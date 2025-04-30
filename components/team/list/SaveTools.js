'use client'

import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useTableContext } from './TableProvider';

// 这里假设我们有用于保存表格设置的Redux actions
// 实际使用时需要替换为真实的action
// import { saveTagOrder, saveTagWidths } from '@/lib/redux/features/someSlice';

export function useSaveTools() {
  const dispatch = useDispatch();
  const {
    teamId,
    tagWidths,
    tagOrder
  } = useTableContext();

  // 保存标签顺序到本地存储
  const saveTagOrderToLocalStorage = () => {
    if (teamId && tagOrder.length > 0) {
      try {
        localStorage.setItem(`tag-order-${teamId}`, JSON.stringify(tagOrder));
      } catch (e) {
        console.error('保存标签顺序到本地存储失败:', e);
      }
    }
  };

  // 保存标签宽度到本地存储
  const saveTagWidthsToLocalStorage = () => {
    if (teamId && Object.keys(tagWidths).length > 0) {
      try {
        localStorage.setItem(`tag-widths-${teamId}`, JSON.stringify(tagWidths));
      } catch (e) {
        console.error('保存标签宽度到本地存储失败:', e);
      }
    }
  };

  // 从本地存储加载标签顺序
  const loadTagOrderFromLocalStorage = () => {
    if (teamId) {
      try {
        const savedOrder = localStorage.getItem(`tag-order-${teamId}`);
        if (savedOrder) {
          return JSON.parse(savedOrder);
        }
      } catch (e) {
        console.error('从本地存储加载标签顺序失败:', e);
      }
    }
    return null;
  };

  // 从本地存储加载标签宽度
  const loadTagWidthsFromLocalStorage = () => {
    if (teamId) {
      try {
        const savedWidths = localStorage.getItem(`tag-widths-${teamId}`);
        if (savedWidths) {
          return JSON.parse(savedWidths);
        }
      } catch (e) {
        console.error('从本地存储加载标签宽度失败:', e);
      }
    }
    return null;
  };

  // 保存设置到后端（模拟函数，实际实现根据API需求）
  const saveSettingsToBackend = async () => {
    if (!teamId) return;
    
    try {
      // 这里应该是实际的API调用或Redux action dispatch
      // 示例：
      // await dispatch(saveTagOrder({ teamId, order: tagOrder }));
      // await dispatch(saveTagWidths({ teamId, widths: tagWidths }));
      console.log('保存表格设置到后端', { teamId, tagOrder, tagWidths });
    } catch (error) {
      console.error('保存表格设置到后端失败:', error);
    }
  };

  // 当标签顺序变化时保存
  useEffect(() => {
    if (tagOrder.length > 0) {
      saveTagOrderToLocalStorage();
      
      // 可选：也保存到后端
      // const debounceTimer = setTimeout(() => {
      //   saveSettingsToBackend();
      // }, 1000);
      // return () => clearTimeout(debounceTimer);
    }
  }, [tagOrder, teamId]);

  // 当标签宽度变化时保存
  useEffect(() => {
    if (Object.keys(tagWidths).length > 0) {
      saveTagWidthsToLocalStorage();
      
      // 可选：也保存到后端
      // const debounceTimer = setTimeout(() => {
      //   saveSettingsToBackend();
      // }, 1000);
      // return () => clearTimeout(debounceTimer);
    }
  }, [tagWidths, teamId]);

  return {
    saveTagOrderToLocalStorage,
    saveTagWidthsToLocalStorage,
    loadTagOrderFromLocalStorage,
    loadTagWidthsFromLocalStorage,
    saveSettingsToBackend
  };
}
