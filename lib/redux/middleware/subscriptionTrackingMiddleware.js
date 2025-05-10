import { trackSubscriptionUsage, getSubscriptionLimit } from '@/lib/subscriptionService';

/**
 * 订阅追踪中间件
 * 负责检查用户行为是否超出订阅限制，以及追踪用户订阅使用情况
 */
export const subscriptionTrackingMiddleware = store => next => async action => {
  // Skip all notification-related actions
  if (action.type.startsWith('notifications/') ||
      action.type.includes('notification') ||
      action.type.includes('Notification')) {
    return next(action);
  }

  // 拦截需要检查限制的 action types
  if (action.type === 'createProject' || 
      action.type === 'inviteMember' ||
      action.type === 'createTeam') {
    
    // 确定操作类型和用户ID
    let limitActionType;
    let userId;
    
    if (action.type === 'createProject') {
      limitActionType = 'create_project';
      userId = action.meta?.arg?.created_by;
    } else if (action.type === 'inviteMember') {
      limitActionType = 'invite_member';
      userId = action.meta?.arg?.inviter_id || action.meta?.arg?.user_id;
    } else if (action.type === 'createTeam') {
      limitActionType = 'create_team';
      userId = action.meta?.arg?.created_by;
    }
    
    // 如果无法确定用户ID，从state获取
    if (!userId) {
      const state = store.getState();
      userId = state.auth?.user?.id;
    }
    
    // 如果仍然无法确定用户ID，使用系统默认值
    if (!userId) {
      console.warn(`无法确定用户ID, 跳过订阅限制检查: ${action.type}`);
      userId = 'system';
    }
    
    try {
      // 调用服务函数检查订阅限制
      const limitCheck = await getSubscriptionLimit(userId, limitActionType);
      
      if (!limitCheck.allowed) {
        // 不继续执行原始 action
        console.log('[SubscriptionMiddleware] Blocking original action due to limit exceeded');
        return;
      }
    } catch (error) {
      console.error('检查订阅限制出错:', error);
      // 出错时允许操作继续
    }
  }
  
  // 继续执行原始 action
  const result = next(action);
  
  // Only process fulfilled async actions
  if (action.type.endsWith('/fulfilled')) {
    const actionType = action.type.split('/')[1];
    const entityType = action.type.split('/')[0];
    
    // Skip query operations and notifications
    if ((actionType.startsWith('fetch')) || 
        (actionType.startsWith('get')) ||
        (entityType === 'notifications')) {
      return result;
    }

    // Get userId using the same logic as loggerMiddleware
    let userId;
    const state = store.getState();
    
    if (action.payload?.created_by) {
      userId = action.payload.created_by;
    } else if (action.meta?.arg?.created_by) {
      userId = action.meta.arg.created_by;
    } else if (action.meta?.arg?.user_id) {
      userId = action.meta.arg.user_id;
    } else if (state.auth?.user?.id) {
      userId = state.auth.user.id;
    } else if (action.payload?.edited_by) {
      userId = action.payload.edited_by;
    } else if (action.payload?.userId) {
      userId = action.payload.userId;
    } else if (action.userId) {
      userId = action.userId;
    }

    if (!userId) {
      console.warn('Cannot track subscription usage: Unable to determine userId for action:', action.type);
      userId = 'system';
    }

    // Get entityId
    let entityId = action.payload?.id;
    if (!entityId) {
      entityId = action.entityId || action.payload?.entityId || action.meta?.arg?.id;
    }

    // Track subscription usage based on action type
    const usageData = {
      userId,
      actionType,
      entityType,
      entityId,
      payload: action.payload,
      meta: action.meta
    };

    // Asynchronously track usage without blocking
    trackSubscriptionUsage(usageData).catch(error => {
      console.error('Failed to track subscription usage:', error);
    });
  }
  
  return result;
} 