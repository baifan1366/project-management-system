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

export default function Home({ params }) {
  // 使用React.use解包params对象
  const projectParams = use(params);
  const projectId = projectParams.id;
  
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

  // 使用Redux获取任务数据
  const dispatch = useDispatch();
  const tasks = useSelector(state => state.tasks.tasks);
  const taskStatus = useSelector(state => state.tasks.status);
  const taskError = useSelector(state => state.tasks.error);

  // 获取当前用户信息
  const [userId, setUserId] = useState(null);
  
  useEffect(() => {
    async function getCurrentUser() {
      try {
        if (user) {
          setUserId(user.id);
        }
      } catch (err) {
        console.error('Error getting current user:', err);
      }
    }
    
    getCurrentUser();
  }, [user]);

  // 获取任务数据
  useEffect(() => {
    if (userId) {
      dispatch(fetchAllTasks());
    }
  }, [dispatch, userId]);

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

  // 转换所有任务
  const displayTasks = tasks.map(transformTaskForDisplay);

  return (
    <div className="container px-4 py-6">
      {/* 页面头部 */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{t('overview')}</h1>
        <div className="flex space-x-2">
          <Dialog open={openAgentDialog} onOpenChange={setOpenAgentDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Bot size={16} />
                {t_pengy('title')}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-hidden p-0">
              <DialogTitle className="sr-only">{t_pengy('titleForProject')}</DialogTitle>
              <TaskManagerAgent userId={userId} projectId={projectId} />
            </DialogContent>
          </Dialog>
          <Button className="bg-primary text-white hover:bg-primary/90">
            <Plus className="mr-2 h-4 w-4" />
            {t('createTask')}
          </Button>
        </div>
      </div>

      {/* 统计卡片部分 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatsCard 
          icon={<ListTodo className="h-5 w-5 text-blue-500" />} 
          title={t('pendingTasks')} 
          value={loading ? "..." : taskCount.pending.toString()} 
        />
        <StatsCard 
          icon={<Clock className="h-5 w-5 text-yellow-500" />} 
          title={t('inProgressTasks')} 
          value={loading ? "..." : taskCount.inProgress.toString()} 
        />
        <StatsCard 
          icon={<Calendar className="h-5 w-5 text-green-500" />} 
          title={t('completedTasks')} 
          value={loading ? "..." : taskCount.completed.toString()} 
        />
        <StatsCard 
          icon={<BarChart2 className="h-5 w-5 text-purple-500" />} 
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
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
          </div>
          <div className="p-2 bg-background rounded-full">{icon}</div>
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
      <CardHeader>
        <CardTitle>{t('upcomingTasks')}</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        ) : recentTasks.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            {t('noTasks')}
          </div>
        ) : (
          <div className="space-y-4">
            {recentTasks.map((task) => (
              <div key={task.id} className="flex items-center p-3 bg-accent/20 rounded-lg">
                <div className={`w-2 h-2 rounded-full mr-3 ${
                  task.status === 'in_progress' ? 'bg-yellow-500' : 
                  task.status === 'done' ? 'bg-green-500' : 'bg-blue-500'
                }`}></div>
                <div className="flex-1">
                  <h4 className="text-sm font-medium">{task.title}</h4>
                  <p className="text-xs text-muted-foreground">截止日期: {task.dueDate || '无'}</p>
                </div>
                <span className={`px-2 py-1 text-xs rounded-full ${
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
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{t('allTasks')}</CardTitle>
          <Button variant="outline" size="sm">
            <Plus className="mr-2 h-4 w-4" />
            {t('addTask')}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            {t('noTasks')}
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => (
              <TaskItem key={task.id} task={task} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

