'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { useDispatch, useSelector } from 'react-redux';
import { fetchTasksByUserId, updateTask } from '@/lib/redux/features/taskSlice';
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

// 任务看板视图组件
export default function MyTasksPage() {
  const t_tasks = useTranslations('myTasks');
  const t_common = useTranslations('common');
  const dispatch = useDispatch();
  const { tasks, status, error } = useSelector((state) => state.tasks);
  const [columns, setColumns] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [selectedType, setSelectedType] = useState('upcoming');
  const [selectedAssignee, setSelectedAssignee] = useState('me');
  const [selectedWorkspace, setSelectedWorkspace] = useState('workspace');
  const { user } = useGetUser();

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
  
  // 检查任务是否有分配者
  const hasAssignee = React.useCallback((task) => {
    // 假设任何不是创建者的用户ID都是被分配者
    if (!task?.tag_values) return false;
    
    // 检查tag_values中是否有任何值是合法的用户ID（UUID格式）
    return Object.values(task.tag_values).some(
      value => typeof value === 'string' && 
      value.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i) &&
      value !== task.created_by
    );
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
    if (!task?.tag_values) return null;
    const titleKey = getKeyForField('title', task.tag_values);
    return titleKey ? task.tag_values[titleKey] : null;
  }, [getKeyForField]);
  
  // 获取任务的描述
  const getTaskDescription = React.useCallback((task) => {
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
      'unassigned': 'TODO', // 将未分配任务默认设置为TODO状态
      'todo': 'TODO',
      'in_progress': 'IN_PROGRESS',
      'in_review': 'IN_REVIEW',
      'done': 'DONE'
    };
    return statusMap[columnId];
  }, []);

  // 获取所有任务
  useEffect(() => {
    if (user) {
      dispatch(fetchTasksByUserId(user.id));
    }
  }, [dispatch, user]);

  // 调试任务数据结构
  useEffect(() => {
    if (tasks && tasks.length > 0) {
      console.log('Task data structure example:', tasks[0]);
      
      // 检查tag_values结构
      const tagValues = tasks[0].tag_values || {};
      
      // 尝试识别哪个键对应状态
      const potentialStatusValues = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'];
      Object.entries(tagValues).forEach(([key, value]) => {
        if (potentialStatusValues.includes(value)) {
          console.log(`Found status field: key=${key}, value=${value}`);
        }
      });
    }
  }, []); // 空依赖数组，确保只运行一次

  // 在前端过滤出分配给当前用户的任务
  useEffect(() => {
    if (tasks && tasks.length > 0 && user?.id) {
      // 找出分配给当前用户的任务
      const userTasks = tasks.filter(task => {
        // 用户创建的任务
        const isUserCreated = task.created_by === user.id;
        
        // 检查是否分配给当前用户
        let isAssignedToUser = false;
        
        if (task.tag_values) {
          // 检查是否有任何字段的值匹配用户ID
          isAssignedToUser = Object.values(task.tag_values).some(
            value => value === user.id
          );
        }
        
        return isUserCreated || isAssignedToUser;
      });
      
      setFilteredTasks(userTasks);
    }
  }, [tasks, user?.id]);

  // 任务数据处理和分列
  useEffect(() => {
    if (filteredTasks && filteredTasks.length > 0) {
      // 应用搜索过滤
      const tasksAfterSearch = searchQuery 
        ? filteredTasks.filter(task => 
            task.tag_values && 
            Object.values(task.tag_values).some(value => 
              value && value.toString().toLowerCase().includes(searchQuery.toLowerCase())
            )
          )
        : filteredTasks;
      
      // 根据状态将任务分组到不同列
      const newColumns = {
        unassigned: {
          id: 'unassigned',
          title: t_tasks('assignedTo.unassigned'),
          tasks: tasksAfterSearch.filter(task => !hasAssignee(task))
        },
        todo: {
          id: 'todo',
          title: t_tasks('status.todo'),
          tasks: tasksAfterSearch.filter(task => getTaskStatus(task) === 'TODO' && hasAssignee(task))
        },
        in_progress: {
          id: 'in_progress',
          title: t_tasks('status.in_progress'),
          tasks: tasksAfterSearch.filter(task => getTaskStatus(task) === 'IN_PROGRESS' && hasAssignee(task))
        },
        in_review: {
          id: 'in_review',
          title: t_tasks('status.in_review'),
          tasks: tasksAfterSearch.filter(task => getTaskStatus(task) === 'IN_REVIEW' && hasAssignee(task))
        },
        done: {
          id: 'done',
          title: t_tasks('status.done'),
          tasks: tasksAfterSearch.filter(task => getTaskStatus(task) === 'DONE' && hasAssignee(task))
        }
      };
      
      setColumns(newColumns);
    }
  }, [filteredTasks, searchQuery, t_tasks, hasAssignee, getTaskStatus]);

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
        const currentStatus = getTaskStatus(task);
        
        if (newStatus && currentStatus !== newStatus) {
          // 获取当前任务的tag_values或创建一个新的对象
          const currentTagValues = task.tag_values || {};
          
          // 找到对应status的数字键
          let statusKey = null;
          
          // 首先尝试查找现有的状态键
          for (const [key, value] of Object.entries(currentTagValues)) {
            if (['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'].includes(value)) {
              statusKey = key;
              break;
            }
          }
          
          // 如果没找到，使用12作为默认键
          if (!statusKey) {
            statusKey = '12';
          }
          
          // 创建一个新的tag_values对象，更新状态值
          const newTagValues = { ...currentTagValues };
          newTagValues[statusKey] = newStatus;
          
          // 更新Redux中的任务状态
          dispatch(updateTask({
            taskId: task.id,
            taskData: { tag_values: newTagValues }
          }));
        }

        // 处理任务分配状态的变化
        if (source.droppableId === 'unassigned' || destination.droppableId === 'unassigned') {
          handleTaskAssignment(task.id, destination.droppableId);
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

  // 更新任务分配状态
  const handleTaskAssignment = React.useCallback((taskId, destinationColumnId) => {
    const allTasks = tasks; // 使用来自Redux的任务数组
    const task = allTasks.find(t => t.id === taskId);
    
    if (!task) {
      console.error('无法更新任务分配：找不到任务', taskId);
      return;
    }
    
    // 获取当前任务的tag_values或创建一个新的对象
    const currentTagValues = task.tag_values || {};
    
    // 分配给谁的字段标识 - 由于我们不知道具体的键，需要找到一个合适的
    let assigneeKey = '5'; // 假设5是assignee_id对应的键
    
    // 查找现有的assignee字段
    for (const [key, value] of Object.entries(currentTagValues)) {
      // 如果值是一个UUID格式的字符串且不是created_by，那很可能是assignee_id
      if (typeof value === 'string' && 
          value.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i) &&
          value !== task.created_by) {
        assigneeKey = key;
        break;
      }
    }
    
    // 如果拖动到未分配列，则移除任务的assignee_id
    if (destinationColumnId === 'unassigned') {
      // 检查是否存在assignee值
      if (currentTagValues[assigneeKey]) {
        const newTagValues = { ...currentTagValues };
        delete newTagValues[assigneeKey];
        
        dispatch(updateTask({
          taskId,
          taskData: { tag_values: newTagValues }
        }));
      }
    } 
    // 如果从未分配列拖到其他列，则分配给当前用户
    else {
      // 使用实际的用户ID而不是'current'标识符
      if (!user?.id) {
        console.error('无法分配任务：找不到当前用户ID');
        return;
      }
      
      // 创建一个新的tag_values对象，添加或更新assignee_id
      const newTagValues = { ...currentTagValues };
      newTagValues[assigneeKey] = user.id;
      
      dispatch(updateTask({
        taskId,
        taskData: { tag_values: newTagValues }
      }));
    }
  }, [tasks, user?.id, dispatch]);

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
          <Button onClick={() => dispatch(fetchTasksByUserId(user.id))}>{t_common('retry')}</Button>
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
          <Button>
            <PlusCircle className="h-4 w-4 mr-2" />
            {t_common('create')}
          </Button>
        </div>
      </div>

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

          {/* ASSIGNED TO 过滤器 */}
          <div className="mb-5">
            <h3 className="text-xs text-muted-foreground mb-2">{t_tasks('assignedTo.label')}</h3>
            {renderFilterItem(t_tasks('assignedTo.unassigned'), 'unassigned', selectedAssignee, setSelectedAssignee)}
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
                                      {getTaskDueDate(task) && (
                                        <div className="flex items-center gap-1">
                                          <Calendar className="w-3 h-3" />
                                          <span>
                                            {(() => {
                                              try {
                                                // Validate date before formatting
                                                const dueDate = getTaskDueDate(task);
                                                const dateObj = new Date(dueDate);
                                                // Check if date is valid before formatting
                                                if (!isNaN(dateObj.getTime())) {
                                                  return format(dateObj, 'yyyy-MM-dd');
                                                }
                                                return t_tasks('invalidDate');
                                              } catch (err) {
                                                console.error('Invalid date format:', err);
                                                return t_tasks('invalidDate');
                                              }
                                            })()}
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
