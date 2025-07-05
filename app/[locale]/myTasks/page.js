'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { 
  Clock, Calendar, PlusCircle, Filter, 
  Search, CheckCircle, Circle, Info
} from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import useGetUser from '@/lib/hooks/useGetUser';
import useTaskContext from '@/hooks/useTaskContext';
import React from 'react';
import { supabase } from '@/lib/supabase';
import NewTaskDialog from '@/components/myTasks/NewTaskDialog';
import TaskDetailsDialog from '@/components/myTasks/TaskDetailsDialog';
import EditTaskDialog from '@/components/myTasks/EditTaskDialog';

// 简单的日期格式化函数
const formatDate = (dateString) => {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    console.error('Date formatting error:', error);
    return dateString;
  }
};

// 任务看板视图组件
export default function MyTasksPage() {
  const t_tasks = useTranslations('myTasks');
  const t_common = useTranslations('common');
  const [tasks, setTasks] = useState([]);
  const [myTasks, setMyTasks] = useState([]);
  const [columns, setColumns] = useState({
    todo: { id: 'todo', title: '', tasks: [] },
    in_progress: { id: 'in_progress', title: '', tasks: [] },
    in_review: { id: 'in_review', title: '', tasks: [] },
    done: { id: 'done', title: '', tasks: [] }
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [selectedType, setSelectedType] = useState('upcoming');
  const [showReferenceTasks, setShowReferenceTasks] = useState(true);
  const [selectedPriority, setSelectedPriority] = useState('all');
  const { user } = useGetUser();
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [showNewTaskDialog, setShowNewTaskDialog] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showTaskDetailsDialog, setShowTaskDetailsDialog] = useState(false);
  const [showEditTaskDialog, setShowEditTaskDialog] = useState(false);
  const [hoveredTaskId, setHoveredTaskId] = useState(null);
  const [updatingTaskIds, setUpdatingTaskIds] = useState([]);
  
  // Use our custom hook for task context
  const { 
    taskContextMap: taskContextData, 
    isLoading: isLoadingContext, 
    fetchTaskContext 
  } = useTaskContext();

  // 根据字段名找到对应的数字键
  const getKeyForField = React.useCallback((fieldName, tagValues) => {
    // 通过分析示例数据，推断数字键与字段的映射关系
    const fieldKeyMap = {
      'title': 1,        // 1 对应标题/描述
      'description': 2,  // 2 可能是额外描述
      'due_date': 3,     // 3 对应日期
      'priority': 4,     // 4 对应优先级
      'status': 12,      // 12 对应状态
      'assignee_id': 5,  // 假设5对应assignee_id
      'project_id': 6,   // 假设6对应project_id
    };
    
    // 首先检查是否有这个映射
    const mappedKey = fieldKeyMap[fieldName];
    if (mappedKey !== undefined) {
      return mappedKey;
    }
    
    // 如果没有预定义映射，尝试在tag_values中查找这个值
    // 这是为了处理可能的不同数据结构
    if (tagValues && typeof tagValues === 'object') {
      // 检查是否有直接匹配的键
      if (fieldName in tagValues) {
        return fieldName;
      }
      
      // 检查是否有键的值匹配我们要找的字段
      for (const [key, value] of Object.entries(tagValues)) {
        if (value === fieldName) {
          return key;
        }
      }
    }
    
    return null;
  }, []);
  // 获取任务的标题
  const getTaskTitle = React.useCallback((task) => {
    if (task.title) return task.title;
    if (!task?.tag_values) return null;
    const titleKey = getKeyForField('title', task.tag_values);
    return titleKey ? task.tag_values[titleKey] : null;
  }, [getKeyForField]);
  
  // 获取任务的描述
  const getTaskDescription = React.useCallback((task) => {
    if (task.description) return task.description;
    if (!task?.tag_values) return null;
    const descKey = getKeyForField('description', task.tag_values);
    return descKey ? task.tag_values[descKey] : null;
  }, [getKeyForField]);
  
  // 获取任务的优先级
  const getTaskPriority = React.useCallback((task) => {
    // First check if priority exists directly on the task
    if (task.priority) return task.priority;
    
    // Then fall back to checking tag_values
    if (!task?.tag_values) return null;
    const priorityKey = getKeyForField('priority', task.tag_values);
    return priorityKey ? task.tag_values[priorityKey] : null;
  }, [getKeyForField]);
  
  // 获取任务的项目ID
  const getTaskProjectId = React.useCallback((task) => {
    if (!task?.tag_values) return null;
    const projectKey = getKeyForField('project_id', task.tag_values);
    return projectKey ? task.tag_values[projectKey] : null;
  }, [getKeyForField]);
  
  // 从列ID获取对应的任务状态
  const getStatusFromColumnId = React.useCallback((columnId) => {
    const statusMap = {
      'todo': 'TODO',
      'in_progress': 'IN_PROGRESS',
      'in_review': 'IN_REVIEW',
      'done': 'DONE'
    };
    return statusMap[columnId];
  }, []);

  // 使用Supabase获取用户任务数据
  const fetchMyTasks = async (userId, skipGlobalLoading = false) => {
    try {
      // Only show global loading if not updating specific tasks and not explicitly skipping
      if (updatingTaskIds.length === 0 && !skipGlobalLoading) {
        setStatus('loading');
      }
      
      // 获取mytasks表中的当前用户的任务
      const { data: userMyTasks, error: myTasksError } = await supabase
        .from('mytasks')
        .select('*')
        .eq('user_id', userId);
      
      if (myTasksError) throw myTasksError;
      
      // 准备合并的任务列表
      let combinedTasks = [];
      
      // 处理有关联task_id的任务
      const tasksWithReference = userMyTasks.filter(mt => mt.task_id !== null);
      const standaloneMyTasks = userMyTasks.filter(mt => mt.task_id === null);
      
      // 获取关联的任务详情
      if (tasksWithReference.length > 0) {
        const taskIds = tasksWithReference.map(mt => mt.task_id);
        
        const { data: taskDetails, error: taskError } = await supabase
          .from('task')
          .select('*')
          .in('id', taskIds);
          
        if (taskError) throw taskError;
        
        // 合并关联的任务
        const linkedTasks = taskDetails.map(task => {
          const myTask = tasksWithReference.find(mt => mt.task_id === task.id);
          return {
            ...task,
            my_task_id: myTask.id,
            task_id: task.id, // Ensure task_id is explicitly available for reference display
            status: myTask.status,
            priority: myTask.priority,
            title: myTask.title || getTaskTitle(task),
            description: myTask.description || getTaskDescription(task),
            expected_completion_date: myTask.expected_completion_date,
            expected_start_time: myTask.expected_start_time,
            is_standalone: false
          };
        });
        
        combinedTasks = [...linkedTasks];
      }
      
      // 添加独立任务（没有关联task_id的mytasks记录）
      const standaloneTasks = standaloneMyTasks.map(myTask => ({
        id: `local-${myTask.id}`,
        my_task_id: myTask.id,
        tag_values: {},
        status: myTask.status || 'TODO',
        priority: myTask.priority || 'MEDIUM',
        title: myTask.title || t_tasks('noTitle'),
        description: myTask.description || '',
        expected_completion_date: myTask.expected_completion_date,
        expected_start_time: myTask.expected_start_time,
        is_standalone: true
      }));
      
      // 合并所有任务
      combinedTasks = [...combinedTasks, ...standaloneTasks];
      
      
      setTasks(combinedTasks);
      setMyTasks(userMyTasks);
      setFilteredTasks(combinedTasks);
      setStatus('succeeded');
    } catch (err) {
      console.error('Error fetching tasks:', err);
      setStatus('failed');
      setError(err.message);
    }
  };
  
  // 使用Supabase更新任务状态
  const updateTaskStatus = async (taskId, newStatus) => {
    try {
      // Add task to the updating list
      setUpdatingTaskIds(prev => [...prev, taskId]);
      
      // Check if this is a standalone task (with local- prefix)
      if (String(taskId).startsWith('local-')) {
        // Extract the actual mytasks ID from the local ID (remove the "local-" prefix)
        const myTaskId = String(taskId).replace('local-', '');
        
        // Update the standalone mytasks record directly
        const { error } = await supabase
          .from('mytasks')
          .update({ 
            status: newStatus,
            updated_at: new Date().toISOString()
          })
          .eq('id', myTaskId);
          
        if (error) throw error;
      } else {
        // This is a regular task with a valid task_id reference
        const myTask = myTasks.find(mt => mt.task_id === taskId);
        
        if (myTask) {
          // 更新现有记录
          const { error } = await supabase
            .from('mytasks')
            .update({ 
              status: newStatus,
              updated_at: new Date().toISOString()
            })
            .eq('id', myTask.id);
            
          if (error) throw error;
        } else {
          // 任务不存在于mytasks表，创建新记录
          const { error } = await supabase
            .from('mytasks')
            .insert({
              task_id: taskId,
              user_id: user.id,
              status: newStatus
            });
            
          if (error) throw error;
        }
      }
      
      // 重新获取更新后的数据 - use skipGlobalLoading to avoid global loading state
      await fetchMyTasks(user.id, true);
      
      // Remove task from the updating list after fetching completes
      setUpdatingTaskIds(prev => prev.filter(id => id !== taskId));
    } catch (err) {
      console.error('Error updating task status:', err);
      // Remove task from updating list on error
      setUpdatingTaskIds(prev => prev.filter(id => id !== taskId));
      // 显示错误通知或处理错误
    }
  };

  // 使用Supabase更新任务优先级
  const updateTaskPriority = async (taskId, newPriority) => {
    try {
      // Add task to the updating list
      setUpdatingTaskIds(prev => [...prev, taskId]);
      
      // Check if this is a standalone task (with local- prefix)
      if (String(taskId).startsWith('local-')) {
        // Extract the actual mytasks ID from the local ID (remove the "local-" prefix)
        const myTaskId = String(taskId).replace('local-', '');
        
        // Update the standalone mytasks record directly
        const { error } = await supabase
          .from('mytasks')
          .update({ 
            priority: newPriority,
            updated_at: new Date().toISOString()
          })
          .eq('id', myTaskId);
          
        if (error) throw error;
      } else {
        // This is a regular task with a valid task_id reference
        const myTask = myTasks.find(mt => mt.task_id === taskId);
        
        if (myTask) {
          // 更新现有记录
          const { error } = await supabase
            .from('mytasks')
            .update({ 
              priority: newPriority,
              updated_at: new Date().toISOString()
            })
            .eq('id', myTask.id);
            
          if (error) throw error;
        } else {
          // 任务不存在于mytasks表，创建新记录
          const { error } = await supabase
            .from('mytasks')
            .insert({
              task_id: taskId,
              user_id: user.id,
              priority: newPriority
            });
            
          if (error) throw error;
        }
      }
      
      // 重新获取更新后的数据 - use skipGlobalLoading to avoid full page reload
      await fetchMyTasks(user.id, true);
      
      // Remove task from the updating list after fetching completes
      setUpdatingTaskIds(prev => prev.filter(id => id !== taskId));
    } catch (err) {
      console.error('Error updating task priority:', err);
      // Remove task from updating list on error
      setUpdatingTaskIds(prev => prev.filter(id => id !== taskId));
      // 显示错误通知或处理错误
    }
  };

  // 获取所有任务
  useEffect(() => {
    if (user) {
      fetchMyTasks(user.id);
    }
  }, [user]);

  // 应用所有过滤器（搜索 + 边栏过滤器）
  useEffect(() => {
    if (!tasks || tasks.length === 0) return;
    
    // 应用所有过滤器
    let filtered = [...tasks];
    
    // 应用搜索过滤
    if (searchQuery) {
      filtered = filtered.filter(task => 
        (task.title && typeof task.title === 'string' && task.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (task.description && typeof task.description === 'string' && task.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (task.tag_values && 
          Object.values(task.tag_values).some(value => 
            value && value.toString().toLowerCase().includes(searchQuery.toLowerCase())
          ))
      );
    }
    
    // 按类型过滤（基于任务截止日期）
    if (selectedType !== 'upcoming') {
      const now = new Date(); // 当前时间，包含小时和分钟
      const today = new Date();
      today.setHours(0, 0, 0, 0); // 今天的开始时间
      
      filtered = filtered.filter(task => {
        const dueDate = task.expected_completion_date
          ? new Date(task.expected_completion_date)
          : null;
          
        switch (selectedType) {
          case 'pastDue':
            return dueDate && dueDate < now; // 使用当前时间而不是今天的开始时间
          case 'today':
            return dueDate && dueDate.toDateString() === today.toDateString();
          case 'noDate':
            return !dueDate;
          default:
            return true;
        }
      });
    }
    
    // 按是否显示引用任务过滤
    if (!showReferenceTasks) {
      filtered = filtered.filter(task => task.is_standalone);
    }
    
    // 按优先级过滤
    if (selectedPriority !== 'all') {
      filtered = filtered.filter(task => {
        const priority = getTaskPriority(task) || task.priority || 'LOW';
        return priority === selectedPriority;
      });
    }
    
    // 设置筛选后的任务
    setFilteredTasks(filtered);
  }, [tasks, searchQuery, selectedType, showReferenceTasks, selectedPriority, getTaskPriority]);

  // 任务数据处理和分列
  useEffect(() => {
    if (filteredTasks && filteredTasks.length > 0) {
      // 根据状态将任务分组到不同列
      const newColumns = {
        todo: {
          id: 'todo',
          title: t_tasks('status.todo'),
          tasks: filteredTasks.filter(task => task.status === 'TODO')
        },
        in_progress: {
          id: 'in_progress',
          title: t_tasks('status.in_progress'),
          tasks: filteredTasks.filter(task => task.status === 'IN_PROGRESS')
        },
        in_review: {
          id: 'in_review',
          title: t_tasks('status.in_review'),
          tasks: filteredTasks.filter(task => task.status === 'IN_REVIEW')
        },
        done: {
          id: 'done',
          title: t_tasks('status.done'),
          tasks: filteredTasks.filter(task => task.status === 'DONE')
        }
      };
      
      setColumns(newColumns);
    } else {
      // 如果过滤后没有任务，设置空列
      const emptyColumns = {
        todo: {
          id: 'todo',
          title: t_tasks('status.todo'),
          tasks: []
        },
        in_progress: {
          id: 'in_progress',
          title: t_tasks('status.in_progress'),
          tasks: []
        },
        in_review: {
          id: 'in_review',
          title: t_tasks('status.in_review'),
          tasks: []
        },
        done: {
          id: 'done',
          title: t_tasks('status.done'),
          tasks: []
        }
      };
      setColumns(emptyColumns);
    }
  }, [filteredTasks, t_tasks]);

  // 处理拖放结束事件
  const onDragEnd = (result) => {
    try {
      const { destination, source, draggableId } = result;

      // 如果没有放到有效目的地，不做任何操作
      if (!destination) return;

      // 如果放回原处，不做任何操作
      if (
        destination.droppableId === source.droppableId &&
        destination.index === source.index
      ) return;

      // 获取源列和目标列
      const sourceColumn = columns[source.droppableId];
      const destColumn = columns[destination.droppableId];

      // 找到被拖拽的任务
      const task = sourceColumn.tasks.find(task => String(task.id) === draggableId);
      
      if (!task) return;

      // 从源列中移除任务
      const sourceTasks = [...sourceColumn.tasks];
      sourceTasks.splice(source.index, 1);

      let destTasks = [];

      if (source.droppableId === destination.droppableId) {
        // 在同一列中移动
        destTasks = sourceTasks;
        destTasks.splice(destination.index, 0, task);
      } else {
        // 跨列移动
        destTasks = [...destColumn.tasks];
        destTasks.splice(destination.index, 0, task);

        // 更新任务状态
        const newStatus = getStatusFromColumnId(destination.droppableId);
        
        if (newStatus && task.status !== newStatus) {
          // 使用Supabase更新任务状态
          updateTaskStatus(task.id, newStatus);
        }
      }

      // 更新列状态
      setColumns({
        ...columns,
        [source.droppableId]: {
          ...sourceColumn,
          tasks: sourceTasks
        },
        [destination.droppableId]: {
          ...destColumn,
          tasks: destTasks
        }
      });
    } catch (error) {
      console.error('拖放操作出错:', error);
    }
  };

  // 获取任务优先级对应的样式
  const getPriorityVariant = React.useCallback((priority) => {
    switch (priority) {
      case 'URGENT':
        return 'destructive';
      case 'HIGH':
        return 'yellow';
      case 'MEDIUM':
        return 'warning';
      default:
        return 'secondary';
    }
  }, []);

  // 渲染过滤器项
  const renderFilterItem = (key, value, selectedValue, setSelectedFunc) => {
    const isSelected = selectedValue === value;
    
    // 计算每个过滤条件的任务数量
    const getFilterCount = () => {
      if (!tasks || tasks.length === 0) return 0;
      
      if (value === 'pastDue' || value === 'today' || value === 'upcoming' || value === 'noDate') {
        const now = new Date(); // 当前时间，包含小时和分钟
        const today = new Date();
        today.setHours(0, 0, 0, 0); // 今天的开始时间
        
        return tasks.filter(task => {
          const dueDate = task.expected_completion_date
            ? new Date(task.expected_completion_date)
            : null;
            
          switch (value) {
            case 'pastDue':
              return dueDate && dueDate < now; // 使用当前时间而不是今天的开始时间
            case 'today':
              return dueDate && dueDate.toDateString() === today.toDateString();
            case 'upcoming':
              return dueDate && dueDate > today;
            case 'noDate':
              return !dueDate;
            default:
              return false;
          }
        }).length;
      }
      
      if (value === 'referenceTasks') {
        return tasks.filter(task => !task.is_standalone).length; // 返回引用任务的数量
      }
      
      if (value === 'LOW' || value === 'MEDIUM' || value === 'HIGH' || value === 'URGENT' || value === 'all') {
        if (value === 'all') {
          return tasks.length;
        }
        return tasks.filter(task => {
          const priority = getTaskPriority(task) || task.priority || 'LOW';
          return priority === value;
        }).length;
      }
      
      if (value === 'createdBy') {
        // 暂不支持按创建者筛选，返回0
        return 0;
      }
      
      return 0;
    };
    
    return (
      <div 
        key={value}
        onClick={() => setSelectedFunc(value)}
        className={`flex items-center justify-between cursor-pointer p-2 rounded-md ${isSelected ? 'bg-accent/20' : 'hover:bg-accent/10'}`}
      >
        <div className="flex items-center gap-2">
          {isSelected ? 
            <CheckCircle className="h-4 w-4" /> : 
            <Circle className="h-4 w-4" />
          }
          <span className={isSelected ? 'font-medium' : ''}>{key}</span>
        </div>
        <span className="text-xs text-muted-foreground px-1.5 py-0.5 rounded-full bg-muted">
          {getFilterCount()}
        </span>
      </div>
    );
  };

  // 处理创建新任务
  const handleCreateTask = () => {
    setShowNewTaskDialog(true);
  };
  
  // 处理点击任务卡片
  const handleTaskClick = (task) => {
    // Format the task object with the correct ID and details
    const detailTask = {
      ...task,
      // For standalone tasks, extract the actual ID from the local-prefixed ID
      id: task.is_standalone && task.id.startsWith('local-') 
        ? task.id.replace('local-', '') 
        : task.my_task_id || task.id,
      priority: getTaskPriority(task) || task.priority,
      expected_start_time: task.expected_start_time || null, // Ensure field exists even if null
      expected_completion_date: task.expected_completion_date || null // Ensure field exists even if null
    };
    
    
    
    setSelectedTask(detailTask);
    setShowTaskDetailsDialog(true);
  };

  // 处理编辑任务
  const handleEditTask = (task) => {
    // Make sure the task has the correct ID format for the edit dialog
    const editTask = {
      ...task,
      // For standalone tasks, extract the actual ID from the local-prefixed ID
      id: task.is_standalone && task.id.startsWith('local-') 
        ? task.id.replace('local-', '') 
        : task.my_task_id || task.id,
      priority: task.priority || getTaskPriority(task),
      expected_start_time: task.expected_start_time || null, // Ensure field exists even if null
      expected_completion_date: task.expected_completion_date || null // Ensure field exists even if null
    };
    
    
    
    setSelectedTask(editTask);
    setShowEditTaskDialog(true);
  };

  // 任务成功创建或编辑后更新列表
  const handleTaskUpdate = () => {
    if (user) {
      fetchMyTasks(user.id);
    }
  };

  // Render task reference
  const renderTaskReference = (task) => {
    if (!task.is_standalone && task.task_id) {
      return (
        <TooltipProvider>
          <Tooltip delayDuration={300}>
            <TooltipTrigger asChild>
                              <div 
                className="text-xs bg-muted px-1.5 py-0.5 rounded flex items-center gap-1 cursor-help"
                onMouseEnter={() => {
                  setHoveredTaskId(task.task_id);
                  fetchTaskContext(task.task_id);
                }}
              >
                <Info className="h-3 w-3 flex-shrink-0" />
                {t_tasks('reference') || 'Ref'}: <span className="break-all max-w-[80px] line-clamp-1">{task.task_id}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="p-3 max-w-sm">
              {isLoadingContext[task.task_id] ? (
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4 rounded-full" />
                  <div className="text-xs">{t_tasks('loadingTaskDetails')}</div>
                </div>
              ) : taskContextData[task.task_id] ? (
                <div className="space-y-2 text-xs">
                  {/* Project & Team info */}
                  <div>
                    <div className="font-medium text-sm mb-1">
                      {taskContextData[task.task_id].project?.project_name || t_tasks('unknownProject')}
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t_tasks('team')}:</span>
                      <span className="font-medium">{taskContextData[task.task_id].team?.name || t_tasks('unknownTeam')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t_tasks('section')}:</span>
                      <span>{taskContextData[task.task_id].section?.name || t_tasks('unknownSection')}</span>
                    </div>
                  </div>

                  {/* Task status if available */}
                  {taskContextData[task.task_id].task?.tag_values?.["12"] && (
                    <div className="flex justify-between items-center border-t pt-1">
                      <span className="text-muted-foreground">{t_tasks('status.label')}:</span>
                      <Badge 
                        variant={getStatusVariant(taskContextData[task.task_id].task.tag_values["12"])}
                        className="text-[10px] h-5"
                      >
                        {taskContextData[task.task_id].task.tag_values["12"]}
                      </Badge>
                    </div>
                  )}

                  {/* Assignees with avatars */}
                  {taskContextData[task.task_id].assignees?.length > 0 && (
                    <div className="border-t pt-1">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">{t_tasks('assignees')}:</span>
                        <div className="flex -space-x-1">
                          {taskContextData[task.task_id].assignees.slice(0, 3).map(assignee => (
                            <div 
                              key={assignee.id} 
                              className="h-5 w-5 rounded-full border border-background overflow-hidden bg-muted flex items-center justify-center"
                              title={assignee.name}
                            >
                              {assignee.avatar_url ? (
                                <img 
                                  src={assignee.avatar_url} 
                                  alt={assignee.name} 
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <span className="text-[8px] font-medium">
                                  {assignee.name.charAt(0).toUpperCase()}
                                </span>
                              )}
                            </div>
                          ))}
                          {taskContextData[task.task_id].assignees.length > 3 && (
                            <div className="h-5 w-5 rounded-full bg-muted border border-background flex items-center justify-center">
                              <span className="text-[8px]">+{taskContextData[task.task_id].assignees.length - 3}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      {/* Show assignee names on next line */}
                      <div className="mt-1 text-[10px] text-muted-foreground">
                        {taskContextData[task.task_id].assignees.map(a => a.name).join(', ')}
                      </div>
                    </div>
                  )}
                  
                  {/* View in original project link */}
                  <div className="mt-2 border-t pt-1">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 w-full text-[10px]"
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent triggering the task card click
                        // Navigate to the task in its project
                        if (taskContextData[task.task_id].project?.id && taskContextData[task.task_id].team?.id) {
                          window.open(
                            `/projects/${taskContextData[task.task_id].project.id}?teamId=${taskContextData[task.task_id].team.id}`, 
                            '_blank'
                          );
                        }
                      }}
                    >
                      {t_tasks('viewInProject')}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-muted-foreground">
                  {t_tasks('taskContextNotFound')}
                </div>
              )}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }
    return null;
  };

  // Get status badge variant
  const getStatusVariant = (status) => {
    switch (status) {
      case 'TODO':
        return 'outline';
      case 'IN_PROGRESS':
        return 'secondary';
      case 'IN_REVIEW':
        return 'warning';
      case 'DONE':
        return 'success';
      default:
        return 'outline';
    }
  };

  // 处理任务优先级更新
  const handlePriorityChange = (taskId, newPriority) => {
    updateTaskPriority(taskId, newPriority);
  };

  // 渲染加载状态
  if (status === 'loading') {
    return (
      <div className="p-4 h-screen">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">{t_tasks('title')}</h1>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
        
        <div className="flex gap-4 h-[calc(100vh-105px)]">
          {/* Skeleton for left filter panel */}
          <div className="w-64 bg-background border rounded-md p-4">
            <Skeleton className="h-8 w-full mb-4" />
            
            {/* TYPE filter skeleton */}
            <div className="mb-5">
              <Skeleton className="h-4 w-24 mb-4" />
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-4 rounded-full" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <Skeleton className="h-5 w-8 rounded-full" />
                </div>
              ))}
            </div>
            
            {/* ASSIGNED TO filter skeleton */}
            <div className="mb-5">
              <Skeleton className="h-4 w-32 mb-4" />
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4 rounded-full" />
                  <Skeleton className="h-4 w-16" />
                </div>
                <Skeleton className="h-5 w-8 rounded-full" />
              </div>
            </div>
            
            {/* WORKSPACE & TEAMS filter skeleton */}
            <div className="mb-5">
              <Skeleton className="h-4 w-40 mb-4" />
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-4 rounded-full" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                  <Skeleton className="h-5 w-8 rounded-full" />
                </div>
              ))}
            </div>
          </div>
          
          {/* Skeleton for kanban board */}
          <div className="flex-1">
            <Skeleton className="h-5 w-32 mb-3" />
            <div className="flex space-x-4 overflow-x-auto pb-4 h-full">
              {['todo', 'in_progress', 'in_review', 'done'].map((column, index) => (
                <div key={column} className="flex-1 bg-background border rounded-md shadow min-w-[250px]">
                  <div className="p-2 border-b bg-muted/30">
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-5 w-8 rounded-full" />
                    </div>
                  </div>
                  <div className="p-2">
                    {Array.from({ length: index === 0 ? 4 : index === 1 ? 3 : index === 2 ? 2 : 1 }).map((_, i) => (
                      <div key={i} className="p-3 mb-2 border rounded-md">
                        <div className="mb-2 flex justify-between">
                          <Skeleton className="h-5 w-32" />
                          <Skeleton className="h-5 w-16 rounded-full" />
                        </div>
                        <Skeleton className="h-4 w-full mb-2" />
                        <Skeleton className="h-4 w-3/4 mb-4" />
                        <div className="flex items-center justify-between">
                          <Skeleton className="h-4 w-20" />
                          <div className="flex items-center gap-2">
                            <Skeleton className="h-4 w-16" />
                            <Skeleton className="h-4 w-16" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">{t_tasks('errors.loadingFailed')}</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={() => fetchMyTasks(user.id)}>{t_common('retry')}</Button>
        </div>
      </div>
    );
  }

  return (
          <div className="p-4 h-screen overflow-hidden flex flex-col">
      <div className="flex justify-between items-center mb-4 flex-shrink-0">
        <h1 className="text-2xl font-bold">{t_tasks('title')}</h1>
        <div className="flex gap-2 flex-wrap sm:flex-nowrap">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9 w-full sm:w-64"
              placeholder={t_tasks('searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              maxLength={30}
            />
          </div>
          <Button onClick={handleCreateTask} className="whitespace-nowrap">
            <PlusCircle className="h-4 w-4 mr-2" />
            {t_common('create')}
          </Button>
        </div>
      </div>

      {/* Dialogs */}
      <NewTaskDialog 
        open={showNewTaskDialog}
        onOpenChange={setShowNewTaskDialog}
        onTaskCreated={handleTaskUpdate}
        userId={user?.id}
      />

      <TaskDetailsDialog
        isOpen={showTaskDetailsDialog}
        setIsOpen={setShowTaskDetailsDialog}
        task={selectedTask}
        onEdit={handleEditTask}
        onSuccess={handleTaskUpdate}
      />

      <EditTaskDialog
        isOpen={showEditTaskDialog}
        setIsOpen={setShowEditTaskDialog}
        task={selectedTask}
        onSuccess={handleTaskUpdate}
      />

      <div className="flex gap-4 flex-1 overflow-hidden">
        {/* 左侧过滤器面板 */}
        <div className="w-64 bg-background border rounded-md p-4 flex-shrink-0 overflow-y-auto hidden md:block">
          {/* TYPE 过滤器 */}
          <div className="mb-5">
            <h3 className="text-xs text-muted-foreground mb-2">{t_tasks('type.label')}</h3>
            {renderFilterItem(t_tasks('type.pastDue'), 'pastDue', selectedType, setSelectedType)}
            {renderFilterItem(t_tasks('type.today'), 'today', selectedType, setSelectedType)}
            {renderFilterItem(t_tasks('type.upcoming'), 'upcoming', selectedType, setSelectedType)}
            {renderFilterItem(t_tasks('type.noDate'), 'noDate', selectedType, setSelectedType)}
          </div>

          {/* TASK TYPE 过滤器 */}
          <div className="mb-5">
            <h3 className="text-xs text-muted-foreground mb-2">{t_tasks('assignedTo.label')}</h3>
            <div 
              onClick={() => setShowReferenceTasks(!showReferenceTasks)}
              className="flex items-center justify-between cursor-pointer p-2 rounded-md hover:bg-accent/10"
            >
              <div className="flex items-center gap-2">
                {showReferenceTasks ? 
                  <CheckCircle className="h-4 w-4" /> : 
                  <Circle className="h-4 w-4" />
                }
                <span className={showReferenceTasks ? 'font-medium' : ''}>{t_tasks('assignedTo.showReferenceTasks')}</span>
              </div>
              <span className="text-xs text-muted-foreground px-1.5 py-0.5 rounded-full bg-muted">
                {tasks ? tasks.filter(task => !task.is_standalone).length : 0}
              </span>
            </div>
          </div>
          
          {/* PRIORITY 过滤器 */}
          <div className="mb-5">
            <h3 className="text-xs text-muted-foreground mb-2">{t_common('priority')}</h3>
            {renderFilterItem(t_common('all'), 'all', selectedPriority, setSelectedPriority)}
            {renderFilterItem(t_common('priority_low'), 'LOW', selectedPriority, setSelectedPriority)}
            {renderFilterItem(t_common('priority_medium'), 'MEDIUM', selectedPriority, setSelectedPriority)}
            {renderFilterItem(t_common('priority_high'), 'HIGH', selectedPriority, setSelectedPriority)}
            {renderFilterItem(t_common('priority_urgent'), 'URGENT', selectedPriority, setSelectedPriority)}
          </div>

          {/* 清除过滤器按钮 - 移动到容器底部 */}
          {(selectedType !== 'upcoming' || !showReferenceTasks || 
            selectedPriority !== 'all' || searchQuery) && (
            <Button 
              variant="outline" 
              size="sm"
              className="mt-2 text-xs w-full"
              onClick={() => {
                setSelectedType('upcoming');
                setShowReferenceTasks(true);
                setSelectedPriority('all');
                setSearchQuery('');
              }}
            >
              <Filter className="h-3.5 w-3.5 mr-2 rotate-0 scale-100" />
              {t_common('clearFilters')}
            </Button>
          )}
        </div>

        {/* 右侧任务看板 */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="text-sm text-muted-foreground mb-3 flex-shrink-0 flex justify-between items-center">
            <span>{filteredTasks ? filteredTasks.length : 0} {t_tasks('results')}</span>
            {/* Mobile filters button */}
            <Button 
              variant="outline" 
              size="sm" 
              className="md:hidden" 
              onClick={() => {
                // You could implement a mobile filter modal/drawer here
                alert(t_tasks('filtersComingSoon'));
              }}
            >
              <Filter className="h-4 w-4 mr-2" />
              {t_common('filters')}
            </Button>
          </div>
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="flex space-x-4 overflow-x-auto overflow-y-hidden pb-4 h-full">
              {Object.values(columns).map(column => (
                <div key={column.id} className="flex-none bg-background border rounded-md shadow w-[85vw] sm:w-[250px] md:w-[220px] lg:w-[280px]">
                  <div className="p-2 border-b bg-muted/30 sticky top-0 z-10">
                    <h2 className="text-sm font-semibold">
                      {column.title} ({column.tasks.length})
                    </h2>
                  </div>
                  <Droppable droppableId={column.id}>
                    {(provided, snapshot) => (
                      <div 
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`h-full p-2 overflow-y-auto ${
                          snapshot.isDraggingOver ? "bg-accent/20" : ""
                        }`}
                        style={{ 
                          minHeight: "calc(100% - 40px)",
                          maxHeight: "calc(100vh - 180px)"
                        }}
                      >
                        {column.tasks.length > 0 ? (
                          column.tasks.map((task, index) => (
                            <Draggable
                              key={String(task.id)}
                              draggableId={String(task.id)}
                              index={index}
                            >
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={`p-3 mb-2 bg-card border rounded-md shadow-sm cursor-pointer ${
                                    snapshot.isDragging ? "opacity-75 bg-accent" : ""
                                  }`}
                                  onClick={() => handleTaskClick(task)}
                                >
                                  {updatingTaskIds.includes(task.id) ? (
                                    // Show skeleton loading for this specific task
                                    <div>
                                      <div className="mb-2 flex justify-between">
                                        <Skeleton className="h-5 w-32" />
                                        <Skeleton className="h-5 w-16 rounded-full" />
                                      </div>
                                      <Skeleton className="h-4 w-full mb-2" />
                                      <Skeleton className="h-4 w-3/4 mb-4" />
                                      <div className="flex items-center justify-between">
                                        <Skeleton className="h-4 w-20" />
                                        <div className="flex items-center gap-2">
                                          <Skeleton className="h-4 w-16" />
                                          <Skeleton className="h-4 w-16" />
                                        </div>
                                      </div>
                                    </div>
                                  ) : (
                                    // Normal task display
                                    <>
                                      <div className="mb-2 flex justify-between">
                                        <h3 className="font-medium text-sm max-w-[75%] break-all line-clamp-1">
                                          {getTaskTitle(task) || t_tasks('noTitle')}
                                        </h3>
                                        <div className="relative group">
                                          <Badge 
                                            variant={getPriorityVariant(getTaskPriority(task))}
                                            className={`${getPriorityVariant(getTaskPriority(task)) === 'yellow' ? 'bg-yellow-500 hover:bg-yellow-600' : ''} cursor-pointer`}
                                            onClick={(e) => {
                                              e.stopPropagation(); // Prevent triggering task click
                                              // Toggle priority dropdown menu
                                            }}
                                          >
                                            {getTaskPriority(task) || 'LOW'}
                                          </Badge>
                                          <div className="absolute right-0 mt-1 hidden group-hover:block z-10">
                                            <div className="bg-card border rounded-md shadow-md py-1 min-w-[120px]">
                                              {['URGENT', 'HIGH', 'MEDIUM', 'LOW'].map(priority => (
                                                <div 
                                                  key={priority}
                                                  className={`px-3 py-1.5 text-xs cursor-pointer hover:bg-accent/50 ${(getTaskPriority(task) || 'LOW') === priority ? 'bg-accent/20 font-medium' : ''}`}
                                                  onClick={(e) => {
                                                    e.stopPropagation(); // Prevent triggering task click
                                                    handlePriorityChange(task.id, priority);
                                                  }}
                                                >
                                                  {priority}
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                      {getTaskDescription(task) && (
                                        <p className="text-xs text-muted-foreground line-clamp-3 mb-2 break-all hyphens-auto">
                                          {getTaskDescription(task)}
                                        </p>
                                      )}
                                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                                        <div className="flex items-center gap-2">
                                          {getTaskProjectId(task) && (
                                            <div className="text-xs">
                                              #{getTaskProjectId(task)}
                                            </div>
                                          )}
                                          {renderTaskReference(task)}
                                        </div>
                                        <div className="flex flex-wrap items-center gap-1 sm:gap-3">
                                          {task.expected_start_time && (
                                            <div className="flex items-center gap-1">
                                              <Clock className="w-3 h-3 flex-shrink-0" />
                                              <span className="break-all max-w-[100px] sm:max-w-[150px] line-clamp-1">
                                                {formatDate(task.expected_start_time)}
                                              </span>
                                            </div>
                                          )}
                                          {task.expected_completion_date && (
                                            <div className="flex items-center gap-1">
                                              <Calendar className="w-3 h-3 flex-shrink-0" />
                                              <span className="break-all max-w-[100px] sm:max-w-[150px] line-clamp-1">
                                                {formatDate(task.expected_completion_date)}
                                              </span>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </>
                                  )}
                                </div>
                              )}
                            </Draggable>
                          ))
                        ) : (
                          <div className="flex items-center justify-center h-24 text-xs text-muted-foreground">
                            {t_tasks('noTasks')}
                          </div>
                        )}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              ))}
            </div>
          </DragDropContext>
        </div>
      </div>
    </div>
  );
}
