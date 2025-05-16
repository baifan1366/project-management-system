'use client';

import { useContext, memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { WorkflowContext } from './TaskWorkflow';
import { useTranslations } from 'next-intl';
import { parseSingleSelectValue } from './helpers';

// 自定义任务节点
const TaskNode = memo(({ data, isConnectable }) => {
  const { 
    selectedTaskId, 
    setSelectedTaskId,
    onTaskEdit
  } = useContext(WorkflowContext);
  const t = useTranslations('CreateTask');
  // 确保ID类型一致进行比较
  const isSelected = selectedTaskId === (typeof data.id === 'string' ? parseInt(data.id) || data.id : data.id);

  const handleClick = () => {
    // 确保ID类型一致
    const taskId = typeof data.id === 'string' ? parseInt(data.id) || data.id : data.id;
    console.log('TaskNode - 点击任务节点:', taskId);
    setSelectedTaskId(taskId);
  };

  const handleDoubleClick = () => {
    // 双击节点触发编辑
    if (onTaskEdit && data && data.originalTask) {
      onTaskEdit({
        id: data.id,
        name: data.label,
        description: data.description,
        status: data.status,
        assignee: data.assignee,
        dueDate: data.dueDate,
        originalTask: data.originalTask
      });
    }
  };

  // 获取状态颜色
  const getStatusColor = () => {
    if (!data.status || data.status === '-') return 'transparent'; // 返回透明色，将使用边框样式
    
    // 使用与BodyContent相同的解析逻辑
    const statusData = parseSingleSelectValue(data.status);
    return statusData?.color || 'transparent';
  };

  // 获取状态边框样式
  const getStatusBorderStyle = () => {
    if (!data.status || data.status === '-' || data.status === null) {
      return {
        border: '1px solid #9ca3af',
        backgroundColor: 'transparent'
      };
    }
    return {
      backgroundColor: getStatusColor(),
      border: 'none'
    };
  };

  return (
    <div 
      className={`px-4 py-2 shadow-md rounded-md border ${
        isSelected ? 'bg-background border-gray-500' : 'bg-background border-transparent'
      }`}
      style={{ minWidth: 150 }}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
    >
      <div className="flex items-center">
        <div className={`w-3 h-3 rounded-full mr-2`} style={getStatusBorderStyle()}></div>
        <div className="font-bold">{data.label}</div>
      </div>
      {data.description && (
        <div className="mt-1 text-xs text-gray-600">{data.description}</div>
      )}
      <div className="mt-1 text-xs text-gray-500 flex justify-between">
        <div>{t('assignee')}: {data.assignee || '-'}</div>
        <div>{t('dueDate')}: {data.dueDate || '-'}</div>
      </div>
      <Handle
        type="target"
        position={Position.Top}
        isConnectable={isConnectable}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        isConnectable={isConnectable}
      />
    </div>
  );
});

TaskNode.displayName = 'TaskNode';

export default TaskNode; 