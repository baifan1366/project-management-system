'use client'

import { useState, useEffect, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { ChevronRight, ChevronDown, MoreHorizontal, Plus, Circle } from 'lucide-react';
import { getSectionByTeamId } from '@/lib/redux/features/sectionSlice';
import { fetchTasksBySectionId } from '@/lib/redux/features/taskSlice';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export default function BodyContent({ 
  teamId, 
  sections, 
  localTasks, 
  setLocalTasks,
  tagWidths, 
  tagOrder, 
  sortedTagInfo,
  editingTask,
  editingTaskValues,
  handleAddTask,
  handleTaskValueChange,
  handleTaskEditComplete,
  handleKeyDown
}) {
  const dispatch = useDispatch();
  const [isLoading, setIsLoading] = useState(false);
  const isSectionRequestInProgress = useState(false)[0];
  const isTaskRequestInProgress = useState(false)[0];
  const hasLoadedSections = useState(false)[0];
  const hasLoadedTasks = useState(false)[0];
  
  // 存储折叠状态的对象
  const [collapsedSections, setCollapsedSections] = useState({});
  // 存储悬停状态的对象
  const [hoveredSectionHeader, setHoveredSectionHeader] = useState(null);
  // 存储任务行悬停状态
  const [hoveredTaskRow, setHoveredTaskRow] = useState(null);
  // 存储拖拽状态
  const [isDragging, setIsDragging] = useState(false);

  // 处理部门数据
  const sectionInfo = useMemo(() => {
    if (!sections || !sections.length) return [];
    return sections.map(section => section);
  }, [sections]);

  // 加载部门数据
  const loadSections = async () => {
    if (!teamId || isSectionRequestInProgress) return;
    
    try {
      setIsLoading(true);
      
      await dispatch(getSectionByTeamId(teamId)).unwrap();
    } catch (error) {
      console.error('Error loading sections:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 加载所有部门的任务
  const loadAllSectionTasks = async () => {
    if (!teamId || isTaskRequestInProgress || !sections || !sections.length) return;
    
    try {
      setIsLoading(true);
      
      // 为每个部门加载任务
      for (let i = 0; i < sections.length; i++) {
        const section = sections[i];
        if (section && section.id) {
          const taskData = await dispatch(fetchTasksBySectionId(section.id)).unwrap();
          
          // 将任务数据存储到本地状态中
          setLocalTasks(prevTasks => ({
            ...prevTasks,
            [section.id]: taskData
          }));
        }
      }
    } catch (error) {
      console.error('加载所有任务失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 切换部门的折叠状态
  const toggleSectionCollapse = (sectionId) => {
    setCollapsedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  // 处理拖拽开始事件
  const handleDragStart = (result) => {
    setIsDragging(true);
  };

  // 处理拖放结束事件
  const handleDragEnd = (result) => {
    const { destination, source, type } = result;

    // 如果没有目标位置或目标位置相同，则不执行任何操作
    if (!destination || 
        (destination.droppableId === source.droppableId && 
         destination.index === source.index)) {
      setIsDragging(false);
      return;
    }

    // 根据类型处理不同的拖放操作
    if (type === 'TASK') {
      // 处理任务拖放的逻辑
      console.log('将任务从', source, '移动到', destination);
      // 在这里添加更新任务位置的逻辑
    } else if (type === 'SECTION') {
      // 处理部门拖放的逻辑
      console.log('将部门从', source.index, '移动到', destination.index);
      // 在这里添加更新部门位置的逻辑
    }
    
    setIsDragging(false);
  };

  // 获取标签宽度
  const getTagWidth = (index) => {
    return tagWidths[index] || 200;
  };

  // 部门标题行
  const renderSectionHeader = (section, sectionProvided, snapshot) => {
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
          <span 
            {...sectionProvided.dragHandleProps}
            className="cursor-grab left-0 font-medium"
          >
            {section.name}
          </span>     

          {/* 按钮组 - 当且仅当当前部门行被悬停时显示 */}
          {hoveredSectionHeader === section.id && (
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
                    添加任务
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
                  <DropdownMenuItem>编辑部门</DropdownMenuItem>
                  <DropdownMenuItem>重命名</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive">删除部门</DropdownMenuItem>
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
          部门已折叠
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
      <Droppable droppableId={`tasks-${sectionId}`} type="TASK">
        {(provided) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
          >
            {localTasks[sectionId].map((task, taskIndex) => {
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
                      className={`border-b border-border ${
                        snapshot.isDragging ? 'shadow-lg bg-accent/30' : ''
                      } ${hoveredTaskRow === task.id ? 'bg-accent/20' : ''}`}
                      onMouseEnter={() => setHoveredTaskRow(task.id)}
                      onMouseLeave={() => setHoveredTaskRow(null)}
                    >
                      <div className="flex items-center w-full">
                        {/* 拖拽手柄 */}
                        <div {...taskProvided.dragHandleProps} className="flex justify-start items-center pl-4 pr-2 cursor-grab flex-shrink-0" >
                          <Circle size={12} className="text-muted-foreground" />
                        </div>
                        
                        {/* 任务标签值容器 */}
                        <div className="flex flex-grow">
                          {sortedTagInfo.map((tag, tagIndex) => {
                            // 获取该标签对应的真实索引
                            const realIndex = tagOrder[tagIndex];
                            const tagId = String(realIndex + 1); // 标签ID从1开始，转为字符串
                            
                            // 根据截图中的数据结构调整获取标签值的方式
                            let tagValue = '';
                            if (task.tag_values && tagId in task.tag_values) {
                              tagValue = task.tag_values[tagId];
                            }
                            
                            // 检查是否是正在编辑的任务
                            const isEditing = editingTask === task.id;
                            
                            return (
                              <div 
                                key={`task-${task.id}-tag-${tagId}`} 
                                className={`p-2 overflow-hidden text-ellipsis whitespace-nowrap border-r ${isEditing ? 'bg-accent/10' : ''}`}
                                style={{
                                  width: `${getTagWidth(tagIndex)}px`,
                                  minWidth: `${getTagWidth(tagIndex)}px`, 
                                  maxWidth: `${getTagWidth(tagIndex)}px`,
                                }}
                                onClick={() => {
                                  if (task.isNew && !isEditing) {
                                    setEditingTask(task.id);
                                  }
                                }}
                              >
                                {isEditing ? (
                                  <input
                                    type="text"
                                    value={editingTaskValues[tagId] || ''}
                                    onChange={(e) => handleTaskValueChange(task.id, tagId, e.target.value)}
                                    onKeyDown={(e) => handleKeyDown(e, task.id, task.sectionId)}
                                    onBlur={() => {
                                      if (Object.keys(editingTaskValues).length > 0) {
                                        handleTaskEditComplete(task.id, task.sectionId);
                                      }
                                    }}
                                    autoFocus={tagIndex === 0}
                                    className="w-full bg-transparent border-none focus:outline-none"
                                    placeholder={`输入${tag}`}
                                  />
                                ) : (
                                  tagValue
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
              >
                <Plus size={16} className="text-muted-foreground" />
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
      <Droppable droppableId="sections" type="SECTION">
        {(provided) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
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
              <div className="text-muted-foreground text-center p-4">
                没有部门数据
              </div>
            )}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    );
  };

  return {
    isLoading,
    collapsedSections,
    isDragging,
    handleDragStart,
    handleDragEnd,
    loadSections,
    loadAllSectionTasks,
    renderBodyContent
  };
}
