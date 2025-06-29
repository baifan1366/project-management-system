'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { use } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Plus, ListTodo, Users, Star, StarOff, Bot } from 'lucide-react';
import ActivityLog from '@/components/ActivityLog';
import { useTranslations } from 'use-intl';
import { useDispatch, useSelector } from 'react-redux';
import { store } from '@/lib/redux/store';
import { fetchAllTasks } from '@/lib/redux/features/taskSlice';
import { useGetUser } from '@/lib/hooks/useGetUser';
import TaskManagerAgent from '@/components/ui/TaskManagerAgent';
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from '@/components/ui/dialog';
import { useRouter } from 'next/navigation';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction } from '@/components/ui/alert-dialog';
import { format } from 'date-fns';
import { fetchProjectTeams, fetchTeamById } from '@/lib/redux/features/teamSlice';
import { getSectionByTeamId, getSectionById } from '@/lib/redux/features/sectionSlice';
import { fetchTeamUsers } from '@/lib/redux/features/teamUserSlice';
import ProjectStatsCard from '@/components/ProjectStatsCard';
import TeamMemberCount from '@/components/TeamMemberCount';
import { Skeleton } from '@/components/ui/skeleton';
import globalEventBus, { createEventBus } from '@/lib/eventBus';

// 定义事件名称常量
const TEAM_CREATED_EVENT = 'team:created';

// 使用导入的全局事件总线，如果不存在则创建一个新的
const eventBus = globalEventBus || (typeof window !== 'undefined' ? createEventBus() : {
  on: () => () => {},
  emit: () => {}
});

