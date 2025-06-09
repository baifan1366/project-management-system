import React from 'react';

/**
 * 工作流相关的辅助函数
 */

// 根据标签解析状态对象
export function parseSingleSelectValue(value) {
  if (!value) return null;
  
  // 如果已经是对象形式，直接返回
  if (typeof value === 'object' && value !== null) {
    return {
      label: value.label || '',
      value: value.value || value.label?.toLowerCase()?.replace(/\s+/g, '_') || '',
      color: value.color || generateColorFromLabel(value.label || '')
    };
  }
  
  // 尝试解析JSON字符串
  if (typeof value === 'string') {
    // 处理转义的JSON字符串
    let stringToParse = value;
    
    // 检查是否为转义的JSON字符串 (例如: "{\"label\":\"Pending\",\"color\":\"#10b981\",\"value\":\"pending\"}")
    if (value.includes('\\\"') || value.includes('\\"')) {
      // 替换转义的引号
      stringToParse = value.replace(/\\"/g, '"');
    }
    
    try {
      // 如果是有效的JSON字符串，解析它
      if (stringToParse.startsWith('{') || stringToParse.startsWith('[')) {
        const parsed = JSON.parse(stringToParse);
        
        // 如果是对象，返回格式化的对象
        if (typeof parsed === 'object' && parsed !== null) {
          return {
            label: parsed.label || '',
            value: parsed.value || parsed.label?.toLowerCase()?.replace(/\s+/g, '_') || '',
            color: parsed.color || generateColorFromLabel(parsed.label || '')
          };
        }
      }
    } catch (e) {
      // 解析失败，尝试作为普通字符串处理
    }
    
    // 如果不是有效的JSON或解析失败，创建基本对象
    return {
      label: value,
      value: value.toLowerCase().replace(/\s+/g, '_'),
      color: generateColorFromLabel(value)
    };
  }
  
  // 如果是数字或其他类型，转为字符串并创建基本对象
  const stringValue = String(value);
  return {
    label: stringValue,
    value: stringValue.toLowerCase().replace(/\s+/g, '_'),
    color: generateColorFromLabel(stringValue)
  };
}

// 从标签生成颜色
export function generateColorFromLabel(label) {
  if (!label) return '#10b981'; // 默认颜色
  
  // 基于字符串的简单哈希算法
  let hash = 0;
  for (let i = 0; i < label.length; i++) {
    hash = label.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // 将哈希转换为颜色
  const colors = [
    '#ef4444', '#f97316', '#f59e0b', '#84cc16', 
    '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6', 
    '#d946ef', '#ec4899'
  ];
  
  const index = Math.abs(hash) % colors.length;
  return colors[index];
}

// 渲染状态徽章
export function renderStatusBadge(status) {
  if (!status || status === '-') {
    // 返回一个透明背景、黑色边框样式
    return (
      <span 
        className="px-2 py-1 rounded-full text-xs border text-gray-500"
        style={{ borderColor: '#9ca3af', backgroundColor: 'transparent' }}
      >
        -
      </span>
    );
  }
  
  const statusData = parseSingleSelectValue(status);
  
  return (
    <span 
      className="px-2 py-1 rounded-full text-xs bg-opacity-20 text-opacity-90" 
      style={{
        backgroundColor: `${statusData?.color || '#9ca3af'}30`,
        color: statusData?.color || '#9ca3af'
      }}
    >
      {statusData?.label || status}
    </span>
  );
} 