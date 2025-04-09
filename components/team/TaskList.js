'use client'

import { useTranslations } from 'next-intl';
import { useEffect, useState, useRef, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Plus, MoreHorizontal, ChevronRight, ChevronDown, Grip, Circle } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import CreateTagDialog from './TagDialog';
import { getTags, resetTagsStatus } from '@/lib/redux/features/teamCFSlice';
import { getSectionByTeamId } from '@/lib/redux/features/sectionSlice';
import { fetchTasksBySectionId, fetchTaskById, createTask } from '@/lib/redux/features/taskSlice';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export default function TaskList({ projectId, teamId, teamCFId }) {
  const t = useTranslations('CreateTask');
  const dispatch = useDispatch();
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const isTagRequestInProgress = useRef(false);
  const isSectionRequestInProgress = useRef(false);
  const isTaskRequestInProgress = useRef(false);
  const hasLoadedTags = useRef(false);
  const hasLoadedSections = useRef(false);
  const hasLoadedTasks = useRef(false);
  
  // 存储折叠状态的对象
  const [collapsedSections, setCollapsedSections] = useState({});
  // 存储悬停状态的对象
  const [hoveredSectionHeader, setHoveredSectionHeader] = useState(null);
  // 存储任务行悬停状态
  const [hoveredTaskRow, setHoveredTaskRow] = useState(null);
  // 存储标签顺序状态
  const [tagOrder, setTagOrder] = useState([]);
  // 存储标签拖拽状态
  const [isDraggingTag, setIsDraggingTag] = useState(false);
  // 存储标签宽度状态
  const [tagWidths, setTagWidths] = useState({});
  // 存储任务数据
  const [localTasks, setLocalTasks] = useState({});
  // 存储正在调整宽度的标签索引
  const [resizingTagIndex, setResizingTagIndex] = useState(null);

  // 从Redux状态中获取标签数据
  const { tags: tagsData, tagsStatus } = useSelector((state) => state.teamCF);
  // 从Redux状态中获取部门数据
  const { sections, status: sectionsStatus } = useSelector((state) => state.sections);
  // 从Redux状态中获取任务数据
  const { tasks, status: tasksStatus } = useSelector((state) => state.tasks);
  
  // 处理标签数据
  const tagInfo = useMemo(() => {
    // 如果API直接返回标签数组而不是{tags:[...]}形式
    if (!tagsData) return [];
    // 检查tagsData本身是否是数组
    if (Array.isArray(tagsData)) {
      return tagsData.map(tag => tag.name || '');
    }
    // 兼容原来的结构
    return (tagsData.tags || []).map(tag => tag.name || '');
  }, [tagsData]);
  
  // 初始化标签顺序
  useEffect(() => {
    if (tagInfo.length > 0 && tagOrder.length === 0) {
      setTagOrder(tagInfo.map((_, index) => index));
    }
  }, [tagInfo, tagOrder]);
  
  // 根据标签顺序获取排序后的标签
  const sortedTagInfo = useMemo(() => {
    if (tagOrder.length === 0 || tagInfo.length === 0) return tagInfo;
    return tagOrder.map(index => tagInfo[index]);
  }, [tagInfo, tagOrder]);
  
  // 处理部门数据
  const sectionInfo = useMemo(() => {
    if (!sections || !sections.length) return [];
    return sections.map(section => section);
  }, [sections]);
  
  // 加载标签数据
  const loadTag = async () => {
    if (!teamId || !teamCFId || isTagRequestInProgress.current) return;
    
    try {
      isTagRequestInProgress.current = true;
      setIsLoading(true);
      
      await dispatch(getTags({ teamId, teamCFId })).unwrap();
      hasLoadedTags.current = true;
    } catch (error) {
      console.error('加载标签失败:', error);
      hasLoadedTags.current = false;
    } finally {
      setIsLoading(false);
      isTagRequestInProgress.current = false;
    }
  };

  // 加载部门数据
  const loadSections = async () => {
    if (!teamId || isSectionRequestInProgress.current) return;
    
    try {
      isSectionRequestInProgress.current = true;
      setIsLoading(true);
      
      await dispatch(getSectionByTeamId(teamId)).unwrap();
      
      hasLoadedSections.current = true;
    } catch (error) {
      console.error('Error loading sections:', error);
      hasLoadedSections.current = false;
    } finally {
      setIsLoading(false);
      isSectionRequestInProgress.current = false;
    }
  };

  // 加载所有部门的任务
  const loadAllSectionTasks = async () => {
    if (!teamId || isTaskRequestInProgress.current || !sections || !sections.length) return;
    
    try {
      isTaskRequestInProgress.current = true;
      setIsLoading(true);
      
      // 为每个部门加载任务
      for (let i = 0; i < sections.length; i++) {
        const section = sections[i];
        if (section && section.id) {
          const taskData = await dispatch(fetchTasksBySectionId(section.id)).unwrap();
          console.log('sectionId', section.id, 'taskData', taskData);
          
          // 将任务数据存储到本地状态中
          setLocalTasks(prevTasks => ({
            ...prevTasks,
            [section.id]: taskData
          }));
        }
      }
      
      hasLoadedTasks.current = true;
    } catch (error) {
      console.error('加载所有任务失败:', error);
      hasLoadedTasks.current = false;
    } finally {
      setIsLoading(false);
      isTaskRequestInProgress.current = false;
    }
  };

  // 参数变化时重置加载状态
  useEffect(() => {
    if (teamId && teamCFId) {
      // 重置标签请求状态
      hasLoadedTags.current = false; 
    }
    if (teamId) {
      // 重置部门请求状态
      hasLoadedSections.current = false;
      hasLoadedTasks.current = false;
    }
  }, [teamId, teamCFId]);

  // 处理标签加载
  useEffect(() => {
    if (teamId && teamCFId && !hasLoadedTags.current && tagsStatus !== 'loading') {
      // 使用setTimeout避免在渲染过程中请求
      setTimeout(loadTag, 0);
    }
    
    return () => {
      // 组件卸载时重置状态
      dispatch(resetTagsStatus());
    };
  }, [dispatch, teamId, teamCFId, tagsStatus]);
  
  // 处理部门加载
  useEffect(() => {
    if (teamId && !hasLoadedSections.current) {
      setTimeout(loadSections, 0);
    }
  }, [teamId, sectionsStatus]);
  
  // 处理任务加载
  useEffect(() => {
    if (teamId && sections && sections.length > 0 && !hasLoadedTasks.current) {
      setTimeout(() => loadAllSectionTasks(), 0);
    }
  }, [teamId, sections]);

  // 关闭创建标签对话框
  const handleCloseDialog = () => {
    setDialogOpen(false);
    // 在对话框关闭后强制重新加载数据
    setTimeout(() => {
      hasLoadedTags.current = false;
      hasLoadedSections.current = false;
      isTagRequestInProgress.current = false;
      isSectionRequestInProgress.current = false;
      loadTag();
      loadSections();
    }, 100);
  };

  // 处理拖放结束事件
  const handleDragEnd = (result) => {
    const { destination, source, draggableId, type } = result;

    // 如果没有目标位置或目标位置相同，则不执行任何操作
    if (!destination || 
        (destination.droppableId === source.droppableId && 
         destination.index === source.index)) {
      setIsDraggingTag(false);
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
    } else if (type === 'TAG') {
      // 处理标签拖放的逻辑
      const newTagOrder = Array.from(tagOrder);
      const [removed] = newTagOrder.splice(source.index, 1);
      newTagOrder.splice(destination.index, 0, removed);
      setTagOrder(newTagOrder);
      console.log('标签顺序已更新:', newTagOrder);
      
      // 保存标签顺序到本地存储
      try {
        localStorage.setItem(`tagOrder-${teamId}-${teamCFId}`, JSON.stringify(newTagOrder));
      } catch (error) {
        console.error('保存标签顺序失败:', error);
      }
    }
    
    setIsDraggingTag(false);
  };

  // 处理拖拽开始事件
  const handleDragStart = (result) => {
    const { type } = result;
    if (type === 'TAG') {
      setIsDraggingTag(true);
    }
  };

  // 从本地存储加载标签顺序
  useEffect(() => {
    if (teamId && teamCFId && tagInfo.length > 0) {
      try {
        const savedOrder = localStorage.getItem(`tagOrder-${teamId}-${teamCFId}`);
        if (savedOrder) {
          const parsedOrder = JSON.parse(savedOrder);
          // 确保保存的顺序与当前标签数量匹配
          if (parsedOrder.length === tagInfo.length) {
            setTagOrder(parsedOrder);
          } else {
            // 如果标签数量变化，重新初始化顺序
            setTagOrder(tagInfo.map((_, index) => index));
          }
        } else {
          // 如果没有保存的顺序，初始化顺序
          setTagOrder(tagInfo.map((_, index) => index));
        }
      } catch (error) {
        console.error('加载标签顺序失败:', error);
        setTagOrder(tagInfo.map((_, index) => index));
      }
    }
  }, [teamId, teamCFId, tagInfo]);

  // 获取标签宽度
  const getTagWidth = (index) => {
    return tagWidths[index] || 200;
  };

  // 切换部门的折叠状态
  const toggleSectionCollapse = (sectionId) => {
    setCollapsedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  // 添加新任务
  const handleAddTask = (sectionId) => {
    console.log('向部门', sectionId, '添加任务');
    // 在这里添加创建任务的逻辑
    // dispatch(createTask({ ... }));
  };

  // 计算总列数（标签列 + 操作列）
  const totalColumns = (Array.isArray(tagInfo) ? tagInfo.length : 0) + 1;

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
        <div className="text-muted-foreground text-sm p-2 text-center">
          没有任务
        </div>
      );
    }

    return (
      <Droppable droppableId={`tasks-${sectionId}`} type="TASK">
        {(provided) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className="space-y-1"
          >
            {localTasks[sectionId].map((task, taskIndex) => {
              console.log('渲染单个任务', task);
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
                            // 截图显示tag_values是一个对象，key是标签ID
                            let tagValue = '';
                            if (task.tag_values && tagId in task.tag_values) {
                              tagValue = task.tag_values[tagId];
                            }
                            
                            return (
                              <div 
                                key={`task-${task.id}-tag-${tagId}`} 
                                className="p-2 overflow-hidden text-ellipsis whitespace-nowrap border-r"
                                style={{
                                  width: `${getTagWidth(tagIndex)}px`,
                                  minWidth: `${getTagWidth(tagIndex)}px`, 
                                  maxWidth: `${getTagWidth(tagIndex)}px`,
                                }}
                              >
                                {tagValue}
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
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    );
  };

  return (
    <div>
      <Table>
        <DragDropContext onDragEnd={handleDragEnd} onDragStart={handleDragStart}>
          <TableHeader>
            <TableRow>
              <TableCell colSpan={totalColumns} className="p-0 border-r">
                <Droppable droppableId="tags" direction="horizontal" type="TAG">
                  {(provided) => (
                    <div 
                      ref={provided.innerRef} 
                      {...provided.droppableProps}
                      className={`flex ${isDraggingTag ? 'bg-accent/10' : ''}`}
                    >
                      
                      {/* 可拖拽的标签列 */}
                      {Array.isArray(sortedTagInfo) && sortedTagInfo.map((tag, index) => (
                        <Draggable 
                          key={`tag-${index}`} 
                          draggableId={`tag-${index}`} 
                          index={index}
                        >
                          {(provided, snapshot) => ( //if index == 1, then add a getTagWidth(index) + fixed width 44px
                            <div 
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`hover:bg-accent/50 border-r relative ${
                                snapshot.isDragging ? 'shadow-lg bg-accent/30 z-10' : ''
                              }`}
                              style={{
                                ...provided.draggableProps.style,
                                width: `${index === 0 ? getTagWidth(index) + 36 : getTagWidth(index)}px`,
                                minWidth: `${index === 0 ? getTagWidth(index) + 36 : getTagWidth(index)}px`,
                                maxWidth: `${index === 0 ? getTagWidth(index) + 36 : getTagWidth(index)}px`,
                              }}
                            >
                              <div className="flex items-center p-2 font-medium text-sm">
                                {tag}
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </TableCell>
              {/* 添加标签按钮 */}
              <TableCell className="text-right" style={{ width: '48px', minWidth: '48px' }}>
                <Button 
                  onClick={() => setDialogOpen(true)} 
                  variant="ghost"
                  size="sm"
                  className="transition-colors p-1"
                >
                  <Plus size={16} className="text-muted-foreground" />
                </Button>
              </TableCell>
            </TableRow>
          </TableHeader>
          
          <TableBody>
            <TableRow>
              <TableCell colSpan={totalColumns+1} className="p-0">
                <Droppable droppableId="sections" type="SECTION">
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="space-y-2"
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
              </TableCell>
            </TableRow>
          </TableBody>
        </DragDropContext>
      </Table>
      
      <CreateTagDialog 
        isOpen={isDialogOpen} 
        onClose={handleCloseDialog} 
        projectId={projectId}
        teamId={teamId}
        teamCFId={teamCFId}
      />
    </div>
  );
}