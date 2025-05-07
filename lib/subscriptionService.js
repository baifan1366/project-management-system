import { supabase } from '@/lib/supabase';

// Map of action types to subscription metrics they affect
const ACTION_TO_METRIC_MAP = {
  // actions
  'create_project': 'current_projects',
  'invite_member': 'current_members',
  'create_team': 'current_teams'
};

// Increment or decrement values based on action type
export const DELTA_MAP = {
  // Actions that increment metrics
  'create_project': 1,
  'invite_member': 1,
  'create_team': 1
};

/**
 * Track subscription usage based on user actions
 * @param {Object} usageData - Data about the action that affects subscription usage
 * @returns {Promise<Object|null>} - Result of the tracking operation
 */
export const trackSubscriptionUsage = async (usageData) => {
  try {
    const { userId, actionType, entityType } = usageData;
    
    // 从 action 类型和实体类型推断操作
    let operation = null;
    
    // 基于 Redux action 推断操作类型
    if (entityType === 'projects' && actionType === 'createProject') {
      operation = 'create_project';
    } else if (entityType === 'teamMembers' && actionType === 'inviteMember') {
      operation = 'invite_member';
    } else if (entityType === 'teams' && actionType === 'createTeam') {
      operation = 'create_team';
    }
    
    // 如果无法识别操作类型，直接返回
    if (!operation || !ACTION_TO_METRIC_MAP[operation]) {
      console.log(`Operation not mapped: ${entityType}/${actionType}`);
      return null;
    }
    
    // 获取要更新的指标和增量值
    const metricToUpdate = ACTION_TO_METRIC_MAP[operation];
    const deltaValue = DELTA_MAP[operation] || 0;
    
    if (!metricToUpdate || deltaValue === 0) {
      return null;
    }
    
    console.log(`Tracking usage for ${userId}: ${operation} affects ${metricToUpdate} by ${deltaValue}`);
    
    // 获取用户当前订阅计划
    const { data: subscriptionData, error: subscriptionError } = await supabase
      .from('user_subscription_plan')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'ACTIVE')
      .order('end_date', { ascending: false })
      .limit(1)
      .single();
    
    // 如果没有找到有效订阅，尝试更新免费用户使用情况
    if (subscriptionError && subscriptionError.code === 'PGSQL_NO_ROWS_RETURNED') {
      return await updateFreeUserUsage(userId, operation, deltaValue);
    }
    
    if (subscriptionError || !subscriptionData) {
      console.error('Error fetching subscription data:', subscriptionError);
      return null;
    }
    
    // 计算新值
    const currentValue = subscriptionData[metricToUpdate] || 0;
    const newValue = Math.max(0, currentValue + deltaValue); // 确保不低于0
    
    // 更新订阅使用情况
    const updateData = {
      [metricToUpdate]: newValue,
      updated_at: new Date().toISOString()
    };
    
    const { data, error } = await supabase
      .from('user_subscription_plan')
      .update(updateData)
      .eq('id', subscriptionData.id);
    
    if (error) {
      console.error('Error updating subscription usage:', error);
      return null;
    }
    
    // 获取计划详情以检查限制
    const { data: planData, error: planError } = await supabase
      .from('subscription_plan')
      .select('*')
      .eq('id', subscriptionData.plan_id)
      .single();
    
    if (planError || !planData) {
      console.error('Error fetching plan data:', planError);
      return { success: true, newValue };
    }
    
    // 获取对应的限制字段
    let limitField;
    
    if (metricToUpdate === 'current_projects') {
      limitField = 'max_projects';
    } else if (metricToUpdate === 'current_members') {
      limitField = 'max_members';
    } else if (metricToUpdate === 'current_teams') {
      limitField = 'max_teams';
    } else {
      // 默认映射规则
      limitField = metricToUpdate.replace('current_', 'max_');
    }
    
    const limit = planData[limitField];
  
    return { success: true, newValue, limit };
  } catch (error) {
    console.error('Error in trackSubscriptionUsage:', error);
    return null;
  }
};

