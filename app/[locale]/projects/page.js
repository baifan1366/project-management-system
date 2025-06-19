'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useSelector, useDispatch, shallowEqual } from 'react-redux';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarIcon, EyeIcon, CheckCircleIcon, PlusCircleIcon, Plus, Archive, RefreshCcw, Filter, UserRoundIcon, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getSubscriptionLimit } from '@/lib/subscriptionService';
import { limitExceeded } from '@/lib/redux/features/subscriptionSlice';
import useGetUser from '@/lib/hooks/useGetUser';
import CreateProjectDialog from '@/components/CreateProject';
import { toggleShowArchived, restoreProject } from '@/lib/redux/features/projectSlice';
import { useConfirm } from '@/hooks/use-confirm';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import UserProfileDialog from '@/components/chat/UserProfileDialog';

// 组件外部的辅助函数，避免重复创建
function checkUserInProjectTeams(project, user, teams, userTeams) {
  if (!user || !user.id || !project) return false;
  
  try {
    // 查找与项目关联的团队
    const projectTeams = Array.isArray(teams) ? 
      teams.filter(team => team && team.project_id === project.id) : [];
    
    if (projectTeams.length === 0) return false;
    
    // 提取项目团队ID
    const projectTeamIds = projectTeams.map(team => team.id);
    
    // 检查用户是否在这些团队中
    const isInTeam = Array.isArray(userTeams) && userTeams.some(userTeam => 
      userTeam && userTeam.user_id === user.id && 
      projectTeamIds.includes(userTeam.team_id)
    );
    
    return isInTeam;
  } catch (error) {
    console.error('检查用户团队关系出错:', error);
    return false;
  }
}

