'use client';

import { useState, useEffect } from 'react';
import { use } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Plus, ListTodo, Calendar, BarChart2, Clock, Bot } from 'lucide-react';
import TaskItem from '@/components/TaskItem';
import ActivityLog from '@/components/ActivityLog';
import { useTranslations } from 'use-intl';
import { useDispatch, useSelector } from 'react-redux';
import { fetchAllTasks } from '@/lib/redux/features/taskSlice';
import { useGetUser } from '@/lib/hooks/useGetUser';
import TaskManagerAgent from '@/components/ui/TaskManagerAgent';
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from '@/components/ui/dialog';
import { useRouter } from 'next/navigation';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction } from '@/components/ui/alert-dialog';

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
  const [activeTab, setActiveTab] = useState('overview');
  const [taskCount, setTaskCount] = useState({
    pending: 0,
    inProgress: 0,
    completed: 0,
    total: 0
  });
  const [loading, setLoading] = useState(true);
  const [openAgentDialog, setOpenAgentDialog] = useState(false);
  const { user } = useGetUser();
  const router = useRouter();
  const [showPermissionDialog, setShowPermissionDialog] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [permissionChecked, setPermissionChecked] = useState(false);
  const [showArchivedDialog, setShowArchivedDialog] = useState(false);

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

  // 获取任务属性
  const getTaskProperty = (task, property) => {
    const tagValues = task.tag_values || {};
    return tagValues[property] || '';
  };

  // 转换任务为显示格式
  const transformTaskForDisplay = (task) => {
    return {
      id: task.id,
      title: getTaskProperty(task, 'title') || '无标题任务',
      description: getTaskProperty(task, 'description') || '',
      dueDate: getTaskProperty(task, 'due_date') || '',
      priority: getTaskProperty(task, 'priority')?.toLowerCase() || 'medium',
      status: getTaskProperty(task, 'status')?.toLowerCase() || 'pending',
      assignee: {
        id: getTaskProperty(task, 'assignee_id') || '',
        name: getTaskProperty(task, 'assignee_name') || '未分配',
        avatar: getTaskProperty(task, 'assignee_name') ? getTaskProperty(task, 'assignee_name').substring(0, 2).toUpperCase() : '?'
      },
      comments: task.comments || 0
    };
  };

  // 立即检查项目是否存在
  if (projectsStatus === 'succeeded' && !project) {
    // 如果项目加载完成但不存在，立即重定向
    router.replace(`/${locale}/projects`);
    
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

  // 转换所有任务
  const displayTasks = tasks.map(transformTaskForDisplay);

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
        <h1 className="text-2xl font-bold">{t('overview')}</h1>
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
          <Button 
            variant={themeColor}
            size="icon"
          >
            <Plus size={20} />
          </Button>
        </div>
      </div>

      {/* 统计卡片部分 */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 mb-6">
        <StatsCard 
          icon={<ListTodo className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />} 
          title={t('pendingTasks')}
          value={loading ? "..." : taskCount.pending.toString()} 
        />
        <StatsCard 
          icon={<Clock className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500" />} 
          title={t('inProgressTasks')} 
          value={loading ? "..." : taskCount.inProgress.toString()} 
        />
        <StatsCard 
          icon={<Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />} 
          title={t('completedTasks')} 
          value={loading ? "..." : taskCount.completed.toString()} 
        />
        <StatsCard 
          icon={<BarChart2 className="h-4 w-4 sm:h-5 sm:w-5 text-purple-500" />} 
          title={t('completionRate')} 
          value={loading ? "..." : `${taskCount.total > 0 ? Math.round((taskCount.completed / taskCount.total) * 100) : 0}%`} 
        />
      </div>

      {/* 标签页区域 */}
      <Tabs defaultValue="overview" className="w-full" onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="overview">{t('overview')}</TabsTrigger>
          <TabsTrigger value="tasks">{t('tasks')}</TabsTrigger>
          <TabsTrigger value="timeline">{t('timeline')}</TabsTrigger>
          <TabsTrigger value="files">{t('files')}</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <TasksOverview tasks={displayTasks} loading={loading} />
            </div>
            <div className="lg:col-span-1">
              <ActivityLog />
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="tasks">
          <TasksList tasks={displayTasks} loading={loading} />
        </TabsContent>
        
        <TabsContent value="timeline">
          <div className="h-96 flex items-center justify-center bg-accent/20 rounded-lg">
            <p className="text-muted-foreground">{t('timeline')}</p>
          </div>
        </TabsContent>
        
        <TabsContent value="files">
          <div className="h-96 flex items-center justify-center bg-accent/20 rounded-lg">
            <p className="text-muted-foreground">{t('files')}</p>
          </div>
        </TabsContent>
      </Tabs>
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

// 任务概览组件
function TasksOverview({ tasks, loading }) {
  const t = useTranslations('Projects');
  
  // 获取最近的任务（按截止日期排序）
  const recentTasks = loading ? [] : [...tasks]
    .filter(task => task.status !== 'done')
    .sort((a, b) => {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate) - new Date(b.dueDate);
    })
    .slice(0, 3);

  return (
    <Card className="h-full">
      <CardHeader className="px-3 py-3 sm:p-6">
        <CardTitle className="text-base sm:text-lg">{t('upcomingTasks')}</CardTitle>
      </CardHeader>
      <CardContent className="px-3 pt-0 sm:px-6">
        {loading ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        ) : recentTasks.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            {t('noTasks')}
          </div>
        ) : (
          <div className="space-y-2 sm:space-y-4">
            {recentTasks.map((task) => (
              <div key={task.id} className="flex items-center p-2 sm:p-3 bg-accent/20 rounded-lg">
                <div className={`w-2 h-2 rounded-full mr-2 sm:mr-3 ${
                  task.status === 'in_progress' ? 'bg-yellow-500' : 
                  task.status === 'done' ? 'bg-green-500' : 'bg-blue-500'
                }`}></div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs sm:text-sm font-medium truncate">{task.title}</h4>
                  <p className="text-xs text-muted-foreground truncate">截止日期: {task.dueDate || '无'}</p>
                </div>
                <span className={`ml-2 px-1.5 py-0.5 sm:px-2 sm:py-1 text-xs rounded-full flex-shrink-0 ${
                  task.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' : 
                  task.status === 'done' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                }`}>
                  {task.status === 'in_progress' ? '进行中' : 
                   task.status === 'done' ? '已完成' : '待处理'}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// 任务列表组件
function TasksList({ tasks, loading }) {
  const t = useTranslations('Projects');
  return (
    <Card>
      <CardHeader className="px-3 py-3 sm:p-6">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base sm:text-lg">{t('allTasks')}</CardTitle>
          <Button variant="outline" size="sm" className="h-8 text-xs sm:text-sm">
            <Plus className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
            {t('addTask')}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-3 pt-0 sm:px-6">
        {loading ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            {t('noTasks')}
          </div>
        ) : (
          <div className="space-y-2 sm:space-y-3">
            {tasks.map((task) => (
              <TaskItem key={task.id} task={task} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

