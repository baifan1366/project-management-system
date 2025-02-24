import { logAction } from '@/lib/logService'

export const loggerMiddleware = store => next => action => {
  const result = next(action)
  
  // 只处理异步action的fulfilled状态
  if (action.type.endsWith('/fulfilled')) {
    const actionType = action.type.split('/')[1] // 获取操作类型
    
    // 跳过所有GET操作和 updateTeamOrder
    if (actionType.startsWith('fetch') || actionType.startsWith('get') || 
        actionType === 'updateTeamOrder' || actionType === 'initializeTeamOrder' ||
        actionType === 'updateTeamStar') {
      return result
    }
    
    const entityType = action.type.split('/')[0] // 获取实体类型
    
    // 获取用户ID（假设存储在auth state中）
    const userId = store.getState().auth?.user?.id
    
    // 根据不同的操作类型构建日志数据
    const logData = {
      userId,
      actionType,
      entityType,
      entityId: action.payload?.id,
      newValues: action.payload,
      // 对于更新操作，可以从meta中获取旧值
      oldValues: action.meta?.arg?.oldValues || null
    }
    
    // 异步记录日志
    logAction(logData).catch(error => {
      console.error('Failed to log action:', error)
    })
  }
  
  return result
}