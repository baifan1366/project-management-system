'use client';

import { useState, useEffect, useRef } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { PlusIcon, MoreHorizontal , ThumbsUp, Pen, Trash2, Check, User} from 'lucide-react';
import { Button } from '../../ui/button';
import { useTranslations } from 'next-intl';
import BodyContent from './BodyContent';
import HandleSection from './HandleSection';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../ui/dropdown-menu';

export default function TaskKanban({ projectId, teamId, teamCFId }) {
  const t = useTranslations('CreateTask');

  // 将BodyContent作为组件使用，获取返回的数据
  const { initialColumns, initialTasks, initialColumnOrder, loadData } = BodyContent({ projectId, teamId, teamCFId });
  const { CreateSection, UpdateSection, DeleteSection } = HandleSection({ 
    teamId, 
    // 添加刷新回调
    onSectionChange: () => {
      console.log('分区变更，重新加载数据...');
      // 强制重新加载看板数据
      loadData(true);
    } 
  });
  
  // 使用useRef跟踪是否已初始化，避免重复初始化引起的循环
  const isInitialized = useRef(false);
  
  // 使用空对象作为初始值而不是空字符串
  const [tasks, setTasks] = useState({});
  const [columns, setColumns] = useState({});
  const [columnOrder, setColumnOrder] = useState([]);
  
  // 跟踪当前打开的dropdown
  const [openDropdownId, setOpenDropdownId] = useState(null);
  
  // 跟踪当前正在编辑的列
  const [editingColumnId, setEditingColumnId] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');
  
  // 跟踪新分区的添加状态
  const [isAddingSection, setIsAddingSection] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState('');
  
  // 只在组件挂载和初始数据变化时更新状态
  useEffect(() => {
    // 确保初始数据是对象而不是空字符串
    if (
      (initialTasks && typeof initialTasks === 'object' && Object.keys(initialTasks).length > 0) ||
      (initialColumns && typeof initialColumns === 'object' && Object.keys(initialColumns).length > 0)
    ) {
      // 更新本地状态，无论是否已初始化
      setTasks(initialTasks);
      setColumns(initialColumns);
      setColumnOrder(initialColumnOrder);
      
      // 标记为已初始化
      if (!isInitialized.current) {
        isInitialized.current = true;
      }
    }
  }, [initialTasks, initialColumns, initialColumnOrder]);
  
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

  const handleAddSection = () => {
    setIsAddingSection(true);
    setNewSectionTitle('');
  }
  
  // 保存新分区
  const saveNewSection = () => {
    if (newSectionTitle.trim()) {
      const sectionData = {
        name: newSectionTitle.trim()
      }
      CreateSection(sectionData);
    }
    setIsAddingSection(false);
  }
  
  // 取消添加分区
  const cancelAddSection = () => {
    setIsAddingSection(false);
    setNewSectionTitle('');
  }

  // 处理编辑分区
  const handleEditSection = (columnId) => {
    // 设置当前编辑的列ID和标题
    setEditingColumnId(columnId);
    setEditingTitle(columns[columnId]?.title || '');
  };

  // 保存编辑后的标题
  const saveEditedTitle = () => {
    if (editingColumnId && editingTitle.trim()) {
      setColumns({
        ...columns,
        [editingColumnId]: {
          ...columns[editingColumnId],
          title: editingTitle.trim()
        }
      });
      
      // 保存到服务器
      // 获取完整的column数据
      const column = columns[editingColumnId];
      // 如果column有原始id属性，优先使用它
      const sectionId = column.originalId || editingColumnId;
      
      UpdateSection(sectionId, editingTitle.trim());
    }
    // 退出编辑模式
    setEditingColumnId(null);
  };

  // 处理删除分区
  const handleDeleteSection = (columnId) => {   
    // 获取完整的column数据
    const column = columns[columnId];
    // 如果column有原始id属性，优先使用它
    const sectionId = column.originalId || column.id;
    // 传递ID给DeleteSection
    DeleteSection(sectionId);
  };

  // 点击其他地方关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = () => {
      setOpenDropdownId(null);
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

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
                const columnTasks = column?.taskIds?.map(taskId => tasks[taskId]) || [];

                return (
                  <Draggable key={column?.id || index} draggableId={column?.id || `column-${index}`} index={index}>
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className="flex-1 bg-background border border-transparent hover:border hover:border-border rounded-lg"
                      >
                        <div className="p-2">
                          <div 
                            className="flex justify-between items-center mb-2 p-1"
                            {...provided.dragHandleProps}
                          >
                            {editingColumnId === column?.id ? (
                              <div className="flex items-center">
                                <input
                                  type="text"
                                  value={editingTitle}
                                  onChange={(e) => setEditingTitle(e.target.value)}
                                  className="font-semibold bg-white dark:bg-black border border-border rounded px-2 py-1 text-black dark:text-white"
                                  autoFocus
                                  onBlur={saveEditedTitle}
                                  onKeyPress={(e) => e.key === 'Enter' && saveEditedTitle()}
                                />
                                <span className="text-black dark:text-white ml-1">{column?.taskIds?.length || 0}</span>
                              </div>
                            ) : (
                              <h2 className="font-semibold text-black dark:text-white">{column?.title} <span className="text-black dark:text-white ml-1">{column?.taskIds?.length || 0}</span></h2>
                            )}
                            <div className="flex">
                              <Button 
                                variant="ghost"
                                onClick={() => handleAddTask(column?.id)}
                                className="p-1"
                              >
                                <PlusIcon size={16} className="text-gray-400" />
                              </Button>
                              
                              {/* 使用DropdownMenu组件替换自定义下拉菜单 */}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button 
                                    variant="ghost"
                                    className="p-1"
                                  >
                                    <MoreHorizontal size={16} className="text-gray-400" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-40">
                                  <DropdownMenuItem 
                                    onClick={() => handleEditSection(column?.id)}
                                    className="cursor-pointer flex items-center"
                                  >
                                    <Pen size={14} className="mr-2" />
                                    {t('editSection')}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => handleDeleteSection(column?.id)}
                                    className="cursor-pointer flex items-center text-red-600 focus:text-red-600"
                                  >
                                    <Trash2 size={14} className="mr-2" />
                                    {t('deleteSection')}
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                          <Droppable droppableId={column?.id || `column-${index}`} type="task">
                            {(provided) => (
                              <div
                                {...provided.droppableProps}
                                ref={provided.innerRef}
                                className="max-h-[500px] bg-gray-100 rounded-lg dark:bg-black overflow-y-auto"
                              >
                                {columnTasks.map((task, taskIndex) => (
                                  task ? (
                                    <Draggable key={task.id} draggableId={task.id} index={taskIndex}>
                                      {(provided) => (
                                        <div
                                          ref={provided.innerRef}
                                          {...provided.draggableProps}
                                          {...provided.dragHandleProps}
                                          className="p-3 rounded-md hover:bg-gray-200 hover:dark:bg-accent relative group"
                                        >
                                          {/* 顶部栏 */}
                                          <div className="flex justify-between items-center">
                                            <div className="flex items-center">
                                              <button className="mr-2 h-5 w-5 rounded-full flex items-center justify-center border border-gray-300 hover:bg-gray-200">
                                                <Check size={12} className="text-gray-500" />
                                              </button>
                                              <span className="text-sm text-black dark:text-white">{task.content}</span>
                                            </div>
                                            <button className="invisible group-hover:visible p-1 rounded-md hover:bg-white hover:dark:bg-black">
                                              <Pen size={14} className="text-gray-500" />
                                            </button>
                                          </div>
                                          
                                          {/* 底部栏 */}
                                          <div className="flex justify-between items-center mt-2">
                                            <div>
                                              <User size={14} className="text-gray-500" />
                                            </div>
                                            <button className="invisible group-hover:visible p-1 rounded-md hover:bg-white hover:dark:bg-black">
                                              <ThumbsUp size={14} className="text-gray-500" />
                                            </button>
                                          </div>
                                        </div>
                                      )}
                                    </Draggable>
                                  ) : null
                                ))}
                                {provided.placeholder}
                              </div>
                            )}
                          </Droppable>
                          <Button 
                            variant="ghost"
                            className="w-full mt-1 text-gray-400 text-sm py-2 rounded-md flex items-center justify-center"
                            onClick={() => handleAddTask(column?.id)}
                          >
                            <PlusIcon size={14} className="mr-1 text-muted-foreground" />
                            <span className="text-muted-foreground">{t('addTask')}</span>
                          </Button>
                        </div>
                      </div>
                    )}
                  </Draggable>
                );
              })}
              
              {/* 添加新分区按钮 */}
              <div className="w-64 flex flex-col bg-background border border-transparent hover:border hover:border-border rounded-lg p-2 items-center justify-center">
                {isAddingSection ? (
                  <div className="w-full">
                    <div className="flex items-center">
                      <input
                        type="text"
                        value={newSectionTitle}
                        onChange={(e) => setNewSectionTitle(e.target.value)}
                        className="w-full bg-white dark:bg-black border border-border rounded px-2 py-1 text-black dark:text-white"
                        placeholder={t('enterSectionName')}
                        autoFocus
                        onBlur={saveNewSection}
                        onKeyPress={(e) => e.key === 'Enter' && saveNewSection()}
                        onKeyDown={(e) => e.key === 'Escape' && cancelAddSection()}
                      />
                    </div>
                  </div>
                ) : (
                  <Button 
                    variant="ghost"
                    className="w-full p-4 text-gray-400 justify-center items-center"
                    onClick={() => handleAddSection()}
                  >
                    <PlusIcon size={20} className="text-muted-foreground mr-2" />
                    <span className="text-muted-foreground">{t('addNewSection')}</span>
                  </Button>
                )}
                <div className="w-full min-h-[500px] mt-1 bg-background rounded-lg dark:bg-background"></div>
              </div>
              
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
}