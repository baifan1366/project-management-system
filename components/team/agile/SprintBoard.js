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
  const [nameTagId, setNameTagId] = useState(null);
  
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
  
  // 修改获取agile详情的useEffect
  useEffect(() => {
    // 从URL参数或props中获取teamId和type
    const searchParams = new URLSearchParams(window.location.search);
    const teamId = searchParams.get('teamId') || sprint?.team_id;
    const type = searchParams.get('type');
        
    if (teamId) {
      // 如果有teamId，优先获取对应团队的agile
      if ((!selectedAgile || selectedAgile.team_id !== Number(teamId))) {
        // 使用teamId获取agile
        dispatch({ 
          type: 'agiles/setSelectedAgile', 
          payload: { 
            id: sprint?.id, 
            team_id: Number(teamId) 
          } 
        });
        
        if (sprint?.id) {
          dispatch(fetchSelectedTeamAgileById(sprint.id));
        }
      }
    }
  }, [sprint, dispatch, selectedAgile]);
  
  // 首先修改获取所有标签的逻辑，确保标签已加载
  useEffect(() => {    
    // 始终尝试加载标签数据
    if ((!allTags || allTags.length === 0) && tagsStatus !== 'loading') {
      dispatch(fetchAllTags());
    }
  }, [allTags, tagsStatus, dispatch]);
  
  // 新增：当标签列表加载完成后，找到Name标签的ID
  useEffect(() => {
    if (allTags && allTags.length > 0) {
      // 查找名称为"Name"或"名称"的标签
      const nameTag = allTags.find(tag => 
        tag && (tag.name === 'Name' || tag.name === '名称')
      );
      
      if (nameTag) {
        setNameTagId(nameTag.id);
      } else {
        // 尝试寻找名称中包含"name"的标签
        const nameRelatedTag = allTags.find(tag => 
          tag && tag.name && tag.name.toLowerCase().includes('name')
        );
        
        if (nameRelatedTag) {
          setNameTagId(nameRelatedTag.id);
        }
      }
    }
  }, [allTags]);
  
  // 修改获取任务ID的逻辑，使其在sprint和selectedAgileDetail都可用时工作
  useEffect(() => {
    // 优先从sprint对象获取task_ids
    const taskIdsObj = sprint?.task_ids || selectedAgileDetail?.task_ids;
    
    if (taskIdsObj && Object.keys(taskIdsObj).length > 0) {
      const allTaskIds = [];
      
      // 处理三种可能的状态
      const statusKeys = ['To Do', 'In Progress', 'Done'];
      
      statusKeys.forEach(status => {
        if (taskIdsObj[status]) {
          try {
            // 处理任务ID字符串，兼容多种格式："173, 174, 175" 或 ["173", "174", "175"]
            let idsArray = [];
            if (typeof taskIdsObj[status] === 'string') {
              idsArray = taskIdsObj[status].split(',').map(id => id.trim());
            } else if (Array.isArray(taskIdsObj[status])) {
              idsArray = taskIdsObj[status].map(id => id.toString().trim());
            }
            allTaskIds.push(...idsArray);
          } catch (error) {
            console.error(`解析${status}任务ID出错:`, error);
          }
        }
      });
      
      // 去重并过滤空值
      const uniqueTaskIds = [...new Set(allTaskIds)].filter(id => id && id !== '');
      
      // 获取每个任务的详情
      uniqueTaskIds.forEach(taskId => {
        if (taskId && !sprintTasks.some(task => task.id === Number(taskId))) {
          dispatch(fetchTaskById(taskId));
        }
      });
    }
  }, [sprint, selectedAgileDetail, sprintTasks, dispatch]);
  
  // 获取任务名称
  const getTaskName = (task) => {
    if (!task) return '未命名任务';
        
    // 检查是否有标签数据
    if (!allTags || !Array.isArray(allTags) || allTags.length === 0) {
      return task.title || '未命名任务';
    }
    
    // 检查任务是否有tag_values
    if (!task.tag_values) {
      return task.title || '未命名任务';
    }
        
    try {
      // 查找名为"Name"或"名称"的标签
      const nameTag = allTags.find(tag => 
        tag && (tag.name === 'Name' || tag.name === '名称')
      );
      
      if (nameTag && nameTag.id && task.tag_values[nameTag.id]) {
        const nameValue = task.tag_values[nameTag.id];
        return nameValue;
      }
      
      // 查找名称中包含"name"的任何标签
      for (let tag of allTags) {
        if (tag && tag.name && tag.name.toLowerCase().includes('name')) {
          if (task.tag_values[tag.id]) {
            const nameValue = task.tag_values[tag.id];
            return nameValue;
          }
        }
      }
      
      // 直接查找tag_values中的值
      for (const tagId in task.tag_values) {
        const value = task.tag_values[tagId];
        if (value && typeof value === 'string') {
          const tag = allTags.find(t => t && t.id && t.id.toString() === tagId.toString());
          const tagName = tag ? tag.name : '未知标签';
          return value;
        }
      }
      
      return task.title || '未命名任务';
    } catch (error) {
      console.error(`获取任务 ${task.id} 名称时发生错误:`, error);
      return task.title || '未命名任务';
    }
  };
  
  // 修改按状态分类任务的逻辑
  useEffect(() => {
    // 优先从sprint对象获取task_ids
    const taskIds = sprint?.task_ids || selectedAgileDetail?.task_ids;
    
    if (taskIds) {
      
      const newTasksByStatus = {
        todo: [],
        in_progress: [],
        done: []
      };
      
      // 解析任务ID的通用函数
      const parseTaskIds = (idString) => {
        try {
          if (typeof idString === 'string') {
            return idString.split(',').map(id => Number(id.trim()));
          } else if (Array.isArray(idString)) {
            return idString.map(id => Number(id.toString().trim()));
          }
          return [];
        } catch (e) {
          console.error("解析任务ID出错:", e);
          return [];
        }
      };
      
      // 对于每个状态，找到对应的任务
      if (taskIds['To Do']) {
        const todoIds = parseTaskIds(taskIds['To Do']);
        newTasksByStatus.todo = sprintTasks.filter(task => todoIds.includes(task.id));
      }
      
      if (taskIds['In Progress']) {
        const inProgressIds = parseTaskIds(taskIds['In Progress']);
        newTasksByStatus.in_progress = sprintTasks.filter(task => inProgressIds.includes(task.id));
      }
      
      if (taskIds['Done']) {
        const doneIds = parseTaskIds(taskIds['Done']);
        newTasksByStatus.done = sprintTasks.filter(task => doneIds.includes(task.id));
      }
      
      setTasksByStatus(newTasksByStatus);
    }
  }, [sprintTasks, selectedAgileDetail, sprint]);
  
  // 修改任务状态更新逻辑
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
      
      if (!response.ok) {
        const errorData = await response.text();
        console.error("API错误:", errorData);
        throw new Error('更新任务状态失败');
      }
      
      const updatedTask = await response.json();
      
      // 更新本地状态
      const updatedTasks = sprintTasks.map(t => 
        t.id === taskId ? { ...t, status: newStatus } : t
      );
            
      // 从原列表中移除任务
      const prevStatus = tasksByStatus.todo.find(t => t.id === taskId) 
        ? 'todo' 
        : tasksByStatus.in_progress.find(t => t.id === taskId)
          ? 'in_progress'
          : 'done';
            
      // 创建新的任务状态分类
      const newTasksByStatus = {
        todo: tasksByStatus.todo.filter(t => t.id !== taskId),
        in_progress: tasksByStatus.in_progress.filter(t => t.id !== taskId),
        done: tasksByStatus.done.filter(t => t.id !== taskId)
      };
      
      // 将任务添加到新状态
      const taskToUpdate = sprintTasks.find(t => t.id === taskId);
      if (taskToUpdate) {
        const updatedTaskObj = { ...taskToUpdate, status: newStatus };
        
        if (newStatus === 'todo') {
          newTasksByStatus.todo.push(updatedTaskObj);
        } else if (newStatus === 'in_progress') {
          newTasksByStatus.in_progress.push(updatedTaskObj);
        } else if (newStatus === 'done') {
          newTasksByStatus.done.push(updatedTaskObj);
        }
      }
      
      setTasksByStatus(newTasksByStatus);
      
      toast.success(t('taskStatusUpdated'));
    } catch (error) {
      console.error('更新任务状态失败:', error);
      toast.error(t('taskStatusUpdateError'));
    } finally {
      setLoading(false);
    }
  };
  
  // 监听sprintTasks变化并更新页面
  useEffect(() => {
    if (sprintTasks.length > 0) {
      // 检查有没有新任务需要加入到tasksByStatus中
      const currentTaskIds = [
        ...tasksByStatus.todo.map(t => t.id),
        ...tasksByStatus.in_progress.map(t => t.id),
        ...tasksByStatus.done.map(t => t.id)
      ];
      
      const newTasks = sprintTasks.filter(task => !currentTaskIds.includes(task.id));
      
      if (newTasks.length > 0) {
        
        // 将新任务加入到对应的状态分组
        const updatedTasksByStatus = { ...tasksByStatus };
        
        newTasks.forEach(task => {
          if (task.status === 'todo') {
            updatedTasksByStatus.todo.push(task);
          } else if (task.status === 'in_progress') {
            updatedTasksByStatus.in_progress.push(task);
          } else if (task.status === 'done') {
            updatedTasksByStatus.done.push(task);
          }
        });
        
        setTasksByStatus(updatedTasksByStatus);
      }
    }
  }, [sprintTasks]);
  
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
    if (!task) {
      console.error("尝试渲染无效任务");
      return null;
    }
    
    try {
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
                : task.description || '无描述'}
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
    } catch (error) {
      console.error("渲染任务卡片错误:", task?.id, error);
      return (
        <div className="p-3 mb-2 bg-red-50 rounded-md shadow-sm border border-red-200">
          <div className="font-medium text-red-700">任务渲染错误 ID: {task?.id}</div>
        </div>
      );
    }
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
        </CardTitle>
      </CardHeader>
      
      <CardContent>        
        {hasError && (
          <div className="p-4 mb-4 bg-red-50 text-red-800 rounded-md flex items-center">
            <AlertCircle className="w-5 h-5 mr-2" />
            <span>{t('errorLoadingData')}</span>
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 待处理列 */}
          <div className="bg-background p-2 rounded-md">
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
          <div className="bg-background p-2 rounded-md">
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
          <div className="bg-background p-2 rounded-md">
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