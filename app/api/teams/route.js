import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

// GET /api/teams - Get all teams
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const teamId = searchParams.get('id')
    const projectId = searchParams.get('projectId')

    let data, error

    if (teamId) {
      // Fetch a specific team by ID
      ({ data, error } = await supabase
        .from('team')
        .select('*')
        .eq('id', teamId))
    } else if (projectId) {
      // Fetch teams by project ID
      ({ data, error } = await supabase
        .from('team')
        .select('*')
        .eq('project_id', projectId)
        .order('order_index', { ascending: true }))
    } else {
      // Fetch all teams
      ({ data, error } = await supabase
        .from('team')
        .select('*')
        .order('order_index', { ascending: true }))
    }

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: error.message || '获取团队失败' },
        { status: 500 }
      )
    }

    return NextResponse.json(data || [])
  } catch (error) {
    console.error('Error fetching teams:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch teams' },
      { status: 500 }
    )
  }
}

// POST /api/teams - Create a new team
export async function POST(request) {
  try {
    const body = await request.json()
    console.log('Received data:', body)
    
    // 验证必需字段
    if (!body.name || !body.access || !body.project_id || !body.created_by) {
      return NextResponse.json(
        { error: 'Missing required fields: name, access, project_id, and created_by are required' },
        { status: 400 }
      )
    }

    // 验证字段格式
    if (typeof body.name !== 'string' || body.name.length < 2 || body.name.length > 50) {
      return NextResponse.json(
        { error: 'Team name must be between 2 and 50 characters' },
        { status: 400 }
      )
    }

    // 验证 access 值
    const validAccessTypes = ['invite_only', 'can_edit', 'can_check', 'can_view'];
    if (!validAccessTypes.includes(body.access)) {
      return NextResponse.json(
        { error: `Invalid access type. Must be one of: ${validAccessTypes.join(', ')}` },
        { status: 400 }
      )
    }

    // 获取当前项目中最大的order_index
    const { data: existingTeams, error: fetchError } = await supabase
      .from('team')
      .select('order_index')
      .eq('project_id', body.project_id)
      .order('order_index', { ascending: false })
      .limit(1)

    if (fetchError) {
      console.error('Error fetching max order_index:', fetchError)
      return NextResponse.json(
        { error: 'Failed to process team order: ' + fetchError.message },
        { status: 500 }
      )
    }

    // 计算新的order_index
    const maxOrderIndex = existingTeams?.[0]?.order_index ?? -1
    const newOrderIndex = maxOrderIndex + 1

    // 创建新团队
    const { data: teamData, error: teamError } = await supabase
      .from('team')
      .insert([{ ...body, order_index: newOrderIndex }])
      .select()

    if (teamError) {
      console.error('Database error:', teamError)
      return NextResponse.json(
        { error: 'Failed to create team: ' + teamError.message },
        { status: 500 }
      )
    }

    if (!teamData || teamData.length === 0) {
      return NextResponse.json(
        { error: 'Team was not created successfully' },
        { status: 500 }
      )
    }
    
    return NextResponse.json(teamData[0], { status: 201 })
  } catch (error) {
    console.error('Error creating team:', error)
    return NextResponse.json(
      { error: 'Failed to create team: ' + (error.message || 'Unknown error') },
      { status: 500 }
    )
  }
}

// PUT /api/teams - Update a team or team order
export async function PUT(request) {
  try {
    const body = await request.json()
    console.log(body)
    // 处理单个团队更新
    if (body.id) {
      const updateData = { ...body };
      // 确保只更新允许的字段
      const allowedFields = ['name', 'description', 'access', 'star', 'archive'];
      Object.keys(updateData).forEach(key => {
        if (!allowedFields.includes(key)) {
          delete updateData[key];
        }
      });

      const { data, error } = await supabase
        .from('team')
        .update(updateData)
        .eq('id', body.id)
        .select()

      if (error) throw error
      return NextResponse.json(data[0])
    }
    
    // 处理团队顺序更新
    if (body.teams && Array.isArray(body.teams)) {
      // 如果是初始化顺序
      if (body.initializeOrder && body.projectId) {
        const { data: existingTeams, error: fetchError } = await supabase
          .from('team')
          .select('*')
          .eq('project_id', body.projectId)
          .order('created_at', { ascending: true });

        if (fetchError) throw fetchError;

        // 批量更新所有团队的order_index，保留其他字段
        const { error: updateError } = await supabase
          .from('team')
          .upsert(
            existingTeams.map((team, index) => ({
              ...team,
              order_index: index
            })),
            { 
              onConflict: 'id',
              ignoreDuplicates: false,
              returning: true
            }
          );

        if (updateError) throw updateError;

        // 获取更新后的团队列表
        const { data, error } = await supabase
          .from('team')
          .select('*')
          .eq('project_id', body.projectId)
          .order('order_index', { ascending: true });

        if (error) throw error;
        return NextResponse.json(data);
      }

      // 确保所有必需的字段都存在
      const teamsToUpdate = body.teams.map(team => ({
        id: team.id,
        name: team.name,
        access: team.access,
        order_index: team.order_index, // 这里应该已经是正确的索引值（0,1,2,...）
        project_id: team.project_id,
        created_by: team.created_by,
        description: team.description,
        star: team.star
      }));

      // 使用事务来确保原子性更新
      const { error: updateError } = await supabase
        .from('team')
        .upsert(teamsToUpdate, {
          onConflict: 'id',
          ignoreDuplicates: false
        });

      if (updateError) {
        console.error('更新顺序失败:', updateError);
        throw updateError;
      }

      // 获取更新后的团队列表
      const { data, error } = await supabase
        .from('team')
        .select('*')
        .eq('project_id', body.teams[0].project_id)
        .order('order_index', { ascending: true });

      if (error) throw error;
      return NextResponse.json(data);
    }

    return NextResponse.json(
      { error: '无效的请求数据' },
      { status: 400 }
    )
  } catch (error) {
    console.error('更新团队时出错:', error)
    return NextResponse.json(
      { error: error.message || '更新团队失败' },
      { status: 500 }
    )
  }
}

// DELETE /api/teams - Delete a team
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json(
        { error: 'Team ID is required' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('team')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Database error:', error)
      throw error
    }

    return NextResponse.json(
      { message: 'Team deleted successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error deleting team:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete team' },
      { status: 500 }
    )
  }
}
