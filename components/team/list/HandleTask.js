'use client'

import { useDispatch } from 'react-redux';
import { createTask, updateTask } from '@/lib/redux/features/taskSlice';
import { updateTaskIds } from '@/lib/redux/features/sectionSlice';
import { useTranslations } from 'next-intl';
import { useTableContext } from './TableProvider';
import { useState, useEffect } from 'react';
import { useGetUser } from '@/lib/hooks/useGetUser';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function HandleTask({ teamId, localTasks, setLocalTasks, taskInputRef }) {
  const dispatch = useDispatch();
  const t = useTranslations('CreateTask');
  const { user } = useGetUser();
  const [isLoading, setIsLoading] = useState(false);
  
  // 获取表格上下文
  const {
    editingTask,
    setEditingTask,
    editingTaskValues,
    setEditingTaskValues,
    isAddingTask,
    setIsAddingTask
  } = useTableContext();

  // ===== 添加任务相关功能 =====
  
  /**
   * 添加新任务
   * @param {string} sectionId - 部门ID
   */
  const handleAddTask = (sectionId) => {
    if (isLoading) return;

    // 创建临时的任务ID
    const tempTaskId = `temp-${Date.now()}`;
    
    // 创建空的编辑状态任务
    const newEmptyTask = {
      id: tempTaskId,
      tag_values: {},
      isNew: true,
      sectionId: sectionId
    };
    
    // 更新本地任务列表，添加空任务行
    setLocalTasks(prevTasks => ({
      ...prevTasks,
      [sectionId]: [...(prevTasks[sectionId] || []), newEmptyTask]
    }));
    
    // 设置为编辑状态
    setEditingTask(tempTaskId);
    setEditingTaskValues({});
    setIsAddingTask(true);
    
    // 确保在下一个渲染周期后聚焦到输入框
    setTimeout(() => {
      if (taskInputRef && taskInputRef.current) {
        taskInputRef.current.focus();
      }
    }, 0);
  };

  // ===== 编辑任务相关功能 =====
  
  /**
   * 处理任务值更新
   * @param {string} taskId - 任务ID
   * @param {string} tagId - 标签ID
   * @param {string} value - 新值
   */
  const handleTaskValueChange = (taskId, tagId, value) => {
    if (editingTask === taskId) {
      // 同步更新编辑值
      setEditingTaskValues(prev => {
        const newValues = {
          ...prev,
          [tagId]: value
        };
        return newValues;
      });

      // 如果是添加新任务，同步更新本地任务列表
      if (isAddingTask) {
        setLocalTasks(prevTasks => {
          const updatedTasks = { ...prevTasks };
          for (const sectionId in updatedTasks) {
            const taskIndex = updatedTasks[sectionId].findIndex(task => task.id === taskId);
            if (taskIndex !== -1) {
              updatedTasks[sectionId] = [...updatedTasks[sectionId]];
              updatedTasks[sectionId][taskIndex] = {
                ...updatedTasks[sectionId][taskIndex],
                tag_values: {
                  ...updatedTasks[sectionId][taskIndex].tag_values,
                  [tagId]: value
                }
              };
              break;
            }
          }
          return updatedTasks;
        });
      }
    }
  };

  /**
   * 保存新任务到后端
   * @param {string} taskId - 临时任务ID
   * @param {string} sectionId - 部门ID
   * @returns {Promise<boolean>} - 是否成功
   */
  const saveNewTask = async (taskId, sectionId) => {
    try {
      // 验证必填字段 (标题字段，ID为1)
      if (!editingTaskValues['1'] || editingTaskValues['1'].trim() === '') {
        return false;
      }
      
      const userId = user?.id;
      
      // 准备任务数据
      const taskData = {
        tag_values: editingTaskValues,
        created_by: userId
      };
      
      // 创建任务
      const result = await dispatch(createTask(taskData)).unwrap();
      
      // 更新本地任务列表
      setLocalTasks(prevTasks => ({
        ...prevTasks,
        [sectionId]: prevTasks[sectionId].map(task => 
          task.id === taskId 
            ? { ...result, sectionId } // 使用API返回的数据更新任务
            : task
        )
      }));
      
      // 更新部门的任务IDs
      const taskIds = (localTasks[sectionId] || [])
        .filter(task => !task.isNew) // 过滤掉临时任务
        .map(task => task.id);
      
      taskIds.push(result.id);
      
      await dispatch(updateTaskIds({
        sectionId,
        teamId,
        newTaskIds: taskIds
      })).unwrap();
      
      return true;
    } catch (error) {
      console.error('保存任务失败:', error);
      return false;
    }
  };

  /**
   * 更新现有任务
   * @param {string} taskId - 任务ID
   * @param {string} sectionId - 部门ID
   * @returns {Promise<boolean>} - 是否成功
   */
  const updateExistingTask = async (taskId, sectionId) => {
    try {
      // 获取当前任务的所有值
      const currentTask = localTasks[sectionId].find(task => task.id === taskId);
      if (!currentTask) return false;

      // 准备本地更新的任务数据（对象格式的tag_values）
      const updatedTagValues = {
        ...currentTask.tag_values,
        ...editingTaskValues
      };
      
      // 更新本地任务列表
      setLocalTasks(prevTasks => ({
        ...prevTasks,
        [sectionId]: prevTasks[sectionId].map(task => 
          task.id === taskId 
            ? { 
                ...task, 
                tag_values: updatedTagValues
              }
            : task
        )
      }));

      // 调用更新任务的 action，使用与创建任务相同的对象格式
      await dispatch(updateTask({ 
        taskId: taskId,
        taskData: {
          tag_values: updatedTagValues
        },
        oldTask: currentTask
      })).unwrap();
      
      return true;
    } catch (error) {
      console.error('更新任务失败:', error);
      return false;
    }
  };

  /**
   * 处理任务编辑完成 - 根据是添加还是编辑任务调用不同函数
   * @param {string} taskId - 任务ID
   * @param {string} sectionId - 部门ID
   */
  const handleTaskEditComplete = async (taskId, sectionId) => {
    if (!editingTask || editingTask !== taskId) return;
    
    try {
      setIsLoading(true);
      
      let success = false;
      
      if (isAddingTask) {
        // 保存新任务
        success = await saveNewTask(taskId, sectionId);
        
        if (!success) {
          // 保存失败，从本地任务列表中移除临时任务
          setLocalTasks(prevTasks => ({
            ...prevTasks,
            [sectionId]: prevTasks[sectionId].filter(task => task.id !== taskId)
          }));
        }
      } else {
        // 更新现有任务
        success = await updateExistingTask(taskId, sectionId);
      }
      
      // 清除编辑状态
      setEditingTask(null);
      setEditingTaskValues({});
      setIsAddingTask(false);
      
      return success;
    } catch (error) {
      console.error('任务操作失败:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 处理按键事件
   * @param {Event} e - 键盘事件
   * @param {string} taskId - 任务ID
   * @param {string} sectionId - 部门ID
   */
  const handleKeyDown = (e, taskId, sectionId) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleTaskEditComplete(taskId, sectionId);
    } else if (e.key === "Escape") {
      e.preventDefault();
      
      if (isAddingTask) {
        // 取消添加任务，从本地任务列表中移除临时任务
        setLocalTasks(prevTasks => ({
          ...prevTasks,
          [sectionId]: (prevTasks[sectionId] || []).filter(task => task.id !== taskId)
        }));
      }
      
      // 清除编辑状态
      setEditingTask(null);
      setEditingTaskValues({});
      setIsAddingTask(false);
    }
  };

  /**
   * 点击外部关闭编辑
   * @param {Event} event - 鼠标事件
   */
  const handleClickOutside = (event) => {
    // 如果没有正在编辑的任务，直接返回
    if (!editingTask) return;

    // 检查是否点击了输入框或者在输入框内部的元素
    const isClickOnInput = event.target.tagName === 'INPUT' || 
                          event.target.closest('input') !== null;
    
    // 如果点击了输入框，不做任何处理
    if (isClickOnInput) {
      return;
    }
    
    // 检查点击的元素是否在任务单元格内
    const isClickOnTaskCell = event.target.closest('[class*="overflow-hidden truncate border-r h-10"]') !== null;
    
    // 如果点击的是任务单元格，且这个单元格是当前正在编辑的任务的一部分，不触发保存
    if (isClickOnTaskCell) {
      // 获取当前编辑任务所在行
      const currentTaskRow = document.querySelector(`[data-rfd-draggable-id="task-${editingTask}"]`);
      
      // 获取点击的任务行
      const clickedTaskCell = event.target.closest('[class*="overflow-hidden truncate border-r h-10"]');
      const clickedTaskRow = clickedTaskCell.closest('[data-rfd-draggable-id^="task-"]');
      
      // 如果点击的是同一行内的单元格，不触发保存
      if (currentTaskRow && clickedTaskRow && currentTaskRow === clickedTaskRow) {
        return;
      }
    }
    
    // 获取当前正在编辑的任务和它所属的部门
    let currentTaskSection = null;
    Object.keys(localTasks).forEach(sectionId => {
      const taskInSection = localTasks[sectionId].find(task => task.id === editingTask);
      if (taskInSection) {
        currentTaskSection = sectionId;
      }
    });
    
    // 如果找到了任务所属的部门，完成任务编辑
    if (currentTaskSection) {
      handleTaskEditComplete(editingTask, currentTaskSection);
    } else {
      // 如果找不到部门，只清除编辑状态
      setEditingTask(null);
      setEditingTaskValues({});
      setIsAddingTask(false);
    }
  };

  /**
   * 渲染添加任务按钮
   * @param {string} sectionId - 部门ID
   * @returns {JSX.Element} - 按钮组件
   */
  const renderAddTaskButton = (sectionId) => {
    return (
      <Button 
        variant="ghost" 
        size="sm"
        onClick={() => handleAddTask(sectionId)}
        disabled={isLoading}
      >
        <Plus className="w-4 h-4"/>
      </Button>
    );
  };

  // 返回所有任务操作相关的函数和状态
  return {
    // 状态
    editingTask,
    editingTaskValues,
    isAddingTask,
    isLoading,
    
    // 设置函数
    setEditingTask,
    setEditingTaskValues,
    setIsAddingTask,
    
    // 操作函数
    handleAddTask,
    handleTaskValueChange,
    handleTaskEditComplete,
    handleKeyDown,
    handleClickOutside,
    
    // UI组件
    renderAddTaskButton
  };
}
