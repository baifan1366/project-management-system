'use client'

import { useTranslations } from 'next-intl';
import { useEffect, useState, useRef, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import TagPopover from './TagPopover';
import { getTags, resetTagsStatus } from '@/lib/redux/features/teamCFSlice';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AddTask from './AddTask';
import BodyContent from './BodyContent';
import { useGetUser } from '@/lib/hooks/useGetUser';
import { createSection, resetSectionsState } from '@/lib/redux/features/sectionSlice';
import {
  resetTasksState
} from '@/lib/redux/features/taskSlice';

export default function TaskList({ projectId, teamId, teamCFId }) {
  const t = useTranslations('CreateTask');
  const dispatch = useDispatch();
  const [isPopoverOpen, setPopoverOpen] = useState(false);
  const isTagRequestInProgress = useRef(false);
  const hasLoadedTags = useRef(false);
  const { user } = useGetUser();

  // 新增：部门和任务加载状态的引用
  const isSectionRequestInProgress = useRef(false);
  const isTaskRequestInProgress = useRef(false);

  // 存储标签顺序状态
  const [tagOrder, setTagOrder] = useState([]);
  // 存储标签拖拽状态
  const [isDraggingTag, setIsDraggingTag] = useState(false);
  // 存储标签宽度状态
  const [tagWidths, setTagWidths] = useState({});
  // 存储任务数据
  const [localTasks, setLocalTasks] = useState({});
  // 存储创建任务状态
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  // 新增：存储创建部门状态
  const [isCreatingSection, setIsCreatingSection] = useState(false);
  // 新增：存储部门名称输入
  const [newSectionName, setNewSectionName] = useState('');
  // 新增：创建部门输入框的引用
  const sectionInputRef = useRef(null);
  // 新增：创建任务输入框的引用
  const taskInputRef = useRef(null);

  // 从Redux状态中获取标签数据
  const { tags: tagsData, tagsStatus } = useSelector((state) => state.teamCF);
  // 从Redux状态中获取部门数据
  const { sections, status: sectionsStatus } = useSelector((state) => state.sections);
  
  // 处理标签数据
  const tagInfo = useMemo(() => {
    // 如果没有数据，返回空数组
    if (!tagsData) return [];
    
    // 检查tagsData本身是否是数组
    if (Array.isArray(tagsData)) {
      return tagsData.map(tag => tag.name || '');
    }
    
    // 检查tagsData.tags是否存在
    if (tagsData.tags && Array.isArray(tagsData.tags)) {
      return tagsData.tags.map(tag => tag.name || '');
    }
    
    // 兼容其他可能的结构
    return [];
  }, [tagsData]);
  
  // 初始化标签顺序
  useEffect(() => {
    if (tagInfo.length > 0 && (tagOrder.length === 0 || tagOrder.length !== tagInfo.length)) {
      // 如果没有标签顺序或者标签数量变化，初始化或更新顺序
      setTagOrder(tagInfo.map((_, index) => index));
    }
  }, [tagInfo, tagOrder]);
  
  // 根据标签顺序获取排序后的标签
  const sortedTagInfo = useMemo(() => {
    if (tagOrder.length === 0 || tagInfo.length === 0) return tagInfo;
    if (tagOrder.length !== tagInfo.length) {
      // 如果标签数量与顺序数组长度不匹配，使用原始标签顺序
      return tagInfo;
    }
    return tagOrder.map(index => {
      // 确保索引在有效范围内
      if (index >= 0 && index < tagInfo.length) {
        return tagInfo[index];
      }
      return '';
    });
  }, [tagInfo, tagOrder]);
  
  // 加载标签数据
  const loadTag = async () => {
    if (!teamId || !teamCFId || isTagRequestInProgress.current) return;
    
    try {
      isTagRequestInProgress.current = true;
      // 始终从服务器获取最新数据
      await dispatch(getTags({ teamId, teamCFId })).unwrap();
      hasLoadedTags.current = true;
    } catch (error) {
      console.error('加载标签失败:', error);
      hasLoadedTags.current = false;
    } finally {
      isTagRequestInProgress.current = false;
    }
  };

  // 参数变化时重置加载状态
  useEffect(() => {
    if (teamId && teamCFId) {
      // 重置标签请求状态
      hasLoadedTags.current = false; 
    }
  }, [teamId, teamCFId]);

  // 处理标签加载
  useEffect(() => {
    let timeoutId;
    
    if (teamId && teamCFId && !hasLoadedTags.current) {
      // 使用防抖，避免短时间内多次渲染导致的重复请求
      timeoutId = setTimeout(() => {
        // 在加载前再次检查状态，避免竞态条件
        if (!hasLoadedTags.current && !isTagRequestInProgress.current) {
          loadTag();
        }
      }, 300);
    }
    
    return () => {
      // 清除定时器
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      // 组件卸载时重置状态
      dispatch(resetTagsStatus());
    };
  }, [dispatch, teamId, teamCFId, tagsStatus]);

  // 当标签更新时的回调函数
  const handleTagsUpdated = () => {
    // 重置标签加载状态
    hasLoadedTags.current = false;
    isTagRequestInProgress.current = false;
    
    // 重置Redux状态
    dispatch(resetTagsStatus());
    
    // 重新加载标签数据
    loadTag().then(() => {
      // 在加载完成后，如有需要，重置标签顺序为默认顺序
      if (tagInfo.length > tagOrder.length) {
        setTagOrder(tagInfo.map((_, index) => index));
      }
    });
  };

  // 处理拖放开始事件（处理所有类型的拖拽）
  const handleDragStart = (result) => {
    const { type, source } = result;
    if (type === 'TAG') {
      // 确保第一列不能开始拖拽
      if (source.index === 0) {
        return;
      }
      setIsDraggingTag(true);
    } else if (type === 'TASK' || type === 'SECTION') {
      // 将其他类型的拖拽事件传递给 BodyContent
      // isDragging 状态已在 BodyContent 中设置
    }
  };

  // 处理拖放结束事件（处理所有类型的拖拽）
  const handleDragEnd = (result) => {
    const { destination, source, type } = result;

    // 如果没有目标位置或目标位置相同，则不执行任何操作
    if (!destination || 
        (destination.droppableId === source.droppableId && 
         destination.index === source.index)) {
      setIsDraggingTag(false);
      return;
    }

    // 处理标签拖放
    if (type === 'TAG') {
      // 阻止第一列被拖动或其他列被拖到第一列的位置
      if (source.index === 0 || destination.index === 0) {
        setIsDraggingTag(false);
        return;
      }
      
      const newTagOrder = Array.from(tagOrder);
      const [removed] = newTagOrder.splice(source.index, 1);
      newTagOrder.splice(destination.index, 0, removed);
      setTagOrder(newTagOrder);
      
      // 保存标签顺序到本地存储
      try {
        localStorage.setItem(`tagOrder-${teamId}-${teamCFId}`, JSON.stringify(newTagOrder));
      } catch (error) {
        console.error('保存标签顺序失败:', error);
      }
    } else if (type === 'TASK' || type === 'SECTION') {
      // 将 TASK 和 SECTION 类型的拖拽事件传递给 BodyContent 组件处理
      if (isDragging && typeof handleBodyDragEnd === 'function') {
        handleBodyDragEnd(result);
      }
    }
    
    setIsDraggingTag(false);
  };

  // 从本地存储加载标签顺序
  useEffect(() => {
    if (teamId && teamCFId && tagInfo.length > 0) {
      try {
        const savedOrder = localStorage.getItem(`tagOrder-${teamId}-${teamCFId}`);
        if (savedOrder) {
          const parsedOrder = JSON.parse(savedOrder);
          // 检查当前标签数量与保存的顺序数量是否匹配
          if (parsedOrder.length === tagInfo.length) {
            // 标签数量未变，直接使用保存的顺序
            setTagOrder(parsedOrder);
          } else if (parsedOrder.length < tagInfo.length) {
            // 有新标签添加，为新标签分配顺序
            const newOrder = [...parsedOrder];
            // 为新增的标签添加对应的索引
            for (let i = parsedOrder.length; i < tagInfo.length; i++) {
              newOrder.push(i);
            }
            setTagOrder(newOrder);
            // 保存更新后的顺序
            localStorage.setItem(`tagOrder-${teamId}-${teamCFId}`, JSON.stringify(newOrder));
          } else {
            // 标签数量减少，重新初始化顺序
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

  // 导入AddTask中的任务操作功能
  const { 
    editingTask, 
    editingTaskValues, 
    handleAddTask: originalHandleAddTask, 
    handleTaskValueChange, 
    handleTaskEditComplete: originalHandleTaskEditComplete, 
    handleKeyDown,
    checkTaskInputRef,
    setEditingTask
  } = AddTask({ 
    sectionId: '', 
    teamId, 
    localTasks, 
    setLocalTasks,
    taskInputRef
  });
  
  // 包装handleAddTask以添加加载状态
  const handleAddTask = (sectionId) => {
    setIsCreatingTask(true);
    originalHandleAddTask(sectionId);
  };
  
  // 监听 editingTask 状态变化，当编辑结束时重置 isCreatingTask
  useEffect(() => {
    if (!editingTask && isCreatingTask) {
      // 如果不再编辑任务但创建状态仍为 true，则重置状态
      setIsCreatingTask(false);
    }
  }, [editingTask, isCreatingTask]);
  
  // 包装handleTaskEditComplete以更新加载状态
  const handleTaskEditComplete = async (taskId, sectionId) => {
    setIsCreatingTask(true);
    try {
      const result = await originalHandleTaskEditComplete(taskId, sectionId);
      // 无论成功与否，确保状态被重置
      setIsCreatingTask(false);
      return result;
    } catch (error) {
      // 发生错误时也要确保状态被重置
      setIsCreatingTask(false);
      throw error;
    }
  };

  // 导入BodyContent中的功能
  const { 
    isLoading, 
    isDragging, 
    loadSections, 
    loadAllSectionTasks, 
    renderBodyContent,
    handleBodyDragEnd
  } = BodyContent({
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
    handleKeyDown,
    taskInputRef,
    setEditingTask
  });

  // 在组件初始化时加载部门
  useEffect(() => {
    if (teamId) {
      // 首先重置加载标志
      isSectionRequestInProgress.current = false;
      isTagRequestInProgress.current = false;
      
      // 延迟一小段时间加载，确保Redux状态已被重置
      const loadTimer = setTimeout(() => {
        loadSections();
      }, 100);
      
      return () => clearTimeout(loadTimer);
    }
  }, [teamId]);

  // 在部门数据加载后加载任务
  useEffect(() => {
    if (teamId && sections && sections.length > 0) {
      // 重置任务请求状态
      isTaskRequestInProgress.current = false;
      
      // 延迟一小段时间加载，确保Redux部门状态已完全更新
      const loadTasksTimer = setTimeout(() => {
        loadAllSectionTasks();
      }, 100);
      
      return () => clearTimeout(loadTasksTimer);
    }
  }, [sections, teamId]);

  // 新增：处理部门创建
  const handleAddSection = () => {
    setIsCreatingSection(true);
    setNewSectionName('');
  };

  // 新增：处理部门名称输入变化
  const handleSectionNameChange = (e) => {
    setNewSectionName(e.target.value);
  };

  // 新增：处理点击外部关闭输入框
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isCreatingSection && sectionInputRef.current && !sectionInputRef.current.contains(event.target)) {
        setIsCreatingSection(false);
        setNewSectionName('');
      }
    };

    // 添加点击事件监听器
    document.addEventListener("mousedown", handleClickOutside);
    
    // 清理函数
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isCreatingSection]);

  // 新增：处理部门创建提交
  const handleCreateSection = async (e) => {
    if (e.key === 'Enter' && newSectionName.trim()) {
      try {
        // 开始创建，显示加载状态
        setIsCreatingSection(true);
        const userId = user?.id
        // 准备创建部门的数据
        const sectionData = {
          teamId,
          sectionName: newSectionName.trim(),
          createdBy: userId
        };
        
        // 调用Redux Action创建部门
        await dispatch(createSection({teamId, sectionData})).unwrap();
        
        // 重新加载部门列表
        await loadSections();
        
        // 重置创建状态
        setIsCreatingSection(false);
        setNewSectionName('');
      } catch (error) {
        console.error('创建部门失败:', error);
        setIsCreatingSection(false);
      }
    } else if (e.key === 'Escape') {
      // 取消创建
      setIsCreatingSection(false);
      setNewSectionName('');
    }
  };

  // 计算总列数（标签列 + 操作列）
  const totalColumns = (Array.isArray(tagInfo) ? tagInfo.length : 0) + 1;

  // 修改：当 teamId 变化时重置状态
  useEffect(() => {
    // 重置本地状态
    setLocalTasks({});
    setTagOrder([]);
    setTagWidths({});
    setIsCreatingTask(false);
    setIsCreatingSection(false);
    setNewSectionName('');

    // 重置 Redux 状态
    dispatch(resetTagsStatus());
    dispatch(resetSectionsState());
    dispatch(resetTasksState());
    
    // 重置请求标志
    hasLoadedTags.current = false;
    isTagRequestInProgress.current = false;
    
    // 当 teamId 为有效值时，初始化数据加载
    if (teamId) {
      loadTag();
    }
  }, [teamId, dispatch]);

  return (
    <div className="w-full h-full">
      <DragDropContext onDragEnd={handleDragEnd} onDragStart={handleDragStart}>
        <Table className="w-full">
          <TableHeader>
            <TableRow>
              <TableCell colSpan={totalColumns} className="p-0">
                {/* 标签标题行 */}
                <Droppable droppableId="tag-headers" direction="horizontal" type="TAG" mode="standard">
                  {(provided) => (
                    <div 
                      className={`flex ${isDraggingTag ? 'bg-accent/10' : ''}`}
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                    >
                      {Array.isArray(sortedTagInfo) && sortedTagInfo.map((tag, index) => (
                        <Draggable 
                          key={`tag-${index}`} 
                          draggableId={`tag-${index}`} 
                          index={index}
                          isDragDisabled={index === 0} // 禁止第一列拖动
                        >
                          {(provided, snapshot) => (
                            <div 
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`border-r relative 
                                ${index === 0 ? 'cursor-default' : 'hover:bg-accent/50'} 
                                ${snapshot.isDragging ? 'bg-accent/30' : ''} 
                                ${(isCreatingTask || isLoading) && !snapshot.isDragging ? 'pointer-events-none' : ''}`}
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
              <TableCell className="text-right" >
                <TagPopover
                  isOpen={isPopoverOpen}
                  onClose={() => setPopoverOpen(false)}
                  projectId={projectId}
                  teamId={teamId}
                  teamCFId={teamCFId}
                  onTagsUpdated={handleTagsUpdated}
                />
              </TableCell>
            </TableRow>
          </TableHeader>
          
          <TableBody>
            <TableRow>
              <TableCell colSpan={totalColumns+1} className="p-0">
                {renderBodyContent()}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell colSpan={totalColumns+1} className="p-2 border-t">
                {isCreatingSection ? (
                  <div className="flex items-center space-x-2 p-1">
                    <Input
                      ref={sectionInputRef}
                      autoFocus
                      placeholder={t('enterSectionName')}
                      value={newSectionName}
                      onChange={handleSectionNameChange}
                      onKeyDown={handleCreateSection}
                      className="h-8 border-transparent"
                    />
                  </div>
                ) : (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full text-left text-muted-foreground hover:text-foreground"
                    onClick={handleAddSection}
                  >
                    {t('addNewSection')}
                  </Button>
                )}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </DragDropContext>
    </div>
  );
}