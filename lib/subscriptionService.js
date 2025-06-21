import { supabase } from '@/lib/supabase';

// Map of action types to subscription metrics they affect
const ACTION_TO_METRIC_MAP = {
  // actions
  'create_project': 'current_projects',
  'invite_member': 'current_members',
  'create_team': 'current_teams',
  'create_ai_workflow': 'current_ai_workflow',
  'ai_workflow_runs': 'current_ai_workflow',
  'ai_chat': 'current_ai_chat',
  'ai_task': 'current_ai_task',
  'storage_upload': 'current_storage',
  'storage_delete': 'current_storage' // For decrementing storage usage
};

// Increment or decrement values based on action type
export const DELTA_MAP = {
  // Actions that increment metrics
  'create_project': 1,
  'invite_member': 1,
  'create_team': 1,
  'create_ai_workflow': 1,
  'ai_workflow_runs': 1,
  'ai_chat': 1,
  'ai_task': 1,
  // For storage, deltaValue should be provided in GB (positive for upload, negative for delete)
  'storage_upload': null, // Must be provided in usageData.deltaValue (GB)
  'storage_delete': null  // Must be provided in usageData.deltaValue (GB, negative value)
};

/**
 * Track subscription usage based on user actions, including AI and storage (GB)
 * @param {Object} usageData - Data about the action that affects subscription usage
 * @param {string} usageData.userId - The user's ID
 * @param {string} usageData.actionType - The action type (e.g., 'create_project', 'storage_upload')
 * @param {string} usageData.entityType - The entity type (e.g., 'projects', 'storage')
 * @param {number} [usageData.deltaValue] - For storage actions, the amount in GB to increment/decrement
 * @returns {Promise<Object|null>} - Result of the tracking operation
 */
