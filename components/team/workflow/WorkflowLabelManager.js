import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getLabelByTeamId } from '@/lib/redux/features/teamLabelSlice';
import { extractSingleSelectOptions, getTaskStatusById, integrateLabelsWithTasks } from './labelUtils';
import { renderStatusBadge } from './helpers';

/**
 * 工作流标签管理器组件
 * 演示如何使用labelUtils中的函数处理团队标签和任务数据
 */
const WorkflowLabelManager = ({ teamId, tasks = [] }) => {
  const dispatch = useDispatch();
  const [statusOptions, setStatusOptions] = useState([]);
  const [statusTagId, setStatusTagId] = useState('3'); // 默认假设Status标签ID为3
  const [processedTasks, setProcessedTasks] = useState([]);
  const [tasksByStatus, setTasksByStatus] = useState({});
  
  // 从Redux获取标签数据
  const { label: teamLabel, status: labelStatus } = useSelector(state => state.teamLabels || {});
  
  // 当组件加载时获取团队标签数据
  useEffect(() => {
    if (teamId) {
      dispatch(getLabelByTeamId(teamId));
    }
  }, [dispatch, teamId]);
  
  // 当团队标签数据加载完成后，提取SINGLE-SELECT选项
  useEffect(() => {
    if (labelStatus === 'succeeded' && teamLabel) {
      const options = extractSingleSelectOptions(teamLabel);
      setStatusOptions(options);
      
      // 如果有任务数据，处理任务和标签的集成
      if (tasks.length > 0) {
        const { tasksWithStatus, tasksByStatus: groupedTasks } = integrateLabelsWithTasks(
          teamLabel, 
          tasks, 
          statusTagId
        );
        
        setProcessedTasks(tasksWithStatus);
        setTasksByStatus(groupedTasks);
      }
    }
  }, [teamLabel, labelStatus, tasks, statusTagId]);
  
  // 渲染加载状态
  if (labelStatus === 'loading') {
    return <div className="p-4">加载标签数据中...</div>;
  }
  
  // 渲染错误状态
  if (labelStatus === 'failed') {
    return <div className="p-4 text-red-500">加载标签数据失败</div>;
  }
  
  return (
    <div className="p-4">
      <h2 className="text-lg font-bold mb-4">工作流状态选项</h2>
      
      {/* 显示提取的状态选项 */}
      <div className="mb-6">
        <h3 className="text-md font-semibold mb-2">状态选项:</h3>
        <div className="flex flex-wrap gap-2">
          {statusOptions.length > 0 ? (
            statusOptions.map((option, index) => (
              <div 
                key={index}
                className="flex items-center gap-2 p-2 border rounded"
              >
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: option.color || '#e5e5e5' }}
                ></div>
                <span>{option.label}</span>
              </div>
            ))
          ) : (
            <div>没有可用的状态选项</div>
          )}
        </div>
      </div>
      
      {/* 显示按状态分组的任务 */}
      <div>
        <h3 className="text-md font-semibold mb-2">按状态分组的任务:</h3>
        
        {Object.keys(tasksByStatus).length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(tasksByStatus).map(([status, tasks]) => (
              <div key={status} className="border rounded p-3">
                <div className="font-medium mb-2">
                  {status === 'unclassified' ? '未分类' : (
                    statusOptions.find(opt => opt.value === status)?.label || status
                  )}
                  <span className="ml-2 text-gray-500 text-sm">({tasks.length})</span>
                </div>
                
                <div className="space-y-2">
                  {tasks.map(task => (
                    <div key={task.id} className="p-2 bg-gray-50 rounded">
                      <div className="font-medium">{task.name}</div>
                      <div className="mt-1">
                        状态: {task.statusData ? renderStatusBadge(task.statusData) : '-'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div>没有任务或无法按状态分组</div>
        )}
      </div>
    </div>
  );
};

export default WorkflowLabelManager; 