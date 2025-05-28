'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, 
  AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { Pen, Users, Settings2, Trash2, Plus, Lock, Eye, Pencil, Unlock, UserMinus, CheckCircle } from "lucide-react";
import { useDispatch, useSelector } from 'react-redux';
import { updateTeam, deleteTeam, fetchUserTeams } from '@/lib/redux/features/teamSlice';
import { deleteTeamUserByTeamId, fetchTeamUsers, removeTeamUser, updateTeamUser } from '@/lib/redux/features/teamUserSlice';
import { useGetUser } from '@/lib/hooks/useGetUser';
import { useRouter } from 'next/navigation';
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { createSelector } from '@reduxjs/toolkit';
import InvitationDialog from './InvitationDialog';

// 组件外部：创建记忆化的 selector 工厂函数
const selectTeamUsers = createSelector(
  [(state) => state.teamUsers.teamUsers, (_, teamId) => teamId],
  (teamUsers, teamId) => teamUsers[teamId] || []
);

const EditTeamDialog = ({ open, onClose, team, activeTab, onSuccess, projectId }) => {
  const { user } = useGetUser();    
  const { projects } = useSelector((state) => state.projects)
  const t = useTranslations('Team');
  const tConfirm = useTranslations('confirmation');
  const dispatch = useDispatch();
  const router = useRouter();
  const userId = user?.id;
  const project = projects.find(p => String(p.id) === String(projectId))

  // 状态管理
  const [currentTab, setCurrentTab] = useState(activeTab);
  const [teamName, setTeamName] = useState('');
  const [teamDescription, setTeamDescription] = useState('');
  const [teamAccess, setTeamAccess] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [saving, setIsSaving] = useState(false);
  const [themeColor, setThemeColor] = useState('#000000');
  const [projectName, setProjectName] = useState('');
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [membersError, setMembersError] = useState(null);
  const [pendingRoleChanges, setPendingRoleChanges] = useState({});
  const [pendingRemovals, setPendingRemovals] = useState([]);
  
  // 组件内部：用 useMemo 记忆化 selector，避免每次渲染都创建新函数
  // 只有 team?.id 变化时才会重新创建 selector
  const selectTeamUsersWithId = useMemo(
    () => (state) => selectTeamUsers(state, team?.id),
    [team?.id]
  );
  // 获取团队成员原始数组
  const rawTeamUsers = useSelector(selectTeamUsersWithId);
  // 再用 useMemo 保证 teamUsers 的引用稳定，避免 useSelector 警告
  const teamUsers = useMemo(() => rawTeamUsers, [JSON.stringify(rawTeamUsers)]);
  const { status } = useSelector(state => state.teamUsers);

  const formReset = () => {
    setDeleteConfirmText('');
    resetPendingChanges();
  }

  useEffect(() => {
    if (project?.theme_color) {
      setThemeColor(project.theme_color);
      setProjectName(project.project_name);
    }
  }, [project]);

  // 加载团队数据
  useEffect(() => {
    if (team) {
      setTeamName(team.name || '');
      setTeamDescription(team.description || '');
      setTeamAccess(team.access || '');
      setCurrentTab(activeTab);
    }
  }, [team, activeTab]);
  
  // 加载团队成员数据
  useEffect(() => {
    const loadTeamMembers = async () => {
      if (!team?.id || currentTab !== 'members') return;
      
      try {
        setIsLoadingMembers(true);
        setMembersError(null);
        await dispatch(fetchTeamUsers(team.id)).unwrap();
      } catch (error) {
        console.error('获取团队成员失败:', error);
        setMembersError(error.message || '获取团队成员失败');
      } finally {
        setIsLoadingMembers(false);
      }
    };
    
    loadTeamMembers();
  }, [dispatch, team?.id, currentTab]);
  
  // 重置所有待处理的变更
  const resetPendingChanges = () => {
    setPendingRoleChanges({});
    setPendingRemovals([]);
  };

  // 更新团队详情
  const handleUpdateTeam = async () => {
    setIsSaving(true);
    if (!teamName.trim()) return;
    
    try {
      const name = teamName;
      const description = teamDescription;
      const access = teamAccess;
      const update = await dispatch(updateTeam({ 
        teamId: team.id, 
        data: {name, description, access},
        user_id: userId,
        old_values: team,
        updated_at: new Date().toISOString()
      })).unwrap();
      
      // 处理待处理的成员角色变更
      const pendingRolePromises = Object.entries(pendingRoleChanges).map(([memberId, newRole]) => {
        return dispatch(updateTeamUser({
          teamId: team.id,
          userId: memberId,
          role: newRole,
          createdBy: userId
        })).unwrap();
      });
      
      // 处理待处理的成员移除
      const pendingRemovalPromises = pendingRemovals.map(memberId => {
        return dispatch(removeTeamUser({
          teamId: team.id,
          userId: memberId,
          createdBy: userId
        })).unwrap();
      });
      
      // 等待所有操作完成
      await Promise.all([...pendingRolePromises, ...pendingRemovalPromises]);
      
      // 重置待处理的变更
      resetPendingChanges();
      
      // 更新成功后，刷新用户团队列表
      await dispatch(fetchUserTeams({ userId, projectId })).unwrap();
      
      // 重新获取团队成员列表
      if (pendingRolePromises.length > 0 || pendingRemovalPromises.length > 0) {
        await dispatch(fetchTeamUsers(team.id)).unwrap();
      }
      
      onSuccess(); // 确保在成功时调用onSuccess
    } catch (error) {
      console.error('更新团队时出错:', error);
    } finally {
      setIsSaving(false);
      onClose();
    }
  };
  
  // 删除团队
  const handleDeleteTeam = async () => {
    if (deleteConfirmText !== team?.name) return;
    try {
      // 这里调用删除团队的API并等待操作完成
      const teamId = team?.id;
      // console.log(team);
      
      // Delete all team members first to avoid orphaned records
      // This ensures proper cleanup of user associations before removing the team
      await dispatch(deleteTeamUserByTeamId({userId, teamId})).unwrap();
      
      // Then delete the team itself
      await dispatch(deleteTeam({userId, teamId})).unwrap();
      
      // 删除成功后，刷新用户团队列表
      await dispatch(fetchUserTeams({ userId, projectId })).unwrap();
      
      setConfirmDelete(false);
      onClose();
      router.replace(`/projects/${projectId}`);
    } catch (error) {
      console.error('删除团队失败:', error);
    }
  };
  
  // 记录待处理的成员角色变更
  const handlePendingRoleChange = (memberId, newRole) => {
    // 如果将某人设置为OWNER，需要确保至少保留一个所有者
    if (newRole === 'OWNER') {
      // 不需要执行特殊处理，因为可以有多个所有者
      setPendingRoleChanges(prev => ({
        ...prev,
        [memberId]: newRole
      }));
    } else {
      // 检查是否要将唯一的所有者改为非所有者
      const isChangingOnlyOwner = () => {
        // 找出所有当前是所有者的用户
        const currentOwners = teamUsers.filter(user => 
          user.role === 'OWNER' && 
          !pendingRoleChanges[user.user.id] // 尚未被修改的
        );
        
        // 找出所有通过待处理更改设置为OWNER的用户
        const pendingOwners = Object.entries(pendingRoleChanges)
          .filter(([id, role]) => role === 'OWNER' && id !== memberId)
          .map(([id]) => id);
          
        // 如果待修改用户是唯一的所有者，且没有其他人被设为所有者
        return currentOwners.length === 1 && 
          currentOwners[0].user.id.toString() === memberId.toString() && 
          pendingOwners.length === 0;
      };
      
      if (isChangingOnlyOwner()) {
        // 此情况不允许，因为必须至少有一个所有者
        alert(t('mustHaveOwner') || '团队必须至少有一名所有者');
        return;
      }
      
      // 正常更新角色
      setPendingRoleChanges(prev => ({
        ...prev,
        [memberId]: newRole
      }));
    }
  };
  
  // 记录待处理的成员移除
  const handlePendingRemoval = (memberId) => {
    setPendingRemovals(prev => [...prev, memberId]);
  };
  
  // 取消待处理的成员角色变更
  const cancelPendingRoleChange = (memberId) => {
    setPendingRoleChanges(prev => {
      const updated = { ...prev };
      delete updated[memberId];
      return updated;
    });
  };
  
  // 取消待处理的成员移除
  const cancelPendingRemoval = (memberId) => {
    setPendingRemovals(prev => prev.filter(id => id !== memberId));
  };
  
  // 检查当前用户是否为团队所有者
  const isCurrentUserOwner = () => {
    if (!teamUsers || !userId) return false;
    const currentUserTeamMember = teamUsers.find(tu => String(tu.user.id) === String(userId));
    return currentUserTeamMember?.role === 'OWNER';
  };
  
  // 渲染团队成员列表
  const renderMemberList = () => {
    if (isLoadingMembers || status === 'loading') {
      return (
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent"></div>
        </div>
      );
    }

    if (membersError) {
      return (
        <div className="text-center text-red-500 py-4">
          {membersError}
        </div>
      );
    }

    if (!teamUsers || teamUsers.length === 0) {
      return (
        <div className="text-center text-gray-500 py-4">
          {t('noTeamMembers')}
        </div>
      );
    }

    return teamUsers.map((teamUser) => {
      // 检查此成员是否在待移除列表中
      const isPendingRemoval = pendingRemovals.includes(teamUser.user.id);
      
      // 获取此成员的当前角色（考虑待处理的变更）
      const currentRole = pendingRoleChanges[teamUser.user.id] || teamUser.role;
      
      // 如果成员在待移除列表中，不显示此成员
      if (isPendingRemoval) {
        return (
          <div key={teamUser.user.id} className="flex items-center justify-between p-2 bg-gray-100 dark:bg-gray-700 rounded-md">
            <div className="flex items-center space-x-3">
              <Avatar>
                <AvatarImage src={teamUser.user.avatar_url || "/placeholder-avatar.jpg"} />
                <AvatarFallback>{(teamUser.user.name || "?").charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="font-medium line-through">{teamUser.user.name}</span>
                <span className="text-sm text-muted-foreground line-through">{teamUser.user.email}</span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-red-500">{t('pendingRemoval')}</span>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => cancelPendingRemoval(teamUser.user.id)}
                title={t('undoRemoval')}
              >
                <Pencil className="h-4 w-4 text-blue-500" />
              </Button>
            </div>
          </div>
        );
      }
      
      return (
        <div key={teamUser.user.id} className={`flex items-center justify-between p-2 hover:bg-accent rounded-md ${pendingRoleChanges[teamUser.user.id] ? 'bg-blue-50 dark:bg-blue-950' : ''}`}>
          <div className="flex items-center space-x-3">
            <Avatar>
              <AvatarImage src={teamUser.user.avatar_url || "/placeholder-avatar.jpg"} />
              <AvatarFallback>{(teamUser.user.name || "?").charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="font-medium">{teamUser.user.name}</span>
              <span className="text-sm text-muted-foreground">{teamUser.user.email}</span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {pendingRoleChanges[teamUser.user.id] && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => cancelPendingRoleChange(teamUser.user.id)}
                title={t('undoRoleChange')}
                className="h-8 w-8"
              >
                <Pencil className="h-4 w-4 text-blue-500" />
              </Button>
            )}
            
            {/* 判断是否是当前用户自己 */}
            {String(teamUser.user.id) === String(userId) ? (
              <span className="text-sm text-muted-foreground mr-2">
                {currentRole === 'OWNER' ? t('owner') : 
                 currentRole === 'CAN_VIEW' ? t('viewer') :
                 currentRole === 'CAN_EDIT' ? t('editor') :
                 currentRole === 'OWNER' && " (" + t('me') + ")"
                }
              </span>
            ) : (
              /* 其他所有成员，所有者可以编辑 */
              <>
                {isCurrentUserOwner() ? (
                  <Select 
                    value={currentRole}
                    onValueChange={(value) => handlePendingRoleChange(teamUser.user.id, value)}
                    disabled={status === 'loading' || saving}
                  >
                    <SelectTrigger className="w-[130px] h-8 border-border focus:ring-0 focus:ring-offset-0">
                      <SelectValue>
                        {currentRole && (
                          <div className="flex items-center">
                            {currentRole === 'CAN_VIEW' && <Eye className="w-4 h-4 mr-2 text-gray-500" />}
                            {currentRole === 'CAN_EDIT' && <Pencil className="w-4 h-4 mr-2 text-gray-500" />}
                            <span className="truncate">
                              {currentRole === 'CAN_VIEW' && t('viewer')}
                              {currentRole === 'CAN_EDIT' && t('editor')}
                            </span>
                          </div>
                        )}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CAN_EDIT">
                        <div className="flex items-center w-full">
                          <Pencil className="w-5 h-5 mr-3 text-gray-500" />
                          <div className="flex-1">
                            <div className="font-medium">{t('editor')}</div>
                            <div className="text-xs text-gray-500 mt-0.5">
                              {t('editorDescription')}
                            </div>
                          </div>
                        </div>
                      </SelectItem>
                      <SelectItem value="CAN_VIEW">
                        <div className="flex items-center w-full">
                          <Eye className="w-5 h-5 mr-3 text-gray-500" />
                          <div className="flex-1">
                            <div className="font-medium">{t('viewer')}</div>
                            <div className="text-xs text-gray-500 mt-0.5">
                              {t('viewerDescription')}
                            </div>
                          </div>
                        </div>
                      </SelectItem>
                      {/* 转移所有者选项不再需要，因为可以直接设置为所有者 */}
                    </SelectContent>
                  </Select>
                ) : (
                  // 非所有者只能查看角色，不能修改
                  <span className="text-sm text-muted-foreground mr-2 flex items-center">
                    {currentRole === 'CAN_VIEW' && <Eye className="w-4 h-4 mr-2 text-gray-500" />}
                    {currentRole === 'CAN_EDIT' && <Pencil className="w-4 h-4 mr-2 text-gray-500" />}
                    {currentRole === 'OWNER' && <Lock className="w-4 h-4 mr-2 text-orange-500" />}
                    {currentRole === 'CAN_VIEW' && t('viewer')}
                    {currentRole === 'CAN_EDIT' && t('editor')}
                    {currentRole === 'OWNER' && t('owner')}
                  </span>
                )}
              </>
            )}
            
            {/* 所有者可以移除其他成员（包括其他所有者），但不能移除自己 */}
            {isCurrentUserOwner() && String(teamUser.user.id) !== String(userId) && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => handlePendingRemoval(teamUser.user.id)}
                title={t('removeMember')}
                disabled={status === 'loading' || saving}
                className="text-gray-500 hover:text-red-500"
              >
                <UserMinus className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      );
    });
  };
  
  // 关闭对话框时重置待处理的变更
  const handleClose = () => {
    resetPendingChanges();
    onClose();
  };
  
  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent 
            className="sm:max-w-[600px]"
            onPointerDownOutside={(e) => e.preventDefault()}
            onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>{t('editTeam')}</DialogTitle>
            <DialogDescription/>
          </DialogHeader>
          
          <Tabs defaultValue={currentTab} onValueChange={setCurrentTab} className="w-full">
            <TabsList className="grid grid-cols-3 mb-4">
              <TabsTrigger value="details" className="flex items-center">
                <Pen className="h-4 w-4 mr-1" />
                {t('details')}
              </TabsTrigger>
              <TabsTrigger value="members" className="flex items-center">
                <Users className="h-4 w-4 mr-1" />
                {t('members')}
              </TabsTrigger>
              <TabsTrigger value="access" className="flex items-center">
                <Settings2 className="h-4 w-4 mr-1" />
                {t('access')}
              </TabsTrigger>
            </TabsList>
            
            {/* 团队详情标签内容 */}
            <TabsContent value="details" className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="teamName">{t('teamName')}</Label>
                  <Input 
                    id="teamName" 
                    value={teamName} 
                    onChange={(e) => setTeamName(e.target.value)} 
                    placeholder={t('enterTeamName')}
                    readOnly={!isCurrentUserOwner()}
                    disabled={!isCurrentUserOwner()}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="teamDescription">{t('teamDescription')}</Label>
                  <Textarea 
                    id="teamDescription" 
                    value={teamDescription} 
                    onChange={(e) => setTeamDescription(e.target.value)} 
                    placeholder={t('enterTeamDescription')}
                    rows={4}
                    readOnly={!isCurrentUserOwner()}
                    disabled={!isCurrentUserOwner()}
                  />
                </div>
              </div>
            </TabsContent>
            
            {/* 成员管理标签内容 */}
            <TabsContent value="members" className="space-y-4">
              <div className="mt-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="teamMembers">{t('teamMembers')}</Label>
                </div>
                <div className="text-sm text-muted-foreground mb-4">
                  {isCurrentUserOwner() 
                    ? t('membersManagementDescription')
                    : t('membersViewDescription') || '查看团队成员列表。只有团队所有者可以管理成员权限。'}
                  
                </div>
                
                {/* 成员列表 */}
                <div className="border rounded-md p-2 space-y-1 max-h-[200px] overflow-y-auto">
                  {renderMemberList()}
                </div>
              </div>
            </TabsContent>
            
            {/* 权限管理标签内容 */}
            <TabsContent value="access" className="space-y-4">
              <div className="space-y-4">
                {/* 权限设置 */}
                <div className="mt-4">
                  <Label htmlFor="teamAccess">{t('teamAccess')}</Label>
                  <div className="text-sm text-muted-foreground mb-5">
                    {isCurrentUserOwner() 
                      ? t('accessManagementDescription')
                      : t('accessViewDescription') || '查看团队访问设置。只有团队所有者可以更改访问设置。'}
                  </div>
                  {isCurrentUserOwner() ? (
                    <Select
                      value={teamAccess}
                      onValueChange={(value) => setTeamAccess(value)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={t('teamAccessPlaceholder')}>
                          {teamAccess ? (
                            <div className="flex items-center justify-between w-full">
                              <div className="flex items-center">
                                {teamAccess === 'invite_only' && <Lock className="w-4 h-4 mr-2 text-gray-500" />}
                                {teamAccess === 'can_edit' && <Pencil className="w-4 h-4 mr-2 text-gray-500" />}
                                {teamAccess === 'can_view' && <Eye className="w-4 h-4 mr-2 text-gray-500" />}
                                <span>
                                  {teamAccess === 'invite_only' && t('inviteOnly')}
                                  {teamAccess === 'can_edit' && t('everyoneAt{projectName}CanEdit', { projectName })}
                                  {teamAccess === 'can_view' && t('everyoneAt{projectName}CanView', { projectName })}
                                </span>
                              </div>
                            </div>
                          ) : (
                            ''
                          )}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="invite_only" className="relative flex items-center py-3 px-3 hover:bg-gray-100 dark:hover:bg-accent">
                          <div className="flex items-center w-full">
                            <Lock className="w-5 h-5 mr-3 text-gray-500" />
                            <div className="flex-1">
                              <div className="font-medium">{t('inviteOnly')}</div>
                              <div className="text-xs text-gray-500 mt-0.5">
                                {t('inviteOnlyDescription')}
                              </div>
                            </div>
                          </div>
                        </SelectItem>
                        <SelectItem value="can_edit" className="relative flex items-center py-3 px-3 hover:bg-gray-100 dark:hover:bg-accent">
                          <div className="flex items-center w-full">
                            <Pencil className="w-5 h-5 mr-3 text-gray-500" />
                            <div className="flex-1">
                              <div className="font-medium">{t('everyoneAt{projectName}CanEdit', { projectName })}</div>
                              <div className="text-xs text-gray-500 mt-0.5">
                                {t('everyoneCanEditDescription')}
                              </div>
                            </div>
                          </div>
                        </SelectItem>
                        <SelectItem value="can_view" className="relative flex items-center py-3 px-3 hover:bg-gray-100 dark:hover:bg-accent">
                          <div className="flex items-center w-full">
                            <Eye className="w-5 h-5 mr-3 text-gray-500" />
                            <div className="flex-1">
                              <div className="font-medium">{t('everyoneAt{projectName}CanView', { projectName })}</div>
                              <div className="text-xs text-gray-500 mt-0.5">
                                {t('everyoneCanViewDescription')}
                              </div>
                            </div>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="flex items-center justify-between w-full border border-gray-400 rounded-md p-2 text-sm">
                      <div className="flex items-center">
                        {teamAccess === 'invite_only' && <Lock className="w-4 h-4 mr-2 text-gray-500 text-sm" />}
                        {teamAccess === 'can_edit' && <Pencil className="w-4 h-4 mr-2 text-gray-500 text-sm" />}
                        {teamAccess === 'can_view' && <Eye className="w-4 h-4 mr-2 text-gray-500 text-sm" />}
                        <span>
                          {teamAccess === 'invite_only' && t('inviteOnly')}
                          {teamAccess === 'can_edit' && t('everyoneAt{projectName}CanEdit', { projectName })}
                          {teamAccess === 'can_view' && t('everyoneAt{projectName}CanView', { projectName })}
                        </span>
                      </div>
                    </div>
                  )}
                </div>            
              </div>
            </TabsContent>
          </Tabs>
          
          <DialogFooter className="flex justify-between w-full pt-4">
            {currentTab === "details" && isCurrentUserOwner() && (
                <Button variant="destructive" onClick={() => setConfirmDelete(true)}>
                    <Trash2 className="h-4 w-4 mr-1" />
                    {t('deleteTeam')}
                </Button>
            )}
            {currentTab === "details" && !isCurrentUserOwner() && (
                <div></div> // 占位，保持右侧按钮对齐
            )}
            
            <div className="flex-1 flex justify-end gap-2">
              {/* The cancel button is disabled while saving to prevent duplicate actions */}
              <Button 
                variant="outline" 
                onClick={handleClose} 
                disabled={saving}
              >
                {isCurrentUserOwner() ? t('cancel') : t('cancel')}
              </Button>
              {/* 只有所有者才显示保存按钮 */}
              {isCurrentUserOwner() && (
                <Button 
                  variant={themeColor} 
                  onClick={handleUpdateTeam} 
                  disabled={saving || (!Object.keys(pendingRoleChanges).length && !pendingRemovals.length && teamName === team?.name && teamDescription === team?.description && teamAccess === team?.access)}
                >
                  {saving ? t('saving') : t('saveChanges')}
                  {(Object.keys(pendingRoleChanges).length > 0 || pendingRemovals.length > 0) && !saving && (
                    <span className="ml-1">({Object.keys(pendingRoleChanges).length + pendingRemovals.length})</span>
                  )}
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* 删除确认对话框 */}
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tConfirm('deleteTeamConfirmation')}</AlertDialogTitle>
            <AlertDialogDescription>
                <Label htmlFor="confirmDelete" className="text-sm font-medium">
                  {tConfirm('type{teamName}ToConfirm', { teamName: team?.name })}
                
                  <Input 
                    id="confirmDelete"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    className="mt-2"
                    placeholder={team?.name}
                  />
                </Label>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={formReset}
            >
              {tConfirm('cancel')}
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteTeam} 
              className="bg-red-700 hover:bg-red-800 text-white"
              disabled={deleteConfirmText !== team?.name}
            >
              {tConfirm('permanentlyDelete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* 邀请对话框 */}
      {showInviteDialog && (
        <InvitationDialog 
          open={showInviteDialog} 
          onClose={() => setShowInviteDialog(false)} 
        />
      )}
    </>
  );
};

export default EditTeamDialog;
