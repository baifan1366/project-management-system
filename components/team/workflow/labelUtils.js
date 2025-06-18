import { parseSingleSelectValue } from './helpers';

/**
 * 从团队标签数据中提取SINGLE-SELECT选项
 * @param {Object} labelData - 从getLabelByTeamId获取的原始标签数据
 * @returns {Array} - 解析后的SINGLE-SELECT选项数组
 */
export function extractSingleSelectOptions(labelData) {
  // 确保labelData存在且不为空对象
  if (!labelData || typeof labelData !== 'object' || Object.keys(labelData).length === 0) {
    return [];
  }

  try {
    // 扁平化标签对象，消除嵌套结构
    const flattenedLabel = flattenLabelObject(labelData);
    
    // 获取SINGLE-SELECT数组
    let singleSelectData = flattenedLabel["SINGLE-SELECT"] || [];
    
    // 确保singleSelectData是数组
    if (!Array.isArray(singleSelectData)) {
      singleSelectData = [singleSelectData];
    }
    
    if (singleSelectData.length === 0) {
      return [];
    }
    
    // 解析每个选项
    const result = singleSelectData.map(option => {
      // 使用已有的parseSingleSelectValue函数解析每个选项
      const parsed = parseSingleSelectValue(option);
      return parsed;
    }).filter(option => option); // 过滤掉无效选项
    
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

/**
 * 提取实际的标签数据，解决多层嵌套问题
 * @param {Object} label - 可能嵌套的标签对象
 * @returns {Object} - 提取出的实际标签对象
 */
function extractActualLabel(label) {
  if (!label || typeof label !== 'object') {
    return label;
  }
  
  let actualLabel = label;
  let tempLabel = label;
  let depth = 0;
  const MAX_DEPTH = 20; // 防止无限循环
  
  // 遍历可能的嵌套层级，找到包含SINGLE-SELECT的对象
  while (tempLabel && typeof tempLabel === 'object' && tempLabel.label && depth < MAX_DEPTH) {
    if (tempLabel['SINGLE-SELECT']) {
      actualLabel = tempLabel;
      break;
    }
    tempLabel = tempLabel.label;
    depth++;
  }
  
  return actualLabel;
}

/**
 * 创建新的状态选项
 * @param {Object} label - 现有的标签对象
 * @param {Object} newOption - 新的选项对象 {label:string, color:string}
 * @returns {Object} - 更新后的标签对象
 */
export function createStatusOption(label, newOption) {
  // 验证输入
  if (!newOption || !newOption.label || !newOption.color) {
    console.error('创建状态选项失败: 缺少必要参数', newOption);
    throw new Error('创建状态选项失败: 缺少必要参数');
  }

  try {
    
    // 首先扁平化标签对象，消除嵌套结构
    const flattenedLabel = flattenLabelObject(label);
    
    // 格式化新选项
    const option = {
      label: newOption.label.trim(),
      value: newOption.value || newOption.label.toLowerCase().replace(/\s+/g, '_'),
      color: newOption.color
    };
    
    // 将选项对象转为JSON字符串
    const optionJson = JSON.stringify(option);
    
    // 添加新选项
    const result = { ...flattenedLabel };
    result["SINGLE-SELECT"].push(optionJson);
        
    return result;
  } catch (error) {
    console.error('创建状态选项发生错误:', error);
    throw error;
  }
}

/**
 * 更新现有的状态选项
 * @param {Object} label - 现有的标签对象
 * @param {Object} updatedOption - 更新的选项对象，必须包含value属性以匹配现有选项
 * @returns {Object} - 更新后的标签对象
 */
export function updateStatusOption(label, updatedOption) {
  // 验证输入
  if (!label || !updatedOption || !updatedOption.value) {
    console.error('更新状态选项失败: 缺少必要参数', { label, updatedOption });
    throw new Error('更新状态选项失败: 缺少必要参数');
  }

  try {
    
    // 首先扁平化标签对象，消除嵌套结构
    const flattenedLabel = flattenLabelObject(label);
    
    // 创建结果对象
    const result = { ...flattenedLabel };
    
    // 从SINGLE-SELECT数组中找到匹配的选项并更新
    result["SINGLE-SELECT"] = result["SINGLE-SELECT"].map(optionStr => {
      try {
        let option = typeof optionStr === 'string' ? JSON.parse(optionStr) : optionStr;
        
        // 如果找到匹配的选项，更新它
        if (option.value === updatedOption.value) {
          // 创建更新后的选项
          option = {
            ...option,
            label: updatedOption.label || option.label,
            color: updatedOption.color || option.color
          };
        }
        
        // 将对象转回JSON字符串
        return typeof optionStr === 'string' ? JSON.stringify(option) : option;
      } catch (e) {
        console.error('处理选项时出错:', e);
        return optionStr; // 如果解析错误，保留原始选项
      }
    });
    
    return result;
  } catch (error) {
    console.error('更新状态选项发生错误:', error);
    throw error;
  }
}

/**
 * 删除状态选项
 * @param {Object} label - 现有的标签对象
 * @param {String} optionValue - 要删除的选项的value值
 * @returns {Object} - 更新后的标签对象
 */
export function deleteStatusOption(label, optionValue) {
  // 验证输入
  if (!label || !optionValue) {
    console.error('删除状态选项失败: 缺少必要参数', { label, optionValue });
    throw new Error('删除状态选项失败: 缺少必要参数');
  }

  try {
    
    // 首先扁平化标签对象，消除嵌套结构
    const flattenedLabel = flattenLabelObject(label);
    
    // 创建结果对象
    const result = { ...flattenedLabel };
    
    // 记录删除前的选项数量
    const originalCount = result["SINGLE-SELECT"].length;
    
    // 从SINGLE-SELECT数组中过滤掉匹配的选项
    result["SINGLE-SELECT"] = result["SINGLE-SELECT"].filter(optionStr => {
      try {
        let option = typeof optionStr === 'string' ? JSON.parse(optionStr) : optionStr;
        const shouldKeep = option.value !== optionValue;
        return shouldKeep;
      } catch (e) {
        console.error('处理选项时出错:', e);
        return true; // 如果解析错误，保留选项
      }
    });
    
    return result;
  } catch (error) {
    console.error('删除状态选项发生错误:', error);
    throw error;
  }
}

/**
 * 扁平化标签对象，消除嵌套的label结构
 * @param {Object} originalLabel - 可能包含嵌套label结构的原始标签对象
 * @returns {Object} - 扁平化后的标签对象
 */
function flattenLabelObject(originalLabel) {
  if (!originalLabel || typeof originalLabel !== 'object') {
    return { "TAGS": [""], "MULTI-SELECT": [""], "SINGLE-SELECT": [] };
  }

  // 初始化结果对象
  let result = {
    "TAGS": [""],
    "MULTI-SELECT": [""],
    "SINGLE-SELECT": []
  };
  
  // 递归处理嵌套的label对象
  function extractNestedData(obj) {
    if (!obj || typeof obj !== 'object') return;
    
    // 处理直接属性
    if (obj["TAGS"]) result["TAGS"] = Array.isArray(obj["TAGS"]) ? [...obj["TAGS"]] : [""];
    if (obj["MULTI-SELECT"]) result["MULTI-SELECT"] = Array.isArray(obj["MULTI-SELECT"]) ? [...obj["MULTI-SELECT"]] : [""];
    
    // 合并SINGLE-SELECT数组
    if (obj["SINGLE-SELECT"] && Array.isArray(obj["SINGLE-SELECT"])) {
      result["SINGLE-SELECT"] = [...result["SINGLE-SELECT"], ...obj["SINGLE-SELECT"]];
    } else if (obj["SINGLE-SELECT"]) {
      result["SINGLE-SELECT"].push(obj["SINGLE-SELECT"]);
    }
    
    // 递归处理嵌套的label
    if (obj.label && typeof obj.label === 'object') {
      extractNestedData(obj.label);
    }
  }
  
  // 从原始对象开始处理
  extractNestedData(originalLabel);
  
  return result;
} 