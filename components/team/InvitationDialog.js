'use client'

import { Dialog, DialogContent, DialogHeader, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Link2, Copy, UserPlus, Eye, Mail, Pen, CheckCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { useSelector } from "react-redux";
import { useEffect, useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDispatch } from "react-redux";
import { fetchTeamUsers } from "@/lib/redux/features/teamUserSlice";
import { createTeamUserInv } from "@/lib/redux/features/teamUserInvSlice";
import { createSelector } from '@reduxjs/toolkit';
import { supabase } from '@/lib/supabase'

// 创建记忆化的选择器
const selectTeam = createSelector(
  [(state) => state.teams.teams, (_, teamId) => teamId],
  (teams, teamId) => teams.find(t => String(t.id) === String(teamId))
);

const selectTeamUsers = createSelector(
  [(state) => state.teamUsers.teamUsers, (_, teamId) => teamId],
  (teamUsers, teamId) => teamUsers[teamId] || []
);

export default function InvitationDialog({ open, onClose }) {
  const t = useTranslations('Invitation')
  const params = useParams()
  const { id: projectId, teamId } = params
  const [themeColor, setThemeColor] = useState('#64748b')
  const [showEmailForm, setShowEmailForm] = useState(false)
  const [email, setEmail] = useState('')
  const [permission, setPermission] = useState('CAN_EDIT')
  const [linkEnabled, setLinkEnabled] = useState(true)
  const [isLinkLoading, setIsLinkLoading] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const dispatch = useDispatch()
  
  // 使用记忆化的选择器
  const team = useSelector(state => selectTeam(state, teamId));
  const teamUsers = useSelector(state => selectTeamUsers(state, teamId));
  const { status } = useSelector(state => state.teams);

  const project = useSelector(state => 
    state.projects.projects.find(p => String(p.id) === String(projectId))
  );

  const [dataLoaded, setDataLoaded] = useState(false);
  // 优化数据加载逻辑
  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      if (!open || !teamId || dataLoaded) return;

      try {
        setIsLoading(true);
        setError(null);
        await dispatch(fetchTeamUsers(teamId)).unwrap();
        if (isMounted) {
          setDataLoaded(true);
        }
      } catch (error) {
        console.error('Failed to fetch team users:', error);
        if (isMounted) {
          setError(error.message || 'Failed to fetch team users');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [dispatch, teamId, open, dataLoaded]);

  // 重置状态
  useEffect(() => {
    if (!open) {
      setError(null);
      setIsLoading(false);
      setEmail('');
      setShowEmailForm(false);
    }
  }, [open]);

  // 处理主题颜色
  useEffect(() => {
    if (project?.theme_color) {
      setThemeColor(project.theme_color);
    }
  }, [project]);

  const handleCopyLink = useCallback(async () => {
    const inviteLink = `${window.location.origin}/invite/${teamId}`;
    try {
      setIsLinkLoading(true);
      await navigator.clipboard.writeText(inviteLink);
      // 可以添加成功提示
    } catch (err) {
      console.error('Failed to copy:', err);
      setError('Failed to copy link');
    } finally {
      setIsLinkLoading(false);
    }
  }, [teamId]);

  const handleSendInvite = useCallback(async (e) => {
    e.preventDefault();
    if (!email || !teamId) return;
  
    try {
      setIsLoading(true);
      setError(null);

      // 1. 先获取当前用户信息
      const { data: userData, error: userError } = await supabase.auth.getUser();
      
      // 检查用户是否已登录
      if (userError || !userData?.user?.id) {
        throw new Error('未授权的操作，请先登录');
      }

      // 发送邀请邮件
      const response = await fetch('/api/send-team-invitation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: email,
          invitationDetails: {
            teamId: teamId,
            permission: permission,
            created_by: userData.user.id,
            teamName: team?.name || '',
          }
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '邀请发送失败');
      }
      
      // 2. 邮件发送成功后，创建本地邀请记录
      await dispatch(createTeamUserInv({
        teamId: Number(teamId),
        userEmail: email,
        role: permission,
        created_by: userData.user.id
      }));

      setEmail('');
      setShowEmailForm(false);
    } catch (error) {
      console.error('Failed to send invite:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  }, [email, teamId, permission, dispatch, team]);

  if (!project) {
    return null;
  }

  const renderMemberList = () => {
    if (isLoading || status === 'loading') {
      return (
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent"></div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="text-center text-red-500 py-4">
          {error}
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

    return teamUsers.map((teamUser) => (
      <div key={teamUser.user.id} className="flex items-center justify-between p-2">
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
        <span className="text-sm text-muted-foreground">
          {teamUser.role === 'OWNER' ? t('owner') : 
           teamUser.role === 'CAN_VIEW' ? t('viewer') :
           teamUser.role === 'CAN_EDIT' ? t('editor') :
           teamUser.role === 'CAN_CHECK' ? t('checker') : ''}
        </span>
      </div>
    ));
  };

  return (
    <Dialog 
      open={open} 
      onOpenChange={(isOpen) => {
        if(!isOpen) {
          onClose()
        }
      }}
      modal={true}
    >
      <DialogContent
        className="max-w-md rounded-lg"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="text-left">
          <DialogTitle className="text-xl font-semibold">
            {t('inviteToTeam')} {team?.name}
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-600 dark:text-gray-400">
            {t('invitationDescription')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex space-x-5">
            <button 
              className={`flex items-center transition-colors ${!showEmailForm ? 'text-blue-500' : 'text-foreground hover:text-accent-foreground'}`}
              onClick={() => setShowEmailForm(false)}
            > 
              <Link2 className={`w-4 h-4 mr-2 ${!showEmailForm ? 'text-blue-500' : ''}`} />
              <span className="text-sm">{t('shareLink')}</span>
            </button>
              
            <button 
              className={`flex items-center transition-colors ${showEmailForm ? 'text-blue-500' : 'text-foreground hover:text-accent-foreground'}`}
              onClick={() => setShowEmailForm(true)}
            > 
              <Mail className={`w-4 h-4 mr-2 ${showEmailForm ? 'text-blue-500' : ''}`} />
              <span className="text-sm">{t('email')}</span>
            </button>
          </div>

          {showEmailForm ? (
            <form onSubmit={handleSendInvite} className="space-y-4">
            <div className="h-[1px] w-full bg-border" />
            <div className="flex items-center justify-between p-3 h-[40px] border rounded-lg">
              <div className="flex items-center flex-1">
                <Input
                  type="email"
                  placeholder={t('enterEmail')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>
              <Select value={permission} onValueChange={setPermission}>
                <SelectTrigger className="border-0 focus:ring-0 focus:ring-offset-0 w-[120px]">
                  <SelectValue placeholder={t('selectPermission')}>
                    {permission && (
                      <div className="flex items-center mr-2">
                        {permission === 'CAN_EDIT' && <Pen className="w-4 h-4 mr-2 text-gray-500" />}
                        {permission === 'CAN_CHECK' && <CheckCircle className="w-4 h-4 mr-2 text-gray-500" />}
                        {permission === 'CAN_VIEW' && <Eye className="w-4 h-4 mr-2 text-gray-500" />}
                        <span>{t(permission)}</span>
                      </div>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CAN_EDIT">
                    <div className="flex items-center w-full">
                      <Pen className="w-5 h-5 mr-3 text-gray-500" />
                      <div className="flex-1">
                        <div className="font-medium">{t('editor')}</div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {t('editorDescription')}
                        </div>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="CAN_CHECK">
                    <div className="flex items-center w-full">
                      <CheckCircle className="w-5 h-5 mr-3 text-gray-500" />
                      <div className="flex-1">
                        <div className="font-medium">{t('checker')}</div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {t('checkerDescription')}
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
                </SelectContent>
              </Select>
            </div>
            <Button 
              type="submit" 
              className="w-full"
              variant={themeColor}
              disabled={!email}
            >
              {t('sendInvite')}
            </Button>
          </form>
          ) : (
            <div className="rounded-lg space-y-5">
              <div className="rounded-lg border">
                <div className="flex items-center justify-between p-3 h-[40px]">
                  <div className="flex items-center space-x-2">
                    <Link2 className="w-4 h-4" />
                    <span>{t('shareLink')}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch 
                      checked={linkEnabled}
                      onCheckedChange={async (checked) => {
                        setIsLinkLoading(true);
                        try {
                          // Simulate API call with a small delay
                          await new Promise(resolve => setTimeout(resolve, 500));
                          setLinkEnabled(checked);
                        } finally {
                          setIsLinkLoading(false);
                        }
                      }}
                      disabled={isLinkLoading}
                    />
                  </div>
                </div>
                  {linkEnabled && (
                    <>
                      <div className="h-[1px] w-full bg-border" />
                      <div className="flex items-center justify-between p-3 h-[40px]">
                        <div className="flex items-center space-x-2">
                          <UserPlus className="w-4 h-4" />
                          <span>{t('permissions')}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Select value={permission} onValueChange={setPermission}>
                            <SelectTrigger className="border-0 focus:ring-0 focus:ring-offset-0 w-[120px]">
                              <SelectValue placeholder={t('selectPermission')}>
                                {permission && (
                                  <div className="flex items-center mr-2">
                                    {permission === 'CAN_EDIT' && <Pen className="w-4 h-4 mr-2 text-gray-500" />}
                                    {permission === 'CAN_CHECK' && <CheckCircle className="w-4 h-4 mr-2 text-gray-500" />}
                                    {permission === 'CAN_VIEW' && <Eye className="w-4 h-4 mr-2 text-gray-500" />}
                                    <span>{t(permission)}</span>
                                  </div>
                                )}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="CAN_EDIT">
                                <div className="flex items-center w-full">
                                  <Pen className="w-5 h-5 mr-3 text-gray-500" />
                                  <div className="flex-1">
                                    <div className="font-medium">{t('editor')}</div>
                                    <div className="text-xs text-gray-500 mt-0.5">
                                      {t('editorDescription')}
                                    </div>
                                  </div>
                                </div>
                              </SelectItem>
                              <SelectItem value="CAN_CHECK">
                                <div className="flex items-center w-full">
                                  <CheckCircle className="w-5 h-5 mr-3 text-gray-500" />
                                  <div className="flex-1">
                                    <div className="font-medium">{t('checker')}</div>
                                    <div className="text-xs text-gray-500 mt-0.5">
                                      {t('checkerDescription')}
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
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </>
                  )}
                </div>
                {linkEnabled && (
                  <Button 
                    className="w-full"
                    variant={themeColor}
                    onClick={handleCopyLink}
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    {t('copyLink')}
                  </Button>
                )}
              </div>
          )}

          <div className="mt-6">
            <h4 className="text-sm font-medium mb-3">{t('teamMembers')}</h4>
            <div className="space-y-2">
              {renderMemberList()}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}