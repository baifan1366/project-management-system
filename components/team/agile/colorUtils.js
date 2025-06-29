/**
 * 计算对比色，确保文本在背景上清晰可见
 * @param {string} hexColor - 十六进制颜色代码 
 * @returns {string} 对比色的十六进制代码
 */
export const getContrastColor = (hexColor) => {
  // 如果没有颜色或格式不正确，返回黑色
  if (!hexColor || !hexColor.startsWith('#')) {
    return '#000000';
  }
  
  try {
    // 从十六进制颜色中提取RGB值
    let r, g, b;
    if (hexColor.length === 4) { // #RGB格式
      r = parseInt(hexColor[1] + hexColor[1], 16);
      g = parseInt(hexColor[2] + hexColor[2], 16);
      b = parseInt(hexColor[3] + hexColor[3], 16);
    } else if (hexColor.length === 7) { // #RRGGBB格式
      r = parseInt(hexColor.substr(1, 2), 16);
      g = parseInt(hexColor.substr(3, 2), 16);
      b = parseInt(hexColor.substr(5, 2), 16);
    } else {
      return '#000000';
    }
    
    // 计算亮度 (YIQ公式)
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    
    // 根据亮度返回黑色或白色
    return (yiq >= 128) ? '#000000' : '#ffffff';
  } catch (error) {
    console.error('计算颜色对比时出错:', error);
    return '#000000';
  }
};

/**
 * 获取状态对应的颜色
 * @param {string} status - 状态名称 
 * @returns {string} 状态对应的颜色十六进制代码
 */
export const getStatusColor = (status) => {
  const statusColors = {
    'todo': '#94a3b8',
    'in_progress': '#3b82f6',
    'done': '#10b981',
    'to_do': '#94a3b8',
    'pending': '#f59e0b',
    'blocked': '#ef4444'
  };
  
  return typeof status === 'string'
    ? (statusColors[status.toLowerCase().replace(/[\s-_]+/g, '_')] || '#6b7280')
    : '#6b7280';
}; 