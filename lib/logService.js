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
    // 验证 userId 是否为有效的 UUID 格式
    if (userId === 'system') {
      // 替换为有效的UUID格式
      userId = '00000000-0000-0000-0000-000000000000';
    }
    
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

    // 确保 entityId 不会导致类型错误
    if (typeof entityId !== 'string') {
      entityId = String(entityId);
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

    try {
      // 异步插入日志，不等待结果
      const { error } = await supabase
        .from('action_log')
        .insert([logData]);
        
      if (error) {
        console.error('Error inserting log:', error);
      }
    } catch (insertError) {
      console.error('Failed to log action:', insertError);
    }

    return true;
  } catch (error) {
    console.error('Error in logAction:', error);
    return null;
  }
} 