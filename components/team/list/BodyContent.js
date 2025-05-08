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
  Fingerprint
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
  renderIdCell
} from './TagConfig';

export function useBodyContent(handleAddTask, handleTaskValueChange, handleTaskEditComplete, handleKeyDown, externalEditingTask, externalEditingTaskValues, externalIsLoading) {
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
  const { tags: tagsData } = useSelector((state) => state.teamCF);
  
  // 从Redux状态中获取部门数据
  const { sections, status: sectionsStatus } = useSelector((state) => state.sections);
  
  // 获取标签宽度
  const { getTagWidth } = useResizeTools();

  // 获取Name标签的ID
  const nameTagId = useMemo(() => {
    if (!tagsData?.length) return null;
    const nameTag = tagsData.find(tag => tag.name === 'Name');
    return nameTag?.id?.toString();
  }, [tagsData]);

  // 处理部门数据
  const sectionInfo = useMemo(() => {
    if (!sections || !sections.length) return [];
    return sections.map(section => section);
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
    if (!sections || sections.length === 0) {
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
      
      // 为每个部门加载任务
      
      // 设置延迟间隔 - 每个部门加载后等待一段时间再加载下一个部门
      const sectionLoadDelay = 200; // 毫秒
      
      for (let i = 0; i < sections.length; i++) {
        const section = sections[i];
        if (section && section.id) {
          
          // 如果不是第一个部门，添加延迟
          if (i > 0) {
            await new Promise(resolve => setTimeout(resolve, sectionLoadDelay));
          }
          
          try {
            const taskData = await dispatch(fetchTasksBySectionId(section.id)).unwrap();
            
            if (taskData.length === 0) {
              newTasksData[section.id] = [];
              continue;
            }
            
            // 过滤掉没有名称的任务
            const filteredTasks = taskData.filter(task => {
              // 确保task和tag_values存在
              if (!task || !task.tag_values) return false;
              
              // 遍历task的tag_values
              for (const [tagId, value] of Object.entries(task.tag_values)) {
                // 检查这个tag是否是Name类型
                const tag = tags.find(t => t.id.toString() === tagId);
                if (tag?.name === 'Name' && value) {
                  return true;
                }
              }
              return false;
            });
            
            
            // 将过滤后的任务数据添加到新对象中
            newTasksData[section.id] = filteredTasks;
            
            // 立即更新这个部门的任务到状态，而不是等待所有部门加载完成
            // 这样用户可以更快看到已加载的部门任务
            setLocalTasks(prev => ({
              ...prev,
              [section.id]: filteredTasks
            }));
            
          } catch (sectionError) {
            console.error(`加载部门"${section.name}"(ID:${section.id})的任务失败:`, sectionError);
            // 为失败的部门设置空数组
            newTasksData[section.id] = [];
            
            // 立即更新失败的部门任务状态
            setLocalTasks(prev => ({
              ...prev,
              [section.id]: []
            }));
            
            // 如果是因为网络问题，可以尝试重新加载
            if (sectionError.name === 'NetworkError') {
              // 这里可以选择是否立即重试，或者标记为需要重试
            }
          }
        }
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
                      className={`border-b border-border h-10 ${
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
                                      
                                      allTagValues[tId] = task.tag_values?.[tId] || '';
                                    });
                                    
                                    setEditingTaskValues(allTagValues);
                                  }
                                }}
                              >
                                {(isEditing || isCurrentTaskBeingAdded) ? (
                                  <input
                                    type="text"
                                    ref={tagIndex === 0 ? taskInputRef : null}
                                    value={currentValue}
                                    onChange={(e) => {
                                      const newValue = e.target.value;
                                      handleTaskValueChange(task.id, tagId, newValue);
                                    }}
                                    onKeyDown={(e) => handleKeyDown(e, task.id, sectionId)}
                                    autoFocus={tagIndex === 0}
                                    className="w-full bg-transparent border-none focus:outline-none h-10"
                                    placeholder={`${t('input')} ${tag}`}
                                    onClick={(e) => e.stopPropagation()}
                                    disabled={isTaskLoading}
                                    spellCheck="false"
                                    autoComplete="off"
                                    autoCorrect="off"
                                    autoCapitalize="off"
                                  />
                                ) : (
                                  <div className="w-full overflow-hidden truncate">
                                    {/* 检查是否为文件列 */}
                                    {isFileColumn(tag) && currentValue ? (
                                      renderFileCell(currentValue, (e) => {
                                        e.stopPropagation();
                                        // 如果需要，这里可以添加文件点击处理
                                      })
                                    ) : isPeopleColumn(tag) ? (
                                      // 检查是否为人员列
                                      <div onClick={(e) => e.stopPropagation()}>
                                        {/* 如果值是字符串形式，直接传递；如果已经是数组形式，转换为字符串格式 */}
                                        {typeof currentValue === 'string' 
                                          ? renderPeopleCell(currentValue)
                                          : Array.isArray(currentValue)
                                            ? renderPeopleCell(currentValue) // 已修改parseUserIds支持数组
                                            : renderPeopleCell('')
                                        }
                                      </div>
                                    ) : isDateColumn(tag) ? (
                                      // 检查是否为日期列
                                      <div onClick={(e) => e.stopPropagation()}>
                                        {renderDateCell(currentValue, (value) => handleTaskValueChange(task.id, tagId, value))}
                                      </div>
                                    ) : isIdColumn(tag) ? (
                                      // 检查是否为ID列
                                      <div onClick={(e) => e.stopPropagation()}>
                                        {renderIdCell(currentValue)}
                                      </div>
                                    ) : (() => {
                                      // 尝试从tagsData中获取标签对象
                                      const tagObj = tagsData?.tags?.find(t => 
                                        t.id.toString() === tagId || 
                                        t.name === tag
                                      );
                                      
                                      // 检查是否为数字类型
                                      if ((tagObj && isNumberType(tagObj)) || isNumberColumn(tag)) {
                                        return (
                                          <div onClick={(e) => e.stopPropagation()}>
                                            {renderNumberCell(
                                              currentValue,
                                              (value) => handleTaskValueChange(task.id, tagId, value + 1),
                                              (value) => handleTaskValueChange(task.id, tagId, value - 1),
                                              (value) => handleTaskValueChange(task.id, tagId, value)
                                            )}
                                          </div>
                                        );
                                      }
                                      
                                      // 检查是否为日期类型，如果基于标签对象判断
                                      if (tagObj && isDateType(tagObj)) {
                                        return (
                                          <div onClick={(e) => e.stopPropagation()}>
                                            {renderDateCell(currentValue, (value) => handleTaskValueChange(task.id, tagId, value))}
                                          </div>
                                        );
                                      }
                                      
                                      // 检查是否为ID类型，如果基于标签对象判断
                                      if (tagObj && isIdType(tagObj)) {
                                        return (
                                          <div onClick={(e) => e.stopPropagation()}>
                                            {renderIdCell(currentValue)}
                                          </div>
                                        );
                                      }
                                      
                                      return currentValue;
                                    })()}
                                  </div>
                                )}
                              </div>
                            );
                          })}
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
    retryLoadSectionTasks
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
//     isLoading
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