import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(request) {
  try {
    // 1. 获取 URL 参数
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    // 2. 验证参数
    if (!userId) {
      return Response.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // 3. 创建 Supabase 客户端
    const supabase = createRouteHandlerClient({ cookies });

    // 4. 查询用户的使用统计
    const { data: usage, error } = await supabase
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

    // 5. 处理错误
    if (error) {
      console.error('Database error:', error);
      return Response.json(
        { error: 'Failed to fetch usage statistics' },
        { status: 500 }
      );
    }

    // 6. 返回使用统计数据
    return Response.json({
      current: {
        users: usage.current_users,
        workspaces: usage.current_workspaces,
        aiAgents: usage.current_ai_agents,
        automationFlows: usage.current_automation_flows,
        tasksThisMonth: usage.current_tasks_this_month
      },
      limits: {
        users: usage.max_users,
        workspaces: usage.max_workspaces,
        aiAgents: usage.max_ai_agents,
        automationFlows: usage.max_automation_flows,
        tasksPerMonth: usage.max_tasks_per_month
      }
    });

  } catch (error) {
    console.error('Usage statistics API error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 