export const trackSubscriptionUsage = async (usageData) => {
  try {
    const { userId, actionType, entityType, deltaValue: usageDeltaValue } = usageData;
    
    // Infer operation from actionType and entityType
    let operation = null;
    
    // Map Redux/entity actions to internal operation names
    if (entityType === 'projects' && actionType === 'createProject') {
      operation = 'create_project';
    } else if (entityType === 'teamMembers' && actionType === 'inviteMember') {
      operation = 'invite_member';
    } else if (entityType === 'teams' && actionType === 'createTeam') {
      operation = 'create_team';
    } else if (entityType === 'aiWorkflow' && actionType === 'createAIWorkflow') {
      operation = 'create_ai_workflow';
    } else if (entityType === 'aiChat' && actionType === 'aiChat') {
      operation = 'ai_chat';
    } else if (entityType === 'aiTask' && actionType === 'aiTask') {
      operation = 'ai_task';
    } else if (entityType === 'storage' && actionType === 'storage_upload') {
      operation = 'storage_upload';
    } else if (entityType === 'storage' && actionType === 'storage_delete') {
      operation = 'storage_delete';
    } else {
      // Directly use actionType if it matches
      operation = actionType;
    }
    
    // If operation is not recognized, return
    if (!operation || !ACTION_TO_METRIC_MAP[operation]) {
      return null;
    }
    
    // Get the metric and delta value
    const metricToUpdate = ACTION_TO_METRIC_MAP[operation];
    let deltaValue = typeof usageDeltaValue === 'number' ? usageDeltaValue : DELTA_MAP[operation];
    if (typeof deltaValue !== 'number' || deltaValue === 0) {
      return null;
    }
    
    // Fetch user's current subscription plan
    const { data: subscriptionData, error: subscriptionError } = await supabase
      .from('user_subscription_plan')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'ACTIVE')
      .order('end_date', { ascending: false })
      .limit(1)
      .single();
    
    // If no active subscription, update free user usage
    if (subscriptionError && subscriptionError.code === 'PGSQL_NO_ROWS_RETURNED') {
      return await updateFreeUserUsage(userId, operation, deltaValue);
    }
    
    if (subscriptionError || !subscriptionData) {
      console.error('Error fetching subscription data:', subscriptionError);
      return null;
    }
    
    // Calculate new value (ensure not below 0)
    const currentValue = subscriptionData[metricToUpdate] || 0;
    let newValue = currentValue + deltaValue;
    if (newValue < 0) newValue = 0;

    // Debug log for subscription usage update
    console.log('Subscription usage update:', {
      userId,
      operation,
      metricToUpdate,
      currentValue,
      deltaValue,
      newValue
    });
    
    // Update subscription usage
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
    
    // Fetch plan details to check limits
    const { data: planData, error: planError } = await supabase
      .from('subscription_plan')
      .select('*')
      .eq('id', subscriptionData.plan_id)
      .single();
    
    if (planError || !planData) {
      console.error('Error fetching plan data:', planError);
      return { success: true, newValue };
    }
    
    // Map metric to limit field
    let limitField;
    if (metricToUpdate === 'current_projects') {
      limitField = 'max_projects';
    } else if (metricToUpdate === 'current_members') {
      limitField = 'max_members';
    } else if (metricToUpdate === 'current_teams') {
      limitField = 'max_teams';
    } else if (metricToUpdate === 'current_ai_workflow') {
      limitField = 'max_ai_workflow';
    } else if (metricToUpdate === 'current_ai_chat') {
      limitField = 'max_ai_chat';
    } else if (metricToUpdate === 'current_ai_task') {
      limitField = 'max_ai_task';
    } else if (metricToUpdate === 'current_storage') {
      limitField = 'max_storage';
    } else {
      // Default mapping
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
 * Check if a user can perform an action based on their subscription limits, including AI and storage (GB)
 * @param {string} userId - The user's ID
 * @param {string} actionType - The type of action being performed
 * @param {number} [deltaValue] - For storage actions, the amount in GB to increment/decrement
 * @returns {Promise<{allowed: boolean, reason: string|null}>} - Whether the action is allowed and why not if applicable
 */
export const getSubscriptionLimit = async (userId, actionType, deltaValue) => {
  try {
    // Fetch user's subscription plan
    const { data: subscriptionData, error: subscriptionError } = await supabase
      .from('user_subscription_plan')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'ACTIVE')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (subscriptionError) {
      // If no active plan is found, it's a critical issue, but we can treat it as 'not allowed'
      if (subscriptionError.code === 'PGRST116') { // "single()" returns more than one row
          console.warn(`Warning: Multiple active subscriptions found for user ${userId}. Using the most recent one.`);
      } else {
        console.error('Error fetching active subscription data:', subscriptionError);
        return { allowed: false, reason: 'Could not find an active subscription plan.' };
      }
    }
    // Fetch plan details
    const { data: planData, error: planError } = await supabase
      .from('subscription_plan')
      .select('*')
      .eq('id', subscriptionData.plan_id)
      .single();
    if (planError || !planData) {
      console.error('Error fetching plan data:', planError);
      return { allowed: false, reason: 'Plan data not found' };
    }
    // Map actionType to metric
    if (!ACTION_TO_METRIC_MAP[actionType]) {
      return { allowed: true, reason: null };
    }
    const metricToCheck = ACTION_TO_METRIC_MAP[actionType];
    let actionDelta = DELTA_MAP[actionType];
    // For storage actions, deltaValue must be provided (in GB)
    if ((actionType === 'storage_upload' || actionType === 'storage_delete') && typeof deltaValue === 'number') {
      actionDelta = deltaValue;
    }
    if (typeof actionDelta !== 'number' || actionDelta <= 0) {
      return { allowed: true, reason: null };
    }
    // Get current usage and limit
    const currentValue = subscriptionData[metricToCheck] || 0;
    let limitField;
    if (metricToCheck === 'current_projects') {
      limitField = 'max_projects';
    } else if (metricToCheck === 'current_members') {
      limitField = 'max_members';
    } else if (metricToCheck === 'current_teams') {
      limitField = 'max_teams';
    } else if (metricToCheck === 'current_ai_workflow') {
      limitField = 'max_ai_workflow';
    } else if (metricToCheck === 'current_ai_chat') {
      limitField = 'max_ai_chat';
    } else if (metricToCheck === 'current_ai_task') {
      limitField = 'max_ai_task';
    } else if (metricToCheck === 'current_storage') {
      limitField = 'max_storage';
    } else {
      limitField = metricToCheck.replace('current_', 'max_');
    }
    const limit = planData[limitField];
    
    if (limit && currentValue + actionDelta > limit) {
      const limitName = metricToCheck
        .replace('current_', '')
        .replace('_', ' ')
        .replace(/\b\w/g, l => l.toUpperCase());
      return {
        allowed: false,
        reason: `You have reached your ${limitName} limit (${limit}). Please upgrade your plan to continue.`,
        currentValue,
        limit
      };
    }
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
 * Get a user's current subscription usage and limits, including AI and storage (GB)
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
      .eq('status', 'ACTIVE')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    if (subscriptionError) {
        if (subscriptionError.code === 'PGRST116') {
            console.warn(`Warning: Multiple active subscriptions found for user ${userId}. Using the most recent one.`);
        } else {
            console.error('Error fetching active subscription data for usage:', subscriptionError);
            return null; // No active subscription found or other error
        }
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
        teams: {
          current: subscriptionData.current_teams || 0,
          limit: planData.max_teams
        },
        aiAgents: {
          current: subscriptionData.current_ai_agents || 0,
          limit: planData.max_ai_agents || 0
        },
        aiWorkflows: {
          current: subscriptionData.current_ai_workflow || 0,
          limit: planData.max_ai_workflow || 0
        },
        aiChat: {
          current: subscriptionData.current_ai_chat || 0,
          limit: planData.max_ai_chat || 0
        },
        aiTask: {
          current: subscriptionData.current_ai_task || 0,
          limit: planData.max_ai_task || 0
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
          current: subscriptionData.current_storage || 0, // in GB
          limit: planData.max_storage
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