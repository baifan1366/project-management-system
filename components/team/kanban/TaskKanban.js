'use client';

import { useState, useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { PlusIcon, MoreHorizontal , Pen, Trash2, Check, User} from 'lucide-react';
import { Button } from '../../ui/button';
import { useTranslations } from 'next-intl';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../ui/tooltip';
import { updateTaskOrder } from '@/lib/redux/features/sectionSlice'
import { fetchTaskById } from '@/lib/redux/features/taskSlice';
import BodyContent from './BodyContent';
import HandleSection from './HandleSection';
import LikeTask from './LikeTask';
import HandleTask from './HandleTask';

export default function TaskKanban({ projectId, teamId, teamCFId }) {
  const t = useTranslations('CreateTask');
  const dispatch = useDispatch();
  // 将BodyContent作为组件使用，获取返回的数据
  const { initialColumns, initialTasks, initialColumnOrder, loadData, assigneeTagId } = BodyContent({ projectId, teamId, teamCFId });
  const { CreateSection, UpdateSection, DeleteSection } = HandleSection({ 
    teamId, 
    // 添加刷新回调
    onSectionChange: () => {
      console.log('分区变更，重新加载数据...');
      // 强制重新加载看板数据
      loadData(true);
    } 
  });
  const { DeleteTask, selectTask, UpdateTask, CreateTask } = HandleTask({ teamId });
  
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
  
  // 跟踪当前正在编辑的任务
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editingTaskContent, setEditingTaskContent] = useState('');
  
  // 跟踪新创建的任务
  const [newTaskId, setNewTaskId] = useState(null);
  const [newTaskContent, setNewTaskContent] = useState('');
  
  // 跟踪新分区的添加状态
  const [isAddingSection, setIsAddingSection] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState('');
  
  // 添加错误状态
  const [error, setError] = useState({
    type: null, // 'section', 'task', 'newTask'
    message: ''
  });
  
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
  
  // 记录当前使用的assignee标签ID，用于调试
  useEffect(() => {
    if (assigneeTagId) {
      console.log('正在使用的assignee标签ID:', assigneeTagId);
    }
  }, [assigneeTagId]);
  
  // 处理拖拽结束事件
  const onDragEnd = async(result) => {
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
      
      // 根据最新顺序更新源列的任务顺序
      const sectionId = sourceColumn.originalId || sourceColumn.id;
      await dispatch(updateTaskOrder({
        sectionId: sectionId,
        teamId: teamId,
        newTaskIds: newTaskIds
      })).unwrap();
      
      console.log('同列拖拽：更新任务顺序成功', newTaskIds);
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

    // 更新UI状态
    setColumns({
      ...columns,
      [newSourceColumn.id]: newSourceColumn,
      [newDestColumn.id]: newDestColumn,
    });

    try {
      // 1. 更新源列的任务顺序
      const sourceSectionId = sourceColumn.originalId || sourceColumn.id;
      await dispatch(updateTaskOrder({
        sectionId: sourceSectionId,
        teamId: teamId,
        newTaskIds: sourceTaskIds
      })).unwrap();
      
      console.log('源列任务顺序已更新:', sourceTaskIds);
      
      // 2. 更新目标列的任务顺序
      const destSectionId = destColumn.originalId || destColumn.id;
      await dispatch(updateTaskOrder({
        sectionId: destSectionId,
        teamId: teamId,
        newTaskIds: destTaskIds
      })).unwrap();
    } catch (error) {
      console.error('任务拖拽更新失败:', error);
      // 如果发生错误，可以刷新看板恢复状态
      loadData(true);
    }
  };
  
  // 添加新任务的处理函数
  const handleAddTask = (columnId) => {
    const tempTaskId = `task-${Date.now()}`;
    const newTask = {
      id: tempTaskId,
      content: '',  // 初始内容为空，供用户输入
      assignee: null
    };

    // 更新任务列表
    setTasks({
      ...tasks,
      [tempTaskId]: newTask
    });

    // 更新列
    const column = columns[columnId];
    const newTaskIds = Array.from(column.taskIds);
    newTaskIds.push(tempTaskId);

    setColumns({
      ...columns,
      [columnId]: {
        ...column,
        taskIds: newTaskIds
      }
    });
    
    // 设置为正在编辑的新任务
    setNewTaskId(tempTaskId);
    setNewTaskContent('');
  };

  const handleUpdateTask = (taskId) => {
    // 如果已经处于编辑状态，则直接返回
    if (editingTaskId === taskId) {
      return;
    }
    
    // 获取任务对象
    const task = tasks[taskId];
    if (!task) {
      console.error('任务不存在:', taskId);
      return;
    }
    
    // 设置当前正在编辑的任务
    setEditingTaskId(taskId);
    setEditingTaskContent(task.content || '');
    
    // 选中任务
    selectTask(task);
  }

  const handleDeleteTask = ({columnId, taskId}) => {
    // 先选中要删除的任务
    selectTask(tasks[taskId]);
    // 删除任务并在成功后刷新看板
    DeleteTask(columnId, taskId, () => {
      // 使用loadData强制刷新看板数据
      loadData(true);
    });
  }

  const handleAddSection = () => {
    setIsAddingSection(true);
    setNewSectionTitle('');
  }
  
  // 保存新分区
  const saveNewSection = () => {
    const trimmedTitle = newSectionTitle.trim();
    if (trimmedTitle && trimmedTitle.length >= 2 && trimmedTitle.length <= 50) {
      const sectionData = {
        name: trimmedTitle
      }
      CreateSection(sectionData);
      // 清除错误
      setError({ type: null, message: '' });
      setIsAddingSection(false);
    } else {
      // 显示错误
      setError({
        type: 'newSection',
        message: t('sectionNameRequired')
      });
      // 不关闭添加模式
      return;
    }
  }
  
  // 取消添加分区
  const cancelAddSection = () => {
    setIsAddingSection(false);
    setNewSectionTitle('');
    // 清除错误
    setError({ type: null, message: '' });
  }

  // 处理编辑分区
  const handleEditSection = (columnId) => {
    // 如果已经在编辑其他分区，先保存那个分区
    if (editingColumnId && editingColumnId !== columnId) {
      saveEditedTitle();
    }
    
    // 如果正在创建新任务，先取消
    if (newTaskId) {
      cancelNewTask();
    }
    
    // 如果正在编辑任务，先保存
    if (editingTaskId) {
      saveEditedTask();
    }
    
    // 设置当前编辑的列ID和标题
    setEditingColumnId(columnId);
    setEditingTitle(columns[columnId]?.title || '');
  };

  // 保存编辑后的标题  
  const saveEditedTitle = () => {    
    const trimmedTitle = editingTitle.trim();    
    // 确保标题长度在2-50个字符之间    
    if (editingColumnId && trimmedTitle && trimmedTitle.length >= 2 && trimmedTitle.length <= 50) {      
      setColumns({       
         ...columns,        
         [editingColumnId]: {          
          ...columns[editingColumnId],          
          title: trimmedTitle        
        }      
      });            
      // 保存到服务器      
      // 获取完整的column数据     
      const column = columns[editingColumnId];      
      // 如果column有原始id属性，优先使用它      
      const sectionId = column.originalId || editingColumnId;           
      UpdateSection(sectionId, trimmedTitle);
      // 清除错误
      setError({ type: null, message: '' });
    } else if (editingColumnId) {
      // 显示错误
      setError({
        type: 'section',
        message: t('sectionNameRequired')
      });
      return; // 阻止退出编辑模式
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

  // 添加任务点击处理函数
  const handleTaskClick = (task) => {
    // 选中任务
    selectTask(task);
    // 这里可以添加额外的操作，比如显示任务详情等
  };

  // 保存编辑后的任务
  const saveEditedTask = () => {
    const trimmedContent = editingTaskContent.trim();
    
    // 确保任务名称长度在2-100个字符之间
    if (editingTaskId && trimmedContent && trimmedContent.length >= 2 && trimmedContent.length <= 100) {
      // 更新本地状态
      const updatedTask = {
        ...tasks[editingTaskId],
        content: trimmedContent
      };
      
      setTasks({
        ...tasks,
        [editingTaskId]: updatedTask
      });
      
      // 先选中更新后的任务
      selectTask(updatedTask);
      
      // 调用后端API更新任务，传递新的内容
      UpdateTask(editingTaskId, () => {
        // 成功后刷新看板
        loadData(true);
      }, trimmedContent);
      
      // 清除错误
      setError({ type: null, message: '' });
    } else if (editingTaskId) {
      // 显示错误
      setError({
        type: 'task',
        message: t('taskNameRequired')
      });
      return; // 阻止退出编辑模式
    }
    // 退出编辑模式
    setEditingTaskId(null);
  };

  // 取消编辑任务
  const cancelEditTask = () => {
    setEditingTaskId(null);
  };

  // 保存新创建的任务
  const saveNewTask = () => {
    const trimmedContent = newTaskContent.trim();
    
    // 确保任务名称长度在2-100个字符之间
    if (newTaskId && trimmedContent && trimmedContent.length >= 2 && trimmedContent.length <= 100) {
      // 更新本地状态
      const updatedTask = {
        ...tasks[newTaskId],
        content: trimmedContent
      };
      
      setTasks({
        ...tasks,
        [newTaskId]: updatedTask
      });
      
      // 调用 CreateTask API 保存到服务器
      // 获取任务所在的列（分区）
      const columnId = Object.keys(columns).find(colId => 
        columns[colId].taskIds.includes(newTaskId)
      );
      
      if (columnId) {
        // 获取分区的原始ID
        const sectionId = columns[columnId].originalId || columnId;
        
        // 调用 CreateTask API
        CreateTask({
          sectionId,
          content: trimmedContent,
          tempId: newTaskId
        }, () => {
          // 成功后刷新看板
          loadData(true);
        });
      }
      
      // 清除错误
      setError({ type: null, message: '' });
    } else if (newTaskId) {
      // 显示错误
      setError({
        type: 'newTask',
        message: t('taskNameRequired')
      });
      return; // 阻止退出创建模式
    }
    
    // 重置新任务状态
    setNewTaskId(null);
    setNewTaskContent('');
  };
  
  // 取消新任务创建
  const cancelNewTask = () => {
    if (newTaskId) {
      // 从任务列表中移除临时任务
      const newTasks = { ...tasks };
      delete newTasks[newTaskId];
      setTasks(newTasks);
      
      // 从列的任务ID列表中移除
      const columnId = Object.keys(columns).find(colId => 
        columns[colId].taskIds.includes(newTaskId)
      );
      
      if (columnId) {
        const column = columns[columnId];
        const updatedTaskIds = column.taskIds.filter(id => id !== newTaskId);
        
        setColumns({
          ...columns,
          [columnId]: {
            ...column,
            taskIds: updatedTaskIds
          }
        });
      }
    }
    
    // 重置新任务状态
    setNewTaskId(null);
    setNewTaskContent('');
  };

  // 添加全局点击事件处理自动保存
  useEffect(() => {
    const handleGlobalClick = (e) => {
      // 如果正在编辑分区名称，检查点击是否在输入框外
      if (editingColumnId) {
        const inputEl = document.querySelector(`input[data-column-id="${editingColumnId}"]`);
        if (inputEl && !inputEl.contains(e.target)) {
          saveEditedTitle();
        }
      }
      
      // 如果正在编辑任务，检查点击是否在输入框外
      if (editingTaskId) {
        const inputEl = document.querySelector(`input[data-task-id="${editingTaskId}"]`);
        if (inputEl && !inputEl.contains(e.target)) {
          saveEditedTask();
        }
      }
      
      // 如果正在创建新任务，检查点击是否在输入框外
      if (newTaskId) {
        const inputEl = document.querySelector(`input[data-new-task-id="${newTaskId}"]`);
        if (inputEl && !inputEl.contains(e.target)) {
          saveNewTask();
        }
      }
      
      // 如果正在添加新分区，检查点击是否在输入框外
      if (isAddingSection) {
        const inputEl = document.querySelector(`input[data-adding-section="true"]`);
        if (inputEl && !inputEl.contains(e.target)) {
          saveNewSection();
        }
      }
    };
    
    document.addEventListener('mousedown', handleGlobalClick);
    return () => {
      document.removeEventListener('mousedown', handleGlobalClick);
    };
  }, [editingColumnId, editingTaskId, newTaskId, isAddingSection, editingTitle, editingTaskContent, newTaskContent, newSectionTitle]);

  return (
    <div className="p-2">
      {/* 显示错误消息 */}
      {error.type && (
        <div className="bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 p-2 mb-4 rounded-md">
          {error.message}
        </div>
      )}
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="all-columns" direction="horizontal" type="column">
          {(provided) => (
            <div 
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="flex gap-4 overflow-x-auto pb-4"
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
                        className="w-64 min-w-[240px] max-w-[240px] flex-shrink-0 bg-background border border-transparent hover:border hover:border-border rounded-lg"
                      >
                        <div className="p-2">
                          <div 
                            className="flex justify-between items-center mb-2 p-1"
                            {...provided.dragHandleProps}
                          >
                            {editingColumnId === column?.id ? (
                              <div className="flex items-center flex-grow mr-2">
                                <input                                  
                                  type="text"                                  
                                  value={editingTitle}                                  
                                  onChange={(e) => setEditingTitle(e.target.value)}                                  
                                  className={`font-semibold bg-white dark:bg-black border ${error.type === 'section' ? 'border-red-500' : 'border-border'} rounded px-2 py-1 text-black dark:text-white w-[140px]`}
                                  autoFocus                                  
                                  onBlur={saveEditedTitle}                                  
                                  onKeyPress={(e) => e.key === 'Enter' && saveEditedTitle()}                                  
                                  minLength={2}                                  
                                  maxLength={50}
                                  data-column-id={column?.id}
                                />
                                <span className="text-black dark:text-white ml-1 whitespace-nowrap">{column?.taskIds?.length || 0}</span>
                              </div>
                            ) : (
                              <div className="flex items-center flex-grow mr-2">
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <h2 className="font-semibold text-black break-words line-clamp-4 max-h-[90px] max-w-[140px] dark:text-white">{column?.title}</h2>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>{column?.title}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                                <span className="text-gray-800 dark:text-gray-400 ml-1 whitespace-nowrap">{column?.taskIds?.length || 0}</span>
                              </div>
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
                                className="min-h-[10px] max-h-[500px] bg-gray-100 rounded-lg dark:bg-black overflow-y-auto"
                              >
                                {columnTasks.map((task, taskIndex) => (
                                  task ? (
                                    <Draggable key={task.id} draggableId={task.id} index={taskIndex}>
                                      {(provided) => (
                                        <div
                                          ref={provided.innerRef}
                                          {...provided.draggableProps}
                                          {...provided.dragHandleProps}
                                          className="p-3 mb-2 bg-white dark:bg-gray-800 rounded-md hover:bg-gray-200 hover:dark:bg-accent relative group"
                                          onClick={() => handleTaskClick(task)}
                                        >
                                          {/* 顶部栏 */}
                                          <div className="flex justify-between items-start">
                                            <div className="flex items-start flex-grow overflow-hidden mr-2">
                                              <LikeTask task={task} onLikeUpdate={() => {}} />
                                              {editingTaskId === task.id ? (
                                                <input
                                                  type="text"
                                                  value={editingTaskContent}
                                                  onChange={(e) => setEditingTaskContent(e.target.value)}
                                                  className={`w-full bg-white dark:bg-black border ${error.type === 'task' ? 'border-red-500' : 'border-border'} rounded px-2 py-1 text-sm text-black dark:text-white`}
                                                  autoFocus
                                                  onBlur={saveEditedTask}
                                                  onKeyPress={(e) => e.key === 'Enter' && saveEditedTask()}
                                                  onKeyDown={(e) => {
                                                    if (e.key === 'Escape') {
                                                      e.stopPropagation();
                                                      cancelEditTask();
                                                    }
                                                  }}
                                                  onClick={(e) => e.stopPropagation()}
                                                  minLength={2}                                                  
                                                  maxLength={100}
                                                  data-task-id={task.id}
                                                />
                                              ) : newTaskId === task.id ? (
                                                <input
                                                  type="text"
                                                  value={newTaskContent}
                                                  onChange={(e) => setNewTaskContent(e.target.value)}
                                                  className={`w-full bg-white dark:bg-black border ${error.type === 'newTask' ? 'border-red-500' : 'border-border'} rounded px-2 py-1 text-sm text-black dark:text-white`}
                                                  autoFocus
                                                  placeholder={t('enterTaskName')}
                                                  onBlur={saveNewTask}
                                                  onKeyPress={(e) => e.key === 'Enter' && saveNewTask()}
                                                  onKeyDown={(e) => {
                                                    if (e.key === 'Escape') {
                                                      e.stopPropagation();
                                                      cancelNewTask();
                                                    }
                                                  }}
                                                  onClick={(e) => e.stopPropagation()}
                                                  minLength={2}                                                  
                                                  maxLength={100}
                                                  data-new-task-id={task.id}
                                                />
                                              ) : (                                                  
                                              <TooltipProvider>
                                                <Tooltip>
                                                  <TooltipTrigger asChild>
                                                    <span className="text-sm text-black dark:text-white line-clamp-6 break-words">{task.content}</span>
                                                  </TooltipTrigger>
                                                  <TooltipContent className="">
                                                    <p>{task.content}</p>
                                                  </TooltipContent>
                                                </Tooltip>
                                              </TooltipProvider>
                                              )}
                                            </div>
                                            <div className="flex-shrink-0">
                                              <button 
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleUpdateTask(task.id);
                                                }}
                                                className="invisible group-hover:visible p-1 rounded-md hover:bg-white hover:dark:bg-black"
                                              >
                                                <Pen size={14} className="text-gray-500" />
                                              </button>
                                            </div>
                                          </div>
                                          
                                          {/* 底部栏 */}
                                          <div className="flex justify-between items-center mt-2">
                                            <div className="flex items-center">
                                              <User size={14} className="text-gray-500 mr-1" />
                                              {/* 显示assignee信息 */}
                                              {task.assignee ? (
                                                <div className="flex items-center">
                                                  {/* 处理多个assignee的情况 */}
                                                  {task.assignee.assignees ? (
                                                    <span className="text-xs text-gray-500">
                                                      {task.assignee.assignees.length} {t('assignees')}
                                                    </span>
                                                  ) : (
                                                    <span className="text-xs text-gray-500">
                                                      {task.assignee.assignee || t('assigned')}
                                                    </span>
                                                  )}
                                                </div>
                                              ) : (
                                                <span className="text-xs text-gray-500">{t('unassigned')}</span>
                                              )}
                                            </div>
                                            <div>
                                              <button 
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleDeleteTask({columnId: column?.id, taskId: task.id});
                                                }}
                                                className="invisible group-hover:visible p-1 rounded-md hover:bg-white hover:dark:bg-black"
                                              >
                                                <Trash2 size={14} className="text-red-500" />
                                              </button>
                                            </div>
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
              <div className="w-64 min-w-[240px] max-w-[240px] flex-shrink-0 flex flex-col bg-background border border-transparent hover:border hover:border-border rounded-lg p-2 items-center justify-center">
                {isAddingSection ? (
                  <div className="w-full">
                    <div className="flex items-center">
                      <input                        
                      type="text"                        
                      value={newSectionTitle}                        
                      onChange={(e) => setNewSectionTitle(e.target.value)}                        
                      className={`w-[200px] bg-white dark:bg-black border ${error.type === 'newSection' ? 'border-red-500' : 'border-border'} rounded px-2 py-1 text-black dark:text-white`}                        
                      placeholder={t('enterSectionName')}                        
                      autoFocus                        
                      onBlur={saveNewSection}                        
                      onKeyPress={(e) => e.key === 'Enter' && saveNewSection()}                        
                      onKeyDown={(e) => e.key === 'Escape' && cancelAddSection()}                        
                      minLength={2}                        
                      maxLength={50}                        
                      data-adding-section="true"
                      />
                    </div>
                  </div>
                ) : (
                  <Button 
                    variant="ghost"
                    className="w-60 h-[40px] text-gray-400 justify-center items-center"
                    onClick={() => handleAddSection()}
                  >
                    <PlusIcon size={20} className="text-muted-foreground mr-2" />
                    <span className="text-muted-foreground">{t('addNewSection')}</span>
                  </Button>
                )}
              </div>
              
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
}