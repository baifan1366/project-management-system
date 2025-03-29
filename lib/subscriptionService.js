import { supabase } from '@/lib/supabase';

// Map of action types to subscription metrics they affect
const ACTION_TO_METRIC_MAP = {
  // User-related actions
  'addTeamMember': 'current_users',
  'removeTeamMember': 'current_users',
  
  // Workspace-related actions
  'createTeam': 'current_workspaces',
  'deleteTeam': 'current_workspaces',
  
  // AI-related actions
  'createAIAgent': 'current_ai_agents',
  'deleteAIAgent': 'current_ai_agents',
  
  // Automation-related actions
  'createAutomation': 'current_automation_flows',
  'deleteAutomation': 'current_automation_flows',
  
  // Task-related actions
  'createTask': 'current_tasks_this_month',
  // Add more mappings as needed
};

// Increment or decrement values based on action type
const DELTA_MAP = {
  // Actions that increment metrics
  'addTeamMember': 1,
  'createTeam': 1,
  'createAIAgent': 1,
  'createAutomation': 1,
  'createTask': 1,
  
  // Actions that decrement metrics
  'removeTeamMember': -1,
  'deleteTeam': -1,
  'deleteAIAgent': -1,
  'deleteAutomation': -1,
  // Tasks don't decrement the monthly count
};

/**
 * Track subscription usage based on user actions
 * @param {Object} usageData - Data about the action that affects subscription usage
 * @returns {Promise<Object|null>} - Result of the tracking operation
 */
export const trackSubscriptionUsage = async (usageData) => {
  try {
    const { userId, actionType, entityType, payload } = usageData;
    
    // Skip if we don't have a mapping for this action
    if (!ACTION_TO_METRIC_MAP[actionType]) {
      return null;
    }
    
    // Get the metric to update and the delta value
    const metricToUpdate = ACTION_TO_METRIC_MAP[actionType];
    const deltaValue = DELTA_MAP[actionType] || 0;
    
    if (!metricToUpdate || deltaValue === 0) {
      return null;
    }
    
    // Get the user's current subscription plan
    const { data: subscriptionData, error: subscriptionError } = await supabase
      .from('user_subscription_plan')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'ACTIVE')
      .order('end_date', { ascending: false })
      .limit(1)
      .single();
    
    if (subscriptionError || !subscriptionData) {
      console.error('Error fetching subscription data:', subscriptionError);
      return null;
    }
    
    // Calculate the new value
    const currentValue = subscriptionData[metricToUpdate] || 0;
    const newValue = Math.max(0, currentValue + deltaValue); // Ensure we don't go below 0
    
    // Update the subscription usage
    const updateData = {};
    updateData[metricToUpdate] = newValue;
    
    const { data, error } = await supabase
      .from('user_subscription_plan')
      .update(updateData)
      .eq('id', subscriptionData.id);
    
    if (error) {
      console.error('Error updating subscription usage:', error);
      return null;
    }
    
    // Check if the new value exceeds the plan's limit
    const { data: planData, error: planError } = await supabase
      .from('subscription_plan')
      .select('*')
      .eq('id', subscriptionData.plan_id)
      .single();
    
    if (planError || !planData) {
      console.error('Error fetching plan data:', planError);
      return null;
    }
    
    // Get the corresponding limit from the plan
    const limitField = metricToUpdate.replace('current_', 'max_');
    const limit = planData[limitField];
    
    // Log if we're approaching or exceeding limits
    if (limit && newValue >= limit * 0.8) {
      const warningLevel = newValue >= limit ? 'EXCEEDED' : 'APPROACHING';
      
      // Log the usage warning
      await supabase
        .from('subscription_usage_log')
        .insert([{
          user_id: userId,
          plan_id: subscriptionData.plan_id,
          metric: metricToUpdate,
          current_value: newValue,
          limit_value: limit,
          warning_level: warningLevel,
          action_type: actionType,
          entity_type: entityType
        }]);
      
      // You could also trigger notifications here
    }
    
    return { success: true, newValue, limit };
  } catch (error) {
    console.error('Error in trackSubscriptionUsage:', error);
    return null;
  }
};

/**
 * Check if a user can perform an action based on their subscription limits
 * @param {string} userId - The user's ID
 * @param {string} actionType - The type of action being performed
 * @returns {Promise<{allowed: boolean, reason: string|null}>} - Whether the action is allowed and why not if applicable
 */
export const checkSubscriptionLimit = async (userId, actionType) => {
  try {
    // Skip check if we don't have a mapping for this action
    if (!ACTION_TO_METRIC_MAP[actionType]) {
      return { allowed: true, reason: null };
    }
    
    const metricToCheck = ACTION_TO_METRIC_MAP[actionType];
    const deltaValue = DELTA_MAP[actionType] || 0;
    
    // Only check for actions that would increase usage
    if (deltaValue <= 0) {
      return { allowed: true, reason: null };
    }
    
    // Get the user's current subscription plan
    const { data: subscriptionData, error: subscriptionError } = await supabase
      .from('user_subscription_plan')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'ACTIVE')
      .order('end_date', { ascending: false })
      .limit(1)
      .single();
    
    if (subscriptionError || !subscriptionData) {
      console.error('Error fetching subscription data:', subscriptionError);
      return { allowed: false, reason: 'Subscription data not found' };
    }
    
    // Get the plan details
    const { data: planData, error: planError } = await supabase
      .from('subscription_plan')
      .select('*')
      .eq('id', subscriptionData.plan_id)
      .single();
    
    if (planError || !planData) {
      console.error('Error fetching plan data:', planError);
      return { allowed: false, reason: 'Plan data not found' };
    }
    
    // Get the current usage and limit
    const currentValue = subscriptionData[metricToCheck] || 0;
    const limitField = metricToCheck.replace('current_', 'max_');
    const limit = planData[limitField];
    
    // Check if the action would exceed the limit
    if (limit && currentValue + deltaValue > limit) {
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
    console.error('Error in checkSubscriptionLimit:', error);
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
      .eq('status', 'ACTIVE')
      .order('end_date', { ascending: false })
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
          current: subscriptionData.current_workspaces || 0,
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