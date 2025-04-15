// 安全地解析JSON字符串
export function safeParseJSON(jsonString) {
  try {
    // 尝试直接解析
    return { data: JSON.parse(jsonString), error: null };
  } catch (error) {
    console.error("JSON解析错误，原始字符串:", jsonString);
    
    try {
      // 如果常规解析失败，尝试清理字符串然后解析
      // 1. 查找第一个 '{' 和最后一个 '}'
      const startIdx = jsonString.indexOf('{');
      const endIdx = jsonString.lastIndexOf('}');
      
      if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
        const jsonSubstring = jsonString.substring(startIdx, endIdx + 1);
        
        // 尝试解析清理后的JSON
        try {
          return { data: JSON.parse(jsonSubstring), error: null };
        } catch (subError) {
          // 如果还是失败，检查是否存在多余的右大括号问题
          // 计算左右大括号数量
          const leftBraces = (jsonSubstring.match(/\{/g) || []).length;
          const rightBraces = (jsonSubstring.match(/\}/g) || []).length;
          
          if (rightBraces > leftBraces) {
            // 如果右大括号更多，找到匹配的最后一个右大括号
            let depth = 0;
            let matchedEndIdx = -1;
            
            for (let i = 0; i < jsonSubstring.length; i++) {
              if (jsonSubstring[i] === '{') depth++;
              else if (jsonSubstring[i] === '}') {
                depth--;
                if (depth === 0) matchedEndIdx = i;
              }
            }
            
            if (matchedEndIdx !== -1) {
              const balancedJson = jsonSubstring.substring(0, matchedEndIdx + 1);
              return { data: JSON.parse(balancedJson), error: null };
            }
          }
        }
      }
      
      return { data: null, error: "无法提取有效的JSON内容" };
    } catch (cleanError) {
      return { data: null, error: error.message };
    }
  }
}

// 创建错误响应
export function createErrorResponse(status, errorType, message) {
  return new Response(
    JSON.stringify({
      error: errorType,
      message: message
    }),
    {
      status: status,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
}

// 创建成功响应
export function createSuccessResponse(data) {
  return new Response(
    JSON.stringify(data),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
} 