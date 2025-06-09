'use client'

import { useDispatch, useSelector } from 'react-redux';
import { createTask, updateTask } from '@/lib/redux/features/taskSlice';
import { updateTaskIds } from '@/lib/redux/features/sectionSlice';
import { useTranslations } from 'next-intl';
import { useTableContext } from './TableProvider';
import { useState, useEffect } from 'react';
import { useGetUser } from '@/lib/hooks/useGetUser';
import { Plus, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { validateTextInput } from './TagConfig';

// 错误提示组件
function ValidationError({ message }) {
  if (!message) return null;
  
  return (
    <div className="flex items-center text-red-500 text-xs mt-1">
      <AlertCircle size={12} className="mr-1" />
      <span>{message}</span>
    </div>
  );
}

export default function HandleTask({ teamId, localTasks, setLocalTasks, taskInputRef }) {
  const dispatch = useDispatch();
  const t = useTranslations('CreateTask');
  const { user } = useGetUser();
  const [isLoading, setIsLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  
  // 获取表格上下文
  const {
    editingTask,
    setEditingTask,
    editingTaskValues,
    setEditingTaskValues,
    isAddingTask,
    setIsAddingTask
  } = useTableContext();

  // 将useSelector移到组件顶层 - 修复Hook错误
  const tagsData = useSelector((state) => state.teamCF.tags);
  const tags = Array.isArray(tagsData) ? tagsData : (tagsData?.tags || []);

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
   * @param {string|object} value - 新值
   */
  const handleTaskValueChange = (taskId, tagId, value) => {
    if (editingTask === taskId) {
      // 同步更新编辑值
      setEditingTaskValues(prev => {
        // 根据不同类型的数据进行处理
        let processedValue = value;
        
        // 处理对象类型的数据 - 例如JSON字符串
        if (typeof value === 'string' && (value.startsWith('{') || value.startsWith('['))) {
          try {
            processedValue = JSON.parse(value);
          } catch (e) {
            // 如果解析失败，保持原样
            processedValue = value;
          }
        }
        
        // 处理数字类型
        if (typeof value === 'string' && !isNaN(value) && value !== '') {
          const num = Number(value);
          if (!isNaN(num) && Number.isFinite(num)) {
            // 确保不是像 '123abc' 这样的非纯数字字符串
            if (/^-?\d+(\.\d+)?$/.test(value)) {
              processedValue = num;
            }
          }
        }
        
        const newValues = {
          ...prev,
          [tagId]: processedValue
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
              
              // 处理对象类型的数据 - 与上面相同逻辑
              let processedValue = value;
              if (typeof value === 'string' && (value.startsWith('{') || value.startsWith('['))) {
                try {
                  processedValue = JSON.parse(value);
                } catch (e) {
                  processedValue = value;
                }
              }
              
              // 处理数字类型
              if (typeof value === 'string' && !isNaN(value) && value !== '') {
                const num = Number(value);
                if (!isNaN(num) && Number.isFinite(num)) {
                  if (/^-?\d+(\.\d+)?$/.test(value)) {
                    processedValue = num;
                  }
                }
              }
              
              updatedTasks[sectionId][taskIndex] = {
                ...updatedTasks[sectionId][taskIndex],
                tag_values: {
                  ...updatedTasks[sectionId][taskIndex].tag_values,
                  [tagId]: processedValue
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
      // 使用组件顶层已声明的tagsData和tags变量，而不是在函数内部调用useSelector
      
      // 重置所有验证错误
      setValidationErrors({});
      
      // 检查必填字段是否已填写
      let validationFailed = false;
      let firstInvalidField = null;
      const errors = {};
      
      // 处理和转换编辑值，确保格式正确
      const processedValues = {};
      
      // 遍历所有字段进行验证和处理
      for (const [tagId, value] of Object.entries(editingTaskValues)) {
        // 找到对应的标签定义
        const tagDefinition = tags.find(t => t.id.toString() === tagId);
        
        // 如果是名称字段，或者标记为必填的字段
        const isNameField = tagDefinition?.name === 'Name' || tagId === '1';
        const isRequired = isNameField || tagDefinition?.required;
        
        if (isRequired) {
          const validation = validateTextInput(value, { required: true });
          if (!validation.isValid) {
            validationFailed = true;
            errors[tagId] = validation.message;
            if (!firstInvalidField) {
              firstInvalidField = tagId;
            }
          }
        }
        
        // 处理不同类型的字段值
        if (value !== undefined && value !== null) {
          // 特殊类型处理
          if (tagDefinition) {
            // 根据标签类型处理
            const tagType = tagDefinition.type ? tagDefinition.type.toUpperCase() : 'TEXT';
            
            switch (tagType) {
              case 'SINGLE-SELECT':
                // 单选字段可能是字符串或对象
                if (typeof value === 'string' && (value.startsWith('{') && value.endsWith('}'))) {
                  try {
                    processedValues[tagId] = JSON.parse(value);
                  } catch (e) {
                    processedValues[tagId] = value;
                  }
                } else {
                  processedValues[tagId] = value;
                }
                break;
                
              case 'MULTI-SELECT':
              case 'TAGS':
                // 多选或标签字段可能是字符串或数组
                if (typeof value === 'string' && (value.startsWith('[') && value.endsWith(']'))) {
                  try {
                    processedValues[tagId] = JSON.parse(value);
                  } catch (e) {
                    processedValues[tagId] = value;
                  }
                } else {
                  processedValues[tagId] = value;
                }
                break;
                
              case 'NUMBER':
                // 数字字段
                if (typeof value === 'string' && !isNaN(value)) {
                  processedValues[tagId] = Number(value);
                } else {
                  processedValues[tagId] = value;
                }
                break;
                
              default:
                // 默认不处理
                processedValues[tagId] = value;
            }
          } else {
            // 没有标签定义，直接使用值
            processedValues[tagId] = value;
          }
        }
      }
      
      // 如果验证失败，显示错误并返回失败
      if (validationFailed) {
        setValidationErrors(errors);
        console.error('验证失败: 有必填字段未填写', errors);
        return false;
      }
      
      const userId = user?.id;
      
      // 准备任务数据
      const taskData = {
        tag_values: processedValues,
        created_by: userId
      };
      
      // 创建任务
      const result = await dispatch(createTask(taskData)).unwrap();
      
      //it may also create a notion_page, then update the notion_page id into the task table, page_id column
      const { data: notionPageData, error: notionPageError } = await supabase
        .from('notion_page')
        .insert({
          created_by: userId,
          last_edited_by: userId
        })
        .select()
        .single();
            
      //update the notion_page id into the task table, page_id column
      if (notionPageData && notionPageData.id) {
        const { data: newTaskData, error: taskError } = await supabase
          .from('task')
          .update({
            page_id: notionPageData.id
          })
          .eq('id', result.id);
          
        if (taskError) {
          console.error('更新任务页面ID失败:', taskError);
        }
      }
      
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

      // 使用组件顶层已声明的tagsData和tags变量，而不是在函数内部调用useSelector
      
      // 重置所有验证错误
      setValidationErrors({});
      
      // 准备本地更新的任务数据（对象格式的tag_values）
      const updatedTagValues = {
        ...currentTask.tag_values
      };
      
      // 只更新已编辑的字段
      for (const [tagId, value] of Object.entries(editingTaskValues)) {
        // 只有当值改变时才更新
        if (value !== undefined && value !== null && 
            JSON.stringify(updatedTagValues[tagId]) !== JSON.stringify(value)) {
          updatedTagValues[tagId] = value;
        }
      }
      
      // 验证必填字段
      let validationFailed = false;
      const errors = {};
      
      // 遍历所有字段进行验证
      for (const [tagId, value] of Object.entries(updatedTagValues)) {
        // 找到对应的标签定义
        const tagDefinition = tags.find(t => t.id.toString() === tagId);
        
        // 如果是名称字段，或者标记为必填的字段
        const isNameField = tagDefinition?.name === 'Name' || tagId === '1';
        const isRequired = isNameField || tagDefinition?.required;
        
        if (isRequired) {
          const validation = validateTextInput(value, { required: true });
          if (!validation.isValid) {
            validationFailed = true;
            errors[tagId] = validation.message;
            break;
          }
        }
      }
      
      // 如果验证失败，显示错误并返回失败
      if (validationFailed) {
        setValidationErrors(errors);
        console.error('验证失败: 有必填字段未填写', errors);
        return false;
      }
      
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
      
      // 清除所有验证错误
      setValidationErrors({});
      
      // 使用组件顶层已声明的tagsData和tags变量，而不是在函数内部调用useSelector
      
      // 检查必填字段 (预验证)
      let preValidationFailed = false;
      const errors = {};
      
      // 确认必填字段都有值
      for (const tag of tags) {
        if (tag.required || tag.name === 'Name') {
          const tagId = tag.id.toString();
          const value = editingTaskValues[tagId];
          
          if (!value || (typeof value === 'string' && value.trim() === '')) {
            preValidationFailed = true;
            errors[tagId] = '此字段不能为空';
          }
        }
      }
      
      if (preValidationFailed) {
        setValidationErrors(errors);
        setIsLoading(false);
        return false;
      }
      
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
      if (success) {
        setEditingTask(null);
        setEditingTaskValues({});
        setIsAddingTask(false);
      }
      
      return success;
    } catch (error) {
      console.error('任务操作失败:', error);
      
      // 提供更具体的错误信息
      if (error.message) {
        console.error('错误详情:', error.message);
      }
      
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
    validationErrors,
    
    // 设置函数
    setEditingTask,
    setEditingTaskValues,
    setIsAddingTask,
    setValidationErrors,
    
    // 操作函数
    handleAddTask,
    handleTaskValueChange,
    handleTaskEditComplete,
    handleKeyDown,
    handleClickOutside,
    
    // UI组件
    renderAddTaskButton,
    ValidationError
  };
}