export default function ProjectsPage() {
  const { locale } = useParams();
  const router = useRouter();
  const dispatch = useDispatch();
  
  // 使用shallowEqual优化选择器
  const { projects, status, showArchived } = useSelector(
    (state) => ({
      projects: state.projects.projects || [],
      status: state.projects.status,
      showArchived: state.projects.showArchived
    }),
    shallowEqual
  );
  
  // 分开选择器以避免不必要的重新渲染
  const teams = useSelector((state) => state.teams?.teams || [], shallowEqual);
  const teamUsers = useSelector((state) => state.teamUsers?.teamUsers || {}, shallowEqual);
  const userTeams = useSelector((state) => state.userTeams?.userTeams || [], shallowEqual);
  const allUsers = useSelector((state) => state.users?.users || [], shallowEqual);
  
  const t = useTranslations('Projects');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const { user } = useGetUser();
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const { confirm } = useConfirm();
  const [selectedUser, setSelectedUser] = useState(null);
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);

  // 使用useMemo计算过滤后的项目列表
  const formattedProjects = useMemo(() => {
    if (!projects.length) {
      return [];
    }
    
    // 根据showArchived状态和statusFilter筛选项目
    const filteredProjects = projects.filter(project => {
      try {
        // 检查归档状态
        const matchesArchiveState = showArchived ? project.archived : !project.archived;
        
        // 检查状态筛选
        const matchesStatusFilter = statusFilter === 'ALL' || project.status === statusFilter;
        
        // 检查可见性权限
        let hasVisibilityAccess = false;
        
        // 获取可见性设置，默认为private
        const visibility = project.visibility?.toLowerCase?.() || 'private';
        
        // 重要：如果项目是public，所有用户都可以查看
        if (visibility === 'public') {
          hasVisibilityAccess = true;
        }
        // 对于private项目，只有创建者可以查看
        else if (visibility === 'private' && user && user.id === project.created_by) {
          hasVisibilityAccess = true;
        }
        
        return matchesArchiveState && matchesStatusFilter && hasVisibilityAccess;
      } catch (error) {
        console.error('项目过滤错误:', error, project);
        return false;
      }
    });
    
    return filteredProjects.map(project => ({
      ...project,
      created_at: new Date(project.created_at || Date.now()).toLocaleDateString('en-US', { timeZone: 'UTC' }),
      // 添加标志表示项目是否与用户相关
      isUserCreated: user && user.id === project.created_by,
      isUserInTeam: user ? checkUserInProjectTeams(project, user, teams, userTeams) : false
    }));
  }, [projects, showArchived, statusFilter, user, teams, userTeams]);

  // 获取项目的团队成员
  const getProjectTeamMembers = useCallback((projectId) => {
    try {
      // 获取项目的所有团队
      const projectTeams = teams.filter(team => team.project_id === projectId);
      if (!projectTeams.length) return [];
      
      // 获取这些团队的所有成员
      const teamMembers = [];
      projectTeams.forEach(team => {
        const teamId = team.id;
        const members = teamUsers[teamId] || [];
        
        members.forEach(member => {
          if (member.user) {
            // 查找完整的用户信息
            const fullUserInfo = allUsers.find(u => u.id === member.user.id);
            if (fullUserInfo) {
              // 避免重复添加同一用户
              if (!teamMembers.some(m => m.id === fullUserInfo.id)) {
                teamMembers.push(fullUserInfo);
              }
            } else {
              // 使用 teamUsers 中的基本用户信息
              if (!teamMembers.some(m => m.id === member.user.id)) {
                teamMembers.push(member.user);
              }
            }
          }
        });
      });
      
      return teamMembers;
    } catch (error) {
      console.error('获取项目团队成员失败:', error);
      return [];
    }
  }, [teams, teamUsers, allUsers]);

  // 处理打开用户资料对话框
  const handleOpenUserProfile = useCallback((user, e) => {
    if (e) {
      e.stopPropagation();
    }
    setSelectedUser(user);
    setIsProfileDialogOpen(true);
  }, []);

  // 使用useCallback记忆化事件处理程序
  const handleCardClick = useCallback((projectId) => {
    router.push(`/${locale}/projects/${projectId}`);
  }, [router, locale]);

  const handleAddTask = useCallback((e, projectId) => {
    e.stopPropagation();
    router.push(`/${locale}/projects/${projectId}/tasks/create`);
  }, [router, locale]);

  const handleRestoreProject = useCallback((e, projectId) => {
    e.stopPropagation();
    confirm({
      title: t('restoreProjectConfirmTitle'),
      description: t('restoreProjectConfirmDescription'),
      variant: "info",
      onConfirm: async () => {
        try {
          await dispatch(restoreProject(projectId)).unwrap();
        } catch (error) {
          console.error('恢复项目失败:', error);
        }
      }
    });
  }, [confirm, t, dispatch]);

  // 切换已归档/未归档项目视图
  const handleToggleArchived = useCallback(() => {
    dispatch(toggleShowArchived());
  }, [dispatch]);

  // 添加检查订阅限制的函数
  const checkLimit = useCallback(async (e) => {
    e.preventDefault();
    
    try {
      if (!user || !user.id) {
        console.error('User not authenticated');
        router.push(`/${locale}/login`);
        return;
      }
      
      const limitCheck = await getSubscriptionLimit(user.id, 'create_project');
      
      if (limitCheck && !limitCheck.allowed) {
        // 使用 Redux 的 limitExceeded action 显示限制模态框
        dispatch(limitExceeded({
          actionType: 'create_project',
          origin: 'projects/createProject',
          limitInfo: limitCheck
        }));
        return;
      }
      
      // 限制检查通过，跳转到创建项目页面
      router.push(`/${locale}/createProject`);
    } catch (error) {
      console.error('检查订阅限制失败:', error);
    }
  }, [user, router, locale, dispatch]);

  const handleStatusFilterChange = useCallback((status) => {
    setStatusFilter(status);
  }, []);

  const getStatusFilterLabel = useCallback(() => {
    if (statusFilter === 'ALL') return t('allStatuses');
    return t(`status.${statusFilter.toLowerCase()}`);
  }, [statusFilter, t]);

  if (status === 'loading') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="overflow-hidden bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-3 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="h-full m-6">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-bold tracking-tight">{t('projects')}</h1>
          {showArchived && (
            <Badge variant="outline" className="ml-2 bg-muted">
              {t('archivedProjects')}
            </Badge>
          )}
          {statusFilter !== 'ALL' && (
            <Badge variant="outline" className="ml-2 bg-muted">
              {getStatusFilterLabel()}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <Filter size={16} />
                {t('filterByStatus')}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>{t('projectStatus')}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem onClick={() => handleStatusFilterChange('ALL')}>
                  <span className={statusFilter === 'ALL' ? 'font-bold' : ''}>
                    {t('allStatuses')}
                  </span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleStatusFilterChange('PENDING')}>
                  <span className={statusFilter === 'PENDING' ? 'font-bold' : ''}>
                    {t('status.pending')}
                  </span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleStatusFilterChange('IN_PROGRESS')}>
                  <span className={statusFilter === 'IN_PROGRESS' ? 'font-bold' : ''}>
                    {t('status.in_progress')}
                  </span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleStatusFilterChange('COMPLETED')}>
                  <span className={statusFilter === 'COMPLETED' ? 'font-bold' : ''}>
                    {t('status.completed')}
                  </span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleStatusFilterChange('CANCELLED')}>
                  <span className={statusFilter === 'CANCELLED' ? 'font-bold' : ''}>
                    {t('status.cancelled')}
                  </span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleStatusFilterChange('ON_HOLD')}>
                  <span className={statusFilter === 'ON_HOLD' ? 'font-bold' : ''}>
                    {t('status.on_hold')}
                  </span>
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            onClick={handleToggleArchived}
            size="sm"
            variant="outline"
            className="flex items-center gap-2"
          >
            {showArchived ? (
              <>
                <RefreshCcw size={16} />
                {t('showActiveProjects')}
              </>
            ) : (
              <>
                <Archive size={16} />
                {t('showArchivedProjects')}
              </>
            )}
          </Button>
          
          {!showArchived && (
            <Button
              onClick={() => setOpenCreateDialog(true)}
              size="icon"
              variant="outline"
              className="inline-flex items-center justify-center transition-colors"
            >
              <Plus size={20}/>
            </Button>
          )}
        </div>
      </div>
      <ScrollArea className="h-[calc(100vh-10rem)]">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {formattedProjects.length === 0 ? (
            <div className="col-span-full text-center text-muted-foreground">
              {showArchived ? t('noArchivedProjects') : t('noProjects')}
            </div>
          ) : (
            formattedProjects.map((project) => (
              <Card 
                key={project.id}
                suppressHydrationWarning={true} 
                onClick={() => handleCardClick(project.id)}
                className={`relative overflow-hidden border transition-all duration-300 
                  bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-sm
                  hover:bg-gradient-to-br hover:from-card/95 hover:to-card/70
                  hover:border-primary/20 hover:shadow-[0_0_15px_rgba(var(--primary-rgb),0.15)]
                  cursor-pointer group
                  ${showArchived ? "border-dashed border-muted-foreground/30" : "border-transparent"}`}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/0 to-primary/0 opacity-0 group-hover:opacity-100 group-hover:via-primary/10 transition-opacity duration-700 pointer-events-none"></div>
                
                <CardHeader className="pb-2">
                  <CardTitle className="text-xl group-hover:text-primary transition-colors duration-300">
                    <div className="break-all hyphens-auto overflow-wrap-anywhere whitespace-normal overflow-hidden">
                      {project.project_name}
                    </div>
                  </CardTitle>
                  <CardDescription className="line-clamp-2 mt-1">{project.description}</CardDescription>
                </CardHeader>
                
                <CardContent>
                  <div className="flex flex-col gap-3 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4 text-muted-foreground/70" />
                      <span className="text-muted-foreground/70">{t('created_at')}:</span>
                      <span className="ml-auto font-medium">{project.created_at}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <EyeIcon className="h-4 w-4 text-muted-foreground/70" />
                      <span className="text-muted-foreground/70">{t('visibility')}:</span>
                      <span className="ml-auto font-medium">
                        {t(`${project.visibility ? project.visibility.toLowerCase() : ''}`)}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <CheckCircleIcon className="h-4 w-4 text-muted-foreground/70" />
                      <span className="text-muted-foreground/70">{t('statusTitle')}:</span>
                      <span className="ml-auto font-medium">
                        {t(`status.${project.status ? project.status.toLowerCase() : ''}`)}
                      </span>
                    </div>
                  </div>
                </CardContent>

                <CardFooter className="pt-0 pb-4 px-6 flex justify-end gap-2">
                  <TooltipProvider>
                    {showArchived ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-8 w-8 rounded-full bg-background/80 hover:bg-green-600/10 hover:text-green-600 border-none shadow-sm"
                            onClick={(e) => handleRestoreProject(e, project.id)}
                          >
                            <RefreshCcw className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{t('restoreProject')}</p>
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <>
                        {/* Quick Chat Popover */}
                        <Popover>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <Button 
                                  variant="outline" 
                                  size="icon" 
                                  className="h-8 w-8 rounded-full bg-background/80 hover:bg-blue-600/10 hover:text-blue-600 border-none shadow-sm"
                                >
                                  <Users className="h-4 w-4" />
                                </Button>
                              </PopoverTrigger>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{t('quickChat') || 'Quick Chat'}</p>
                            </TooltipContent>
                          </Tooltip>
                          <PopoverContent 
                            className="w-64 p-0" 
                            align="end"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="p-2">
                              <h4 className="font-medium px-2 py-1.5 text-sm">{t('teamMembers') || 'Team Members'}</h4>
                              <div className="max-h-60 overflow-y-auto">
                                {getProjectTeamMembers(project.id).length > 0 ? (
                                  getProjectTeamMembers(project.id).map(member => (
                                    <div
                                      key={member.id}
                                      className="flex items-center gap-2 p-2 hover:bg-muted rounded-md cursor-pointer"
                                      onClick={(e) => handleOpenUserProfile(member, e)}
                                    >
                                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                        {member.avatar_url ? (
                                          <img 
                                            src={member.avatar_url} 
                                            alt={member.name || member.email}  
                                            className="h-8 w-8 rounded-full object-cover"
                                          />
                                        ) : (
                                          <UserRoundIcon className="h-4 w-4 text-primary" />
                                        )}
                                      </div>
                                      <div className="flex-1 truncate">
                                        <p className="text-sm font-medium">{member.name || member.email}</p>
                                        {member.email && <p className="text-xs text-muted-foreground truncate">{member.email}</p>}
                                      </div>
                                    </div>
                                  ))
                                ) : (
                                  <p className="text-sm text-muted-foreground p-2">{t('noTeamMembers') || 'No team members found'}</p>
                                )}
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="icon" 
                              className="h-8 w-8 rounded-full bg-background/80 hover:bg-primary/10 hover:text-primary border-none shadow-sm"
                              onClick={(e) => handleAddTask(e, project.id)}
                            >
                              <PlusCircleIcon className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{t('addTask')}</p>
                          </TooltipContent>
                        </Tooltip>
                      </>
                    )}
                  </TooltipProvider>
                </CardFooter>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>
      <CreateProjectDialog open={openCreateDialog} onOpenChange={setOpenCreateDialog} />
      <UserProfileDialog 
        open={isProfileDialogOpen} 
        onOpenChange={setIsProfileDialogOpen} 
        user={selectedUser} 
      />
    </div>
  );
}