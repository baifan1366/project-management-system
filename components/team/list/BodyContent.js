'use client'

import { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { 
  ChevronRight, 
  ChevronDown, 
  MoreHorizontal, 
  Plus, 
  Circle, 
  Trash, 
  Loader2,
  FileText, 
  File, 
  Sheet,
  FileCode,
  Calendar,
  Fingerprint,
  X
} from 'lucide-react';
import { getSectionByTeamId } from '@/lib/redux/features/sectionSlice';
import { fetchTasksBySectionId } from '@/lib/redux/features/taskSlice';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useConfirm } from '@/hooks/use-confirm';
import { updateSection, deleteSection } from '@/lib/redux/features/sectionSlice';
import { useTableContext } from './TableProvider';
import { useResizeTools } from './ResizeTools';
import { 
  isFileColumn, 
  getFileIcon, 
  renderFileCell, 
  isNumberType, 
  isNumberColumn, 
  renderNumberCell,
  isPeopleColumn,
  renderPeopleCell,
  isDateType,
  isDateColumn,
  renderDateCell,
  isIdType,
  isIdColumn,
  renderIdCell,
  isSingleSelectType,
  isSingleSelectColumn,
  renderSingleSelectCell,
  parseSingleSelectValue,
  isMultiSelectType,
  isMultiSelectColumn, 
  renderMultiSelectCell,
  parseMultiSelectValue,
  renderMultiSelectTags,
  isTagsType,
  isTagsColumn,
  renderTagsCell,
  parseTagsValue,
  isTextType,
  isTextColumn,
  renderTextCell,
  validateTextInput,
  EnhancedSingleSelect,
  SingleSelectManager
} from './TagConfig';

