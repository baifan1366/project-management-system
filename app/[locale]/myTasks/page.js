'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { useDispatch, useSelector } from 'react-redux';
import { fetchTasks, updateTask } from '@/lib/redux/features/taskSlice';
import { Clock, Calendar, PlusCircle, Filter, SortAsc, Search } from 'lucide-react';
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
  const t_tasks = useTranslations('tasks');
  const t_projects = useTranslations('Projects');
  const t_common = useTranslations('common');
  const dispatch = useDispatch();
  const { tasks, status, error } = useSelector((state) => state.tasks);
  const [columns, setColumns] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredTasks, setFilteredTasks] = useState([]);

  // 获取所有任务
  useEffect(() => {
    dispatch(fetchTasks());
  }, [dispatch]);

  // 任务数据处理和分列
  useEffect(() => {
    if (tasks && tasks.length > 0) {
      const filteredBySearch = searchQuery 
        ? tasks.filter(task => 
            task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (task.description && task.description.toLowerCase().includes(searchQuery.toLowerCase()))
          )
        : tasks;
      
      setFilteredTasks(filteredBySearch);
      
      // 根据状态将任务分组到不同列
      const newColumns = {
        todo: {
          id: 'todo',
          title: t_tasks('status.todo'),
          tasks: filteredBySearch.filter(task => task.status === 'TODO')
        },
        in_progress: {
          id: 'in_progress',
          title: t_tasks('status.in_progress'),
          tasks: filteredBySearch.filter(task => task.status === 'IN_PROGRESS')
        },
        in_review: {
          id: 'in_review',
          title: t_tasks('status.in_review'),
          tasks: filteredBySearch.filter(task => task.status === 'IN_REVIEW')
        },
        done: {
          id: 'done',
          title: t_tasks('status.done'),
          tasks: filteredBySearch.filter(task => task.status === 'DONE')
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
      'todo': 'TODO',
      'in_progress': 'IN_PROGRESS',
      'in_review': 'IN_REVIEW',
      'done': 'DONE'
    };
    return statusMap[columnId];
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
          <Button onClick={() => dispatch(fetchTasks())}>重试</Button>
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>{t_tasks('filters.all')}</DropdownMenuItem>
              <DropdownMenuItem>{t_tasks('filters.assignedToMe')}</DropdownMenuItem>
              <DropdownMenuItem>{t_tasks('filters.createdByMe')}</DropdownMenuItem>
              <DropdownMenuItem>{t_tasks('filters.completed')}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <SortAsc className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>{t_tasks('sort.byDueDate')}</DropdownMenuItem>
              <DropdownMenuItem>{t_tasks('sort.byPriority')}</DropdownMenuItem>
              <DropdownMenuItem>{t_tasks('sort.byCreatedDate')}</DropdownMenuItem>
              <DropdownMenuItem>{t_tasks('sort.byUpdatedDate')}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button>
            <PlusCircle className="h-4 w-4 mr-2" />
            {t('addTask')}
          </Button>
        </div>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex space-x-4 overflow-x-auto pb-4 h-[calc(100vh-120px)]">
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
  );
}
