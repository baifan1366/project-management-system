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
    const { data, error } = await supabase
      .from('action_log')
      .insert([{
        user_id: userId,
        action_type: actionType,
        entity_type: entityType,
        entity_id: entityId,
        old_values: oldValues,
        new_values: newValues,
        ip_address: window.clientIP, // 需要另外获取
        user_agent: navigator.userAgent
      }])
      .select()

    if (error) throw error
    return data[0]
  } catch (error) {
    console.error('Error logging action:', error)
    return null
  }
} 