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
      throw error
    }

    return NextResponse.json(data)
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
    
    if (!body || Object.keys(body).length === 0) {
      return NextResponse.json(
        { error: 'Invalid request data' },
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
      throw fetchError
    }

    // 计算新的order_index
    const maxOrderIndex = existingTeams?.[0]?.order_index ?? -1
    const newOrderIndex = maxOrderIndex + 1

    // 创建新团队，使用计算出的order_index
    const { data, error } = await supabase
      .from('team')
      .insert([{ ...body, order_index: newOrderIndex }])
      .select()

    if (error) {
      console.error('Database error:', error)
      throw error
    }
    
    return NextResponse.json(data[0], { status: 201 })
  } catch (error) {
    console.error('Error creating team:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create team' },
      { status: 500 }
    )
  }
}

// PUT /api/teams - Update a team or team order
export async function PUT(request) {
  try {
    const body = await request.json()
    
    // 处理单个团队更新
    if (body.id) {
      const { data, error } = await supabase
        .from('team')
        .update(body)
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

      // 正常的顺序更新逻辑
      const { error: updateError } = await supabase
        .from('team')
        .upsert(
          body.teams.map(team => ({
            id: team.id,
            name: team.name,
            access: team.access,
            order_index: team.order_index,
            project_id: team.project_id,
            created_by: team.created_by,
            description: team.description
          })),
          { 
            onConflict: 'id',
            ignoreDuplicates: false,
            returning: true
          }
        );

      if (updateError) {
        console.error('Update error:', updateError);
        throw updateError;
      }

      // 获取更新后的团队列表
      const { data, error } = await supabase
        .from('team')
        .select('*')
        .eq('project_id', body.teams[0].project_id)
        .order('order_index', { ascending: true });

      if (error) {
        console.error('Fetch error:', error);
        throw error;
      }
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
