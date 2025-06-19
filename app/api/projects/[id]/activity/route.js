import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * GET: 获取项目活动日志
 * @param {Object} request - 请求对象
 * @param {Object} params - 参数对象，包含项目ID
 * @returns {NextResponse} - 返回活动日志数据
 */
export async function GET(request, { params }) {
  try {
    const { id } = params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    // 检查是否提供了用户ID
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // 获取项目团队信息
    const { data: teams, error: teamsError } = await supabase
      .from('team')
      .select('id')
      .eq('project_id', id);

    if (teamsError) {
      console.error('Error fetching teams:', teamsError);
      return NextResponse.json({ error: 'Failed to fetch teams' }, { status: 500 });
    }
    
    const { data: projectActivities, error: projectActivitiesError } = await supabase
      .from('action_log')
      .select(`
        id,
        user_id,
        action_type,
        entity_type,
        entity_id,
        old_values,
        new_values,
        created_at,
        user:user_id (name, avatar_url)
      `)
      .in('entity_id', id)
      .eq('entity_type', 'projects')
      .order('created_at', { ascending: false })
      .limit(20);
    
    if (projectActivitiesError) {
      console.error('Error fetching activities:', projectActivitiesError);
      return NextResponse.json({ error: 'Failed to fetch activities' }, { status: 500 });
    }

    // 如果没有找到团队，返回空数组
    if (!teams || teams.length === 0) {
      return NextResponse.json({ activities: [] });
    }
    
    // 提取团队ID列表
    const teamIds = teams.map(team => team.id);
    
    // 获取与这些团队相关的活动记录
    const { data: activities, error: activitiesError } = await supabase
      .from('action_log')
      .select(`
        id,
        user_id,
        action_type,
        entity_type,
        entity_id,
        old_values,
        new_values,
        created_at,
        user:user_id (name, avatar_url)
      `)
      .in('entity_id', teamIds)
      .eq('entity_type', 'teams')
      .order('created_at', { ascending: false })
      .limit(20);
    
    if (activitiesError) {
      console.error('Error fetching activities:', activitiesError);
      return NextResponse.json({ error: 'Failed to fetch activities' }, { status: 500 });
    }
    
    //fetch team user inv by using team id
    const { data: teamUserInv, error: teamUserInvError } = await supabase
      .from('user_team_invitation')
      .select('id')
      .in('team_id', teamIds)

    if (teamUserInvError) {
      console.error('Error fetching team user inv:', teamUserInvError);
      return NextResponse.json({ error: 'Failed to fetch team user inv' }, { status: 500 });
    }

    // 获取任务活动记录
    const { data: teamUsersActivities, error: teamUsersActivitiesError } = await supabase
      .from('action_log')
      .select(`
        id,
        user_id,
        action_type,
        entity_type,
        entity_id,
        old_values,
        new_values,
        created_at,
        user:user_id (name, avatar_url)
      `)
      .eq('entity_type', 'teamUserInv')
      .in('entity_id', teamUserInv.map(inv => inv.id))
      .order('created_at', { ascending: false })
      .limit(20);
    
    if (teamUsersActivitiesError) {
      console.error('Error fetching team users activities:', teamUsersActivitiesError);
      return NextResponse.json({ error: 'Failed to fetch team users activities' }, { status: 500 });
    }
    
    // 合并团队和任务活动记录
    const allActivities = [...projectActivities, ...teamUsersActivities]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 20);
    
    return NextResponse.json({ activities: allActivities });
  } catch (error) {
    console.error('Error in activity log API:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 