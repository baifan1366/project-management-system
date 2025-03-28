import { trackSubscriptionUsage } from '@/lib/subscriptionService';

export const subscriptionTrackingMiddleware = store => next => action => {
  const result = next(action);
  
  // Only process fulfilled async actions
  if (action.type.endsWith('/fulfilled')) {
    const actionType = action.type.split('/')[1];
    const entityType = action.type.split('/')[0];
    
    // Skip query operations
    if ((actionType.startsWith('fetch')) || 
        (actionType.startsWith('get'))) {
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