/**
 * 更新免费用户的使用情况
 * @private
 */
async function updateFreeUserUsage(userId, operation, deltaValue) {
  try {
    // 确定要更新的字段
    let field;
    
    switch (operation) {
      case 'create_project':
        field = 'projects';
        break;
      case 'invite_member':
        field = 'members';
        break;
      case 'create_team':
        field = 'teams';
        break;
      default:
        return null;
    }
    
    // 获取用户当前使用情况
    const { data: usageData, error: usageError } = await supabase
      .from('user_usage')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (usageError && usageError.code !== 'PGSQL_NO_ROWS_RETURNED') {
      console.error('Error fetching usage data:', usageError);
      return null;
    }
    
    // 如果找到现有记录，更新它
    if (usageData) {
      const currentValue = usageData[field] || 0;
      const newValue = Math.max(0, currentValue + deltaValue);
      
      const { error } = await supabase
        .from('user_usage')
        .update({ 
          [field]: newValue,
          updated_at: new Date().toISOString()
        })
        .eq('id', usageData.id);
      
      if (error) {
        console.error('Error updating usage:', error);
        return null;
      }
      
      return { success: true, newValue };
    } else {
      // 创建新的使用记录
      const { data, error } = await supabase
        .from('user_usage')
        .insert([{ 
          user_id: userId,
          [field]: Math.max(0, deltaValue),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select();
      
      if (error) {
        console.error('Error creating usage record:', error);
        return null;
      }
      
      return { success: true, newValue: deltaValue };
    }
  } catch (error) {
    console.error('Error in updateFreeUserUsage:', error);
    return null;
  }
}

/**
 * Check if a user can perform an action based on their subscription limits
 * @param {string} userId - The user's ID
 * @param {string} actionType - The type of action being performed
 * @returns {Promise<{allowed: boolean, reason: string|null}>} - Whether the action is allowed and why not if applicable
 */
export const getSubscriptionLimit = async (userId, actionType) => {
  try {
    console.log('getSubscriptionLimit called with:', { userId, actionType });
    
    // 先获取用户的订阅计划数据
    console.log('Fetching subscription data for user:', userId);
    const { data: subscriptionData, error: subscriptionError } = await supabase
      .from('user_subscription_plan')
      .select('*')
      .eq('user_id', userId)
      .limit(1)
      .single();
    
    console.log('Subscription data result:', { 
      subscriptionData: JSON.stringify(subscriptionData, null, 2), 
      error: subscriptionError 
    });
    
    if (subscriptionError || !subscriptionData) {
      console.error('Error fetching subscription data:', subscriptionError);
      return { allowed: false, reason: 'Subscription data not found' };
    }
    
    // 获取计划详情
    console.log('Fetching plan details for plan_id:', subscriptionData.plan_id);
    const { data: planData, error: planError } = await supabase
      .from('subscription_plan')
      .select('*')
      .eq('id', subscriptionData.plan_id)
      .single();
    
    console.log('Plan data result:', { 
      planData: JSON.stringify(planData, null, 2), 
      error: planError 
    });
    
    if (planError || !planData) {
      console.error('Error fetching plan data:', planError);
      return { allowed: false, reason: 'Plan data not found' };
    }
    
    // 然后再检查操作类型映射
    if (!ACTION_TO_METRIC_MAP[actionType]) {
      console.log('No mapping found for action type:', actionType);
      return { allowed: true, reason: null };
    }
    
    const metricToCheck = ACTION_TO_METRIC_MAP[actionType];
    const deltaValue = DELTA_MAP[actionType] || 0;
    
    console.log('Checking metric and delta:', { metricToCheck, deltaValue });
    
    // 只检查会增加使用量的操作
    if (deltaValue <= 0) {
      console.log('Action does not increase usage, skipping check');
      return { allowed: true, reason: null };
    }
    
    // Get the current usage and limit
    const currentValue = subscriptionData[metricToCheck] || 0;

    // 根据指标类型获取对应的限制字段名
    let limitField;
    
    if (metricToCheck === 'current_projects') {
      limitField = 'max_projects';
    } else {
      // 默认映射规则
      limitField = metricToCheck.replace('current_', 'max_');
    }

    const limit = planData[limitField];
    
    console.log('Usage check:', { 
      metricToCheck, 
      currentValue, 
      limitField, 
      limit, 
      wouldBeAfterAction: currentValue + deltaValue 
    });
    
    // Check if the action would exceed the limit
    if (limit && currentValue + deltaValue > limit) {
      const limitName = metricToCheck
        .replace('current_', '')
        .replace('_', ' ')
        .replace(/\b\w/g, l => l.toUpperCase());
      
      console.log('Limit would be exceeded:', { 
        limitName, 
        currentValue, 
        limit, 
        delta: deltaValue 
      });
      
      return { 
        allowed: false, 
        reason: `You have reached your ${limitName} limit (${limit}). Please upgrade your plan to continue.`,
        currentValue,
        limit
      };
    }
    
    console.log('Action is allowed within subscription limits');
    return { allowed: true, reason: null };
  } catch (error) {
    console.error('Error in getSubscriptionLimit:', error);
    return { allowed: false, reason: 'An error occurred while checking subscription limits' };
  }
};

/**
 * Reset monthly counters for all users (to be called via a cron job)
 */
export const resetMonthlyCounters = async () => {
  try {
    // Reset only the monthly counters
    const { data, error } = await supabase
      .from('user_subscription_plan')
      .update({ current_tasks_this_month: 0 })
      .eq('status', 'ACTIVE');
    
    if (error) {
      console.error('Error resetting monthly counters:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error in resetMonthlyCounters:', error);
    return false;
  }
};

/**
 * Get a user's current subscription usage and limits
 * @param {string} userId - The user's ID
 * @returns {Promise<Object|null>} - The user's subscription usage and limits
 */
export const getSubscriptionUsage = async (userId) => {
  try {
    // Get the user's current subscription plan
    const { data: subscriptionData, error: subscriptionError } = await supabase
      .from('user_subscription_plan')
      .select('*')
      .eq('user_id', userId)
      .limit(1)
      .single();
    
    if (subscriptionError || !subscriptionData) {
      console.error('Error fetching subscription data:', subscriptionError);
      return null;
    }
    
    // Get the plan details
    const { data: planData, error: planError } = await supabase
      .from('subscription_plan')
      .select('*')
      .eq('id', subscriptionData.plan_id)
      .single();
    
    if (planError || !planData) {
      console.error('Error fetching plan data:', planError);
      return null;
    }
    
    // Combine the data to show usage vs limits
    return {
      planName: planData.name,
      planType: planData.type,
      usageData: {
        users: {
          current: subscriptionData.current_users || 0,
          limit: planData.max_members
        },
        workspaces: {
          current: subscriptionData.current_projects || 0,
          limit: planData.max_projects
        },
        aiAgents: {
          current: subscriptionData.current_ai_agents || 0,
          limit: planData.max_ai_agents || 0
        },
        automationFlows: {
          current: subscriptionData.current_automation_flows || 0,
          limit: planData.max_automation_flows || 0
        },
        tasksThisMonth: {
          current: subscriptionData.current_tasks_this_month || 0,
          limit: planData.max_tasks_per_month || 0
        },
        storage: {
          current: 0, // This would need to be calculated separately
          limit: planData.storage_limit
        }
      },
      subscription: {
        id: subscriptionData.id,
        startDate: subscriptionData.start_date,
        endDate: subscriptionData.end_date,
        status: subscriptionData.status
      }
    };
  } catch (error) {
    console.error('Error in getSubscriptionUsage:', error);
    return null;
  }
}; 