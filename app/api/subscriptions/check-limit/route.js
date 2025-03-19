import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(request) {
  try {
    // 1. 获取请求体数据
    const { userId, limitType } = await request.json();

    // 2. 验证参数
    if (!userId || !limitType) {
      return Response.json(
        { error: 'User ID and limit type are required' },
        { status: 400 }
      );
    }

    // 3. 创建 Supabase 客户端
    const supabase = createRouteHandlerClient({ cookies });

    // 4. 获取用户的订阅使用情况
    const { data: subscription, error } = await supabase
      .from('user_subscription_plan')
      .select(`
        current_users,
        current_workspaces,
        current_ai_agents,
        current_automation_flows,
        current_tasks_this_month,
        max_users,
        max_workspaces,
        max_ai_agents,
        max_automation_flows,
        max_tasks_per_month
      `)
      .eq('user_id', userId)
      .eq('status', 'ACTIVE')
      .single();

    // 5. 处理数据库错误
    if (error) {
      console.error('Database error:', error);
      return Response.json(
        { error: 'Failed to fetch subscription data' },
        { status: 500 }
      );
    }

    // 6. 检查具体限制
    let isWithinLimit = false;
    let currentUsage = 0;
    let maxLimit = 0;

    // 根据 limitType 检查具体限制
    switch (limitType) {
      case 'users':
        currentUsage = subscription.current_users;
        maxLimit = subscription.max_users;
        break;
      case 'workspaces':
        currentUsage = subscription.current_workspaces;
        maxLimit = subscription.max_workspaces;
        break;
      case 'ai_agents':
        currentUsage = subscription.current_ai_agents;
        maxLimit = subscription.max_ai_agents;
        break;
      case 'automation_flows':
        currentUsage = subscription.current_automation_flows;
        maxLimit = subscription.max_automation_flows;
        break;
      case 'tasks':
        currentUsage = subscription.current_tasks_this_month;
        maxLimit = subscription.max_tasks_per_month;
        break;
      default:
        return Response.json(
          { error: 'Invalid limit type' },
          { status: 400 }
        );
    }

    isWithinLimit = currentUsage < maxLimit;

    // 7. 返回检查结果
    return Response.json({
      allowed: isWithinLimit,
      currentUsage,
      maxLimit,
      remaining: maxLimit - currentUsage
    });

  } catch (error) {
    console.error('Check limit API error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 