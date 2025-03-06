import { logAction } from '@/lib/logService'

export const loggerMiddleware = store => next => action => {
  const result = next(action)
  
  // 只处理异步action的fulfilled状态
  if (action.type.endsWith('/fulfilled')) {
    const actionType = action.type.split('/')[1] // 获取操作类型
    
    // 只跳过查询类操作
    if (actionType.startsWith('fetch') || 
        actionType.startsWith('get') || 
        actionType === 'updateOrder' || 
        actionType === 'initializeTeamOrder' ||
        actionType === 'updateTeamStar') {
      // 对于查询操作，仍然记录错误
      if (action.error) {
        console.error(`Redux Logger: ${actionType} 失败:`, action.error);
      }
      return result;
    }
    
    const entityType = action.type.split('/')[0] // 获取实体类型
    
    // 从action的payload或meta中获取用户ID
    const userId = action.payload?.created_by || 
                  action.meta?.arg?.created_by || 
                  action.meta?.arg?.user_id ||
                  store.getState().auth?.user?.id
      
    // 确保实体ID存在
    const entityId = action.payload?.id || action.meta?.arg?.id
    
    if (!entityId) {
      console.warn('No entity ID found for logging:', action)
      return result
    }

    if (!userId) {
      console.warn('No user ID found for logging:', action)
      return result
    }

    // 为createTeam和createTeamUser添加特殊的日志记录
    if (action.type === 'teams/createTeam/fulfilled' || action.type === 'teams/createTeamUser/fulfilled') {
      console.log('Logging special action:', action.type);
      
      const specialLogData = {
        userId,
        actionType: action.type.split('/')[1], // 获取真实的action类型
        entityType,
        entityId,
        newValues: action.payload,
        oldValues: null,
        timestamp: new Date().toISOString(),
        details: action.type === 'teams/createTeam/fulfilled'
          ? { teamName: action.payload.name, teamDescription: action.payload.description }
          : { teamId: action.payload.team_id, userRole: action.payload.role }
      }

      // 异步记录特殊日志
      logAction(specialLogData).catch(error => {
        console.error(`Failed to log ${action.type}:`, error)
      })
      
      return result
    }
    
    // 根据不同的操作类型构建日志数据
    let logData = {
      userId,
      actionType,
      entityType,
      entityId,
      newValues: action.payload,
      oldValues: action.meta?.arg?.oldValues || null
    }
    
    // 异步记录日志
    logAction(logData).catch(error => {
      console.error('Failed to log action:', error)
    })
  }
  
  return result
}