import { supabase } from '@/lib/supabase'

export const logAction = async ({
  userId,
  actionType,
  entityType,
  entityId,
  oldValues = null,
  newValues = null,
}) => {
  try {
    // 如果缺少必要参数，直接返回
    if (!userId || !actionType || !entityType || !entityId) {
      console.warn('Missing required parameters for logging:', {
        userId,
        actionType,
        entityType,
        entityId
      });
      return null;
    }

    // 准备日志数据
    const logData = {
      user_id: userId,
      action_type: actionType,
      entity_type: entityType,
      entity_id: entityId,
      old_values: oldValues,
      new_values: newValues,
      user_agent: typeof window !== 'undefined' ? window.navigator.userAgent : null
    };

    // 异步插入日志，不等待结果
    supabase
      .from('action_log')
      .insert([logData])
      .then(({ error }) => {
        if (error) {
          console.error('Error inserting log:', error);
        }
      })
      .catch(error => {
        console.error('Failed to log action:', error);
      });

    return true;
  } catch (error) {
    console.error('Error in logAction:', error);
    return null;
  }
} 