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


// 标签ID映射辅助函数
export function getDefaultTagIdsForField(fieldId) {
  // 根据视图类型分配适当的标签ID
  switch (fieldId) {
    case 1: // List视图
      return [1, 2, 3, 4, 6]; // 名称、负责人、截止日期、状态、优先级
    case 2: // Dashboard视图
      return [1, 4, 6]; // 名称、状态、优先级
    case 3: // File视图
      return [1, 2]; // 名称、负责人
    case 4: // Gantt视图
      return [1, 2, 3, 4]; // 名称、负责人、截止日期、状态
    case 5: // Board视图
      return [1, 2, 3, 4, 6]; // 名称、负责人、截止日期、状态、优先级
    case 6: // Calendar视图
      return [1, 3, 6]; // 名称、截止日期、优先级
    case 7: // Note视图
      return [1, 2]; // 名称、负责人
    case 8: // Timeline视图
      return [1, 2, 3, 4]; // 名称、负责人、截止日期、状态
    case 9: // Overview视图
      return [1, 2, 3, 4, 6]; // 名称、负责人、截止日期、状态、优先级
    default:
      return []; // 默认返回空数组
  }
} 

// 检查是否是邀请指令
export function isInvitationInstruction(instruction) {
  const lowerInstruction = instruction.toLowerCase();
  const inviteTerms = ['invite', 'add user', 'add member', 'join team'];
  
  // 检查是否包含邀请相关术语
  const containsInviteTerm = inviteTerms.some(term => lowerInstruction.includes(term));
  
  // 检查是否包含邮箱
  const containsEmail = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g.test(lowerInstruction);
  
  const result = containsInviteTerm && containsEmail;
  console.log(`Checking if instruction is invitation: ${result}`);
  return result;
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