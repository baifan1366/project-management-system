'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { 
  Clock, Calendar, PlusCircle, Filter, SortAsc, 
  Search, CheckCircle, Circle 
} from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from '@/components/ui/skeleton';
import useGetUser from '@/lib/hooks/useGetUser';
import React from 'react';
import { supabase } from '@/lib/supabase';
import NewTaskDialog from '@/components/myTasks/NewTaskDialog';

// 任务看板视图组件
export default function MyTasksPage() {
  const t_tasks = useTranslations('myTasks');
  const t_common = useTranslations('common');
  const [tasks, setTasks] = useState([]);
  const [myTasks, setMyTasks] = useState([]);
  const [columns, setColumns] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [selectedType, setSelectedType] = useState('upcoming');
  const [selectedAssignee, setSelectedAssignee] = useState('me');
  const [selectedWorkspace, setSelectedWorkspace] = useState('workspace');
  const { user } = useGetUser();
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [showNewTaskDialog, setShowNewTaskDialog] = useState(false);

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
  
  // 获取任务的状态
  const getTaskStatus = React.useCallback((task) => {
    if (!task?.tag_values) return null;
    
    // 记录可能的状态值
    const statusValues = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'];
    
    // 遍历所有tag_values，查找任何匹配状态的值
    for (const [key, value] of Object.entries(task.tag_values)) {
      if (statusValues.includes(value)) {
        return value;
      }
    }
    
    // 对于键12，我们假设它可能是状态
    if ('12' in task.tag_values) {
      return task.tag_values['12'];
    }
    
    // 如果没有找到明确的状态，默认为TODO
    return 'TODO';
  }, []);
  
  // 获取任务的执行者
  const getTaskAssignee = React.useCallback((task) => {
    if (!task?.tag_values) return null;
    const assigneeKey = getKeyForField('assignee_id', task.tag_values);
    return assigneeKey ? task.tag_values[assigneeKey] : null;
  }, [getKeyForField]);
  
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
  
  // 获取任务的截止日期
  const getTaskDueDate = React.useCallback((task) => {
    if (!task?.tag_values) return null;
    const dueDateKey = getKeyForField('due_date', task.tag_values);
    return dueDateKey ? task.tag_values[dueDateKey] : null;
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
  const fetchMyTasks = async (userId) => {
    try {
      setStatus('loading');
      
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
            status: myTask.status,
            title: myTask.title || getTaskTitle(task),
            description: myTask.description || getTaskDescription(task),
            expected_completion_date: myTask.expected_completion_date
          };
        });
        
        combinedTasks = [...linkedTasks];
      }
      
      // 添加独立任务（没有关联task_id的mytasks记录）
      const standaloneTasks = standaloneMyTasks.map(myTask => ({
        id: `local-${myTask.id}`,
        my_task_id: myTask.id,
        tag_values: {},
        status: myTask.status,
        title: myTask.title,
        description: myTask.description,
        expected_completion_date: myTask.expected_completion_date,
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
      
      // 重新获取更新后的数据
      fetchMyTasks(user.id);
    } catch (err) {
      console.error('Error updating task status:', err);
      // 显示错误通知或处理错误
    }
  };

  // 获取所有任务
  useEffect(() => {
    if (user) {
      fetchMyTasks(user.id);
    }
  }, [user]);

  // 任务数据处理和分列
  useEffect(() => {
    if (filteredTasks && filteredTasks.length > 0) {
      // 应用搜索过滤
      const tasksAfterSearch = searchQuery 
        ? filteredTasks.filter(task => 
            (task.title && task.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (task.description && task.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (task.tag_values && 
              Object.values(task.tag_values).some(value => 
                value && value.toString().toLowerCase().includes(searchQuery.toLowerCase())
              ))
          )
        : filteredTasks;
      
      // 根据状态将任务分组到不同列
      const newColumns = {
        todo: {
          id: 'todo',
          title: t_tasks('status.todo'),
          tasks: tasksAfterSearch.filter(task => task.status === 'TODO')
        },
        in_progress: {
          id: 'in_progress',
          title: t_tasks('status.in_progress'),
          tasks: tasksAfterSearch.filter(task => task.status === 'IN_PROGRESS')
        },
        in_review: {
          id: 'in_review',
          title: t_tasks('status.in_review'),
          tasks: tasksAfterSearch.filter(task => task.status === 'IN_REVIEW')
        },
        done: {
          id: 'done',
          title: t_tasks('status.done'),
          tasks: tasksAfterSearch.filter(task => task.status === 'DONE')
        }
      };
      
      setColumns(newColumns);
    }
  }, [filteredTasks, searchQuery, t_tasks]);

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
      case 'HIGH':
      case 'URGENT':
        return 'destructive';
      case 'MEDIUM':
        return 'warning';
      default:
        return 'secondary';
    }
  }, []);

  // 渲染过滤器项
  const renderFilterItem = (key, value, selectedValue, setSelectedFunc) => {
    const isSelected = selectedValue === value;
    
    return (
      <div 
        key={value}
        onClick={() => setSelectedFunc(value)}
        className={`flex items-center gap-2 cursor-pointer p-2 rounded-md ${isSelected ? 'bg-accent/20' : 'hover:bg-accent/10'}`}
      >
        {isSelected ? 
          <CheckCircle className="h-4 w-4" /> : 
          <Circle className="h-4 w-4" />
        }
        <span className={isSelected ? 'font-medium' : ''}>{key}</span>
      </div>
    );
  };

  // 处理创建新任务
  const handleCreateTask = () => {
    setShowNewTaskDialog(true);
  };
  
  // 任务成功创建后更新列表
  const handleTaskCreated = () => {
    if (user) {
      fetchMyTasks(user.id);
    }
  };

  // 渲染加载状态
  if (status === 'loading') {
    return (
      <div className="p-4 h-screen">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">{t_tasks('title')}</h1>
          <Skeleton className="h-9 w-32" />
        </div>
        <div className="flex space-x-4 h-[calc(100vh-120px)]">
          {[1, 2, 3, 4].map(index => (
            <div key={index} className="flex-1 bg-background border rounded-md p-2 shadow min-w-[250px]">
              <div className="p-2">
                <Skeleton className="h-6 w-24 mb-4" />
                <div className="space-y-3">
                  {[1, 2, 3].map(item => (
                    <Skeleton key={item} className="h-32 w-full rounded-md" />
                  ))}
                </div>
              </div>
            </div>
          ))}
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
    <div className="p-4 h-screen">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">{t_tasks('title')}</h1>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9 w-64"
              placeholder={t_tasks('searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button onClick={handleCreateTask}>
            <PlusCircle className="h-4 w-4 mr-2" />
            {t_common('create')}
          </Button>
        </div>
      </div>

      {/* New Task Dialog */}
      <NewTaskDialog 
        open={showNewTaskDialog}
        onOpenChange={setShowNewTaskDialog}
        onTaskCreated={handleTaskCreated}
        userId={user?.id}
      />

      <div className="flex gap-4 h-[calc(100vh-120px)]">
        {/* 左侧过滤器面板 */}
        <div className="w-64 bg-background border rounded-md p-4">
          {/* TYPE 过滤器 */}
          <div className="mb-5">
            <h3 className="text-xs text-muted-foreground mb-2">{t_tasks('type.label')}</h3>
            {renderFilterItem(t_tasks('type.pastDue'), 'pastDue', selectedType, setSelectedType)}
            {renderFilterItem(t_tasks('type.today'), 'today', selectedType, setSelectedType)}
            {renderFilterItem(t_tasks('type.upcoming'), 'upcoming', selectedType, setSelectedType)}
            {renderFilterItem(t_tasks('type.noDate'), 'noDate', selectedType, setSelectedType)}
          </div>

          {/* ASSIGNED TO 过滤器 - 移除 unassigned 选项 */}
          <div className="mb-5">
            <h3 className="text-xs text-muted-foreground mb-2">{t_tasks('assignedTo.label')}</h3>
            {renderFilterItem(t_tasks('assignedTo.me'), 'me', selectedAssignee, setSelectedAssignee)}
          </div>

          {/* WORKSPACE & TEAMS 过滤器 */}
          <div className="mb-5">
            <h3 className="text-xs text-muted-foreground mb-2">{t_tasks('workspaceTeams.label')}</h3>
            {renderFilterItem(t_tasks('workspaceTeams.all'), 'all', selectedWorkspace, setSelectedWorkspace)}
            {renderFilterItem(t_tasks('workspaceTeams.shared'), 'shared', selectedWorkspace, setSelectedWorkspace)}
            {renderFilterItem(t_tasks('workspaceTeams.workspace'), 'workspace', selectedWorkspace, setSelectedWorkspace)}
          </div>

          {/* DUE DATE 过滤器 */}
          <div className="mb-5">
            <h3 className="text-xs text-muted-foreground mb-2">{t_tasks('dueDate.label')}</h3>
            {renderFilterItem(t_tasks('dueDate.createdBy'), 'createdBy', '', () => {})}
          </div>
        </div>

        {/* 右侧任务看板 */}
        <div className="flex-1">
          <div className="text-sm text-muted-foreground mb-3">
            {filteredTasks.length} {t_tasks('results')}
          </div>
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="flex space-x-4 overflow-x-auto pb-4 h-full">
              {Object.values(columns).map(column => (
                <div key={column.id} className="flex-1 bg-background border rounded-md shadow min-w-[250px]">
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
                        style={{ minHeight: "calc(100% - 40px)" }}
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
                                  className={`p-3 mb-2 bg-card border rounded-md shadow-sm ${
                                    snapshot.isDragging ? "opacity-75 bg-accent" : ""
                                  }`}
                                >
                                  <div className="mb-2 flex justify-between">
                                    <h3 className="font-medium text-sm">
                                      {getTaskTitle(task) || t_tasks('noTitle')}
                                    </h3>
                                    <Badge variant={getPriorityVariant(getTaskPriority(task))}>
                                      {getTaskPriority(task)?.toLowerCase() || 'low'}
                                    </Badge>
                                  </div>
                                  {getTaskDescription(task) && (
                                    <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
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
                                    </div>
                                    <div className="flex items-center gap-3">
                                      {task.expected_completion_date && (
                                        <div className="flex items-center gap-1">
                                          <Calendar className="w-3 h-3" />
                                          <span>
                                            {format(new Date(task.expected_completion_date), 'yyyy-MM-dd')}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
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
