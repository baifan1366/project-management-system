"use client";

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useDispatch, useSelector } from 'react-redux';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Clock, ArrowRight, CheckCircle, AlertCircle } from 'lucide-react';
import React from 'react';
import { 
  fetchSelectedTeamAgileById, 
  fetchTaskById, 
  fetchAllTags 
} from '@/lib/redux/features/agileSlice';

const TASK_STATUS = {
  'todo': '待处理',
  'in_progress': '进行中',
  'done': '已完成'
};

const SprintBoard = ({ sprint, agileMembers = [] }) => {
  const t = useTranslations('Agile');
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const [tasksByStatus, setTasksByStatus] = useState({
    todo: [],
    in_progress: [],
    done: []
  });
  
  // 从Redux获取状态
  const { 
    selectedAgile, 
    selectedAgileDetail, 
    selectedAgileDetailStatus, 
    sprintTasks, 
    sprintTasksStatus,
    allTags,
    tagsStatus
  } = useSelector(state => state.agiles);
  
  // 获取当前选中的冲刺详情
  useEffect(() => {
    if (selectedAgile?.id && (!selectedAgileDetail || selectedAgileDetail.id !== selectedAgile.id)) {
      dispatch(fetchSelectedTeamAgileById(selectedAgile.id));
    }
  }, [selectedAgile, selectedAgileDetail, dispatch]);
  
  // 获取所有标签
  useEffect(() => {
    if (tagsStatus === 'idle') {
      dispatch(fetchAllTags());
    }
  }, [tagsStatus, dispatch]);
  
  // 根据task_ids获取任务详情
  useEffect(() => {
    if (selectedAgileDetail?.task_ids && Object.keys(selectedAgileDetail.task_ids).length > 0) {
      // 将task_ids从对象转换为数组
      const taskIdsObj = selectedAgileDetail.task_ids;
      const allTaskIds = [];
      
      // 提取所有状态下的任务ID
      Object.keys(taskIdsObj).forEach(status => {
        if (taskIdsObj[status]) {
          // 处理任务ID字符串，可能的格式："173, 174, 175"
          const idsArray = taskIdsObj[status].split(',').map(id => id.trim());
          allTaskIds.push(...idsArray);
        }
      });
      
      // 获取每个任务的详情
      allTaskIds.forEach(taskId => {
        if (taskId && !sprintTasks.some(task => task.id === Number(taskId))) {
          dispatch(fetchTaskById(taskId));
        }
      });
    }
  }, [selectedAgileDetail, sprintTasks, dispatch]);
  
  // 获取任务名称
  const getTaskName = (task) => {
    if (!task || !task.tag_values || !allTags || allTags.length === 0) {
      return task?.title || '未命名任务';
    }
    
    // 查找名称标签ID
    const nameTag = allTags.find(tag => tag.name === 'Name' || tag.name === '名称');
    if (!nameTag) return task.title || '未命名任务';
    
    // 获取任务名称
    const nameValue = task.tag_values[nameTag.id];
    if (nameValue) {
      return nameValue;
    }
    
    return task.title || '未命名任务';
  };
  
  // 任务处理
  useEffect(() => {
    if (sprintTasks.length > 0 && selectedAgileDetail?.task_ids) {
      const taskIds = selectedAgileDetail.task_ids;
      const newTasksByStatus = {
        todo: [],
        in_progress: [],
        done: []
      };
      
      // 对于每个状态，找到对应的任务
      if (taskIds['To Do']) {
        const todoIds = taskIds['To Do'].split(',').map(id => Number(id.trim()));
        newTasksByStatus.todo = sprintTasks.filter(task => todoIds.includes(task.id));
      }
      
      if (taskIds['In Progress']) {
        const inProgressIds = taskIds['In Progress'].split(',').map(id => Number(id.trim()));
        newTasksByStatus.in_progress = sprintTasks.filter(task => inProgressIds.includes(task.id));
      }
      
      if (taskIds['Done']) {
        const doneIds = taskIds['Done'].split(',').map(id => Number(id.trim()));
        newTasksByStatus.done = sprintTasks.filter(task => doneIds.includes(task.id));
      }
      
      setTasksByStatus(newTasksByStatus);
    }
  }, [sprintTasks, selectedAgileDetail]);
  
  // 更新任务状态
  const updateTaskStatus = async (taskId, newStatus) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          status: newStatus 
        }),
      });
      
      if (!response.ok) throw new Error('更新任务状态失败');
      
      // 更新本地状态
      const updatedTask = sprintTasks.find(t => t.id === taskId);
      if (updatedTask) {
        const updatedTasks = sprintTasks.map(t => 
          t.id === taskId ? { ...t, status: newStatus } : t
        );
        
        const newTasksByStatus = {
          todo: updatedTasks.filter(task => task.status === 'todo'),
          in_progress: updatedTasks.filter(task => task.status === 'in_progress'),
          done: updatedTasks.filter(task => task.status === 'done')
        };
        
        setTasksByStatus(newTasksByStatus);
      }
      
      toast.success(t('taskStatusUpdated'));
    } catch (error) {
      console.error('更新任务状态失败:', error);
      toast.error(t('taskStatusUpdateError'));
    } finally {
      setLoading(false);
    }
  };
  
  // 更新任务分配
  const updateTaskAssignee = async (taskId, userId) => {
    try {
      setLoading(true);
      
      // 如果值是"none"，将其转换为null或空值
      const assigneeValue = userId === 'none' ? null : userId;
      
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          assignee: assigneeValue
        }),
      });
      
      if (!response.ok) throw new Error('更新任务分配失败');
      
      // 更新本地状态
      const updatedTasks = sprintTasks.map(t => 
        t.id === taskId ? { ...t, assignee: assigneeValue } : t
      );
      
      const newTasksByStatus = {
        todo: updatedTasks.filter(task => task.status === 'todo'),
        in_progress: updatedTasks.filter(task => task.status === 'in_progress'),
        done: updatedTasks.filter(task => task.status === 'done')
      };
      
      setTasksByStatus(newTasksByStatus);
      toast.success(t('taskAssigneeUpdated'));
    } catch (error) {
      console.error('更新任务分配失败:', error);
      toast.error(t('taskAssigneeUpdateError'));
    } finally {
      setLoading(false);
    }
  };
  
  // 获取成员信息
  const getMemberInfo = (userId) => {
    if (!userId) return null;
    return agileMembers.find(member => member.user_id === userId || member.id === userId);
  };
  
  // 优先级标签颜色
  const priorityColor = (priority) => {
    switch(priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };
  
  // 渲染任务卡片
  const renderTaskCard = (task) => {
    const memberInfo = getMemberInfo(task.assignee);
    const taskName = getTaskName(task);
    
    return (
      <div key={task.id} className="p-3 mb-2 bg-white rounded-md shadow-sm border">
        <div className="font-medium">{taskName}</div>
        
        <div className="flex items-center justify-between mt-2">
          <Badge className={`${priorityColor(task.priority)} text-xs`}>
            {task.priority || '无优先级'}
          </Badge>
          
          <div className="flex items-center text-xs text-gray-500">
            <Clock className="w-3 h-3 mr-1" />
            <span>{task.estimate || '-'}</span>
          </div>
        </div>
        
        <div className="mt-2">
          <div className="text-sm text-gray-600">
            {task.description?.length > 80 
              ? `${task.description.substring(0, 80)}...` 
              : task.description}
          </div>
          
          <div className="mt-2 flex justify-between items-center">
            <Select 
              value={task.assignee || 'none'} 
              onValueChange={(value) => updateTaskAssignee(task.id, value)}
              disabled={loading}
            >
              <SelectTrigger className="w-full h-8 text-xs">
                <SelectValue placeholder={t('assignTo')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t('unassigned')}</SelectItem>
                {agileMembers.map(member => (
                  <SelectItem key={member.user_id || member.id} value={member.user_id || member.id}>
                    {member.name || member.user_id || member.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {memberInfo && (
              <Avatar className="w-6 h-6">
                <AvatarImage src={memberInfo.avatar} />
                <AvatarFallback>{memberInfo.name?.charAt(0) || 'U'}</AvatarFallback>
              </Avatar>
            )}
          </div>
        </div>
        
        {/* 状态操作按钮 */}
        <div className="mt-3 flex justify-end space-x-2">
          {task.status === 'todo' && (
            <Button 
              size="sm" 
              variant="outline" 
              className="text-xs" 
              onClick={() => updateTaskStatus(task.id, 'in_progress')}
              disabled={loading}
            >
              <ArrowRight className="w-3 h-3 mr-1" />
              {t('moveToProgress')}
            </Button>
          )}
          
          {task.status === 'in_progress' && (
            <Button 
              size="sm" 
              variant="outline" 
              className="text-xs" 
              onClick={() => updateTaskStatus(task.id, 'done')}
              disabled={loading}
            >
              <CheckCircle className="w-3 h-3 mr-1" />
              {t('markAsDone')}
            </Button>
          )}
        </div>
      </div>
    );
  };

  // 加载状态显示
  const isLoading = selectedAgileDetailStatus === 'loading' || sprintTasksStatus === 'loading' || tagsStatus === 'loading';
  
  // 错误状态
  const hasError = selectedAgileDetailStatus === 'failed' || sprintTasksStatus === 'failed' || tagsStatus === 'failed';

  return (
    <Card className="">
      <CardHeader>
        <CardTitle>
          {t('sprintBoard')}
          {selectedAgile && ` - ${selectedAgile.name}`}
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        {(loading || isLoading) && (
          <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-10">
            <p>{t('updating')}</p>
          </div>
        )}
        
        {hasError && (
          <div className="p-4 mb-4 bg-red-50 text-red-800 rounded-md flex items-center">
            <AlertCircle className="w-5 h-5 mr-2" />
            <span>{t('errorLoadingData')}</span>
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 待处理列 */}
          <div className="bg-gray-50 p-2 rounded-md">
            <h3 className="font-medium p-2 text-center border-b mb-2">
              {t('todo')} ({tasksByStatus.todo.length})
            </h3>
            <div className="min-h-[300px]">
              {tasksByStatus.todo.map(task => (
                <React.Fragment key={task.id}>
                  {renderTaskCard(task)}
                </React.Fragment>
              ))}
            </div>
          </div>
          
          {/* 进行中列 */}
          <div className="bg-gray-50 p-2 rounded-md">
            <h3 className="font-medium p-2 text-center border-b mb-2">
              {t('inProgress')} ({tasksByStatus.in_progress.length})
            </h3>
            <div className="min-h-[300px]">
              {tasksByStatus.in_progress.map(task => (
                <React.Fragment key={task.id}>
                  {renderTaskCard(task)}
                </React.Fragment>
              ))}
            </div>
          </div>
          
          {/* 已完成列 */}
          <div className="bg-gray-50 p-2 rounded-md">
            <h3 className="font-medium p-2 text-center border-b mb-2">
              {t('done')} ({tasksByStatus.done.length})
            </h3>
            <div className="min-h-[300px]">
              {tasksByStatus.done.map(task => (
                <React.Fragment key={task.id}>
                  {renderTaskCard(task)}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SprintBoard; 