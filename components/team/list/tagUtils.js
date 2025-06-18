import { parseSingleSelectValue } from './TagConfig';

// 添加一个备用的parseSingleSelectValue函数，以防导入失败
function backupParseSingleSelectValue(value) {
  
  // 如果值是空的，返回null
  if (!value) return null;
  
  // 如果已经是对象形式，直接返回
  if (typeof value === 'object' && value !== null) {
    return value;
  }
  
  // 尝试解析JSON字符串
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (typeof parsed === 'object' && parsed !== null) {
        return parsed;
      }
    } catch (e) {
      // 不是有效的JSON，将作为纯文本选项处理
      
    }
    
    // 作为普通文本处理
    return {
      label: value,
      value: value,
      color: '#10b981' // 默认颜色
    };
  }
  
  // 返回默认值
  return null;
}

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
  
  // 首先尝试获取扁平化的标签对象
  const flattenedLabel = flattenLabelObject(labelData);
  

  try {
    // 获取SINGLE-SELECT数组
    let singleSelectData = flattenedLabel["SINGLE-SELECT"] || [];
    
    
    // 确保singleSelectData是数组
    if (!Array.isArray(singleSelectData)) {
      
      singleSelectData = [singleSelectData].filter(Boolean);
    }
    
    if (singleSelectData.length === 0) {
      
      return [];
    }
    
    // 解析每个选项
    const result = singleSelectData.map(option => {
      
      try {
        // 尝试使用导入的parseSingleSelectValue函数
        const parsed = parseSingleSelectValue(option);
        
        return parsed;
      } catch (error) {
        console.error('使用导入的parseSingleSelectValue失败，尝试使用备用函数', error);
        // 使用备用函数
        return backupParseSingleSelectValue(option);
      }
    }).filter(option => option); // 过滤掉无效选项
    
    
    return result;
  } catch (error) {
    console.error('解析SINGLE-SELECT选项时出错:', error);
    return [];
  }
}

/**
 * 扁平化标签对象，处理可能存在的嵌套结构
 * @param {Object} originalLabel - 可能包含嵌套的标签对象
 * @returns {Object} - 扁平化后的标签对象
 */
function flattenLabelObject(originalLabel) {
  
  
  // 处理空值或非对象
  if (!originalLabel || typeof originalLabel !== 'object') {
    
    return {
      "TAGS": [],
      "MULTI-SELECT": [],
      "SINGLE-SELECT": []
    };
  }
  
  // 递归处理嵌套的label属性（可能有多层嵌套）
  if (originalLabel.label && typeof originalLabel.label === 'object') {
    
    return flattenLabelObject(originalLabel.label);
  }
  
  // 检查数据是否已经是正确的扁平结构（有TAGS, MULTI-SELECT, SINGLE-SELECT）
  const hasExpectedStructure = 
    "TAGS" in originalLabel || 
    "MULTI-SELECT" in originalLabel || 
    "SINGLE-SELECT" in originalLabel;
    
  if (hasExpectedStructure) {
    
    // 创建标准化的结构，确保所有必要的属性都存在
    const standardized = {
      "TAGS": Array.isArray(originalLabel["TAGS"]) ? [...originalLabel["TAGS"]] : [],
      "MULTI-SELECT": Array.isArray(originalLabel["MULTI-SELECT"]) ? [...originalLabel["MULTI-SELECT"]] : [],
      "SINGLE-SELECT": Array.isArray(originalLabel["SINGLE-SELECT"]) ? [...originalLabel["SINGLE-SELECT"]] : []
    };
    return standardized;
  }
  
  // 处理非预期结构 - 尝试查找任何可能是标签类别的键
  
  
  // 检查是否存在一个包含标签数据的对象
  for (const key in originalLabel) {
    if (typeof originalLabel[key] === 'object' && originalLabel[key] !== null) {
      const nestedObj = originalLabel[key];
      
      // 递归检查嵌套对象中的label属性
      if (nestedObj.label && typeof nestedObj.label === 'object') {
        
        return flattenLabelObject(nestedObj.label);
      }
      
      if (
        "TAGS" in nestedObj || 
        "MULTI-SELECT" in nestedObj || 
        "SINGLE-SELECT" in nestedObj
      ) {
        
        return flattenLabelObject(nestedObj); // 递归处理，确保扁平化
      }
    }
  }
  
  // 如果没有找到标准结构，返回一个空的标准结构
  
  return {
    "TAGS": [],
    "MULTI-SELECT": [],
    "SINGLE-SELECT": []
  };
}

/**
 * 创建新的单选选项
 * @param {Object} label - 现有的标签对象
 * @param {Object} newOption - 新的选项对象 {label:string, color:string}
 * @returns {Object} - 更新后的标签对象
 */
