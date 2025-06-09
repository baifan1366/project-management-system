import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getLabelByTeamId } from '@/lib/redux/features/teamLabelSlice';
import { extractSingleSelectOptions, getTaskStatusById } from './labelUtils';

/**
 * 标签集成示例
 * 
 * 这个文件展示了如何在工作流中集成团队标签和任务数据
 * 主要步骤:
 * 1. 使用redux获取团队标签数据
 * 2. 从标签数据中提取SINGLE-SELECT选项作为状态选项
 * 3. 根据标签ID从任务数据中提取状态信息
 */
export default function LabelIntegrationExample() {
  const dispatch = useDispatch();
  
  // 从URL或其他来源获取teamId
  const teamId = /* 获取teamId */ '1';
  
  // 从状态标签获取ID (例如: 从getTagByName)
  const statusTagId = '3';
  
  // Step 1: 使用redux获取团队标签数据
  useEffect(() => {
    if (teamId) {
      dispatch(getLabelByTeamId(teamId));
    }
  }, [dispatch, teamId]);
  
  // 从redux store获取标签数据
  const { label: teamLabelData, status: labelStatus } = useSelector(state => state.teamLabels || {});
  
  // 示例任务数据
  const exampleTask = {
    id: 123,
    tag_values: {
      '1': 'Task Name',
      '3': '{"label":"Completed","value":"completed","color":"#10b981"}',
      '4': '2025-06-29',
      '5': 'Task Description'
    }
  };
  
  // 使用方法 A: 基本用法
  const basicExample = () => {
    // 只有当标签数据加载完成后才处理
    if (labelStatus === 'succeeded' && teamLabelData) {
      // Step 2: 从标签数据中提取SINGLE-SELECT选项
      const statusOptions = extractSingleSelectOptions(teamLabelData);
      console.log('状态选项:', statusOptions);
      
      // Step 3: 从任务中提取状态
      const taskStatus = getTaskStatusById(exampleTask.tag_values, statusTagId);
      console.log('任务状态:', taskStatus);
      
      // 示例: 找到与任务状态匹配的选项
      const matchingOption = statusOptions.find(
        option => option.value === taskStatus?.value
      );
      console.log('匹配的状态选项:', matchingOption);
    }
  };
  
  // 使用方法 B: 结合Redux和React hooks
  const useWorkflowLabels = (teamId) => {
    const dispatch = useDispatch();
    const { label, status } = useSelector(state => state.teamLabels || {});
    
    // 获取团队标签数据
    useEffect(() => {
      if (teamId) {
        dispatch(getLabelByTeamId(teamId));
      }
    }, [dispatch, teamId]);
    
    // 提取并返回状态选项
    const statusOptions = label && status === 'succeeded' 
      ? extractSingleSelectOptions(label)
      : [];
      
    return {
      isLoading: status === 'loading',
      isError: status === 'failed',
      statusOptions,
      rawLabelData: label
    };
  };
  
  // 示例: 处理任务列表中的所有任务状态
  const processTasksExample = (tasks, statusTagId) => {
    // 从团队标签数据中获取状态选项
    const statusOptions = extractSingleSelectOptions(teamLabelData);
    
    // 处理每个任务，提取状态信息
    const processedTasks = tasks.map(task => {
      const taskStatus = getTaskStatusById(task.tag_values, statusTagId);
      
      return {
        ...task,
        status: taskStatus?.label || '-',
        statusData: taskStatus,
        statusColor: taskStatus?.color || '#e5e5e5'
      };
    });
    
    // 按状态对任务进行分组
    const tasksByStatus = {};
    
    // 初始化所有状态选项的任务列表
    statusOptions.forEach(option => {
      tasksByStatus[option.value] = [];
    });
    
    // 为每个任务找到对应的状态组
    processedTasks.forEach(task => {
      if (task.statusData) {
        const statusValue = task.statusData.value;
        
        if (tasksByStatus[statusValue]) {
          tasksByStatus[statusValue].push(task);
        } else {
          // 如果状态不在预定义列表中，创建新组
          tasksByStatus[statusValue] = [task];
        }
      } else {
        // 对于没有状态的任务，可以创建一个"未分类"组
        if (!tasksByStatus['unclassified']) {
          tasksByStatus['unclassified'] = [];
        }
        tasksByStatus['unclassified'].push(task);
      }
    });
    
    return { processedTasks, tasksByStatus };
  };
  
  return null; // 这只是一个示例文件，不实际渲染任何内容
} 