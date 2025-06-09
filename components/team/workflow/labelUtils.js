import { parseSingleSelectValue } from './helpers';

/**
 * 从团队标签数据中提取SINGLE-SELECT选项
 * @param {Object} labelData - 从getLabelByTeamId获取的原始标签数据
 * @returns {Array} - 解析后的SINGLE-SELECT选项数组
 */
export function extractSingleSelectOptions(labelData) {
  // 确保labelData存在且不为空对象
  if (!labelData || typeof labelData !== 'object' || Object.keys(labelData).length === 0) {
    console.log('extractSingleSelectOptions: labelData为空或无效', labelData);
    return [];
  }

  try {
    // 记录原始数据
    console.log('extractSingleSelectOptions: 原始数据', labelData);
    
    // 处理键名可能的大小写和连字符变体
    let singleSelectData = null;
    const possibleKeys = ['SINGLE-SELECT', 'SINGLE_SELECT', 'single-select', 'single_select', 'SINGLE_SELECT', 'Single-Select'];
    
    // 尝试所有可能的键名
    for (const key of possibleKeys) {
      if (labelData[key] && (Array.isArray(labelData[key]) || typeof labelData[key] === 'object')) {
        singleSelectData = labelData[key];
        console.log(`找到SINGLE-SELECT数据，使用键名: ${key}`, singleSelectData);
        break;
      }
    }
    
    // 如果没有找到，检查label对象内是否有嵌套的SINGLE-SELECT
    if (!singleSelectData && labelData.label) {
      for (const key of possibleKeys) {
        if (labelData.label[key] && (Array.isArray(labelData.label[key]) || typeof labelData.label[key] === 'object')) {
          singleSelectData = labelData.label[key];
          console.log(`在label对象内找到SINGLE-SELECT数据，使用键名: ${key}`, singleSelectData);
          break;
        }
      }
    }
    
    // 如果仍然没有找到，尝试检查所有键
    if (!singleSelectData) {
      console.log('没有找到SINGLE-SELECT数据，可用键名:', Object.keys(labelData));
      // 默认使用空数组
      singleSelectData = [];
    }
    
    // 确保singleSelectData是数组
    if (!Array.isArray(singleSelectData)) {
      console.log('singleSelectData不是数组，转换为数组:', singleSelectData);
      // 如果是对象，尝试转换为数组
      singleSelectData = Object.values(singleSelectData);
    }
    
    if (singleSelectData.length === 0) {
      console.log('singleSelectData为空数组');
      return [];
    }
    
    // 解析每个选项
    const result = singleSelectData.map(option => {
      // 使用已有的parseSingleSelectValue函数解析每个选项
      const parsed = parseSingleSelectValue(option);
      console.log('解析选项:', option, '结果:', parsed);
      return parsed;
    }).filter(option => option); // 过滤掉无效选项
    
    console.log('最终提取的选项:', result);
    return result;
  } catch (error) {
    console.error('解析SINGLE-SELECT选项时出错:', error);
    return [];
  }
}

/**
 * 根据标签ID从任务标签值中获取状态
 * @param {Object} tagValues - 任务的标签值对象
 * @param {String|Number} statusTagId - 状态标签的ID
 * @returns {Object|null} - 解析后的状态对象
 */
export function getTaskStatusById(tagValues, statusTagId) {
  if (!tagValues || !statusTagId || !tagValues[statusTagId]) {
    return null;
  }
  
  try {
    const statusValue = tagValues[statusTagId];
    // 使用parseSingleSelectValue解析状态值
    return parseSingleSelectValue(statusValue);
  } catch (error) {
    console.error('解析任务状态时出错:', error);
    return null;
  }
}

/**
 * 根据标签数据和任务记录获取完整的任务信息
 * @param {Object} task - 任务记录
 * @param {Array} tags - 标签数组
 * @param {Object} tagIdMap - 标签ID映射 {name: id}
 * @returns {Object} - 包含完整信息的任务对象
 */
export function getEnrichedTaskInfo(task, tags, tagIdMap) {
  const tagValues = task.tag_values || {};
  const statusTagId = tagIdMap?.status || findTagIdByName(tags, 'Status');
  
  let taskInfo = {
    id: task.id,
    name: `Task #${task.id}`,
    description: '',
    status: '-',
    originalTask: task
  };
  
  // 根据标签ID获取名称
  if (tagIdMap?.name && tagValues[tagIdMap.name]) {
    taskInfo.name = String(tagValues[tagIdMap.name] || '');
  }
  
  // 根据标签ID获取描述
  if (tagIdMap?.description && tagValues[tagIdMap.description]) {
    taskInfo.description = String(tagValues[tagIdMap.description] || '');
  }
  
  // 根据标签ID获取状态
  if (statusTagId && tagValues[statusTagId]) {
    const statusValue = tagValues[statusTagId];
    // 保存原始状态值，便于编辑
    taskInfo.rawStatus = statusValue;
    // 解析状态值
    const parsedStatus = parseSingleSelectValue(statusValue);
    
    if (parsedStatus) {
      taskInfo.statusData = parsedStatus;
      taskInfo.status = parsedStatus.label || String(statusValue);
    } else {
      taskInfo.status = String(statusValue || '');
    }
  }
  
  return taskInfo;
}

/**
 * 根据标签名称查找标签ID
 * @param {Array} tags - 标签数组
 * @param {String} name - 标签名称
 * @returns {String|Number|null} - 标签ID或null
 */
export function findTagIdByName(tags, name) {
  if (!tags || !Array.isArray(tags) || !name) {
    return null;
  }
  
  const tag = tags.find(tag => 
    tag.name.toLowerCase() === name.toLowerCase() ||
    tag.name.toLowerCase() === name.toLowerCase().replace(/\s+/g, '')
  );
  
  return tag ? tag.id : null;
}

/**
 * 使用示例：将团队标签和任务数据集成到工作流视图中
 * 
 * @param {Object} teamLabelData - 团队标签数据
 * @param {Array} tasks - 任务数组
 * @param {Number} statusTagId - 状态标签的ID
 * @returns {Object} - 包含处理后数据的对象
 */
export function integrateLabelsWithTasks(teamLabelData, tasks, statusTagId) {
  // 1. 从团队标签数据中提取SINGLE-SELECT选项作为状态选项
  const statusOptions = extractSingleSelectOptions(teamLabelData);
  
  // 2. 根据状态标签ID从每个任务中提取状态
  const tasksWithStatus = tasks.map(task => {
    const tagValues = task.tag_values || {};
    const statusData = getTaskStatusById(tagValues, statusTagId);
    
    return {
      id: task.id,
      name: tagValues[1] || `Task #${task.id}`, // 假设标签ID 1为名称
      status: statusData?.label || '-',
      statusData,
      originalTask: task
    };
  });
  
  // 3. 按状态分组任务
  const tasksByStatus = {};
  
  // 初始化每个状态的任务列表
  statusOptions.forEach(option => {
    tasksByStatus[option.value] = [];
  });
  
  // 将任务添加到相应状态组
  tasksWithStatus.forEach(task => {
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
  
  return {
    statusOptions,
    tasksWithStatus,
    tasksByStatus
  };
} 