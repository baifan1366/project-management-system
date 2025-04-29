'use client'

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { resetSectionsState } from '@/lib/redux/features/sectionSlice';
import { resetTasksState } from '@/lib/redux/features/taskSlice';
import { resetTagsStatus } from '@/lib/redux/features/teamCFSlice';

// 创建上下文
export const TableContext = createContext(null);

// 自定义钩子方便使用上下文
export const useTableContext = () => {
  const context = useContext(TableContext);
  if (context === null) {
    throw new Error('useTableContext must be used within a TableProvider');
  }
  return context;
};

export default function TableProvider({ children, teamId, projectId, teamCFId }) {
  const dispatch = useDispatch();
  
  // 请求状态
  const isSectionRequestInProgress = useRef(false);
  const isTaskRequestInProgress = useRef(false);
  
  // 任务数据
  const [localTasks, setLocalTasks] = useState({});
  
  // UI状态
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [isCreatingSection, setIsCreatingSection] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // 编辑状态
  const [editingTask, setEditingTask] = useState(null);
  const [editingTaskValues, setEditingTaskValues] = useState({});
  
  // 拖拽状态
  const [isDragging, setIsDragging] = useState(false);
  const [isDraggingTag, setIsDraggingTag] = useState(false);
  
  // 部门状态
  const [collapsedSections, setCollapsedSections] = useState({});
  const [hoveredSectionHeader, setHoveredSectionHeader] = useState(null);
  const [hoveredTaskRow, setHoveredTaskRow] = useState(null);
  
  // 编辑部门状态
  const [editingSectionId, setEditingSectionId] = useState(null);
  const [editingSectionName, setEditingSectionName] = useState('');
  
  // 标签相关状态
  const [tagWidths, setTagWidths] = useState({});
  const [tagOrder, setTagOrder] = useState([]);
  const [tagInfo, setTagInfo] = useState([]);
  const [sortedTagInfo, setSortedTagInfo] = useState([]);
  
  // refs
  const sectionInputRef = useRef(null);
  const taskInputRef = useRef(null);
  
  // 当 teamId 变化时重置状态
  useEffect(() => {
    // 重置本地状态
    setLocalTasks({});
    setTagWidths({});
    setTagOrder([]);
    setTagInfo([]);
    setSortedTagInfo([]);
    setIsCreatingTask(false);
    setIsCreatingSection(false);
    setNewSectionName('');
    setIsLoading(false);
    setIsDraggingTag(false);
    setIsDragging(false);
    setCollapsedSections({});
    setHoveredSectionHeader(null);
    setHoveredTaskRow(null);
    setEditingSectionId(null);
    setEditingSectionName('');
    setEditingTask(null);
    setEditingTaskValues({});

    // 重置 Redux 状态
    dispatch(resetSectionsState());
    dispatch(resetTasksState());
    dispatch(resetTagsStatus());
    
    // 重置请求状态
    isSectionRequestInProgress.current = false;
    isTaskRequestInProgress.current = false;
  }, [teamId, dispatch]);

  // 共享的上下文值
  const value = {
    // ID相关
    teamId,
    projectId,
    teamCFId,
    
    // 请求状态
    isSectionRequestInProgress,
    isTaskRequestInProgress,
    
    // 任务数据
    localTasks,
    setLocalTasks,
    
    // UI状态
    isCreatingTask,
    setIsCreatingTask,
    isCreatingSection,
    setIsCreatingSection,
    newSectionName,
    setNewSectionName,
    isLoading,
    setIsLoading,
    
    // 编辑状态
    editingTask,
    setEditingTask,
    editingTaskValues,
    setEditingTaskValues,
    
    // 拖拽状态
    isDragging,
    setIsDragging,
    isDraggingTag,
    setIsDraggingTag,
    
    // 部门状态
    collapsedSections,
    setCollapsedSections,
    hoveredSectionHeader,
    setHoveredSectionHeader,
    hoveredTaskRow,
    setHoveredTaskRow,
    
    // 编辑部门状态
    editingSectionId,
    setEditingSectionId,
    editingSectionName,
    setEditingSectionName,
    
    // 标签相关状态
    tagWidths,
    setTagWidths,
    tagOrder,
    setTagOrder,
    tagInfo,
    setTagInfo,
    sortedTagInfo,
    setSortedTagInfo,
    
    // refs
    sectionInputRef,
    taskInputRef
  };

  return <TableContext.Provider value={value}>{children}</TableContext.Provider>;
}
