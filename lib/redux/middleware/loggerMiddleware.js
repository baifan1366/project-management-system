import { logAction } from '@/lib/logService'

export const loggerMiddleware = store => next => action => {
  const result = next(action)
  
  // 只处理异步action的fulfilled状态
  if (action.type.endsWith('/fulfilled')) {
    const actionType = action.type.split('/')[1]
    
    // 跳过查询类操作
    if ((actionType.startsWith('fetch')) || 
        (actionType.startsWith('get')) || 
        actionType === 'updateOrder' || 
        actionType === 'updateTeamCustomFieldOrder' ||
        actionType === 'initializeTeamOrder' ||
        actionType === 'updateTeamStar') {
      return result;
    }

    // 更可靠的 userId 获取方式
    let userId;
    const state = store.getState();
    
    // 按优先级依次尝试获取 userId
    if (action.payload?.created_by) {
      userId = action.payload.created_by;
    } else if (action.meta?.arg?.created_by) {
      userId = action.meta.arg.created_by;
    } else if (action.meta?.arg?.user_id) {
      userId = action.meta.arg.user_id;
    } else if (state.auth?.user?.id) {
      userId = state.auth.user.id;
    }

    // 如果还是获取不到 userId，记录警告
    if (!userId) {
      console.warn('无法获取 userId，action:', action.type, 'payload:', action.payload);
      // 可以设置一个默认值或者系统用户ID
      userId = 'system';
    }

    // 由于所有 slice 现在都遵循统一格式，我们可以直接构建日志数据
    const logData = {
      userId,
      actionType: action.type.split('/')[1],
      entityType: action.type.split('/')[0],
      entityId: action.payload?.id,
      newValues: action.payload,
      oldValues: action.payload?.oldValues || null,
      timestamp: new Date().toISOString()
    }

    // 异步记录日志
    logAction(logData).catch(error => {
      console.error('Failed to log action:', error)
    })
  }
  
  return result
}