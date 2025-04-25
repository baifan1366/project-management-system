'use client';

import { useContext, memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { WorkflowContext } from './TaskWorkflow';
import { useTranslations } from 'next-intl';

// 自定义任务节点
const TaskNode = memo(({ data, isConnectable }) => {
  const { 
    selectedTaskId, 
    setSelectedTaskId
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

  return (
    <div 
      className={`px-4 py-2 shadow-md rounded-md border ${
        isSelected ? 'bg-background border-gray-500' : 'bg-background border-transparent'
      }`}
      style={{ minWidth: 150 }}
      onClick={handleClick}
    >
      <div className="flex items-center">
        <div className={`w-3 h-3 rounded-full mr-2 ${
          data.status === t('completed') ? 'bg-green-500' : 
          data.status === t('inProgress') ? 'bg-blue-500' : 
          data.status === t('pending') ? 'bg-yellow-500' : 
          'bg-gray-500'
        }`}></div>
        <div className="font-bold">{data.label}</div>
      </div>
      {data.description && (
        <div className="mt-1 text-xs text-gray-600">{data.description}</div>
      )}
      {data.assignee && (
        <div className="mt-1 text-xs text-gray-500">{t('assignee')}: {data.assignee}</div>
      )}
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