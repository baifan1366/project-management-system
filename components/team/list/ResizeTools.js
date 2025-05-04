'use client'

import { useRef, useEffect } from 'react';
import { useTableContext } from './TableProvider';

export function useResizeTools() {
  const {
    tagWidths,
    setTagWidths,
    isDraggingTag
  } = useTableContext();
  
  const resizingColumnIndex = useRef(null);
  const startX = useRef(0);
  const startWidth = useRef(0);

  // 处理开始调整列宽度
  const handleResizeStart = (e, index) => {
    // 如果标签正在拖拽中，则禁止调整大小
    if (isDraggingTag) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    resizingColumnIndex.current = index;
    startX.current = e.clientX;
    
    // 对于第一列，减去额外的36px以获取基础宽度
    if (index === 0) {
      startWidth.current = (tagWidths[index] || 200); // 不需要减去36px，因为存储的是基础宽度
    } else {
      startWidth.current = tagWidths[index] || 200; // 默认宽度
    }
    
    document.addEventListener('mousemove', handleResizeMove);
    document.addEventListener('mouseup', handleResizeEnd);
  };

  // 处理列宽度调整过程
  const handleResizeMove = (e) => {
    if (resizingColumnIndex.current === null) return;
    
    const index = resizingColumnIndex.current;
    const dx = e.clientX - startX.current;
    
    // 对于第一列，确保最小宽度考虑额外的36px
    let minWidth = 100;
    if (index === 0) {
      minWidth = 100; // 基础最小宽度，getTagWidth会自动加上36px
    }
    
    const newWidth = Math.max(minWidth, startWidth.current + dx);
    
    setTagWidths(prev => ({
      ...prev,
      [index]: newWidth
    }));
  };

  // 处理结束调整列宽度
  const handleResizeEnd = () => {
    resizingColumnIndex.current = null;
    
    document.removeEventListener('mousemove', handleResizeMove);
    document.removeEventListener('mouseup', handleResizeEnd);
    
    // TODO: 可以在此处保存列宽度到后端或本地存储
  };

  // 清理函数，确保组件卸载时移除全局事件监听器
  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleResizeMove);
      document.removeEventListener('mouseup', handleResizeEnd);
    };
  }, []);

  // 获取指定索引的标签宽度
  const getTagWidth = (index, isHeader = false) => {
    // 只在表头时为第一列添加额外的宽度
    if (index === 0 && isHeader) {
      return (tagWidths[index] || 200) + 36; // 第一列表头额外宽度
    }
    return tagWidths[index] || 200; // 默认宽度200px
  };

  return {
    getTagWidth,
    handleResizeStart
  };
}
