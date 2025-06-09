'use client';

import { useState, useEffect } from 'react';
import { use } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Plus, ListTodo, Users, Star, StarOff, Bot } from 'lucide-react';
import ActivityLog from '@/components/ActivityLog';
import { useTranslations } from 'use-intl';
import { useDispatch, useSelector } from 'react-redux';
import { fetchAllTasks } from '@/lib/redux/features/taskSlice';
import { useGetUser } from '@/lib/hooks/useGetUser';
import TaskManagerAgent from '@/components/ui/TaskManagerAgent';
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from '@/components/ui/dialog';
import { useRouter } from 'next/navigation';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction } from '@/components/ui/alert-dialog';
import { format } from 'date-fns';

export default function Home({ params }) {
  // 使用React.use解包params对象
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

  // 使用Redux获取任务数据
  const dispatch = useDispatch();
  const tasks = useSelector(state => state.tasks.tasks);
  const taskStatus = useSelector(state => state.tasks.status);
  const taskError = useSelector(state => state.tasks.error);

  // 获取当前用户信息
  const [userId, setUserId] = useState(null);
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
      }
    }
    
    getCurrentUser();
  }, [user]);

  // 获取项目中的团队数据
  useEffect(() => {
    async function fetchTeams() {
      try {
        if (!projectId) return;
        
        const response = await fetch(`/api/projects/${projectId}/teams`);
        const data = await response.json();
        
        // 处理团队数据，将星标团队排在前面
        const sortedTeams = data.sort((a, b) => {
          if (a.star && !b.star) return -1;
          if (!a.star && b.star) return 1;
          return 0;
        });
        
        // 获取每个团队的成员数量和任务数量
        for (let team of sortedTeams) {
          // 获取团队成员数量
          const membersResponse = await fetch(`/api/teams/${team.id}/members`);
          const membersData = await membersResponse.json();
          team.memberCount = membersData.length;
          
          // 获取团队任务数量
          const tasksResponse = await fetch(`/api/teams/${team.id}/tasks`);
          const tasksData = await tasksResponse.json();
          team.taskCount = tasksData.length;
        }
        
        setTeams(sortedTeams);
        setTeamsLoading(false);
      } catch (err) {
        console.error('Error fetching teams:', err);
        setTeamsLoading(false);
      }
    }
    
    if (hasPermission && projectId) {
      fetchTeams();
    }
  }, [projectId, hasPermission]);

  // 获取项目成员
  useEffect(() => {
    async function fetchProjectMembers() {
      try {
        if (!projectId || !hasPermission) return;
        
        const response = await fetch(`/api/projects/${projectId}/members`);
        const data = await response.json();
        
        setProjectMembers(data);
        setMembersLoading(false);
      } catch (err) {
        console.error('Error fetching project members:', err);
        setMembersLoading(false);
      }
    }
    
    fetchProjectMembers();
  }, [projectId, hasPermission]);

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
        total: tasks.length
      });
      
      setLoading(false);
    }
  }, [tasks]);

  // 根据状态过滤团队
  const filteredTeams = teams.filter(team => {
    if (activeStatus === 'ALL') return true;
    return team.status === activeStatus;
  });

  // 立即检查项目是否存在
  if (projectsStatus === 'succeeded' && !project) {
    // 使用useEffect处理重定向，而不是在渲染过程中
    useEffect(() => {
      // 使用setTimeout确保在渲染完成后执行
      const redirectTimer = setTimeout(() => {
        router.replace(`/${locale}/projects`);
      }, 0);
      
      return () => clearTimeout(redirectTimer);
    }, [projectsStatus, project, locale, router]);
    
    // 显示加载状态，直到重定向完成
    return (
      <div className="container px-4 py-6 flex justify-center items-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p>{t('redirecting')}</p>
        </div>
      </div>
    );
  }

  // 如果权限检查未完成，显示加载状态
  if (!permissionChecked) {
    return (
      <div className="container px-4 py-6 flex justify-center items-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p>{t('loading')}</p>
        </div>
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

  return (
    <div className="container px-4 py-6 max-h-screen overflow-y-auto">
      {/* 页面头部 */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{project?.project_name || t('projectDetails')}</h1>
        <div className="flex space-x-2">
          <Dialog open={openAgentDialog} onOpenChange={setOpenAgentDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2 px-2">
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
          value={teamsLoading ? "..." : teams.length.toString()} 
        />
        <StatsCard 
          icon={<Star className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500" />} 
          title={t('starredTeams')} 
          value={teamsLoading ? "..." : teams.filter(team => team.star).length.toString()} 
        />
        <StatsCard 
          icon={<ListTodo className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />} 
          title={t('totalTasks')} 
          value={loading ? "..." : taskCount.total.toString()} 
        />
        <StatsCard 
          icon={<Users className="h-4 w-4 sm:h-5 sm:w-5 text-purple-500" />} 
          title={t('projectMembers')} 
          value={membersLoading ? "..." : projectMembers.length.toString()} 
        />
      </div>

      {/* 主要内容区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="px-3 py-3 sm:p-6 pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base sm:text-lg">{t('projectTeams')}</CardTitle>
                <Button variant="outline" size="sm" className="h-8 text-xs sm:text-sm">
                  <Plus className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                  {t('createTeam')}
                </Button>
              </div>
            </CardHeader>
            
            {/* 状态过滤标签页 */}
            <Tabs defaultValue="ALL" className="w-full" onValueChange={setActiveStatus}>
              <div className="px-3 sm:px-6">
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

// 统计卡片组件
function StatsCard({ icon, title, value }) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-3 sm:p-4 sm:pt-6">
        <div className="flex items-center justify-between">
          <div className="mr-2">
            <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">{title}</p>
            <p className="text-lg sm:text-2xl font-bold">{value}</p>
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

  // 处理团队点击
  const handleTeamClick = (teamId) => {
    router.push(`/teams/${teamId}`);
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
    <CardContent className="px-3 pt-0 sm:px-6">
      {loading ? (
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
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
                    <p className="text-xs text-muted-foreground truncate">{team.description || t('noDescription')}</p>
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleStar(team.id, team.star);
                    }}
                    className="p-1 rounded-full hover:bg-accent/30 transition-colors ml-2"
                  >
                    {team.star ? (
                      <Star className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500 fill-yellow-500" />
                    ) : (
                      <StarOff className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                    )}
                  </button>
                </div>
                <div 
                  className="p-3 sm:p-4 bg-accent/5 cursor-pointer" 
                  onClick={() => handleTeamClick(team.id)}
                >
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">{t('members')}</p>
                      <p className="font-medium">{team.memberCount || 0}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{t('tasks')}</p>
                      <p className="font-medium">{team.taskCount || 0}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{t('created')}</p>
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

