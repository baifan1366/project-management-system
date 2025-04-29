'use client'

import { useState, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { createTask } from '@/lib/redux/features/taskSlice';
import { updateTaskIds } from '@/lib/redux/features/sectionSlice';
import { useGetUser } from '@/lib/hooks/useGetUser';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';

export default function AddTask({ sectionId, teamId, localTasks, setLocalTasks, taskInputRef }) {
  const dispatch = useDispatch();
  const t = useTranslations('CreateTask');
  const { user } = useGetUser();

  // 存储编辑中的任务状态
  const [editingTask, setEditingTask] = useState(null);
  // 存储编辑中的任务内容
  const [editingTaskValues, setEditingTaskValues] = useState({});
  const checkTaskInputRef = useRef(null);
  // 添加新任务
  const handleAddTask = (sectionId) => {
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
    
    // 确保在下一个渲染周期后聚焦到输入框
    setTimeout(() => {
      if (taskInputRef && taskInputRef.current) {
        taskInputRef.current.focus();
      }
    }, 0);
  };

  // 处理任务值更新
  const handleTaskValueChange = (taskId, tagId, value) => {
    setEditingTaskValues(prev => ({
      ...prev,
      [tagId]: value
    }));
  };

  // 处理任务编辑完成
  const handleTaskEditComplete = async (taskId, sectionId) => {
    if (!editingTask || editingTask !== taskId) return;
    
    // 如果没有填写任何标签值，或者所有值都为空，则取消操作
    const hasValues = Object.values(editingTaskValues).some(value => value && value.trim() !== '');
    if (!hasValues) {
      // 从本地任务列表中移除临时任务
      setLocalTasks(prevTasks => ({
        ...prevTasks,
        [sectionId]: (prevTasks[sectionId] || []).filter(task => task.id !== taskId)
      }));
      
      // 清除编辑状态
      setEditingTask(null);
      setEditingTaskValues({});
      return;
    }
    
    try {
      const userId = user?.id;
      
      // 确保至少有一个值，如果第一个标签值是空的，设置默认值
      const tagValues = { ...editingTaskValues };
      if (!tagValues['1'] || tagValues['1'].trim() === '') {
        tagValues['1'] = t('newTask');
      }
      
      // 准备任务数据
      const taskData = {
        tag_values: tagValues,
        created_by: userId,
      };
      
      // 创建任务
      const result = await dispatch(createTask({ ...taskData }));
      
      // 获取所有任务IDs并添加新任务ID
      const taskIds = (localTasks[sectionId] || [])
        .filter(task => !task.isNew) // 过滤掉临时任务
        .map(task => task.id);
      
      // 添加新创建的任务ID
      taskIds.push(result.payload.id);
      
      // 更新部门的任务IDs
      await dispatch(updateTaskIds({
        sectionId,
        teamId,
        newTaskIds: taskIds
      }));
      
      // 清除编辑状态
      setEditingTask(null);
      setEditingTaskValues({});
      
      // 返回true表示添加成功，需要重新加载任务
      return true;
    } catch (error) {
      console.error('保存任务失败:', error);
      
      // 发生错误时也要清理临时任务
      setLocalTasks(prevTasks => ({
        ...prevTasks,
        [sectionId]: (prevTasks[sectionId] || []).filter(task => task.id !== taskId)
      }));
      
      setEditingTask(null);
      setEditingTaskValues({});
      
      // 返回false表示添加失败
      return false;
    }
  };

  // 处理按键事件
  const handleKeyDown = (e, taskId, sectionId) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleTaskEditComplete(taskId, sectionId);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      // 使用从父组件传递的 taskInputRef 而不是本地的 checkTaskInputRef
      if (editingTask && taskInputRef && taskInputRef.current && !taskInputRef.current.contains(event.target)) {
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
        }
      }
    };

    // 添加点击事件监听器
    document.addEventListener("mousedown", handleClickOutside);
    
    // 清理函数
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [editingTask, localTasks, taskInputRef]);

  // 渲染添加任务按钮
  const renderAddTaskButton = (sectionId) => {
    return (
      <Button 
        variant="ghost" 
        size="sm"
        onClick={() => handleAddTask(sectionId)}
      >
        <Plus className="w-4 h-4"/>
      </Button>
    );
  };

  return {
    editingTask,
    editingTaskValues,
    handleAddTask,
    handleTaskValueChange,
    handleTaskEditComplete,
    handleKeyDown,
    renderAddTaskButton,
    setEditingTask
  };
}
