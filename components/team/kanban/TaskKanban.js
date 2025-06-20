'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { PlusIcon, MoreHorizontal , Pen, Trash2, Check, User, X} from 'lucide-react';
import { Button } from '../../ui/button';
import { useTranslations } from 'next-intl';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../ui/tooltip';
import { updateTaskOrder } from '@/lib/redux/features/sectionSlice'
import { updateSectionOrder } from '@/lib/redux/features/sectionSlice'
import { fetchTaskById, updateTask } from '@/lib/redux/features/taskSlice';
import { useGetUser } from '@/lib/hooks/useGetUser';
import BodyContent from './BodyContent';
import HandleSection from './HandleSection';
import LikeTask from './LikeTask';
import HandleTask from './HandleTask';
import { Avatar, AvatarFallback, AvatarImage } from "../../ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "../../ui/popover";
import { fetchTeamUsers } from '@/lib/redux/features/teamUserSlice';
import { fetchUserById } from '@/lib/redux/features/usersSlice';
import { createSelector } from '@reduxjs/toolkit';

// 创建全局用户缓存
const userCache = {};
// 创建全局请求跟踪器
const pendingRequests = new Set();
// 创建请求节流控制器
const throttleControl = {
  timeouts: {},
  throttleTime: 2000, // 同一用户ID的请求间隔2秒
  
  canRequest(userId) {
    return !this.timeouts[userId];
  },
  
  startThrottle(userId) {
    if (!userId) return;
    this.timeouts[userId] = true;
    setTimeout(() => {
      delete this.timeouts[userId];
    }, this.throttleTime);
  }
};

// 创建记忆化选择器
const selectUserById = createSelector(
  [(state) => state.users?.entities, (state, userId) => userId],
  (usersEntities, userId) => usersEntities ? usersEntities[userId] : null
);

// 创建记忆化的团队成员选择器
const selectTeamMembers = createSelector(
  [(state, teamId) => state.teamUsers.teamUsers?.[teamId]],
  (teamMembers) => teamMembers || []
);

// 创建记忆化的任务选择器
const selectTaskById = createSelector(
  [(state) => state.tasks?.entities, (state, taskId) => taskId],
  (tasksEntities, taskId) => tasksEntities ? tasksEntities[taskId] : null
);

// 批量请求控制器 - 添加批量加载用户功能
const batchUserLoader = {
  queue: new Set(),
  timer: null,
  maxBatchSize: 10,
  batchDelay: 300, // 毫秒
  
  add(userId, dispatch) {
    if (!userId || pendingRequests.has(userId)) return;
    
    this.queue.add(userId);
    pendingRequests.add(userId);
    
    
    if (!this.timer) {
      this.timer = setTimeout(() => this.processBatch(dispatch), this.batchDelay);
    }
  },
  
  processBatch(dispatch) {
    const batch = Array.from(this.queue).slice(0, this.maxBatchSize);
    if (batch.length > 0) {
      
      
      // 如果有批量API可以在这里调用批量加载API，这里模拟单个加载
      batch.forEach(userId => {
        
        dispatch(fetchUserById(userId))
          .then(result => {
            
          })
          .catch(error => {
            console.error(`fetchUserById失败: ${userId}`, error);
          })
          .finally(() => {
            pendingRequests.delete(userId);
          });
      });
      
      // 清空已处理的
      batch.forEach(userId => this.queue.delete(userId));
    }
    
    // 如果队列非空，继续处理
    if (this.queue.size > 0) {
      this.timer = setTimeout(() => this.processBatch(dispatch), this.batchDelay);
    } else {
      this.timer = null;
    }
  },
  
  reset() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.queue.clear();
  }
};

// 添加防抖函数，避免频繁刷新
const debounce = (func, delay) => {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => func(...args), delay);
  };
};

// 添加任务预处理函数，提前识别所有需要加载的用户ID
function preloadTaskUsers(tasks, columns, dispatch) {
  if (!tasks || !columns) return;
  
  // 重置批处理器
  batchUserLoader.reset();
  
  // 收集所有任务中的用户ID
  const userIds = new Set();
  
  Object.values(tasks).forEach(task => {
    if (task?.assignee?.assignee) {
      userIds.add(task.assignee.assignee);
    }
    
    if (task?.assignee?.assignees && Array.isArray(task.assignee.assignees)) {
      task.assignee.assignees.forEach(userId => userIds.add(userId));
    }
  });
  
  // 批量加载用户数据
  userIds.forEach(userId => {
    batchUserLoader.add(userId, dispatch);
  });
}

