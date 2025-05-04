'use client'

import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import TagPopover from './TagPopover';
import { getTags } from '@/lib/redux/features/teamCFSlice';
import { useTableContext } from './TableProvider';
import { useResizeTools } from './ResizeTools';
import { useSaveTools } from './SaveTools';

export function useLoadTag() {
  const dispatch = useDispatch();
  const { 
    teamId, 
    teamCFId,
    tagInfo,
    setTagInfo,
    sortedTagInfo, 
    setSortedTagInfo,
    tagOrder,
    setTagOrder,
    isLoading,
    setIsLoading,
    isCreatingTask,
    projectId
  } = useTableContext();
  
  const [isPopoverOpen, setPopoverOpen] = useState(false);
  
  // 从Redux状态中获取标签数据
  const { tags: tagsData, tagsStatus } = useSelector((state) => state.teamCF);
  
  // 导入列宽调整工具
  const { getTagWidth, handleResizeStart } = useResizeTools();
  
  // 导入保存工具
  const { loadTagOrderFromLocalStorage } = useSaveTools();

  // 处理标签数据
  useEffect(() => {
    // 如果没有数据，返回空数组
    if (!tagsData) {
      setTagInfo([]);
      return;
    }
    
    let extractedTagInfo = [];
    
    // 检查tagsData本身是否是数组
    if (Array.isArray(tagsData)) {
      extractedTagInfo = tagsData.map(tag => tag.name || '');
    }
    // 检查tagsData.tags是否存在
    else if (tagsData.tags && Array.isArray(tagsData.tags)) {
      extractedTagInfo = tagsData.tags.map(tag => tag.name || '');
    }
    
    setTagInfo(extractedTagInfo);
    
    // 如果没有标签顺序或者标签数量变化，初始化或更新顺序
    if (extractedTagInfo.length > 0 && (tagOrder.length === 0 || tagOrder.length !== extractedTagInfo.length)) {
      const savedOrder = loadTagOrderFromLocalStorage();
      
      if (savedOrder && savedOrder.length === extractedTagInfo.length) {
        setTagOrder(savedOrder);
      } else {
        setTagOrder(extractedTagInfo.map((_, index) => index));
      }
    }
  }, [tagsData, setTagInfo, setTagOrder]);
  
  // 根据标签顺序更新排序后的标签
  useEffect(() => {
    if (tagOrder.length === 0 || tagInfo.length === 0) {
      setSortedTagInfo(tagInfo);
      return;
    }
    
    if (tagOrder.length !== tagInfo.length) {
      // 如果标签数量与顺序数组长度不匹配，使用原始标签顺序
      setSortedTagInfo(tagInfo);
      return;
    }
    
    const sorted = tagOrder.map(index => {
      // 确保索引在有效范围内
      if (index >= 0 && index < tagInfo.length) {
        return tagInfo[index];
      }
      return '';
    });
    
    setSortedTagInfo(sorted);
  }, [tagInfo, tagOrder, setSortedTagInfo]);
  
  // 加载标签数据
  const loadTag = async () => {
    if (!teamId || !teamCFId) return;
    
    try {
      setIsLoading(true);
      // Always get the latest data from the server
      await dispatch(getTags({ teamId, teamCFId })).unwrap();
    } catch (error) {
      console.error('加载标签失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 当标签更新时的回调函数
  const handleTagsUpdated = async () => {
    // 重新加载标签数据
    try {
      setIsLoading(true);
      await dispatch(getTags({ teamId, teamCFId })).unwrap();
      
      // 在加载完成后，如有需要，重置标签顺序为默认顺序
      if (tagInfo.length > tagOrder.length) {
        setTagOrder(tagInfo.map((_, index) => index));
      }
    } catch (error) {
      console.error('更新标签失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 计算总列数（标签列 + 操作列）
  const totalColumns = useMemo(() => {
    return (Array.isArray(tagInfo) ? tagInfo.length : 0) + 1;
  }, [tagInfo]);

  // 渲染标签标题行
  const renderTagHeaders = () => {
    return (
      <Droppable 
        droppableId="tag-header-row" 
        direction="horizontal" 
        type="TAG"
        isDropDisabled={isCreatingTask || isLoading}
      >
        {(provided) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className="flex border-border"
          >
            {sortedTagInfo.map((tag, index) => {
              const realIndex = tagOrder[index];
              const canDrag = index !== 0; // 第一列不可拖动
              
              return (
                <Draggable
                  key={`tag-${index}`}
                  draggableId={`tag-${index}`}
                  index={index}
                  isDragDisabled={index === 0}
                >
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      className={`relative p-2 font-medium border-r 
                        ${snapshot.isDragging ? 'bg-accent/50' : 'bg-background'} 
                        ${canDrag ? 'cursor-grab' : ''}`}
                      style={{
                        ...provided.draggableProps.style,
                        width: `${getTagWidth(index, true)}px`,
                        minWidth: `${getTagWidth(index, true)}px`,
                        maxWidth: `${getTagWidth(index, true)}px`,
                      }}
                    >
                      {tag}
                      
                      {/* 调整宽度的垂直线 */}
                      {index < sortedTagInfo.length - 1 && !snapshot.isDragging && (
                        <div
                          className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/50"
                          onMouseDown={(e) => handleResizeStart(e, index)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      )}
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

  // 渲染标签设置弹出框
  const renderTagPopover = () => (
    <TagPopover 
      isOpen={isPopoverOpen} 
      setIsOpen={setPopoverOpen} 
      onTagsUpdated={handleTagsUpdated} 
      teamId={teamId}
      teamCFId={teamCFId}
      projectId={projectId}
      existingTags={tagInfo}
    />
  );

  return {
    tagInfo,
    sortedTagInfo,
    tagOrder,
    totalColumns,
    renderTagHeaders,
    renderTagPopover,
    loadTag
  };
}
