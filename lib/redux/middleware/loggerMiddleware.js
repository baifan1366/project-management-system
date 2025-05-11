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
        actionType === 'updateTeamStar' ||
        actionType === 'markAllAsRead' ||
        actionType === 'login' ||
        actionType === 'updateTagIds' ||
        actionType.includes('Notifications') ||
        action.type.includes('notifications/')) {
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
    } else if (state.user?.currentUser?.id) {
      userId = state.user.currentUser.id;
    } else if (action.payload?.edited_by) {
      userId = action.payload.edited_by;
    } else if (action.payload?.userId) {
      userId = action.payload.userId;
    } else if (action.payload?.data?.id) {
      userId = action.payload.data.id;
    } else if (action.userId) {
      userId = action.userId;
    }

    // 如果还是获取不到 userId，记录警告
    if (!userId) {
      console.warn('无法获取 userId，action:', action.type, 'payload:', action.payload);
      // 可以设置一个默认值或者系统用户ID
      userId = 'system';    
    }

    // 获取 entityId 的逻辑，增加更多的获取途径
    let entityId;
    if (action.payload?.entityId) {
      entityId = action.payload.entityId;
    } else if (action.payload?.id) {
      entityId = action.payload.id;
    } else if (action.payload?._id) {
      entityId = action.payload._id;
    } else if (action.entityId) {
      entityId = action.entityId;
    } else if (action.meta?.arg?.id) {
      entityId = action.meta.arg.id;
    } else if (action.meta?.arg?._id) {
      entityId = action.meta.arg._id;
    } else if (action.payload?.data?.id) {
      entityId = action.payload.data.id;
    } else if (action.meta?.arg?.sectionId) {
      entityId = action.meta.arg.sectionId;
    }

    // 如果仍然没有获取到 entityId，则记录警告
    if (!entityId) {
      console.warn('无法获取 entityId，action:', action.type, 'payload:', action.payload);
      // 可以设置一个默认值或者系统用户ID
      entityId = '00';    
    }

    // 获取entityType - 优先使用payload中的自定义entityType，其次使用action类型
    let entityType = action.payload?.entityType || action.type.split('/')[0];

    // 判断是否有明确设置new_values为null的情况
    const newValues = action.payload?.new_values === null 
      ? null 
      : {
          ...action.payload,
          entityId: undefined,  // 从newValues中移除
          entityType: undefined,  // 从newValues中移除
          old_values: undefined,  // 确保newValues中不包含old_values
          new_values: undefined   // 确保newValues中不包含new_values
        };

    // 由于所有 slice 现在都遵循统一格式，我们可以直接构建日志数据
    const logData = {
      userId,
      actionType: action.type.split('/')[1],
      entityType: entityType,
      entityId: entityId,
      newValues: newValues,
      oldValues: action.payload?.old_values || action.meta?.arg?.old_values || null,
      timestamp: new Date().toISOString()
    }

    // 异步记录日志
    logAction(logData).catch(error => {
      console.error('Failed to log action:', error)
    })
  }
  
  return result
}