export default function Home({ params }) {
  const projectParams = use(params);
  const projectId = projectParams.id;
  const { locale } = projectParams;
  const [themeColor, setThemeColor] = useState('#64748b')
  const project = useSelector(state => 
    state.projects.projects ? state.projects.projects.find(p => p && String(p.id) === String(projectId)) : null
  );
  const projectsStatus = useSelector(state => state.projects.status);
  const t = useTranslations('Projects');
  const t_pengy = useTranslations('pengy');
  const [activeStatus, setActiveStatus] = useState('ALL');
  const [taskCount, setTaskCount] = useState({
    pending: 0,
    inProgress: 0,
    completed: 0,
    total: 0
  });
  const [loading, setLoading] = useState(true);
  const [teamsLoading, setTeamsLoading] = useState(true);
  const [openAgentDialog, setOpenAgentDialog] = useState(false);
  const { user } = useGetUser();
  const router = useRouter();
  const [showPermissionDialog, setShowPermissionDialog] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [permissionChecked, setPermissionChecked] = useState(false);
  const [showArchivedDialog, setShowArchivedDialog] = useState(false);
  const [teams, setTeams] = useState([]);
  const [projectMembers, setProjectMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const dispatch = useDispatch();
  const tasks = useSelector(state => state.tasks.tasks);
  const taskStatus = useSelector(state => state.tasks.status);
  const taskError = useSelector(state => state.tasks.error);
  const sections = useSelector(state => state.sections.sections);
  const [totalTasks, setTotalTasks] = useState(0);
  const [userId, setUserId] = useState(null);
  const [uniqueMembers, setUniqueMembers] = useState(new Set());
  const [teamRefreshTrigger, setTeamRefreshTrigger] = useState(0);
  
  // 重定向处理的useEffect要放在组件顶层，不在条件渲染中
  useEffect(() => {
    if (projectsStatus === 'succeeded' && !project) {
      const redirectTimer = setTimeout(() => {
        router.replace(`/${locale}/projects`);
      }, 0);
      
      return () => clearTimeout(redirectTimer);
    }
  }, [projectsStatus, project, locale, router]);

  useEffect(() => {
    if (project?.theme_color) {
      setThemeColor(project.theme_color);
    }
  }, [project]);
  
  useEffect(() => {
    async function getCurrentUser() {
      try {
        if (user) {
          setUserId(user.id);
        }
      } catch (err) {
        console.error("Error getting current user:", err);
      }
    }
    
    getCurrentUser();
  }, [user]);

  // 监听团队创建事件
  useEffect(() => {
    // 监听团队创建事件，当事件触发时刷新团队数据
    const unsubscribe = eventBus.on(TEAM_CREATED_EVENT, () => {
      // 通过更新trigger状态值来触发团队数据刷新
      setTeamRefreshTrigger(prev => prev + 1);
    });
    
    // 组件卸载时取消订阅
    return () => {
      unsubscribe();
    };
  }, []);

  // 获取项目中的团队数据
  useEffect(() => {
    if (projectId && hasPermission) {
      setTeamsLoading(true); // 在开始加载前设置加载状态
      dispatch(fetchProjectTeams(projectId))
        .unwrap()
        .then(teamData => {
          if (teamData) {
            // 添加处理每个团队的成员数和任务数
            const teamsWithCounts = teamData.map(async (team) => {
              // 获取团队成员数
              let memberCount = 0;
              let taskCount = 0;
              
              if (team.id) {
                try {
                  // 获取团队成员
                  const teamUsers = await dispatch(fetchTeamUsers(team.id)).unwrap();
                  memberCount = Array.isArray(teamUsers) ? teamUsers.length : 0;
                  
                  // 获取团队的sections和任务
                  const teamSections = await dispatch(getSectionByTeamId(team.id)).unwrap();
                  if (teamSections && teamSections.length) {
                    // 计算所有section中的任务总数
                    taskCount = teamSections.reduce((total, section) => {
                      return total + (section.task_ids ? section.task_ids.length : 0);
                    }, 0);
                  }
                } catch (err) {
                  console.error(`获取团队${team.id}的成员和任务时出错:`, err);
                }
              }
              
              // 将计数添加到团队对象中
              return {
                ...team,
                memberCount,
                taskCount
              };
            });
            
            // 等待所有异步操作完成并更新状态
            Promise.all(teamsWithCounts).then(processedTeams => {
              setTeams(processedTeams);
              setTeamsLoading(false);
            });
          } else {
            // 如果没有团队数据，也要结束加载状态
            setTeamsLoading(false);
          }
        })
        .catch(err => {
          console.error("Error fetching project teams:", err);
          setTeamsLoading(false);
        });
    }
  }, [dispatch, projectId, hasPermission, teamRefreshTrigger]);

  // 获取所有任务通过section
  useEffect(() => {
    async function fetchAllTasksFromSections() {
      if (!hasPermission) return;
      
      try {
        // 如果没有团队，直接设置任务数为0并结束加载状态
        if (!teams || !teams.length) {
          setTotalTasks(0);
          setTaskCount(prev => ({
            ...prev,
            total: 0
          }));
          setLoading(false);
          return;
        }
        
        let totalTaskCount = 0;
        
        for (const team of teams) {
          if (!team.id) continue; // 跳过没有ID的团队
          
          // 获取团队的所有section
          const teamSections = await dispatch(getSectionByTeamId(team.id)).unwrap();
          
          if (teamSections && teamSections.length) {
            for (const section of teamSections) {
              // 直接从section对象中获取task_ids
              const sectionTaskCount = section && section.task_ids ? section.task_ids.length : 0;
              totalTaskCount += sectionTaskCount;
            }
          }
        }
        
        // 更新任务计数
        setTotalTasks(totalTaskCount);
        setTaskCount(prev => ({
          ...prev,
          total: totalTaskCount
        }));
      } catch (err) {
        console.error('Error fetching tasks from sections:', err);
      } finally {
        // 无论成功或失败，都结束加载状态
        setLoading(false);
      }
    }
    
    // 开始获取任务时设置加载状态
    if (hasPermission) {
      setLoading(true);
      fetchAllTasksFromSections();
    }
  }, [dispatch, teams, hasPermission]);

  // 检查用户是否有权限访问此项目以及项目是否已归档
  useEffect(() => {
    async function checkProjectPermission() {
      try {
        if (!userId || !projectId) return;

        // 检查项目是否已归档
        if (project && project.archived) {
          setShowArchivedDialog(true);
          setPermissionChecked(true);
          return;
        }

        // 检查用户是否是项目创建者
        if (project && project.created_by === userId) {
          setHasPermission(true);
          setPermissionChecked(true);
          return;
        }

        // 检查用户是否是项目团队成员
        const response = await fetch(`/api/projects/${projectId}/team?userId=${userId}`);
        const data = await response.json();

        if (data && data.length > 0) {
          setHasPermission(true);
        } else {
          setHasPermission(false);
          setShowPermissionDialog(true);
        }
        
        setPermissionChecked(true);
      } catch (err) {
        console.error('Error checking project permission:', err);
        setHasPermission(false);
        setShowPermissionDialog(true);
        setPermissionChecked(true);
      }
    }
    
    checkProjectPermission();
  }, [userId, projectId, project]);

  // 处理星标状态切换
  const handleToggleStar = async (teamId, currentStarStatus) => {
    try {
      const response = await fetch(`/api/teams/${teamId}/star`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ star: !currentStarStatus }),
      });
      
      if (response.ok) {
        // 更新本地状态
        setTeams(teams.map(team => 
          team.id === teamId 
            ? { ...team, star: !team.star } 
            : team
        ).sort((a, b) => {
          if (a.star && !b.star) return -1;
          if (!a.star && b.star) return 1;
          return 0;
        }));
      }
    } catch (err) {
      console.error('Error toggling star status:', err);
    }
  };

  // 处理权限对话框关闭
  const handlePermissionDialogClose = () => {
    setShowPermissionDialog(false);
    router.push(`/${locale}/projects`);
  };

  // 处理归档项目对话框关闭
  const handleArchivedDialogClose = () => {
    setShowArchivedDialog(false);
    router.push(`/${locale}/projects`);
  };

  // 获取任务数据
  useEffect(() => {
    if (userId && hasPermission) {
      dispatch(fetchAllTasks());
    }
  }, [dispatch, userId, hasPermission]);

  // 计算任务统计数据
  useEffect(() => {
    if (tasks && tasks.length > 0) {
      let pending = 0;
      let inProgress = 0;
      let completed = 0;
      
      tasks.forEach(task => {
        const tagValues = task.tag_values || {};
        const status = tagValues.status?.toLowerCase() || '';
        
        if (status.includes('done') || status.includes('completed')) {
          completed++;
        } else if (status.includes('progress') || status.includes('working')) {
          inProgress++;
        } else {
          pending++;
        }
      });
      
      setTaskCount({
        pending,
        inProgress,
        completed,
        total: totalTasks || tasks.length // 优先使用section计算的总数
      });
    }
  }, [tasks, totalTasks]);

  // 根据状态过滤团队
  const filteredTeams = teams.filter(team => {
    if (activeStatus === 'ALL') return true;
    return team.status === activeStatus;
  });

  // 计算属性放在hooks后面，条件返回前面
  const teamsCount = teams ? teams.length : 0;
  const starredTeams = teams ? teams.filter(team => team.star === true).length : 0;

  // 如果权限检查未完成，显示加载状态
  if (!permissionChecked) {
    return (
      <div className="container px-4 py-6">
        <PageSkeleton />
      </div>
    );
  }

  // 如果项目已归档，显示归档警告对话框
  if (showArchivedDialog) {
    return (
      <AlertDialog open={showArchivedDialog} onOpenChange={setShowArchivedDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('projectArchived')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('projectArchivedDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={handleArchivedDialogClose}>{t('close')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  // 如果没有权限，显示权限对话框
  if (!hasPermission) {
    return (
      <AlertDialog open={showPermissionDialog} onOpenChange={setShowPermissionDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('projectNotFound')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('noAccessToProject')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={handlePermissionDialogClose}>{t('close')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  // 如果项目不存在或加载失败，显示加载状态并重定向
  if (projectsStatus === 'succeeded' && !project) {
    return (
      <div className="container px-4 py-6">
        <PageSkeleton />
      </div>
    );
  }

  // 在返回JSX之前，确保导出事件总线供其他组件使用
  // 全局暴露事件总线，以便ProjectSidebar可以使用
  if (typeof window !== 'undefined') {
    window._projectEventBus = eventBus;
  }

  return (
    <div className="container px-4 py-6 max-h-screen overflow-y-auto">
      {/* 页面头部 */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{project?.project_name || t('projectDetails')}</h1>
        <div className="flex space-x-2">
          <Dialog open={openAgentDialog} onOpenChange={setOpenAgentDialog}>
            <DialogTrigger asChild>
              <Button variant={themeColor} className="gap-2 px-2">
                <Bot size={20} />
                <span className="hidden md:inline">{t_pengy('title')}</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-hidden p-0">
              <DialogTitle className="sr-only">{t_pengy('titleForProject')}</DialogTitle>
              <TaskManagerAgent userId={userId} projectId={projectId} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* 统计卡片部分 */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 mb-6">
        <StatsCard 
          icon={<Users className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />} 
          title={t('teams')}
          value={teamsLoading ? "..." : teamsCount.toString()} 
          isLoading={teamsLoading}
        />
        <StatsCard 
          icon={<Star className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500" />} 
          title={t('starredTeams')} 
          value={teamsLoading ? "..." : starredTeams.toString()} 
          isLoading={teamsLoading}
        />
        <StatsCard 
          icon={<ListTodo className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />} 
          title={t('totalTasks')} 
          value={loading ? "..." : taskCount.total.toString()} 
          isLoading={loading}
        />
        <ProjectStatsCard
          icon={<Users className="h-4 w-4 sm:h-5 sm:w-5 text-purple-500" />}
          title={t('projectMembers')}
          teams={teams}
          isTeamMembersCard={true}
          isLoading={teamsLoading}
        />
      </div>

      {/* 主要内容区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>            
            {/* 状态过滤标签页 */}
            <Tabs defaultValue="ALL" className="w-full" onValueChange={setActiveStatus}>
              <div className="px-3 sm:px-6 flex items-center justify-between mt-6">
                <TabsList className="mb-4">
                  <TabsTrigger value="ALL">{t('allTeams')}</TabsTrigger>
                  <TabsTrigger value="PENDING">{t('pending')}</TabsTrigger>
                  <TabsTrigger value="IN_PROGRESS">{t('inProgress')}</TabsTrigger>
                  <TabsTrigger value="COMPLETED">{t('completed')}</TabsTrigger>
                  <TabsTrigger value="ON_HOLD">{t('onHold')}</TabsTrigger>
                  <TabsTrigger value="CANCELLED">{t('cancelled')}</TabsTrigger>
                </TabsList>
              </div>
              
              <TabsContent value="ALL" className="mt-0">
                <TeamsContent 
                  teams={filteredTeams} 
                  loading={teamsLoading} 
                  onToggleStar={handleToggleStar}
                />
              </TabsContent>
              
              <TabsContent value="PENDING" className="mt-0">
                <TeamsContent 
                  teams={filteredTeams} 
                  loading={teamsLoading} 
                  onToggleStar={handleToggleStar}
                />
              </TabsContent>
              
              <TabsContent value="IN_PROGRESS" className="mt-0">
                <TeamsContent 
                  teams={filteredTeams} 
                  loading={teamsLoading} 
                  onToggleStar={handleToggleStar}
                />
              </TabsContent>
              
              <TabsContent value="COMPLETED" className="mt-0">
                <TeamsContent 
                  teams={filteredTeams} 
                  loading={teamsLoading} 
                  onToggleStar={handleToggleStar}
                />
              </TabsContent>
              
              <TabsContent value="ON_HOLD" className="mt-0">
                <TeamsContent 
                  teams={filteredTeams} 
                  loading={teamsLoading} 
                  onToggleStar={handleToggleStar}
                />
              </TabsContent>
              
              <TabsContent value="CANCELLED" className="mt-0">
                <TeamsContent 
                  teams={filteredTeams} 
                  loading={teamsLoading} 
                  onToggleStar={handleToggleStar}
                />
              </TabsContent>
            </Tabs>
          </Card>
        </div>
        
        {/* 右侧活动日志 */}
        <div className="lg:col-span-1">
          <ActivityLog />
        </div>
      </div>
    </div>
  );
}

// 整页骨架屏
function PageSkeleton() {
  return (
    <div>
      {/* 标题骨架屏 */}
      <div className="flex items-center justify-between mb-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-20" />
      </div>
      
      {/* 统计卡片骨架屏 */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="overflow-hidden">
            <CardContent className="p-3 sm:p-4 sm:pt-6">
              <div className="flex items-center justify-between">
                <div className="w-full">
                  <Skeleton className="h-4 w-20 mb-2" />
                  <Skeleton className="h-6 w-12" />
                </div>
                <Skeleton className="h-8 w-8 rounded-full" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {/* 主要内容区骨架屏 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <div className="px-6 pt-6">
              <Skeleton className="h-8 w-full max-w-[300px] mb-4" />
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <TeamSkeletonCard key={i} />
                ))}
              </div>
            </div>
          </Card>
        </div>
        
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// 团队卡片骨架屏
function TeamSkeletonCard() {
  return (
    <div className="border rounded-lg overflow-hidden shadow-sm">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2 w-full">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-16 rounded-full" />
        </div>
        <Skeleton className="h-5 w-5 rounded-full" />
      </div>
      <div className="p-4 bg-accent/5">
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i}>
              <Skeleton className="h-3 w-16 mb-2" />
              <Skeleton className="h-5 w-8" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// 统计卡片组件
function StatsCard({ icon, title, value, isLoading }) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-3 sm:p-4 sm:pt-6">
        <div className="flex items-center justify-between">
          <div className="mr-2">
            <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">{title}</p>
            {isLoading ? (
              <Skeleton className="h-6 w-12" />
            ) : (
              <p className="text-lg sm:text-2xl font-bold">{value}</p>
            )}
          </div>
          <div className="p-1.5 sm:p-2 bg-background rounded-full flex-shrink-0">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

// 团队内容组件
function TeamsContent({ teams, loading, onToggleStar }) {
  const t = useTranslations('Projects');
  const router = useRouter();
  
  // 将状态映射到颜色和标签
  const getStatusDetails = (status) => {
    switch(status?.toUpperCase()) {
      case 'COMPLETED':
        return { color: 'bg-green-100 text-green-800', label: t('completed') };
      case 'IN_PROGRESS':
        return { color: 'bg-yellow-100 text-yellow-800', label: t('inProgress') };
      case 'ON_HOLD':
        return { color: 'bg-orange-100 text-orange-800', label: t('onHold') };
      case 'CANCELLED':
        return { color: 'bg-red-100 text-red-800', label: t('cancelled') };
      case 'PENDING':
      default:
        return { color: 'bg-blue-100 text-blue-800', label: t('pending') };
    }
  };
  
  // 格式化日期
  const formatDate = (dateString) => {
    try {
      return format(new Date(dateString), 'yyyy-MM-dd');
    } catch (err) {
      return dateString || t('unknown');
    }
  };
  
  return (
    <CardContent className="px-3 pt-0 sm:px-6 overflow-auto max-h-[470px]">
      {loading ? (
        <div className="space-y-3 sm:space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <TeamSkeletonCard key={i} />
          ))}
        </div>
      ) : teams.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground">
          {t('noTeams')}
        </div>
      ) : (
        <div className="space-y-3 sm:space-y-4">
          {teams.map((team) => {
            const statusDetails = getStatusDetails(team.status);
            
            return (
              <div key={team.id} className="border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between p-3 sm:p-4 border-b">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center">
                      <h3 className="text-sm sm:text-base font-medium truncate">{team.name}</h3>
                      <span className={`ml-2 px-1.5 py-0.5 sm:px-2 sm:py-1 text-xs rounded-full ${statusDetails.color}`}>
                        {statusDetails.label}
                      </span>
                    </div>
                  </div>
                  {team.star ? (
                    <Star className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500 fill-yellow-500" />
                  ) : (
                    <StarOff className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                  )}
                </div>
                <div 
                  className="p-3 sm:p-4 bg-accent/5"
                >
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">{t('members')}</p>
                      <TeamMemberCount teamId={team.id} />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{t('tasks')}</p>
                      <p className="font-medium">{team.taskCount || 0}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{t('createdAt')}</p>
                      <p className="font-medium">{formatDate(team.created_at)}</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </CardContent>
  );
}

