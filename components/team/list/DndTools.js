'use client'

import { useTableContext } from './TableProvider';

export function useDndTools() {
  const {
    setIsDragging,
    setIsDraggingTag,
    tagOrder,
    setTagOrder,
    tagInfo,
    sortedTagInfo,
    setSortedTagInfo
  } = useTableContext();

  // 处理任何类型的拖拽开始
  const handleDragStart = (result) => {
    const { type } = result;
    
    if (type === 'TAG') {
      setIsDraggingTag(true);
    } else if (type === 'TASK' || type === 'SECTION') {
      setIsDragging(true);
    }
  };

  // 处理标签拖拽结束
  const handleTagDragEnd = (result) => {
    const { destination, source, type } = result;
    
    setIsDraggingTag(false);
    
    // 如果没有目标位置或目标位置与源位置相同，则不执行任何操作
    if (!destination || destination.index === source.index) {
      return;
    }
    
    if (type === 'TAG') {
      // 创建新的标签顺序数组
      const newOrder = Array.from(tagOrder);
      
      // 如果试图拖动第一列或拖到第一列位置，则不执行任何操作
      if (source.index === 0 || destination.index === 0) {
        return;
      }
      
      // 移除源位置的项目
      const [removed] = newOrder.splice(source.index, 1);
      // 插入到新位置
      newOrder.splice(destination.index, 0, removed);
      
      // 确保第一个位置的标签不变
      // 获取第一个标签的原始索引（应该是0）
      const firstTagIndex = tagOrder[0];
      
      // 如果第一个位置不是firstTagIndex，调整顺序
      if (newOrder[0] !== firstTagIndex) {
        // 找到firstTagIndex在新数组中的位置
        const firstTagPosition = newOrder.indexOf(firstTagIndex);
        if (firstTagPosition !== -1) {
          // 从数组中移除它
          newOrder.splice(firstTagPosition, 1);
          // 重新放回第一个位置
          newOrder.unshift(firstTagIndex);
        }
      }
      
      // 更新标签顺序状态
      setTagOrder(newOrder);
      
      // 根据新顺序重新排序标签信息
      const newSortedTagInfo = newOrder.map(index => tagInfo[index]);
      setSortedTagInfo(newSortedTagInfo);
    }
  };

  // 处理部门和任务拖拽结束
  const handleBodyDragEnd = (result) => {
    const { destination, source, type } = result;
    
    setIsDragging(false);
    
    // 如果没有目标位置或目标位置与源位置相同，则不执行任何操作
    if (!destination || 
        (destination.droppableId === source.droppableId && 
         destination.index === source.index)) {
      return;
    }
    
    if (type === 'TASK') {
      // 任务拖拽逻辑（实际实现会涉及Redux和后端操作）
      // TODO: 实现任务拖拽后端保存逻辑
    } else if (type === 'SECTION') {
      // 部门拖拽逻辑
      // TODO: 实现部门拖拽后端保存逻辑
    }
  };

  // 处理任何类型的拖拽结束
  const handleDragEnd = (result) => {
    const { type } = result;

    if (type === 'TAG') {
      handleTagDragEnd(result);
    } else if (type === 'TASK' || type === 'SECTION') {
      handleBodyDragEnd(result);
    }
  };

  return {
    handleDragStart,
    handleDragEnd,
    handleTagDragEnd,
    handleBodyDragEnd
  };
}
