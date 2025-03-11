import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    const userId = params.userId;

    // 1. 获取用户所在的所有团队
    const { data: userTeams, error: teamsError } = await supabase
      .from('user_team')
      .select('team_id')
      .eq('user_id', userId);

    if (teamsError) throw teamsError;

    if (!userTeams || userTeams.length === 0) {
      return NextResponse.json([]);
    }

    const teamIds = userTeams.map(ut => ut.team_id);

    // 2. 获取这些团队所属的项目
    const { data: teams, error: projectsError } = await supabase
      .from('team')
      .select('project_id')
      .in('id', teamIds);

    if (projectsError) throw projectsError;

    if (!teams || teams.length === 0) {
      return NextResponse.json([]);
    }

    const projectIds = [...new Set(teams.map(t => t.project_id))];

    // 3. 获取项目详细信息
    const { data: projects, error: finalError } = await supabase
      .from('project')
      .select('*')
      .in('id', projectIds)
      .order('created_at', { ascending: false });

    if (finalError) throw finalError;

    return NextResponse.json(projects || []);
  } catch (error) {
    console.error('获取用户项目失败:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 