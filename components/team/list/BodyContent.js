'use client'

import { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { ChevronRight, ChevronDown, MoreHorizontal, Plus, Circle, Trash, Loader2 } from 'lucide-react';
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

  // 处理部门数据
  const sectionInfo = useMemo(() => {
    if (!sections || !sections.length) return [];
    return sections.map(section => section);
  }, [sections]);

  // 加载部门数据
  const loadSections = async () => {
    // 检查是否有有效的teamId
    if (!teamId) {
      console.log('No teamId provided, cannot load sections');
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
    } catch (error) {
      console.error(`Error loading sections for team ${teamId}:`, error);
    } finally {
      setIsLoading(false);
      isSectionRequestInProgress.current = false;
    }
  };

  // 加载所有部门的任务
  const loadAllSectionTasks = async () => {
    if (!teamId || isTaskRequestInProgress.current) return;
    
    // 确保有部门数据
    if (!sections || sections.length === 0) return;
    
    isTaskRequestInProgress.current = true;
    try {
      setIsLoading(true);
      
      // 创建新的任务数据对象，不依赖于之前的状态
      const newTasksData = {};
      
      // 为每个部门加载任务
      for (let i = 0; i < sections.length; i++) {
        const section = sections[i];
        if (section && section.id) {
          try {
            const taskData = await dispatch(fetchTasksBySectionId(section.id)).unwrap();
            // 将任务数据直接添加到新对象中
            newTasksData[section.id] = taskData;
          } catch (sectionError) {
            console.error(`加载部门 ${section.id} 的任务失败:`, sectionError);
            // 为失败的部门设置空数组
            newTasksData[section.id] = [];
          }
        }
      }
      
      // 一次性更新所有任务数据，替换旧数据
      setLocalTasks(newTasksData);
    } catch (error) {
      console.error('加载所有任务失败:', error);
      // 发生错误时重置任务数据
      setLocalTasks({});
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
      
      console.log('更新部门名称', {
        sectionId: editingSectionId,
        newName: editingSectionName.trim()
      });
      
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
        console.log('删除部门', sectionId);
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
                                    {currentValue}
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
    handleAddTask
  };
}