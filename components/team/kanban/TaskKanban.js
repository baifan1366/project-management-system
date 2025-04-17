'use client';

import { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { PlusIcon, MoreHorizontal , ThumbsUp, Pen, Trash2, Check, User} from 'lucide-react';
import { Button } from '../../ui/button';

// 创建伪数据
const initialColumns = {
  'doing': {
    id: 'doing',
    title: 'Doing',
    taskIds: ['task-2', 'task-3']
  },
  'done': {
    id: 'done',
    title: 'Done',
    taskIds: ['task-4', 'task-5', 'task-6']
  },
  'todo': {
    id: 'todo',
    title: 'To do',
    taskIds: ['task-1']
  }
};

const initialTasks = {
  'task-1': {
    id: 'task-1',
    content: 'Meeting Report',
    assignee: {
      avatar: '/avatar-placeholder.png'
    }
  },
  'task-2': {
    id: 'task-2',
    content: '设计首页UI',
    assignee: null
  },
  'task-3': {
    id: 'task-3',
    content: '后端API开发',
    assignee: null
  },
  'task-4': {
    id: 'task-4',
    content: '测试用户注册流程',
    assignee: null
  },
  'task-5': {
    id: 'task-5',
    content: '修复登录Bug',
    assignee: null
  },
  'task-6': {
    id: 'task-6',
    content: '优化数据库查询',
    assignee: null
  }
};

const initialColumnOrder = ['doing', 'done', 'todo'];

export default function TaskKanban({ projectId, teamId, teamCFId }) {
  const [tasks, setTasks] = useState(initialTasks);
  const [columns, setColumns] = useState(initialColumns);
  const [columnOrder, setColumnOrder] = useState(initialColumnOrder);

  // 处理拖拽结束事件
  const onDragEnd = (result) => {
    const { destination, source, draggableId, type } = result;

    // 如果没有目标位置（拖出界面）则不做任何改变
    if (!destination) {
      return;
    }

    // 如果目标位置与源位置相同则不做任何改变
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    // 处理列的拖拽排序
    if (type === 'column') {
      const newColumnOrder = Array.from(columnOrder);
      newColumnOrder.splice(source.index, 1);
      newColumnOrder.splice(destination.index, 0, draggableId);

      setColumnOrder(newColumnOrder);
      return;
    }

    // 处理同一列内的排序
    const sourceColumn = columns[source.droppableId];
    const destColumn = columns[destination.droppableId];

    if (sourceColumn === destColumn) {
      const newTaskIds = Array.from(sourceColumn.taskIds);
      newTaskIds.splice(source.index, 1);
      newTaskIds.splice(destination.index, 0, draggableId);

      const newColumn = {
        ...sourceColumn,
        taskIds: newTaskIds,
      };

      setColumns({
        ...columns,
        [newColumn.id]: newColumn,
      });
      return;
    }

    // 处理跨列拖拽
    const sourceTaskIds = Array.from(sourceColumn.taskIds);
    sourceTaskIds.splice(source.index, 1);
    const newSourceColumn = {
      ...sourceColumn,
      taskIds: sourceTaskIds,
    };

    const destTaskIds = Array.from(destColumn.taskIds);
    destTaskIds.splice(destination.index, 0, draggableId);
    const newDestColumn = {
      ...destColumn,
      taskIds: destTaskIds,
    };

    setColumns({
      ...columns,
      [newSourceColumn.id]: newSourceColumn,
      [newDestColumn.id]: newDestColumn,
    });
  };

  // 添加新任务的处理函数
  const handleAddTask = (columnId) => {
    const newTaskId = `task-${Date.now()}`;
    const newTask = {
      id: newTaskId,
      content: '新任务',
      assignee: null
    };

    // 更新任务列表
    setTasks({
      ...tasks,
      [newTaskId]: newTask
    });

    // 更新列
    const column = columns[columnId];
    const newTaskIds = Array.from(column.taskIds);
    newTaskIds.push(newTaskId);

    setColumns({
      ...columns,
      [columnId]: {
        ...column,
        taskIds: newTaskIds
      }
    });
  };

  return (
    <div className="p-2">
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="all-columns" direction="horizontal" type="column">
          {(provided) => (
            <div 
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="flex gap-4"
            >
              {columnOrder.map((columnId, index) => {
                const column = columns[columnId];
                const columnTasks = column.taskIds.map(taskId => tasks[taskId]);

                return (
                  <Draggable key={column.id} draggableId={column.id} index={index}>
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className="flex-1 bg-background hover:border hover:border-border rounded-lg"
                      >
                        <div className="p-2">
                          <div 
                            className="flex justify-between items-center mb-2 p-1"
                            {...provided.dragHandleProps}
                          >
                            <h2 className="font-semibold text-muted-foreground">{column.title} <span className="text-gray-400 ml-1">{column.taskIds.length}</span></h2>
                            <div className="flex">
                              <button 
                                onClick={() => handleAddTask(column.id)}
                                className="p-1 hover:bg-gray-200 hover:dark:bg-gray-800 rounded-md"
                              >
                                <PlusIcon size={16} className="text-gray-400" />
                              </button>
                              <button className="p-1 hover:bg-gray-200 hover:dark:bg-gray-800 rounded-md">
                                <MoreHorizontal size={16} className="text-gray-400" />
                              </button>
                            </div>
                          </div>
                          <Droppable droppableId={column.id} type="task">
                            {(provided) => (
                              <div
                                {...provided.droppableProps}
                                ref={provided.innerRef}
                                className="max-h-[500px] bg-gray-100 rounded-lg dark:bg-gray-700 overflow-y-auto"
                              >
                                {columnTasks.map((task, index) => (
                                  <Draggable key={task.id} draggableId={task.id} index={index}>
                                    {(provided) => (
                                      <div
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        {...provided.dragHandleProps}
                                        className="p-3 rounded-md hover:bg-gray-200 hover:dark:bg-gray-800 relative group"
                                      >
                                        {/* 顶部栏 */}
                                        <div className="flex justify-between items-center">
                                          <div className="flex items-center">
                                            <button className="mr-2 h-5 w-5 rounded-full flex items-center justify-center border border-gray-300 hover:bg-gray-200">
                                              <Check size={12} className="text-gray-500" />
                                            </button>
                                            <span className="text-sm text-black dark:text-white">{task.content}</span>
                                          </div>
                                          <button className="invisible group-hover:visible p-1 hover:bg-gray-200 hover:dark:bg-gray-700 rounded-md">
                                            <Pen size={14} className="text-gray-500" />
                                          </button>
                                        </div>
                                        
                                        {/* 底部栏 */}
                                        <div className="flex justify-between items-center mt-2">
                                          <div>
                                            <User size={14} className="text-gray-500" />
                                          </div>
                                          <button className="invisible group-hover:visible p-1 hover:bg-gray-200 hover:dark:bg-gray-700 rounded-md">
                                            <ThumbsUp size={14} className="text-gray-500" />
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                  </Draggable>
                                ))}
                                {provided.placeholder}
                              </div>
                            )}
                          </Droppable>
                          <Button 
                            variant="ghost"
                            className="w-full mt-1 text-gray-400 text-sm py-2 hover:bg-gray-100 hover:dark:bg-gray-700 rounded-md flex items-center justify-center"
                            onClick={() => handleAddTask(column.id)}
                          >
                            <PlusIcon size={14} className="mr-1 text-muted-foreground" />
                            <span className="text-muted-foreground">添加任务</span>
                          </Button>
                        </div>
                      </div>
                    )}
                  </Draggable>
                );
              })}
              
              {/* 添加新分区按钮 */}
              <div className="w-64 flex flex-col bg-background hover:border hover:border-border rounded-lg p-2">
                <Button 
                  variant="ghost"
                  className="w-full p-4 text-gray-400 justify-start"
                >
                  <PlusIcon size={20} className="text-muted-foreground mr-2" />
                  <span className="text-muted-foreground">添加新分区</span>
                </Button>
                <div className="w-full min-h-[500px] mt-1 bg-gray-100 rounded-lg dark:bg-gray-700"></div>
              </div>
              
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
}