export function useBodyContent(handleAddTask, handleTaskValueChange, handleTaskEditComplete, handleKeyDown, externalEditingTask, externalEditingTaskValues, externalIsLoading, validationErrors, handleDeleteTask, projectThemeColor) {
  const t = useTranslations('CreateTask');
  const tConfirm = useTranslations('confirmation');
  const dispatch = useDispatch();
  const { confirm } = useConfirm();
  
  const {
    teamId,
    localTasks,
    setLocalTasks,
    sortedTagInfo,
    tagOrder,
    editingTask,
    editingTaskValues,
    setEditingTaskValues,
    taskInputRef,
    setEditingTask,
    collapsedSections,
    setCollapsedSections,
    hoveredSectionHeader,
    setHoveredSectionHeader,
    hoveredTaskRow,
    setHoveredTaskRow,
    editingSectionId,
    setEditingSectionId,
    editingSectionName,
    setEditingSectionName,
    sectionInputRef,
    isSectionRequestInProgress,
    isTaskRequestInProgress,
    setIsLoading,
    isAddingTask,
    setIsAddingTask
  } = useTableContext();
  
  // 从Redux中获取标签数据，用于获取真实的标签ID
  const { tags: tagsData = { tags: [] } } = useSelector((state) => state.teamCF || {});
  
  // 从Redux状态中获取部门数据
  const { sections = [], status: sectionsStatus } = useSelector((state) => state.sections || {});
  
  // 获取标签宽度
  const { getTagWidth } = useResizeTools();

  // 获取Name标签的ID
  const nameTagId = useMemo(() => {
    if (!tagsData || !Array.isArray(tagsData.tags) || tagsData.tags.length === 0) {
      return null;
    }
    const nameTag = tagsData.tags.find(tag => tag && tag.name === 'Name');
    return nameTag?.id?.toString() || null;
  }, [tagsData]);

  // 处理部门数据
  const sectionInfo = useMemo(() => {
    if (!sections || !Array.isArray(sections) || sections.length === 0) {
      return [];
    }
    return sections.map(section => section).filter(Boolean);
  }, [sections]);

  // 添加一个重试加载任务的函数
  const retryLoadTasks = (delay = 500, maxRetries = 3) => {
    let retryCount = 0;

    const attemptLoad = () => {
      if (retryCount >= maxRetries) {
        return;
      }

      retryCount++;

      // 检查部门和标签数据是否已加载
      if (!sections || sections.length === 0 || 
          !tagsData || (Array.isArray(tagsData.tags) && tagsData.tags.length === 0)) {
        setTimeout(attemptLoad, delay);
        return;
      }

      // 数据已加载，执行任务加载
      loadAllSectionTasks();
    };

    // 开始第一次尝试
    attemptLoad();
  };

  // 修改loadSections函数，在加载部门后自动启动任务加载
  const loadSections = async () => {
    // 检查是否有有效的teamId
    if (!teamId) {
      return;
    }
    
    // 避免请求冲突
    if (isSectionRequestInProgress.current) {
      return;
    }
    
    isSectionRequestInProgress.current = true;
    
    try {
      setIsLoading(true);
      
      // 总是从API获取最新数据
      const result = await dispatch(getSectionByTeamId(teamId)).unwrap();
      
      // 部门加载完成后，尝试加载任务
      retryLoadTasks();
    } catch (error) {
      console.error(`Error loading sections for team ${teamId}:`, error);
    } finally {
      setIsLoading(false);
      isSectionRequestInProgress.current = false;
    }
  };

  // 修改loadAllSectionTasks函数，添加间隔加载机制
  const loadAllSectionTasks = async () => {
    if (!teamId || isTaskRequestInProgress.current) return;
    
    // 确保有部门数据
    if (!sections || !Array.isArray(sections) || sections.length === 0) {
      
      return;
    }
    
    // 检查标签数据是否已加载
    if (!tagsData || (Array.isArray(tagsData.tags) && tagsData.tags.length === 0)) {
      
      return;
    }
    
    isTaskRequestInProgress.current = true;
    try {
      setIsLoading(true);
      
      // 创建新的任务数据对象
      const newTasksData = {};
      
      // 获取标签数组
      const tags = tagsData?.tags || tagsData || [];
      
      // 使用Promise.all进行并行加载，但限制并行数量
      const batchSize = 3; // 每批加载的部门数
      
      // 将部门分批
      const sectionBatches = [];
      for (let i = 0; i < sections.length; i += batchSize) {
        sectionBatches.push(sections.slice(i, i + batchSize));
      }
      
      // 按批次顺序加载
      for (const batch of sectionBatches) {
        // 并行加载一批部门
        await Promise.all(batch.map(async (section) => {
          if (section && section.id) {
            try {
              const taskData = await dispatch(fetchTasksBySectionId(section.id)).unwrap();
              
              if (!taskData || taskData.length === 0) {
                newTasksData[section.id] = [];
                
                // 立即更新状态
                setLocalTasks(prev => ({
                  ...prev,
                  [section.id]: []
                }));
                
                return;
              }
              
              // 过滤和处理任务
              const filteredTasks = taskData
                .filter(task => {
                  // 确保task和tag_values存在
                  if (!task || !task.tag_values) return false;
                  
                  // 检查是否有名称
                  if (nameTagId && task.tag_values[nameTagId]) {
                    return true;
                  }
                  
                  // 遍历task的tag_values寻找Name字段
                  for (const [tagId, value] of Object.entries(task.tag_values)) {
                    const tag = tags.find(t => t && t.id && t.id.toString() === tagId);
                    if (tag?.name === 'Name' && value) {
                      return true;
                    }
                  }
                  
                  return false;
                });
              
              // 更新数据
              newTasksData[section.id] = filteredTasks;
              
              // 立即更新状态
              setLocalTasks(prev => ({
                ...prev,
                [section.id]: filteredTasks
              }));
              
            } catch (sectionError) {
              console.error(`加载部门"${section.name}"(ID:${section.id})的任务失败:`, sectionError);
              
              // 设置空数组
              newTasksData[section.id] = [];
              setLocalTasks(prev => ({
                ...prev,
                [section.id]: []
              }));
            }
          }
        }));
        
        // 批次之间添加小延迟
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
    } catch (error) {
      console.error('加载所有任务失败:', error);
    } finally {
      setIsLoading(false);
      isTaskRequestInProgress.current = false;
    }
  };

  // 切换部门的折叠状态
  const toggleSectionCollapse = (sectionId) => {
    setCollapsedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  // 实现编辑部门名称功能
  const handleEditSection = (sectionId) => {
    // 找到当前部门
    const section = sectionInfo.find(s => s.id === sectionId);
    if (!section) return;
    
    // 设置编辑状态
    setEditingSectionId(sectionId);
    setEditingSectionName(section.name);
    
    // 确保焦点在下一个渲染周期设置
    setTimeout(() => {
      if (sectionInputRef.current) {
        sectionInputRef.current.focus();
      }
    }, 0);
  }

  // 完成部门名称编辑
  const handleSectionEditComplete = async () => {
    if (!editingSectionId) return;
    
    try {
      // 这里应该添加更新部门名称的API调用
      // 示例: 使用dispatch调用更新部门的action
      await dispatch(updateSection({
        teamId,
        sectionId: editingSectionId,
        sectionData: editingSectionName.trim()
      })).unwrap();
      
      // 重置编辑状态
      setEditingSectionId(null);
      setEditingSectionName('');
    } catch (error) {
      console.error('更新部门名称失败:', error);
      // 可以在这里添加错误处理，例如显示通知
    }
  }

  const handleDeleteSection = (sectionId) => {
    confirm({
      title: tConfirm('confirmDeleteSection'),
      description: `${tConfirm('section')} "${sectionInfo.find(section => section.id === sectionId)?.name}" ${tConfirm('willBeDeleted')}`,
      variant: 'error',
      onConfirm: () => {
        // 删除部门
        dispatch(deleteSection({teamId, sectionId}));
      }
    });
  };

  // 添加选项管理状态
  const [taskOptions, setTaskOptions] = useState({});
  
  // 处理创建新选项
  const handleCreateOption = async (taskId, tagId, newOption) => {
    try {
      // 确保选项有一个唯一的值
      const optionWithValue = {
        ...newOption,
        value: newOption.value || newOption.label.toLowerCase().replace(/\s+/g, '_')
      };
      
      // 更新本地选项状态
      setTaskOptions(prev => {
        const taskKey = `${taskId}-${tagId}`;
        const currentOptions = prev[taskKey] || [];
        
        // 检查选项是否已存在
        const optionExists = currentOptions.some(opt => 
          opt.value === optionWithValue.value || opt.label === optionWithValue.label
        );
        
        if (optionExists) {
          return prev; // 如果选项已存在，不添加
        }
        
        // 添加新选项
        const updatedOptions = [...currentOptions, optionWithValue];
        
        return {
          ...prev,
          [taskKey]: updatedOptions
        };
      });
      
      // 自动选择新创建的选项
      handleTaskValueChange(taskId, tagId, JSON.stringify(optionWithValue));
      
      // 调用API将选项保存到服务器
      // 添加服务器同步代码
      if (teamId && tagId) {
        try {
          // 这里替换为实际的API调用
          // 例如: await dispatch(saveTagOption({ teamId, tagId, option: optionWithValue }));
          
          // 假设使用现有API调用结构
          await dispatch({
            type: 'team/saveTagOption',
            payload: {
              teamId,
              tagId,
              option: optionWithValue
            }
          });
          
          // 或者使用直接的fetch调用
          /*
          await fetch(`/api/teams/${teamId}/tags/${tagId}/options`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(optionWithValue),
          });
          */
        } catch (error) {
          console.error('保存选项到服务器失败:', error);
          // 可以添加错误处理，例如显示通知
        }
      }
    } catch (error) {
      console.error('创建选项失败:', error);
    }
  };
  
  // 处理编辑选项
  const handleEditOption = async (taskId, tagId, editedOption) => {
    try {
      setTaskOptions(prev => {
        const taskKey = `${taskId}-${tagId}`;
        const currentOptions = prev[taskKey] || [];
        
        // 更新选项
        const updatedOptions = currentOptions.map(opt => 
          opt.value === editedOption.value ? editedOption : opt
        );
        
        return {
          ...prev,
          [taskKey]: updatedOptions
        };
      });
      
      // 如果当前选择的是被编辑的选项，更新选择的值
      const currentValue = JSON.parse(externalEditingTaskValues[tagId] || '{}');
      if (currentValue && currentValue.value === editedOption.value) {
        handleTaskValueChange(taskId, tagId, JSON.stringify(editedOption));
      }
      
      // 调用API将更新后的选项保存到服务器
      if (teamId && tagId) {
        try {
          // 这里替换为实际的API调用
          // 例如: await dispatch(updateTagOption({ teamId, tagId, option: editedOption }));
          
          // 假设使用现有API调用结构
          await dispatch({
            type: 'team/updateTagOption',
            payload: {
              teamId,
              tagId,
              option: editedOption
            }
          });
          
          // 或者使用直接的fetch调用
          /*
          await fetch(`/api/teams/${teamId}/tags/${tagId}/options/${editedOption.value}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(editedOption),
          });
          */
        } catch (error) {
          console.error('更新选项到服务器失败:', error);
        }
      }
    } catch (error) {
      console.error('编辑选项失败:', error);
    }
  };
  
  // 处理删除选项
  const handleDeleteOption = async (taskId, tagId, optionToDelete) => {
    try {
      setTaskOptions(prev => {
        const taskKey = `${taskId}-${tagId}`;
        const currentOptions = prev[taskKey] || [];
        
        // 过滤掉要删除的选项
        const updatedOptions = currentOptions.filter(opt => 
          opt.value !== optionToDelete.value
        );
        
        return {
          ...prev,
          [taskKey]: updatedOptions
        };
      });
      
      // 如果当前选择的是被删除的选项，清空选择
      const currentValue = JSON.parse(externalEditingTaskValues[tagId] || '{}');
      if (currentValue && currentValue.value === optionToDelete.value) {
        handleTaskValueChange(taskId, tagId, '');
      }
      
      // 调用API将删除选项的操作保存到服务器
      if (teamId && tagId) {
        try {
          // 这里替换为实际的API调用
          // 例如: await dispatch(deleteTagOption({ teamId, tagId, optionValue: optionToDelete.value }));
          
          // 假设使用现有API调用结构
          await dispatch({
            type: 'team/deleteTagOption',
            payload: {
              teamId,
              tagId,
              optionValue: optionToDelete.value
            }
          });
          
          // 或者使用直接的fetch调用
          /*
          await fetch(`/api/teams/${teamId}/tags/${tagId}/options/${optionToDelete.value}`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
            }
          });
          */
        } catch (error) {
          console.error('从服务器删除选项失败:', error);
        }
      }
    } catch (error) {
      console.error('删除选项失败:', error);
    }
  };
  
  // 获取任务选项
  const getTaskOptions = (taskId, tagId) => {
    const taskKey = `${taskId}-${tagId}`;
    return taskOptions[taskKey] || [];
  };

  // 部门标题行
  const renderSectionHeader = (section, sectionProvided, snapshot) => {
    const isEditingThisSection = editingSectionId === section.id;
    
    return (
      <div
        ref={sectionProvided.innerRef}
        {...sectionProvided.draggableProps}
        className={`border-b border-border ${snapshot.isDragging ? 'shadow-lg' : ''}`}
      >
        {/* 将按钮组、标题和操作放在同一flex容器中 */}
        <div 
          className={`flex items-center w-full flex-grow p-2 gap-2 ${
            hoveredSectionHeader === section.id ? 'bg-accent/50' : ''
          } transition-colors group`}
          onMouseEnter={e => {
            if (e.target === e.currentTarget) {
              setHoveredSectionHeader(section.id);
            }
            e.stopPropagation();
          }}
          onMouseLeave={e => {
            if (e.target === e.currentTarget) {
              setHoveredSectionHeader(null);
            }
            e.stopPropagation();
          }}
        >
          {/* 折叠按钮 */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => toggleSectionCollapse(section.id)}
            className="p-0 h-6 w-6 mr-2 flex-shrink-0 hover:bg-accent/50 rounded-sm"
          >
            {collapsedSections[section.id] ? 
              <ChevronRight size={16} /> : 
              <ChevronDown size={16} />
            }
          </Button>
          
          {/* 部门名称与按钮组放在同一个容器内，按钮组直接跟随名称 */}
          <div {...sectionProvided.dragHandleProps} className="cursor-grab left-0 font-medium">
            {isEditingThisSection ? (
              <input
                type="text"
                ref={sectionInputRef}
                value={editingSectionName}
                onChange={(e) => setEditingSectionName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSectionEditComplete();
                  }
                  e.stopPropagation(); // 防止键盘事件冒泡到拖拽处理
                }}
                maxLength={50}
                autoFocus
                className="bg-transparent border rounded px-1 focus:outline-none focus:ring-1 focus:ring-primary"
                onClick={(e) => e.stopPropagation()}
                style={{ cursor: 'text' }} // 在输入框上显示文本光标而不是抓取光标
              />
            ) : (
              <span>
                {section.name}
              </span>     
            )}
          </div>

          {/* 按钮组 - 当且仅当当前部门行被悬停时显示 */}
          {hoveredSectionHeader === section.id && !isEditingThisSection && (
            <div className="flex items-center ml-2">
              {/* 添加任务按钮 */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddTask(section.id);
                      }}
                      className="p-0 h-6 w-6 hover:bg-accent/50 rounded-sm"
                    >
                      <Plus size={16} className="text-muted-foreground" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {t('addTask')}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              {/* 更多操作按钮 */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={e => e.stopPropagation()}
                    className="p-0 h-6 w-6 hover:bg-accent/50 rounded-sm"
                  >
                    <MoreHorizontal size={16} className="text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleEditSection(section.id)}>{t('editSection')}</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-red-500 focus:text-red-600" onClick={() => handleDeleteSection(section.id)}>{t('deleteSection')}</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
        
        {/* 任务列表 - 仅在非折叠时显示 */}
        {!collapsedSections[section.id] && (
          <div className='text-muted-foreground border-t'>
            {renderTasks(section.id)}
          </div>
        )}
      </div>
    );
  };

  // 渲染任务列表
  const renderTasks = (sectionId) => {
    // 如果部门被折叠，则不渲染任务
    if (collapsedSections[sectionId]) {
      return (
        <div className="text-muted-foreground text-sm p-2 text-center">
          {t('sectionCollapsed')}
        </div>
      );
    }
    
    // 如果该部门没有任务，显示没有任务的提示
    if (!localTasks[sectionId] || localTasks[sectionId].length === 0) {
      return (
        <div className="text-muted-foreground text-sm p-1 text-center">
          <Button 
            variant="ghost" 
            className="text-muted-foreground p-1 text-center"
            onClick={() => handleAddTask(sectionId)}
          >
            <Plus size={16} className="text-muted-foreground" />
          </Button>
        </div>
      );
    }

    return (
      <Droppable 
        droppableId={`tasks-${sectionId}`} 
        type="TASK" 
        mode="standard"
        ignoreContainerClipping={true}
        isCombineEnabled={false}
      >
        {(provided) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className="task-container"
          >
            {localTasks[sectionId].map((task, taskIndex) => {
              const isEditing = externalEditingTask === task.id;
              const isTaskLoading = isEditing && externalIsLoading;
              const isCurrentTaskBeingAdded = isAddingTask && task.id === externalEditingTask;
              
              return (
                <Draggable
                  key={`task-${task.id}`}
                  draggableId={`task-${task.id}`}
                  index={taskIndex}
                >
                  {(taskProvided, snapshot) => (
                    <div
                      ref={taskProvided.innerRef}
                      {...taskProvided.draggableProps}
                      className={`border-b border-border h-10 relative ${
                        snapshot.isDragging ? 'shadow-lg bg-accent/30' : ''
                      } ${hoveredTaskRow === task.id ? 'bg-accent/20' : ''} ${
                        isEditing || isCurrentTaskBeingAdded ? 'bg-accent/10' : ''
                      }`}
                      onMouseEnter={() => setHoveredTaskRow(task.id)}
                      onMouseLeave={() => setHoveredTaskRow(null)}
                      data-rfd-draggable-id={`task-${task.id}`}
                    >
                      <div className="flex items-center w-full h-full">
                        {/* 拖拽手柄 */}
                        <div {...taskProvided.dragHandleProps} className="flex justify-start items-center pl-4 pr-2 cursor-grab flex-shrink-0" >
                          {isTaskLoading ? (
                            <Loader2 size={12} className="animate-spin text-muted-foreground" />
                          ) : (
                            <Circle size={12} className="text-muted-foreground" />
                          )}
                        </div>
                        
                        {/* 任务标签值容器 */}
                        <div className="flex flex-grow">
                          {sortedTagInfo.map((tag, tagIndex) => {
                            // 获取该标签对应的真实索引
                            const realIndex = tagOrder[tagIndex];
                            
                            // 从tagsData获取真实标签ID
                            let tagId = String(realIndex + 1);
                            
                            if (tagsData && tagsData.tags && Array.isArray(tagsData.tags) && tagsData.tags[realIndex]) {
                              tagId = String(tagsData.tags[realIndex].id);
                            }
                            
                            // 获取当前值
                            const currentValue = (isEditing || isCurrentTaskBeingAdded) 
                              ? (externalEditingTaskValues[tagId] || '')
                              : (task.tag_values?.[tagId] || '');
                            
                            // 预处理currentValue，确保对象类型值被正确处理
                            const processCurrentValue = (value) => {
                              if (typeof value === 'object' && value !== null) {
                                // 如果是对象但不是数组，尝试提取text或value属性
                                if (!Array.isArray(value)) {
                                  if (value.text !== undefined) {
                                    return value.text;
                                  } else if (value.value !== undefined) {
                                    return value.value;
                                  } else {
                                    try {
                                      return JSON.stringify(value);
                                    } catch (e) {
                                      return '';
                                    }
                                  }
                                }
                              }
                              return value;
                            };
                            
                            return (
                              <div 
                                key={`task-${task.id}-tag-${tagId}`} 
                                className={`p-2 overflow-hidden truncate border-r h-10 flex items-center ${
                                  isEditing || isCurrentTaskBeingAdded ? 'bg-accent/10' : ''
                                }`}
                                style={{
                                  width: `${getTagWidth(tagIndex)}px`,
                                  minWidth: `${getTagWidth(tagIndex)}px`, 
                                  maxWidth: `${getTagWidth(tagIndex)}px`,
                                }}
                                onClick={() => {
                                  if (!isEditing && !isTaskLoading && !isCurrentTaskBeingAdded) {
                                    setEditingTask(task.id);
                                    
                                    // 初始化整行的所有标签值
                                    const allTagValues = {};
                                    sortedTagInfo.forEach((tag, idx) => {
                                      const rIndex = tagOrder[idx];
                                      let tId = String(rIndex + 1);
                                      
                                      if (tagsData && tagsData.tags && Array.isArray(tagsData.tags) && tagsData.tags[rIndex]) {
                                        tId = String(tagsData.tags[rIndex].id);
                                      }
                                      
                                      const rawValue = task.tag_values?.[tId];
                                      
                                      // 根据不同类型处理值，确保初始值格式正确
                                      let processedValue = rawValue;
                                      
                                      // 安全地获取tagObj
                                      const tagObj = tagsData?.tags?.find(t => 
                                        t.id.toString() === tId || 
                                        t.name === tag
                                      );
                                      
                                      // 对特定类型进行预处理
                                      if (rawValue !== undefined && rawValue !== null) {
                                        if (isSingleSelectColumn(tag) || (tagObj && isSingleSelectType(tagObj))) {
                                          // 单选值可能需要JSON字符串格式
                                          if (typeof rawValue === 'object') {
                                            processedValue = JSON.stringify(rawValue);
                                          }
                                        } else if (isMultiSelectColumn(tag) || isTagsColumn(tag) || 
                                                 (tagObj && (isMultiSelectType(tagObj) || isTagsType(tagObj)))) {
                                          // 多选或标签值应该是JSON字符串格式
                                          if (typeof rawValue === 'object') {
                                            processedValue = JSON.stringify(rawValue);
                                          }
                                        }
                                      }
                                      
                                      allTagValues[tId] = processedValue;
                                    });
                                    
                                    setEditingTaskValues(allTagValues);
                                  }
                                }}
                              >
                                {(isEditing || isCurrentTaskBeingAdded) ? (
                                  <div className="w-full">
                                    {/* 首先获取tagObj以确保它存在 */}
                                    {(() => {
                                      // 在这里安全地获取tagObj
                                      const tagObj = tagsData?.tags?.find(t => 
                                        t.id.toString() === tagId || 
                                        t.name === tag
                                      );
                                      
                                      // 检查不同类型并渲染相应编辑组件
                                      if (isFileColumn(tag)) {
                                        return renderFileCell(currentValue, (e) => {
                                          e.stopPropagation();
                                        });
                                      } else if (isPeopleColumn(tag)) {
                                        return renderPeopleCell(currentValue, task.id, teamId);
                                      } else if (isDateColumn(tag) || (tagObj && isDateType(tagObj))) {
                                        return renderDateCell(currentValue, (value) => {
                                          // 直接更新日期值
                                          handleTaskValueChange(task.id, tagId, value);
                                        });
                                      } else if (isIdColumn(tag) || (tagObj && isIdType(tagObj))) {
                                        return renderIdCell(currentValue);
                                      } else if (isSingleSelectColumn(tag) || (tagObj && isSingleSelectType(tagObj))) {
                                        return (
                                          <EnhancedSingleSelect
                                            value={currentValue}
                                            options={getTaskOptions(task.id, tagId)}
                                            onChange={(option) => {
                                              const newValue = JSON.stringify(option);
                                              handleTaskValueChange(task.id, tagId, newValue);
                                            }}
                                            onCreateOption={(newOption) => handleCreateOption(task.id, tagId, newOption)}
                                            onEditOption={(editedOption) => handleEditOption(task.id, tagId, editedOption)}
                                            onDeleteOption={(optionToDelete) => handleDeleteOption(task.id, tagId, optionToDelete)}
                                            teamId={teamId}
                                            tagId={tagId}
                                            projectThemeColor={projectThemeColor}
                                          />
                                        );
                                      } else if (isMultiSelectColumn(tag) || (tagObj && isMultiSelectType(tagObj))) {
                                        return renderMultiSelectCell(
                                          currentValue,
                                          getTaskOptions(task.id, tagId),
                                          (options) => {
                                            // 激活编辑模式并设置新值
                                            if (!isEditing) {
                                              setEditingTask(task.id);
                                              
                                              // 初始化所有字段值
                                              const allTagValues = {};
                                              sortedTagInfo.forEach((tag, idx) => {
                                                const rIndex = tagOrder[idx];
                                                let tId = String(rIndex + 1);
                                                
                                                if (tagsData && tagsData.tags && Array.isArray(tagsData.tags) && tagsData.tags[rIndex]) {
                                                  tId = String(tagsData.tags[rIndex].id);
                                                }
                                                
                                                allTagValues[tId] = task.tag_values?.[tId] || '';
                                              });
                                              
                                              // 更新当前字段值
                                              allTagValues[tagId] = JSON.stringify(options);
                                              
                                              setEditingTaskValues(allTagValues);
                                              
                                              // 直接提交更改
                                              setTimeout(() => {
                                                handleTaskEditComplete(task.id, sectionId);
                                              }, 0);
                                            } else {
                                              const newValue = JSON.stringify(options);
                                              handleTaskValueChange(task.id, tagId, newValue);
                                            }
                                          },
                                          (newOption) => handleCreateOption(task.id, tagId, newOption),
                                          (editedOption) => handleEditOption(task.id, tagId, editedOption),
                                          (optionToDelete) => handleDeleteOption(task.id, tagId, optionToDelete)
                                        );
                                      } else if (isTagsColumn(tag) || (tagObj && isTagsType(tagObj))) {
                                        return renderTagsCell(
                                          currentValue,
                                          getTaskOptions(task.id, tagId),
                                          (tags) => {
                                            // 激活编辑模式并设置新值
                                            if (!isEditing) {
                                              setEditingTask(task.id);
                                              
                                              // 初始化所有字段值
                                              const allTagValues = {};
                                              sortedTagInfo.forEach((tag, idx) => {
                                                const rIndex = tagOrder[idx];
                                                let tId = String(rIndex + 1);
                                                
                                                if (tagsData && tagsData.tags && Array.isArray(tagsData.tags) && tagsData.tags[rIndex]) {
                                                  tId = String(tagsData.tags[rIndex].id);
                                                }
                                                
                                                allTagValues[tId] = task.tag_values?.[tId] || '';
                                              });
                                              
                                              // 更新当前字段值
                                              allTagValues[tagId] = JSON.stringify(tags);
                                              
                                              setEditingTaskValues(allTagValues);
                                              
                                              // 直接提交更改
                                              setTimeout(() => {
                                                handleTaskEditComplete(task.id, sectionId);
                                              }, 0);
                                            } else {
                                              const newValue = JSON.stringify(tags);
                                              handleTaskValueChange(task.id, tagId, newValue);
                                            }
                                          }
                                        );
                                      } else if (isNumberColumn(tag) || (tagObj && isNumberType(tagObj)) || 
                                                (typeof tag === 'string' && (tag.toLowerCase().includes('duration') || tag.toLowerCase().includes('progress'))) || 
                                                (tagObj && tagObj.name && (tagObj.name.toLowerCase().includes('duration') || tagObj.name.toLowerCase().includes('progress')))) {
                                        // 对于数字类型、Duration和Progress字段，始终使用数字控件
                                        return (
                                          <div onClick={(e) => e.stopPropagation()}>
                                            {renderNumberCell(
                                              processCurrentValue(currentValue),
                                              // 增加数值
                                              (value) => {
                                                // 激活编辑模式并增加数值
                                                if (!isEditing) {
                                                  setEditingTask(task.id);
                                                  
                                                  // 初始化所有字段值
                                                  const allTagValues = {};
                                                  sortedTagInfo.forEach((tag, idx) => {
                                                    const rIndex = tagOrder[idx];
                                                    let tId = String(rIndex + 1);
                                                    
                                                    if (tagsData && tagsData.tags && Array.isArray(tagsData.tags) && tagsData.tags[rIndex]) {
                                                      tId = String(tagsData.tags[rIndex].id);
                                                    }
                                                    
                                                    allTagValues[tId] = task.tag_values?.[tId] || '';
                                                  });
                                                  
                                                  // 更新当前数字字段值
                                                  allTagValues[tagId] = value;
                                                  
                                                  setEditingTaskValues(allTagValues);
                                                  
                                                  // 直接提交更改
                                                  setTimeout(() => {
                                                    handleTaskEditComplete(task.id, sectionId);
                                                  }, 0);
                                                } else {
                                                  handleTaskValueChange(task.id, tagId, value);
                                                  
                                                  // 自动保存更改
                                                  setTimeout(() => {
                                                    handleTaskEditComplete(task.id, sectionId);
                                                  }, 0);
                                                }
                                              },
                                              // 减少数值
                                              (value) => {
                                                // 激活编辑模式并减少数值
                                                if (!isEditing) {
                                                  setEditingTask(task.id);
                                                  
                                                  // 初始化所有字段值
                                                  const allTagValues = {};
                                                  sortedTagInfo.forEach((tag, idx) => {
                                                    const rIndex = tagOrder[idx];
                                                    let tId = String(rIndex + 1);
                                                    
                                                    if (tagsData && tagsData.tags && Array.isArray(tagsData.tags) && tagsData.tags[rIndex]) {
                                                      tId = String(tagsData.tags[rIndex].id);
                                                    }
                                                    
                                                    allTagValues[tId] = task.tag_values?.[tId] || '';
                                                  });
                                                  
                                                  // 更新当前数字字段值
                                                  allTagValues[tagId] = value;
                                                  
                                                  setEditingTaskValues(allTagValues);
                                                  
                                                  // 直接提交更改
                                                  setTimeout(() => {
                                                    handleTaskEditComplete(task.id, sectionId);
                                                  }, 0);
                                                } else {
                                                  handleTaskValueChange(task.id, tagId, value);
                                                  
                                                  // 自动保存更改
                                                  setTimeout(() => {
                                                    handleTaskEditComplete(task.id, sectionId);
                                                  }, 0);
                                                }
                                              },
                                              // 直接设置数值
                                              (value) => {
                                                // 激活编辑模式并设置数值
                                                if (!isEditing) {
                                                  setEditingTask(task.id);
                                                  
                                                  // 初始化所有字段值
                                                  const allTagValues = {};
                                                  sortedTagInfo.forEach((tag, idx) => {
                                                    const rIndex = tagOrder[idx];
                                                    let tId = String(rIndex + 1);
                                                    
                                                    if (tagsData && tagsData.tags && Array.isArray(tagsData.tags) && tagsData.tags[rIndex]) {
                                                      tId = String(tagsData.tags[rIndex].id);
                                                    }
                                                    
                                                    allTagValues[tId] = task.tag_values?.[tId] || '';
                                                  });
                                                  
                                                  // 更新当前数字字段值
                                                  allTagValues[tagId] = value;
                                                  
                                                  setEditingTaskValues(allTagValues);
                                                  
                                                  // 直接提交更改
                                                  setTimeout(() => {
                                                    handleTaskEditComplete(task.id, sectionId);
                                                  }, 0);
                                                } else {
                                                  handleTaskValueChange(task.id, tagId, value);
                                                }
                                              },
                                              // 选项
                                              {
                                                fieldName: typeof tag === 'string' ? tag : (tagObj?.name || ''),
                                                min: 0,
                                                max: (typeof tag === 'string' ? tag : (tagObj?.name || '')).toLowerCase().includes('progress') ? 1 : 999,
                                                step: (typeof tag === 'string' ? tag : (tagObj?.name || '')).toLowerCase().includes('progress') ? 0.1 : 1
                                              }
                                            )}
                                          </div>
                                        );
                                      } else if (isTextColumn(tag) || isTextType(tagObj)) {
                                        // 修改编辑状态下的文本字段处理
                                        const fieldName = typeof tag === 'string' ? tag : (tagObj?.name || '');
                                        return renderTextCell(
                                          typeof currentValue === 'object' && currentValue !== null 
                                            ? (currentValue.text || currentValue.value || JSON.stringify(currentValue)) 
                                            : currentValue,
                                          (value) => {
                                            handleTaskValueChange(task.id, tagId, value);
                                          },
                                          { 
                                            fieldName,
                                            // 如果是Name标签，则设为必填
                                            required: fieldName === 'Name' || tagId === nameTagId,
                                            // 根据字段名称设置合适的最大长度
                                            maxLength: fieldName.toLowerCase().includes('name') ? 50 :
                                                     fieldName.toLowerCase().includes('desc') ? 100 :
                                                     fieldName.toLowerCase().includes('title') ? 50 : 100
                                          }
                                        );
                                      } else {
                                        // 默认作为文本类型处理 - TEXT类型或未识别类型
                                        const fieldName = typeof tag === 'string' ? tag : (tagObj?.name || '');
                                        return renderTextCell(
                                          typeof currentValue === 'object' && currentValue !== null 
                                            ? (currentValue.text || currentValue.value || JSON.stringify(currentValue)) 
                                            : currentValue,
                                          (value) => {
                                            handleTaskValueChange(task.id, tagId, value);
                                          },
                                          { 
                                            fieldName,
                                            // 如果是Name标签，则设为必填
                                            required: fieldName === 'Name' || tagId === nameTagId,
                                            // 根据字段名称设置合适的最大长度
                                            maxLength: fieldName.toLowerCase().includes('name') ? 50 :
                                                     fieldName.toLowerCase().includes('desc') ? 100 :
                                                     fieldName.toLowerCase().includes('title') ? 50 : 100
                                          }
                                        );
                                      }
                                    })()}
                                    
                                    {validationErrors && validationErrors[tagId] && (
                                      <div className="text-red-500 text-xs">
                                        {validationErrors[tagId]}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="w-full overflow-hidden truncate">
                                    {/* 非编辑状态下，使用相同的类型检查逻辑渲染只读组件 */}
                                    {(() => {
                                      // 安全地获取tagObj
                                      const tagObj = tagsData?.tags?.find(t => 
                                        t.id.toString() === tagId || 
                                        t.name === tag
                                      );
                                      
                                      // 检查不同类型并渲染相应查看组件
                                      if (isFileColumn(tag)) {
                                        return renderFileCell(currentValue, (e) => {
                                          e.stopPropagation();
                                        });
                                      } else if (isPeopleColumn(tag)) {
                                        return (
                                          <div onClick={(e) => e.stopPropagation()}>
                                            {typeof currentValue === 'string' 
                                              ? renderPeopleCell(currentValue, task.id, teamId)
                                              : Array.isArray(currentValue)
                                                ? renderPeopleCell(currentValue, task.id, teamId)
                                                : renderPeopleCell('', task.id, teamId)
                                            }
                                          </div>
                                        );
                                      } else if (isDateColumn(tag) || (tagObj && isDateType(tagObj))) {
                                        return (
                                          <div onClick={(e) => {
                                            e.stopPropagation();
                                            // 单击日期时启用编辑模式
                                            if (!isEditing && !isTaskLoading) {
                                              setEditingTask(task.id);
                                              
                                              // 初始化整行的所有标签值
                                              const allTagValues = {};
                                              sortedTagInfo.forEach((tag, idx) => {
                                                const rIndex = tagOrder[idx];
                                                let tId = String(rIndex + 1);
                                                
                                                if (tagsData && tagsData.tags && Array.isArray(tagsData.tags) && tagsData.tags[rIndex]) {
                                                  tId = String(tagsData.tags[rIndex].id);
                                                }
                                                
                                                allTagValues[tId] = task.tag_values?.[tId] || '';
                                              });
                                              
                                              setEditingTaskValues(allTagValues);
                                            }
                                          }}>
                                            {renderDateCell(currentValue, (value) => {
                                              // 直接激活编辑模式并设置日期值
                                              if (!isEditing) {
                                                setEditingTask(task.id);
                                                
                                                // 初始化所有字段值
                                                const allTagValues = {};
                                                sortedTagInfo.forEach((tag, idx) => {
                                                  const rIndex = tagOrder[idx];
                                                  let tId = String(rIndex + 1);
                                                  
                                                  if (tagsData && tagsData.tags && Array.isArray(tagsData.tags) && tagsData.tags[rIndex]) {
                                                    tId = String(tagsData.tags[rIndex].id);
                                                  }
                                                  
                                                  allTagValues[tId] = task.tag_values?.[tId] || '';
                                                });
                                                
                                                // 更新当前日期字段值
                                                allTagValues[tagId] = value;
                                                
                                                setEditingTaskValues(allTagValues);
                                                
                                                // 直接提交更改
                                                setTimeout(() => {
                                                  handleTaskEditComplete(task.id, sectionId);
                                                }, 0);
                                              } else {
                                                // 如果已经在编辑模式，直接更新值
                                                handleTaskValueChange(task.id, tagId, value);
                                                
                                                // 自动保存更改
                                                setTimeout(() => {
                                                  handleTaskEditComplete(task.id, sectionId);
                                                }, 0);
                                              }
                                            })}
                                          </div>
                                        );
                                      } else if (isIdColumn(tag) || (tagObj && isIdType(tagObj))) {
                                        return (
                                          <div onClick={(e) => e.stopPropagation()}>
                                            {renderIdCell(currentValue)}
                                          </div>
                                        );
                                      } else if (isSingleSelectColumn(tag) || (tagObj && isSingleSelectType(tagObj))) {
                                        return (
                                          <div onClick={(e) => e.stopPropagation()}>
                                            <EnhancedSingleSelect
                                              value={currentValue}
                                              options={getTaskOptions(task.id, tagId)}
                                              onChange={(option) => {
                                                // 激活编辑模式并设置新值
                                                if (!isEditing) {
                                                  setEditingTask(task.id);
                                                  
                                                  // 初始化所有字段值
                                                  const allTagValues = {};
                                                  sortedTagInfo.forEach((tag, idx) => {
                                                    const rIndex = tagOrder[idx];
                                                    let tId = String(rIndex + 1);
                                                    
                                                    if (tagsData && tagsData.tags && Array.isArray(tagsData.tags) && tagsData.tags[rIndex]) {
                                                      tId = String(tagsData.tags[rIndex].id);
                                                    }
                                                    
                                                    allTagValues[tId] = task.tag_values?.[tId] || '';
                                                  });
                                                  
                                                  // 更新当前字段值
                                                  allTagValues[tagId] = JSON.stringify(option);
                                                  
                                                  setEditingTaskValues(allTagValues);
                                                  
                                                  // 直接提交更改
                                                  setTimeout(() => {
                                                    handleTaskEditComplete(task.id, sectionId);
                                                  }, 0);
                                                } else {
                                                  const newValue = JSON.stringify(option);
                                                  handleTaskValueChange(task.id, tagId, newValue);
                                                }
                                              }}
                                              onCreateOption={(newOption) => handleCreateOption(task.id, tagId, newOption)}
                                              onEditOption={(editedOption) => handleEditOption(task.id, tagId, editedOption)}
                                              onDeleteOption={(optionToDelete) => handleDeleteOption(task.id, tagId, optionToDelete)}
                                              teamId={teamId}
                                              tagId={tagId}
                                              projectThemeColor={projectThemeColor}
                                            />
                                          </div>
                                        );
                                      } else if (isMultiSelectColumn(tag) || (tagObj && isMultiSelectType(tagObj))) {
                                        return (
                                          <div onClick={(e) => e.stopPropagation()}>
                                            {renderMultiSelectCell(
                                              currentValue,
                                              getTaskOptions(task.id, tagId),
                                              (options) => {
                                                // 激活编辑模式并设置新值
                                                if (!isEditing) {
                                                  setEditingTask(task.id);
                                                  
                                                  // 初始化所有字段值
                                                  const allTagValues = {};
                                                  sortedTagInfo.forEach((tag, idx) => {
                                                    const rIndex = tagOrder[idx];
                                                    let tId = String(rIndex + 1);
                                                    
                                                    if (tagsData && tagsData.tags && Array.isArray(tagsData.tags) && tagsData.tags[rIndex]) {
                                                      tId = String(tagsData.tags[rIndex].id);
                                                    }
                                                    
                                                    allTagValues[tId] = task.tag_values?.[tId] || '';
                                                  });
                                                  
                                                  // 更新当前字段值
                                                  allTagValues[tagId] = JSON.stringify(options);
                                                  
                                                  setEditingTaskValues(allTagValues);
                                                  
                                                  // 直接提交更改
                                                  setTimeout(() => {
                                                    handleTaskEditComplete(task.id, sectionId);
                                                  }, 0);
                                                } else {
                                                  const newValue = JSON.stringify(options);
                                                  handleTaskValueChange(task.id, tagId, newValue);
                                                }
                                              },
                                              (newOption) => handleCreateOption(task.id, tagId, newOption),
                                              (editedOption) => handleEditOption(task.id, tagId, editedOption),
                                              (optionToDelete) => handleDeleteOption(task.id, tagId, optionToDelete)
                                            )}
                                          </div>
                                        );
                                      } else if (isTagsColumn(tag) || (tagObj && isTagsType(tagObj))) {
                                        return (
                                          <div onClick={(e) => e.stopPropagation()}>
                                            {renderTagsCell(
                                              currentValue,
                                              getTaskOptions(task.id, tagId),
                                              (tags) => {
                                                // 激活编辑模式并设置新值
                                                if (!isEditing) {
                                                  setEditingTask(task.id);
                                                  
                                                  // 初始化所有字段值
                                                  const allTagValues = {};
                                                  sortedTagInfo.forEach((tag, idx) => {
                                                    const rIndex = tagOrder[idx];
                                                    let tId = String(rIndex + 1);
                                                    
                                                    if (tagsData && tagsData.tags && Array.isArray(tagsData.tags) && tagsData.tags[rIndex]) {
                                                      tId = String(tagsData.tags[rIndex].id);
                                                    }
                                                    
                                                    allTagValues[tId] = task.tag_values?.[tId] || '';
                                                  });
                                                  
                                                  // 更新当前字段值
                                                  allTagValues[tagId] = JSON.stringify(tags);
                                                  
                                                  setEditingTaskValues(allTagValues);
                                                  
                                                  // 直接提交更改
                                                  setTimeout(() => {
                                                    handleTaskEditComplete(task.id, sectionId);
                                                  }, 0);
                                                } else {
                                                  const newValue = JSON.stringify(tags);
                                                  handleTaskValueChange(task.id, tagId, newValue);
                                                }
                                              }
                                            )}
                                          </div>
                                        );
                                      } else {
                                        // 默认作为文本类型处理 - TEXT类型或未识别类型
                                        const fieldName = typeof tag === 'string' ? tag : (tagObj?.name || '');
                                        return renderTextCell(
                                          typeof currentValue === 'object' && currentValue !== null 
                                            ? (currentValue.text || currentValue.value || JSON.stringify(currentValue)) 
                                            : currentValue,
                                          (value) => {
                                            handleTaskValueChange(task.id, tagId, value);
                                          },
                                          { 
                                            fieldName,
                                            // 如果是Name标签，则设为必填
                                            required: fieldName === 'Name' || tagId === nameTagId
                                          }
                                        );
                                      }
                                    })()}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                          
                          {/* 添加操作按钮 - 只在编辑状态显示 */}
                          {(isEditing || isCurrentTaskBeingAdded) && (
                            <div className="flex items-center px-2 gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 text-muted-foreground hover:text-primary"
                                onClick={() => handleTaskEditComplete(task.id, sectionId)}
                                disabled={isTaskLoading}
                                title={t('save')}
                              >
                                {isTaskLoading ? (
                                  <Loader2 size={16} className="animate-spin" />
                                ) : (
                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="20 6 9 17 4 12"></polyline>
                                  </svg>
                                )}
                              </Button>
                            </div>
                          )}

                          {/* 非编辑状态下的操作按钮 - 在鼠标悬停时显示 */}
                          {!isEditing && !isCurrentTaskBeingAdded && hoveredTaskRow === task.id && (
                            <div className="flex items-center px-2 gap-1 absolute right-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 mt-1.5 text-muted-foreground hover:text-red-500"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  confirm({
                                    title: tConfirm('confirmDeleteTask'),
                                    description: `${tConfirm('task')} "${task.tag_values?.['1'] || ''}" ${tConfirm('willBeDeleted')}`,
                                    variant: 'error',
                                    onConfirm: () => {
                                      handleDeleteTask(task.id, sectionId);
                                    }
                                  });
                                }}
                                disabled={externalIsLoading}
                                title={t('delete')}
                              >
                                <Trash size={16} className="text-red-500 hover:text-red-600" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </Draggable>
              );
            })}
            <div className="text-muted-foreground text-sm p-1 text-center">
              <Button 
                variant="ghost" 
                className="text-muted-foreground p-1 text-center"
                onClick={() => handleAddTask(sectionId)}
                disabled={externalIsLoading || isAddingTask}
              >
                {externalIsLoading ? (
                  <Loader2 size={16} className="animate-spin text-muted-foreground" />
                ) : (
                  <Plus size={16} className="text-muted-foreground" />                    
                )}
              </Button>
            </div>
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    );
  };

  // 添加一个按需重试特定部门任务加载的函数
  const retryLoadSectionTasks = async (sectionId, maxRetries = 3, delay = 500) => {
    if (!sectionId || !teamId) return;
    
    let retryCount = 0;
    let success = false;
    
    
    // 确保标签数据已加载
    if (!tagsData || (Array.isArray(tagsData.tags) && tagsData.tags.length === 0)) {
      return false;
    }
    
    // 获取部门信息
    const section = sections.find(s => s.id === sectionId);
    if (!section) {
      return false;
    }
    
    const tags = tagsData?.tags || tagsData || [];
    
    while (retryCount < maxRetries && !success) {
      retryCount++;
      
      try {
        const taskData = await dispatch(fetchTasksBySectionId(sectionId)).unwrap();
        
        if (taskData && taskData.length > 0) {
          
          // 过滤任务
          const filteredTasks = taskData.filter(task => {
            if (!task || !task.tag_values) return false;
            
            for (const [tagId, value] of Object.entries(task.tag_values)) {
              const tag = tags.find(t => t.id.toString() === tagId);
              if (tag?.name === 'Name' && value) {
                return true;
              }
            }
            return false;
          });
          
          // 更新这个部门的任务数据
          setLocalTasks(prev => ({
            ...prev,
            [sectionId]: filteredTasks
          }));
          
          success = true;
          return true;
        } else {
          
          // 设置空数组
          setLocalTasks(prev => ({
            ...prev,
            [sectionId]: []
          }));
          
          if (retryCount < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      } catch (error) {
        console.error(`部门"${section.name}"第${retryCount}次重试失败:`, error);
        
        if (retryCount < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    if (!success) {
      return false;
    }
    
    return success;
  };

  // 渲染主体内容
  const renderBodyContent = () => {
    return (
      <Droppable droppableId="sections" type="SECTION" mode="standard" direction="vertical" ignoreContainerClipping={true}>
        {(provided) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className="sections-container"
          >
            {/* 部门列表 */}
            {sectionInfo.length > 0 ? (
              sectionInfo.map((section, sectionIndex) => (
                <Draggable 
                  key={section.id} 
                  draggableId={`section-${section.id}`} 
                  index={sectionIndex}
                >
                  {/* 渲染部门标题行 */}
                  {(sectionProvided, snapshot) => renderSectionHeader(section, sectionProvided, snapshot)}
                </Draggable>
              ))
            ) : (
              ''
            )}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    );
  };

  return {
    loadSections,
    loadAllSectionTasks,
    renderBodyContent,
    handleAddTask,
    retryLoadTasks,
    retryLoadSectionTasks,
    taskOptions,  // 导出选项状态，以便外部组件可以访问
    setTaskOptions  // 导出设置选项的函数，以便外部组件可以修改
  };
}

// 在外部组件中使用示例:
// 
// import { useBodyContent } from './BodyContent';
// 
// function TeamListComponent() {
//   // 定义任务处理函数
//   const handleAddTask = (sectionId) => { /* ... */ };
//   const handleTaskValueChange = (taskId, tagId, value) => { /* ... */ };
//   const handleTaskEditComplete = (taskId, sectionId) => { /* ... */ };
//   const handleKeyDown = (e, taskId, sectionId) => { /* ... */ };
//   
//   // 状态管理
//   const [editingTask, setEditingTask] = useState(null);
//   const [editingTaskValues, setEditingTaskValues] = useState({});
//   const [isLoading, setIsLoading] = useState(false);
//   
//   // 使用bodyContent hook
//   const { 
//     loadSections, 
//     loadAllSectionTasks, 
//     renderBodyContent,
//     retryLoadTasks,
//     retryLoadSectionTasks
//   } = useBodyContent(
//     handleAddTask,
//     handleTaskValueChange,
//     handleTaskEditComplete,
//     handleKeyDown,
//     editingTask,
//     editingTaskValues,
//     isLoading,
//     validationErrors
//   );
//   
//   // 在组件加载时加载数据
//   useEffect(() => {
//     // 先加载部门数据
//     loadSections();
//     
//     // 如果加载失败，可以使用重试机制
//     // retryLoadTasks(500, 3);
//     
//     // 针对特定部门，可以单独重试
//     // retryLoadSectionTasks(sectionId, 3, 500);
//   }, []);
//   
//   return (
//     <div>
//       {renderBodyContent()}
//     </div>
//   );
// }