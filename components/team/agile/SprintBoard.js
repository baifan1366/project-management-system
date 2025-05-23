"use client";

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import BodyContent from './BodyContent';

// 列类型定义
const COLUMNS = {
  todo: {
    id: 'todo',
    title: 'todo',
    color: 'bg-gray-100'
  },
  in_progress: {
    id: 'in_progress',
    title: 'inProgress',
    color: 'bg-blue-100'
  },
  review: {
    id: 'review',
    title: 'review',
    color: 'bg-yellow-100'
  },
  done: {
    id: 'done',
    title: 'done',
    color: 'bg-green-100'
  }
};

const SprintBoard = ({ teamId, projectId, currentSprint, sprints }) => {
    const t = useTranslations('Agile');
  const [tasks, setTasks] = useState([]);
  const [columns, setColumns] = useState({
    todo: { items: [] },
    in_progress: { items: [] },
    review: { items: [] },
    done: { items: [] }
  });
  const [loading, setLoading] = useState(true);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null);

  // 获取冲刺的任务
  useEffect(() => {
    if (currentSprint) {
      // 这里应该从数据库获取冲刺任务
      // fetchSprintTasks(currentSprint.id);
      
      // 模拟数据
      const mockTasks = [
        { 
          id: 1, 
          title: '用户注册页面', 
          description: '创建新的用户注册页面，包含表单验证', 
          priority: 'high',
          status: 'todo',
          estimate: '8',
          assignee: {
            id: 1,
            name: '张三',
            avatar: null
          }
        },
        { 
          id: 2, 
          title: '后端API文档', 
          description: '编写API文档，包含所有端点和认证方法', 
          priority: 'medium',
          status: 'todo',
          estimate: '5',
          assignee: {
            id: 2,
            name: '李四',
            avatar: null
          }
        },
        { 
          id: 3, 
          title: '首页重构', 
          description: '重构首页组件，提高性能和可维护性', 
          priority: 'medium',
          status: 'in_progress',
          estimate: '13',
          assignee: {
            id: 1,
            name: '张三',
            avatar: null
          }
        },
        { 
          id: 4, 
          title: '用户认证服务', 
          description: '实现JWT认证服务，支持令牌刷新', 
          priority: 'high',
          status: 'review',
          estimate: '8',
          assignee: {
            id: 3,
            name: '王五',
            avatar: null
          }
        },
        { 
          id: 5, 
          title: '数据库索引优化', 
          description: '添加必要的索引提高查询性能', 
          priority: 'low',
          status: 'done',
          estimate: '3',
          assignee: {
            id: 4,
            name: '赵六',
            avatar: null
          }
        }
      ];
      
      setTasks(mockTasks);
      
      // 根据任务状态分组
      const newColumns = {
        todo: { items: [] },
        in_progress: { items: [] },
        review: { items: [] },
        done: { items: [] }
      };
      
      mockTasks.forEach(task => {
        if (task.status && newColumns[task.status]) {
          newColumns[task.status].items.push(task);
        } else {
          // 如果状态不是预定义的列，则放入待处理列
          newColumns.todo.items.push({...task, status: 'todo'});
        }
      });
      
      setColumns(newColumns);
      setLoading(false);
    } else {
      setTasks([]);
      setColumns({
        todo: { items: [] },
        in_progress: { items: [] },
        review: { items: [] },
        done: { items: [] }
      });
      setLoading(false);
    }
  }, [currentSprint]);

  // 处理拖拽结束事件
  const onDragEnd = (result) => {
    if (!result.destination) return;
    
    const { source, destination } = result;
    
    // 如果是拖动到相同的列中的相同位置
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return;
    }
    
    // 获取源列和目标列
    const sourceColumn = columns[source.droppableId];
    const destColumn = columns[destination.droppableId];
    
    // 如果在同一列内移动
    if (source.droppableId === destination.droppableId) {
      const newItems = Array.from(sourceColumn.items);
      const [movedItem] = newItems.splice(source.index, 1);
      newItems.splice(destination.index, 0, movedItem);
      
      const newColumns = {
        ...columns,
        [source.droppableId]: {
          ...sourceColumn,
          items: newItems
        }
      };
      
      setColumns(newColumns);
    } 
    // 如果在不同列之间移动
    else {
      const sourceItems = Array.from(sourceColumn.items);
      const destItems = Array.from(destColumn.items);
      const [movedItem] = sourceItems.splice(source.index, 1);
      
      // 更新任务状态
      const updatedItem = {
        ...movedItem,
        status: destination.droppableId
      };
      
      destItems.splice(destination.index, 0, updatedItem);
      
      const newColumns = {
        ...columns,
        [source.droppableId]: {
          ...sourceColumn,
          items: sourceItems
        },
        [destination.droppableId]: {
          ...destColumn,
          items: destItems
        }
      };
      
      setColumns(newColumns);
      
      // 更新任务列表
      const newTasks = tasks.map(task => {
        if (task.id === movedItem.id) {
          return updatedItem;
        }
        return task;
      });
      
      setTasks(newTasks);
      
      // 在实际应用中，这里应该调用API保存任务状态更新
      toast.success(`${t('task')} "${movedItem.title}" ${t('statusUpdatedTo')} ${t(COLUMNS[destination.droppableId].title)}`);
    }
  };

  // 确认删除任务
  const confirmDeleteTask = (task) => {
    setTaskToDelete(task);
    setConfirmDialogOpen(true);
  };

  // 执行删除任务
  const deleteTask = () => {
    if (!taskToDelete) return;
    
    // 从列中移除任务
    const sourceColumnId = taskToDelete.status;
    const sourceColumn = columns[sourceColumnId];
    
    if (sourceColumn) {
      const newItems = sourceColumn.items.filter(item => item.id !== taskToDelete.id);
      
      const newColumns = {
        ...columns,
        [sourceColumnId]: {
          ...sourceColumn,
          items: newItems
        }
      };
      
      setColumns(newColumns);
      
      // 更新任务列表
      const newTasks = tasks.filter(task => task.id !== taskToDelete.id);
      setTasks(newTasks);
      
      // 在实际应用中，这里应该调用API删除任务
      toast.success(`任务 "${taskToDelete.title}" ${t('deleted')}`);
    }
    
    setTaskToDelete(null);
    setConfirmDialogOpen(false);
  };

  if (!currentSprint) {
    return (
      <div className="flex items-center justify-center p-8">
        <BodyContent loading={false}>
          <p>{t('noSprintTasks')}</p>
          <p className="text-muted-foreground">{t('pleaseSelectOrCreateASprint')}</p>
        </BodyContent>
      </div>
    );
  }
  
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <BodyContent loading={true} />
      </div>
    );
  }
  
  return (
    <BodyContent>
      <div className="space-y-4">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-lg font-semibold">{t('board')}</h2>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">
              {t('remaining')} {Math.ceil((new Date(currentSprint.endDate) - new Date()) / (1000 * 60 * 60 * 24))} {t('days')}
            </p>
          </div>
        </div>
        
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(COLUMNS).map(([columnId, column]) => (
              <div key={columnId} className="flex flex-col h-full">
                <Card className={cn("flex-1", column.color)}>
                  <CardHeader className="p-3">
                    <CardTitle className="text-sm font-medium flex justify-between items-center">
                      <span>{t(column.title)}</span>
                      <Badge variant="outline" className="ml-2">
                        {columns[columnId].items.length}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-2 flex-1">
                    <Droppable droppableId={columnId}>
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className="min-h-[300px]"
                        >
                          {columns[columnId].items.map((task, index) => (
                            <Draggable 
                              key={task.id} 
                              draggableId={task.id.toString()} 
                              index={index}
                              isDragDisabled={currentSprint.status !== 'in_progress'}
                            >
                              {(provided) => (
                                <Card
                                  className="mb-2 bg-white"
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                >
                                  <CardContent className="p-3 space-y-2">
                                    <div className="flex justify-between items-start">
                                      <div className="font-medium">{task.title}</div>
                                      {currentSprint.status === 'in_progress' && (
                                        <Button
                                          variant="ghost" 
                                          size="icon"
                                          className="h-6 w-6"
                                          onClick={() => confirmDeleteTask(task)}
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      )}
                                    </div>
                                    <p className="text-xs text-muted-foreground line-clamp-2">
                                      {task.description}
                                    </p>
                                    <div className="flex justify-between items-center pt-1">
                                      <div className="flex items-center space-x-1">
                                        <Badge 
                                          className={cn(
                                            "text-xs",
                                            task.priority === 'high' && "bg-red-100 text-red-800 hover:bg-red-100",
                                            task.priority === 'medium' && "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
                                            task.priority === 'low' && "bg-green-100 text-green-800 hover:bg-green-100"
                                          )}
                                          variant="outline"
                                        >
                                          {task.priority === 'high' && t('high')}
                                          {task.priority === 'medium' && t('medium')}
                                          {task.priority === 'low' && t('low')}
                                        </Badge>
                                      </div>
                                      
                                      {task.assignee && (
                                        <Avatar className="h-6 w-6">
                                          {task.assignee.avatar && (
                                            <AvatarImage src={task.assignee.avatar} />
                                          )}
                                          <AvatarFallback className="text-xs">
                                            {task.assignee.name.substring(0, 1)}
                                          </AvatarFallback>
                                        </Avatar>
                                      )}
                                    </div>
                                  </CardContent>
                                </Card>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </DragDropContext>
      </div>
      
      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteTask')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('confirmDeleteTask')} "{taskToDelete?.title}"? {t('actionCannotBeUndo')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={deleteTask} className="bg-red-600 hover:bg-red-700">
              {t('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </BodyContent>
  );
};

export default SprintBoard; 