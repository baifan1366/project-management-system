'use client'

import { useTranslations } from 'next-intl';
import { useEffect, useState, useRef, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Plus } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import CreateTagDialog from './TagDialog';
import { getTags, resetTagsStatus } from '@/lib/redux/features/teamCFSlice';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import AddTask from './AddTask';
import BodyContent from './BodyContent';

export default function TaskList({ projectId, teamId, teamCFId }) {
  const t = useTranslations('CreateTask');
  const dispatch = useDispatch();
  const [isDialogOpen, setDialogOpen] = useState(false);
  const isTagRequestInProgress = useRef(false);
  const hasLoadedTags = useRef(false);
  
  // 存储标签顺序状态
  const [tagOrder, setTagOrder] = useState([]);
  // 存储标签拖拽状态
  const [isDraggingTag, setIsDraggingTag] = useState(false);
  // 存储标签宽度状态
  const [tagWidths, setTagWidths] = useState({});
  // 存储任务数据
  const [localTasks, setLocalTasks] = useState({});

  // 从Redux状态中获取标签数据
  const { tags: tagsData, tagsStatus } = useSelector((state) => state.teamCF);
  // 从Redux状态中获取部门数据
  const { sections, status: sectionsStatus } = useSelector((state) => state.sections);
  
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
  
  // 加载标签数据
  const loadTag = async () => {
    if (!teamId || !teamCFId || isTagRequestInProgress.current) return;
    
    try {
      isTagRequestInProgress.current = true;
      
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
    if (teamId && teamCFId && !hasLoadedTags.current) {
      // 使用setTimeout避免在渲染过程中请求
      setTimeout(loadTag, 0);
    }
    
    return () => {
      // 组件卸载时重置状态
      dispatch(resetTagsStatus());
    };
  }, [dispatch, teamId, teamCFId, tagsStatus]);

  // 关闭创建标签对话框
  const handleCloseDialog = () => {
    setDialogOpen(false);
    // 在对话框关闭后强制重新加载数据
    setTimeout(() => {
      hasLoadedTags.current = false;
      isTagRequestInProgress.current = false;
      loadTag();
    }, 100);
  };

  // 处理拖放开始事件（仅处理标签拖拽）
  const handleDragStart = (result) => {
    const { type } = result;
    if (type === 'TAG') {
      setIsDraggingTag(true);
    }
  };

  // 处理拖放结束事件（仅处理标签拖拽）
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

  // 导入AddTask中的任务操作功能
  const { 
    editingTask, 
    editingTaskValues, 
    handleAddTask, 
    handleTaskValueChange, 
    handleTaskEditComplete, 
    handleKeyDown 
  } = AddTask({ 
    sectionId: '', 
    teamId, 
    localTasks, 
    setLocalTasks 
  });

  // 导入BodyContent中的功能
  const { 
    isLoading, 
    isDragging, 
    loadSections, 
    loadAllSectionTasks, 
    renderBodyContent 
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
    handleKeyDown
  });

  // 在部门数据加载后加载任务
  useEffect(() => {
    if (sections && sections.length > 0) {
      loadAllSectionTasks();
    }
  }, [sections]);

  // 在组件初始化时加载部门
  useEffect(() => {
    if (teamId) {
      loadSections();
    }
  }, [teamId]);

  // 计算总列数（标签列 + 操作列）
  const totalColumns = (Array.isArray(tagInfo) ? tagInfo.length : 0) + 1;

  return (
    <div className="w-full overflow-hidden">
      <Table className="w-full">
        <DragDropContext onDragEnd={handleDragEnd} onDragStart={handleDragStart}>
          <TableHeader>
            <TableRow>
              <TableCell colSpan={totalColumns} className="p-0 border-r">
                {/* 标签标题行 */}
                <Droppable droppableId="tag-headers" direction="horizontal" type="TAG">
                  {(provided) => (
                    <div 
                      className={`flex ${isDraggingTag ? 'bg-accent/10' : ''}`}
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                    >
                      {Array.isArray(sortedTagInfo) && sortedTagInfo.map((tag, index) => (
                        <Draggable key={`tag-${index}`} draggableId={`tag-${index}`} index={index}>
                          {(provided, snapshot) => (
                            <div 
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`hover:bg-accent/50 border-r relative ${snapshot.isDragging ? 'bg-accent/30' : ''}`}
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
                <Button 
                  onClick={() => setDialogOpen(true)} 
                  variant="ghost"
                  size="sm"
                >
                  <Plus className="w-4 h-4"/>
                </Button>
              </TableCell>
            </TableRow>
          </TableHeader>
          
          <TableBody className="overflow-auto">
            <TableRow>
              <TableCell colSpan={totalColumns+1} className="p-0">
                {renderBodyContent()}
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