// DragDropContext修改为使用React.memo减少重渲染
const MemoizedDragDropContext = React.memo(DragDropContext);
const MemoizedDroppable = React.memo(Droppable);

export default function TaskKanban({ projectId, teamId, teamCFId }) {
  const t = useTranslations('CreateTask');
  const dispatch = useDispatch();
  const { user } = useGetUser();
  // 将BodyContent作为组件使用，获取返回的数据
  const { initialColumns, initialTasks, initialColumnOrder, loadData, assigneeTagId } = BodyContent({ projectId, teamId, teamCFId });
  const { CreateSection, UpdateSection, DeleteSection } = HandleSection({ 
    teamId, 
    // 添加刷新回调
    onSectionChange: () => {
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
  
  // 添加看板加载状态管理
  const [isLoading, setIsLoading] = useState(false);
  
  // 使用防抖函数包装loadData
  const debouncedLoadData = useRef(
    debounce((forceRefresh) => {
      setIsLoading(true);
      // 包装loadData调用
      const loadPromise = loadData(forceRefresh);
      if (loadPromise && typeof loadPromise.then === 'function') {
        loadPromise.finally(() => setIsLoading(false));
      } else {
        // 如果不是Promise，手动设置加载完成
        setTimeout(() => setIsLoading(false), 500);
      }
    }, 300)
  ).current;
  
  // 只在组件挂载和初始数据变化时更新状态
  useEffect(() => {
    // 确保初始数据是对象而不是空字符串
    if (
      initialTasks && typeof initialTasks === 'object' && 
      initialColumns && typeof initialColumns === 'object'
    ) {
      // 先更新本地状态，再进行预加载
      setTasks(prevTasks => {
        const updatedTasks = {...initialTasks};
        // 预加载任务中的用户数据，减少后续单独请求
        preloadTaskUsers(updatedTasks, initialColumns, dispatch);
        return updatedTasks;
      });
      
      setColumns(initialColumns);
      setColumnOrder(initialColumnOrder);
      
      // 标记为已初始化
      if (!isInitialized.current) {
        isInitialized.current = true;
      }
    }
  }, [initialTasks, initialColumns, initialColumnOrder, dispatch]);
  
  // 记录当前使用的assignee标签ID，用于调试
  useEffect(() => {
    if (assigneeTagId) {
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

      // 更新UI状态
      setColumnOrder(newColumnOrder);
      
      // 获取每个列的真实sectionId
      const sectionIds = newColumnOrder.map(colId => {
        const column = columns[colId];
        // 使用originalId（如果存在）否则使用colId
        return column.originalId || colId;
      });
      
      try {
        // 调用API更新分区顺序
        await dispatch(updateSectionOrder({
          teamId,
          sectionIds,
          userId: user.id
        })).unwrap();
        
      } catch (error) {
        console.error('更新分区顺序失败:', error);
        // 如果发生错误，延迟刷新看板恢复状态，避免UI阻塞
        debouncedLoadData(true);
      }
      
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
            
      // 2. 更新目标列的任务顺序
      const destSectionId = destColumn.originalId || destColumn.id;
      await dispatch(updateTaskOrder({
        sectionId: destSectionId,
        teamId: teamId,
        newTaskIds: destTaskIds
      })).unwrap();
    } catch (error) {
      console.error('拖拽操作失败:', error);
      // 如果发生错误，延迟刷新看板恢复状态，避免UI阻塞
      debouncedLoadData(true);
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
    
    // 清除错误状态
    setError({ type: null, message: '' });
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

  // 用户头像组件优化
  const UserAvatar = React.memo(({ userId, userData = null, size = "sm" }) => {
    const dispatch = useDispatch();
    
    // 先从props中获取userData，如果没有再从Redux获取
    const cachedUser = userData || useSelector(state => selectUserById(state, userId));
    
    // 添加调试日志
    
    
    const [isLoading, setIsLoading] = useState(!cachedUser);
    
    // 确保用户数据已经加载
    useEffect(() => {
      // 确保userId有效
      if (!userId) {
        setIsLoading(false);
        return;
      }
      
      // 如果已经有完整数据，不需要加载
      if (cachedUser && cachedUser.avatar_url) {
        
        setIsLoading(false);
        return;
      }
      
      // 如果正在请求中，不重复请求
      if (pendingRequests.has(userId)) {
        
        return;
      }
      
      // 节流控制，避免短时间内重复请求
      if (!throttleControl.canRequest(userId)) {
        
        return;
      }
      
      // 将请求添加到批处理队列
      
      setIsLoading(true);
      batchUserLoader.add(userId, dispatch);
      throttleControl.startThrottle(userId);
    }, [userId, cachedUser, dispatch]);
    
    const sizeClasses = {
      sm: "h-6 w-6",
      md: "h-8 w-8",
      lg: "h-10 w-10"
    };
    
    const avatarClass = sizeClasses[size] || sizeClasses.sm;
    const displayName = cachedUser?.name || userId || '?';
    const displayInitial = displayName?.[0] || '?';
    
    // 安全地检查是否有有效的头像URL - 更严格的检查
    const hasValidAvatar = Boolean(cachedUser && typeof cachedUser === 'object' && 'avatar_url' in cachedUser && cachedUser.avatar_url && cachedUser.avatar_url.length > 0);
    
    
    
    // 处理点击头像显示用户详情
    const handleAvatarClick = (e) => {
      e.stopPropagation();
      // 这里可以添加显示用户详情的逻辑
    };
    
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <Avatar className={`${avatarClass} cursor-pointer hover:ring-2 hover:ring-primary`} onClick={handleAvatarClick}>
              {hasValidAvatar ? (
                <AvatarImage 
                  src={cachedUser.avatar_url} 
                  alt={displayName} 
                  onError={(e) => {
                    console.warn(`头像加载失败: ${userId}`, e);
                    // 标记元素已经出错，避免继续显示损坏的图像
                    e.target.style.display = 'none';
                  }}
                />
              ) : (
                <AvatarFallback>
                  <User size={14} />
                </AvatarFallback>
              )}
            </Avatar>
          </TooltipTrigger>
          <TooltipContent>
            <p>{displayName}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  });

  // 添加负责人组件
  const AddAssignee = ({ taskId }) => {
    const t = useTranslations('CreateTask');
    const [open, setOpen] = useState(false);
    
    // 使用记忆化选择器获取团队成员，避免获取整个Redux状态
    const teamMembers = useSelector(state => selectTeamMembers(state, teamId), 
      // 添加浅比较函数，避免不必要的重新渲染
      (prev, next) => {
        if (!prev || !next) return false;
        if (prev.length !== next.length) return false;
        return true;
      }
    );
    
    const teamUsersStatus = useSelector(state => state.teamUsers?.status);
    
    const [isLoading, setIsLoading] = useState(false);
    const [requestSent, setRequestSent] = useState(false);
    
    // 加载团队成员
    useEffect(() => {
      const loadTeamMembers = async () => {
        // 只有当弹窗打开时才请求数据
        if (!teamId || !open) return;
        
        // 如果团队成员正在加载中或已经成功加载，则不重复请求
        if (teamUsersStatus === 'loading' || (teamMembers.length > 0 && teamUsersStatus === 'succeeded')) {          
          return;
        }
        
        setIsLoading(true);
        try {
          
          const result = await dispatch(fetchTeamUsers(teamId)).unwrap();
          
          setRequestSent(true);
        } catch (error) {
          console.error('获取团队成员失败:', error);
        } finally {
          setIsLoading(false);
        }
      };
      
      loadTeamMembers();
    }, [teamId, open, dispatch, teamMembers.length, teamUsersStatus]);
    
    // 添加assignee的处理函数
    const handleAddAssignee = async (userId) => {
      if (!taskId || !userId) return;
      
      try {
        // 先获取任务数据
        const taskData = await dispatch(fetchTaskById(taskId)).unwrap();
        const tagValues = taskData.tag_values || {};
        
        // 获取当前assignee列表（如果有）
        const currentAssignees = Array.isArray(tagValues[assigneeTagId]) 
          ? tagValues[assigneeTagId] 
          : [];
        
        // 防止重复添加同一用户
        if (currentAssignees.includes(userId)) {
          return;
        }
        
        // 添加新的assignee
        const updatedAssignees = [...currentAssignees, userId];
        
        // 更新任务
        await dispatch(updateTask({
          taskId: taskId,
          taskData: {
            tag_values: {
              ...tagValues,
              [assigneeTagId]: updatedAssignees
            }
          }
        })).unwrap();
        
        // 关闭弹窗后再刷新看板
        setOpen(false);
        // 使用防抖函数刷新
        debouncedLoadData(true);
      } catch (error) {
        console.error('添加负责人失败:', error);
        setOpen(false);
      }
    };
    
    // 添加移除assignee的处理函数
    const handleRemoveAssignee = async (userId, e) => {
      if (!taskId || !userId) return;
      e.stopPropagation(); // 防止触发父元素的点击事件
      
      try {
        // 先获取任务数据
        const taskData = await dispatch(fetchTaskById(taskId)).unwrap();
        const tagValues = taskData.tag_values || {};
        
        // 获取当前assignee列表（如果有）
        const currentAssignees = Array.isArray(tagValues[assigneeTagId]) 
          ? tagValues[assigneeTagId] 
          : [];
        
        // 从列表中移除用户
        const updatedAssignees = currentAssignees.filter(id => id !== userId);
        
        // 更新任务
        await dispatch(updateTask({
          taskId: taskId,
          taskData: {
            tag_values: {
              ...tagValues,
              [assigneeTagId]: updatedAssignees
            }
          }
        })).unwrap();
        
        // 使用防抖函数刷新
        debouncedLoadData(true);
      } catch (error) {
        console.error('移除负责人失败:', error);
      }
    };
    
    // 检查用户是否已分配为任务负责人
    const isUserAssigned = async () => {
      try {
        const taskData = await dispatch(fetchTaskById(taskId)).unwrap();
        const tagValues = taskData.tag_values || {};
        
        return Array.isArray(tagValues[assigneeTagId]) 
          ? tagValues[assigneeTagId] 
          : [];
      } catch (error) {
        console.error('获取任务负责人失败:', error);
        return [];
      }
    };
    
    // 获取当前任务的assignee列表
    const [assignedUsers, setAssignedUsers] = useState([]);
    
    // 加载任务的assignee信息
    useEffect(() => {
      if (open && taskId) {
        const loadTaskAssignees = async () => {
          try {
            const taskData = await dispatch(fetchTaskById(taskId)).unwrap();
            const tagValues = taskData.tag_values || {};
            
            const currentAssignees = Array.isArray(tagValues[assigneeTagId]) 
              ? tagValues[assigneeTagId] 
              : [];
              
            setAssignedUsers(currentAssignees);
          } catch (error) {
            console.error('获取任务负责人失败:', error);
            setAssignedUsers([]);
          }
        };
        
        loadTaskAssignees();
      }
    }, [open, taskId, dispatch, assigneeTagId]);
    
    return (
      <Popover open={open} onOpenChange={(newOpen) => {
        
        setOpen(newOpen);
      }}>
        <PopoverTrigger asChild>
          <button 
            className="p-1 rounded-full hover:bg-gray-200 hover:dark:bg-gray-700"
            onClick={(e) => e.stopPropagation()}
          >
            <PlusIcon size={14} className="text-gray-500" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-60 p-2">
          <h4 className="text-sm font-medium mb-2">{t('assignee')}</h4>
          
          {isLoading || teamUsersStatus === 'loading' ? (
            <div className="flex items-center justify-center py-2">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              <span className="ml-2 text-sm">{t('loading')}</span>
            </div>
          ) : teamMembers && teamMembers.length > 0 ? (
            <div className="max-h-40 overflow-y-auto">
              {teamMembers.map((member) => {
                const isAssigned = assignedUsers.includes(member.user_id);
                // 从member获取user数据，API返回的结构可能有嵌套的user对象
                const userData = member.user || member;
                
                const userId = member.user_id || member.id;
                const userName = userData.name || userId;
                const userAvatar = userData.avatar_url;
                
                // 添加调试日志
                
                
                // 更严格的头像检查
                const hasAvatar = Boolean(userAvatar && typeof userAvatar === 'string' && userAvatar.length > 0);
                const userInitial = userName?.[0]?.toUpperCase() || 'U';
                
                return (
                  <div
                    key={userId}
                    className="flex items-center justify-between p-2 rounded-md hover:bg-gray-100 hover:dark:bg-gray-800 cursor-pointer"
                    onClick={() => !isAssigned && handleAddAssignee(userId)}
                  >
                    <div className="flex items-center gap-2">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Avatar className="h-6 w-6">
                              {hasAvatar ? (
                                <AvatarImage 
                                  src={userAvatar} 
                                  alt={userName}
                                  onError={(e) => {
                                    console.warn(`头像加载失败: ${userId}`, e);
                                    // 标记元素已经出错，避免继续显示损坏的图像
                                    e.target.style.display = 'none';
                                  }}
                                />
                              ) : null}
                              <AvatarFallback>
                                {userInitial}
                              </AvatarFallback>
                            </Avatar>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{userName}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <span className="text-sm">{userName}</span>
                    </div>
                    
                    {isAssigned ? (
                      <button 
                        className="p-1 rounded-full hover:bg-red-100 hover:dark:bg-red-900 text-red-500"
                        onClick={(e) => handleRemoveAssignee(userId, e)}
                      >
                        <X size={14} />
                      </button>
                    ) : (
                      <span className="p-1 rounded-full hover:bg-green-100 hover:dark:bg-green-900 text-green-500">
                        <Check size={14} />
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-sm text-center text-gray-500">
              {teamUsersStatus === 'failed' ? t('failedToLoadUsers') : t('noUsers')}
            </div>
          )}
        </PopoverContent>
      </Popover>
    );
  };

  // 删除负责人组件
  const RemoveAssignee = ({ taskId, userId }) => {
    const dispatch = useDispatch();
    // 使用记忆化选择器获取最新任务数据
    const task = useSelector(state => selectTaskById(state, taskId));
    
    // 移除assignee的处理函数
    const handleRemoveAssignee = async (e) => {
      e.stopPropagation();
      
      if (!taskId || !userId) return;
      
      try {
        // 如果已经有任务数据，直接使用，否则请求
        let tagValues;
        if (task && task.tag_values) {
          tagValues = task.tag_values;
        } else {
          // 请求任务数据
          const taskData = await dispatch(fetchTaskById(taskId)).unwrap();
          tagValues = taskData.tag_values || {};
        }
        
        // 获取当前assignee列表
        const currentAssignees = Array.isArray(tagValues[assigneeTagId]) 
          ? tagValues[assigneeTagId] 
          : [];
        
        // 如果用户不在列表中，不需要移除
        if (!currentAssignees.includes(userId)) {
          return;
        }
        
        // 移除指定的assignee
        const updatedAssignees = currentAssignees.filter(id => id !== userId);
        
        // 更新任务
        await dispatch(updateTask({
          taskId: taskId,
          taskData: {
            tag_values: {
              ...tagValues,
              [assigneeTagId]: updatedAssignees
            }
          }
        })).unwrap();
        
        // 使用防抖函数刷新
        debouncedLoadData(true);
      } catch (error) {
        console.error('移除负责人失败:', error);
      }
    };
    
    // 返回删除按钮
    return (
      <button 
        className="p-1 rounded-full hover:bg-red-100 hover:dark:bg-red-900 text-red-500"
        onClick={handleRemoveAssignee}
      >
        <X size={14} />
      </button>
    );
  };

  // 显示多个负责人的组件
  const MultipleAssignees = ({ assignees, taskId }) => {
    const t = useTranslations('CreateTask');
    const [open, setOpen] = useState(false);
    const dispatch = useDispatch();
    
    // 为每个用户ID添加到批处理队列而不是立即调用API
    useEffect(() => {
      if (assignees && assignees.length > 0) {
        // 仅当第一次渲染或assignees变化时添加到批处理队列
        assignees.forEach(userId => {
          if (userId) {
            batchUserLoader.add(userId, dispatch);
          }
        });
      }
    }, [assignees, dispatch]);
    
    // 仅在弹出框打开时获取详细数据
    useEffect(() => {
      if (open && assignees && assignees.length > 0) {
        // 仅当弹窗打开时才请求更多用户详情
        assignees.forEach(userId => {
          if (userId && !pendingRequests.has(userId)) {
            const user = useSelector(state => selectUserById(state, userId));
            if (!user || !user.avatar_url) {
              batchUserLoader.add(userId, dispatch);
            }
          }
        });
      }
    }, [open, assignees, dispatch]);
    
    // 如果没有assignees，返回添加按钮
    if (!assignees || assignees.length === 0) {
      return (
        <div className="flex items-center">
          <AddAssignee taskId={taskId} />
        </div>
      );
    }
    
    // 如果只有一个assignee，显示头像和删除按钮
    if (assignees.length === 1) {
      return (
        <div className="flex items-center gap-1">
          <UserAvatar userId={assignees[0]} />
          <AddAssignee taskId={taskId} />
        </div>
      );
    }
    
    // 如果有多个assignee，显示数字和弹出菜单
    return (
      <div className="flex items-center gap-1">
        <div className="flex -space-x-1">
          {assignees.slice(0, 2).map((userId) => (
            <UserAvatar key={userId} userId={userId} />
          ))}
          {assignees.length > 2 && (
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Avatar className="h-6 w-6 bg-gray-200 dark:bg-gray-700 cursor-pointer" onClick={(e) => e.stopPropagation()}>
                  <AvatarFallback>+{assignees.length - 2}</AvatarFallback>
                </Avatar>
              </PopoverTrigger>
              <PopoverContent className="w-60 p-2">
                <h4 className="text-sm font-medium mb-2">{t('assignees')}</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {assignees.map((userId) => {
                    // 使用记忆化选择器获取用户数据
                    const user = useSelector(state => selectUserById(state, userId));
                    const userName = user?.name || userId;
                    
                    return (
                      <div key={userId} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <UserAvatar userId={userId} userData={user} />
                          <span className="text-sm">{userName}</span>
                        </div>
                        <RemoveAssignee taskId={taskId} userId={userId} />
                      </div>
                    );
                  })}
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>
        <AddAssignee taskId={taskId} />
      </div>
    );
  };

  return (
    <div className="p-2">
      {/* 添加加载指示器 */}
      {isLoading && (
        <div>
        </div>
      )}
      
      {/* 显示错误消息 */}
      {error.type && (
        <div className="bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 p-2 mb-4 rounded-md">
          {error.message}
        </div>
      )}
      <MemoizedDragDropContext onDragEnd={onDragEnd}>
        <MemoizedDroppable droppableId="all-columns" direction="horizontal" type="column">
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
                                              {newTaskId !== task.id && (
                                                <button 
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleUpdateTask(task.id);
                                                  }}
                                                  className="invisible group-hover:visible p-1 rounded-md hover:bg-white hover:dark:bg-black"
                                                >
                                                  <Pen size={14} className="text-gray-500" />
                                                </button>
                                              )}
                                            </div>
                                          </div>
                                          
                                          {/* 底部栏 */}
                                          <div className="flex justify-between items-center mt-2">
                                            <div className="flex items-center">
                                              {/* 显示assignee信息 */}
                                              {task.assignee ? (
                                                task.assignee.assignees ? (
                                                  <MultipleAssignees 
                                                    assignees={task.assignee.assignees} 
                                                    taskId={task.id} 
                                                  />
                                                ) : (
                                                  <div className="flex items-center gap-1">
                                                    <UserAvatar userId={task.assignee.assignee} />
                                                    <RemoveAssignee taskId={task.id} userId={task.assignee.assignee} />
                                                    <AddAssignee taskId={task.id} />
                                                  </div>
                                                )
                                              ) : (
                                                <div className="flex items-center">
                                                  <AddAssignee taskId={task.id} />
                                                </div>
                                              )}
                                            </div>
                                            <div>
                                              <button 
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  if (newTaskId === task.id) {
                                                    cancelNewTask();
                                                  } else {
                                                    handleDeleteTask({columnId: column?.id, taskId: task.id});
                                                  }
                                                }}
                                                className="invisible group-hover:visible p-1 rounded-md hover:bg-white hover:dark:bg-black"
                                              >
                                                {newTaskId === task.id ? (
                                                  <span className="text-red-500 text-xs">{t('cancel')}</span>
                                                ) : (
                                                  <Trash2 size={14} className="text-red-500" />
                                                )}
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
        </MemoizedDroppable>
      </MemoizedDragDropContext>
    </div>
  );
}