export function createSingleSelectOption(label, newOption) {
  // 验证输入
  if (!newOption || !newOption.label || !newOption.color) {
    console.error('创建单选选项失败: 缺少必要参数', newOption);
    throw new Error('创建单选选项失败: 缺少必要参数');
  }

  try {
    // 首先扁平化标签对象，彻底消除嵌套结构
    const flattenedLabel = flattenLabelObject(label);
    
    
    // 格式化新选项
    const option = {
      label: newOption.label.trim(),
      value: newOption.value || newOption.label.toLowerCase().replace(/\s+/g, '_'),
      color: newOption.color
    };
    
    // 将选项对象转为JSON字符串
    const optionJson = JSON.stringify(option);
    
    
    // 创建结果对象 - 确保是完全扁平的结构
    const result = {
      "TAGS": Array.isArray(flattenedLabel["TAGS"]) ? [...flattenedLabel["TAGS"]] : [],
      "MULTI-SELECT": Array.isArray(flattenedLabel["MULTI-SELECT"]) ? [...flattenedLabel["MULTI-SELECT"]] : [],
      "SINGLE-SELECT": Array.isArray(flattenedLabel["SINGLE-SELECT"]) ? [...flattenedLabel["SINGLE-SELECT"]] : []
    };
    
    
    // 添加新选项
    result["SINGLE-SELECT"].push(optionJson);
    
    
    // 返回扁平结构，确保不会包含嵌套的label属性
    return result;
  } catch (error) {
    console.error('创建单选选项发生错误:', error);
    throw error;
  }
}

/**
 * 更新现有的单选选项
 * @param {Object} label - 现有的标签对象
 * @param {Object} updatedOption - 更新的选项对象，必须包含value属性以匹配现有选项
 * @returns {Object} - 更新后的标签对象
 */
export function updateSingleSelectOption(label, updatedOption) {
  // 验证输入
  if (!label || !updatedOption || !updatedOption.value) {
    console.error('更新单选选项失败: 缺少必要参数', { label, updatedOption });
    throw new Error('更新单选选项失败: 缺少必要参数');
  }

  try {
    // 首先扁平化标签对象，彻底消除嵌套结构
    const flattenedLabel = flattenLabelObject(label);
    
    
    // 创建结果对象 - 确保是完全扁平的结构
    const result = {
      "TAGS": Array.isArray(flattenedLabel["TAGS"]) ? [...flattenedLabel["TAGS"]] : [],
      "MULTI-SELECT": Array.isArray(flattenedLabel["MULTI-SELECT"]) ? [...flattenedLabel["MULTI-SELECT"]] : [],
      "SINGLE-SELECT": Array.isArray(flattenedLabel["SINGLE-SELECT"]) ? [...flattenedLabel["SINGLE-SELECT"]] : []
    };
    
    
    // 如果没有选项，直接返回
    if (result["SINGLE-SELECT"].length === 0) {
      return result;
    }
    
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
    
    
    
    // 返回扁平结构，确保不会包含嵌套的label属性
    return result;
  } catch (error) {
    console.error('更新单选选项发生错误:', error);
    throw error;
  }
}

/**
 * 删除单选选项
 * @param {Object} label - 现有的标签对象
 * @param {String} optionValue - 要删除的选项的value值
 * @returns {Object} - 更新后的标签对象
 */
export function deleteSingleSelectOption(label, optionValue) {
  // 验证输入
  if (!label || !optionValue) {
    console.error('删除单选选项失败: 缺少必要参数', { label, optionValue });
    throw new Error('删除单选选项失败: 缺少必要参数');
  }

  try {
    // 首先扁平化标签对象，彻底消除嵌套结构
    const flattenedLabel = flattenLabelObject(label);
    
    
    // 创建结果对象 - 确保是完全扁平的结构
    const result = {
      "TAGS": Array.isArray(flattenedLabel["TAGS"]) ? [...flattenedLabel["TAGS"]] : [],
      "MULTI-SELECT": Array.isArray(flattenedLabel["MULTI-SELECT"]) ? [...flattenedLabel["MULTI-SELECT"]] : [],
      "SINGLE-SELECT": Array.isArray(flattenedLabel["SINGLE-SELECT"]) ? [...flattenedLabel["SINGLE-SELECT"]] : []
    };
    
    
    // 如果没有选项，直接返回
    if (result["SINGLE-SELECT"].length === 0) {
      return result;
    }
    
    // 记录要删除的选项值
    
    
    // 从SINGLE-SELECT数组中过滤掉匹配的选项
    const originalLength = result["SINGLE-SELECT"].length;
    result["SINGLE-SELECT"] = result["SINGLE-SELECT"].filter(optionStr => {
      try {
        let option = typeof optionStr === 'string' ? JSON.parse(optionStr) : optionStr;
        return option.value !== optionValue;
      } catch (e) {
        console.error('处理选项时出错:', e);
        return true; // 如果解析错误，保留选项
      }
    });
    
    
    
    
    // 返回扁平结构，确保不会包含嵌套的label属性
    return result;
  } catch (error) {
    console.error('删除单选选项发生错误:', error);
    throw error;
  }
}

/**
 * 根据原始标签结构决定输出格式
 * @param {Object} originalLabel - 原始标签对象
 * @param {Object} resultLabel - 处理后的标签对象
 * @returns {Object} - 格式化为API期望结构的标签对象
 */
function handleOutputStructure(originalLabel, resultLabel) {
  // 直接返回扁平结构，不添加嵌套
  
  return resultLabel;
} 