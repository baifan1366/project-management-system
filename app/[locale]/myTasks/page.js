'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from '@/components/ui/skeleton';

// 任务看板视图组件
export default function MyTasksPage() {
  const t = useTranslations('CreateTask');
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

  // 获取所有任务
  useEffect(() => {
    // 使用'current'标识符让API获取当前用户的任务
    dispatch(fetchTasksByUserId('current'));
  }, [dispatch]);

  // 任务数据处理和分列
  useEffect(() => {
    if (tasks && tasks.length > 0) {
      const filteredBySearch = searchQuery 
        ? tasks.filter(task => 
            task.tag_values && 
            Object.values(task.tag_values).some(value => 
              value && value.toString().toLowerCase().includes(searchQuery.toLowerCase())
            )
          )
        : tasks;
      
      setFilteredTasks(filteredBySearch);
      
      // 根据状态将任务分组到不同列
      const newColumns = {
        unassigned: {
          id: 'unassigned',
          title: t_tasks('assignedTo.unassigned'),
          tasks: filteredBySearch.filter(task => !task.assignee_id)
        },
        todo: {
          id: 'todo',
          title: t_tasks('status.todo'),
          tasks: filteredBySearch.filter(task => task.status === 'TODO' && task.assignee_id)
        },
        in_progress: {
          id: 'in_progress',
          title: t_tasks('status.in_progress'),
          tasks: filteredBySearch.filter(task => task.status === 'IN_PROGRESS' && task.assignee_id)
        },
        in_review: {
          id: 'in_review',
          title: t_tasks('status.in_review'),
          tasks: filteredBySearch.filter(task => task.status === 'IN_REVIEW' && task.assignee_id)
        },
        done: {
          id: 'done',
          title: t_tasks('status.done'),
          tasks: filteredBySearch.filter(task => task.status === 'DONE' && task.assignee_id)
        }
      };
      
      setColumns(newColumns);
    }
  }, [tasks, searchQuery, t_tasks]);

  // 处理拖放结束事件
  const onDragEnd = (result) => {
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
        // 更新Redux中的任务状态
        dispatch(updateTask({
          taskId: task.id,
          taskData: { status: newStatus }
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
  };

  // 从列ID获取对应的任务状态
  const getStatusFromColumnId = (columnId) => {
    const statusMap = {
      'unassigned': 'TODO', // 将未分配任务默认设置为TODO状态
      'todo': 'TODO',
      'in_progress': 'IN_PROGRESS',
      'in_review': 'IN_REVIEW',
      'done': 'DONE'
    };
    return statusMap[columnId];
  };

  // 更新任务分配状态
  const handleTaskAssignment = (taskId, destinationColumnId) => {
    // 如果拖动到未分配列，则移除任务的assignee_id
    if (destinationColumnId === 'unassigned') {
      dispatch(updateTask({
        taskId: taskId,
        taskData: { assignee_id: null }
      }));
    } 
    // 如果从未分配列拖到其他列，则分配给当前用户
    else {
      // 使用'current'标识符，API会使用当前登录用户的ID
      dispatch(updateTask({
        taskId: taskId,
        taskData: { assignee_id: 'current' }
      }));
    }
  };

  // 获取任务优先级对应的样式
  const getPriorityVariant = (priority) => {
    switch (priority) {
      case 'HIGH':
      case 'URGENT':
        return 'destructive';
      case 'MEDIUM':
        return 'warning';
      default:
        return 'secondary';
    }
  };

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
          <h2 className="text-xl font-semibold mb-2">加载任务时出错</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={() => dispatch(fetchTasksByUserId('current'))}>重试</Button>
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
            {t('addTask')}
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
                                      {task.title}
                                    </h3>
                                    <Badge variant={getPriorityVariant(task.priority)}>
                                      {task.priority.toLowerCase()}
                                    </Badge>
                                  </div>
                                  {task.description && (
                                    <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                                      {task.description}
                                    </p>
                                  )}
                                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                                    <div className="flex items-center gap-2">
                                      {task.project_id && (
                                        <div className="text-xs">
                                          #{task.project_id}
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-3">
                                      {task.due_date && (
                                        <div className="flex items-center gap-1">
                                          <Calendar className="w-3 h-3" />
                                          <span>{format(new Date(task.due_date), 'yyyy-MM-dd')}</span>
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
