import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

const VALID_ROLES = ['CAN_EDIT', 'CAN_CHECK', 'CAN_VIEW', 'OWNER'];

// GET /api/teams/teamUsers - Get all team users
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const teamId = searchParams.get('id')
    const userId = searchParams.get('userId')
    const projectId = searchParams.get('projectId')
    
    // 如果提供了 userId 和 projectId，获取用户在特定项目中加入的团队
    if (userId && projectId) {      
      const { data, error } = await supabase
        .from('team')
        .select(`
          *,
          user_team!inner(user_id)
        `)
        .eq('project_id', projectId)
        .eq('user_team.user_id', userId)
        .eq('archive', false)
        .order('order_index', { ascending: true });

      if (error) {
        console.error('API Route: 获取用户团队失败:', error);
        return NextResponse.json(
          { error: error.message },
          { status: 500 }
        );
      }

      // 处理返回的数据，移除 user_team 字段
      const teams = data?.map(team => {
        const { user_team, ...rest } = team;
        return rest;
      }) || [];

      return NextResponse.json(teams);
    }

    // 原有的按团队 ID 获取用户的逻辑
    // 构建基础查询
    let query = supabase
      .from('user_team')  // 确保表名正确
      .select(`
        id,
        team_id,
        user_id,
        role,
        created_at,
        user:user_id (
          id,
          email,
          name,
          avatar_url
        )
      `);

    // 如果提供了teamId，则按团队筛选
    if (teamId) {
      const parsedTeamId = parseInt(teamId);
      if (isNaN(parsedTeamId)) {
        return NextResponse.json(
          { error: '无效的团队ID' },
          { status: 400 }
        );
      }
      query = query.eq('team_id', parsedTeamId);
    }

    // 执行查询
    const { data, error } = await query;

    if (error) {
      console.error('API Route: 数据库查询错误:', error);
      return NextResponse.json(
        { error: error.message || '获取团队用户失败' },
        { status: 500 }
      );
    }

    // 验证返回的数据
    if (!data) {
      return NextResponse.json([]);
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('API Route: 获取团队用户时出错:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch team users' },
      { status: 500 }
    );
  }
}

// POST /api/teams/teamUsers - Create a new teamUser
export async function POST(request) {
  try {
    const body = await request.json();
    const { team_id, user_id, role, created_by } = body;

    // 验证必需的字段
    if (!team_id || !user_id || !role) {
      console.error('API Route: 缺少必需字段:', { team_id, user_id, role });
      return NextResponse.json(
        { error: '缺少必需字段: team_id, user_id, 和 role 是必需的' },
        { status: 400 }
      );
    }

    // 确保 team_id 是数字类型
    const teamId = Number(team_id);
    if (isNaN(teamId)) {
      console.error('API Route: 无效的 team_id:', team_id);
      return NextResponse.json(
        { error: '无效的 team_id: 必须是数字' },
        { status: 400 }
      );
    }

    // 验证角色值
    const normalizedRole = role.toUpperCase();
    if (!VALID_ROLES.includes(normalizedRole)) {
      console.error('API Route: 无效的角色:', role);
      return NextResponse.json(
        { error: `无效的角色。必须是以下之一: ${VALID_ROLES.join(', ')}` },
        { status: 400 }
      );
    }

    // 先检查团队是否存在
    const { data: teamExists, error: teamCheckError } = await supabase
      .from('team')
      .select('id')
      .eq('id', teamId)
      .single();

    if (teamCheckError || !teamExists) {
      console.error('API Route: 团队不存在:', teamId);
      return NextResponse.json(
        { error: '团队不存在' },
        { status: 404 }
      );
    }

    // 创建新的团队用户关系
    const { data: newTeamUser, error: insertError } = await supabase
      .from('user_team')
      .insert([
        {
          team_id: teamId,
          user_id,
          role: normalizedRole,
          created_by: created_by
        }
      ])
      .select(`
        id,
        team_id,
        user_id,
        role,
        created_at,
        user:user_id (
          id,
          email,
          name
        ),
        created_by
      `)
      .single();

    if (insertError) {
      console.error('API Route: 创建团队用户失败:', insertError);
      return NextResponse.json(
        { error: '创建团队用户失败: ' + insertError.message },
        { status: 500 }
      );
    }

    if (!newTeamUser) {
      console.error('API Route: 创建成功但没有返回数据');
      return NextResponse.json(
        { error: '创建成功但没有返回数据' },
        { status: 500 }
      );
    }

    return NextResponse.json(newTeamUser);

  } catch (error) {
    console.error('API Route: 创建团队用户时发生意外错误:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url)
    const teamId = searchParams.get('teamId')

    const { error } = await supabase
      .from('user_team')
      .delete()
      .eq('team_id', teamId)

    if (error) {
      console.error('Database error:', error)
      throw error
    }

    return NextResponse.json(
      { message: 'Team user deleted successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error deleting team user:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete team user' },
      { status: 500 }
    )
  }
}