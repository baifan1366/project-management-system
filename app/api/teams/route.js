import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

// GET /api/teams - Get all teams
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const teamId = searchParams.get('teamId')

    let data, error

    if (teamId) {
      // Fetch a specific team by ID
      ({ data, error } = await supabase
        .from('team')
        .select('*')
        .eq('id', teamId))
    } else {
      // Fetch all teams
      ({ data, error } = await supabase
        .from('team')
        .select('*'))
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

    const { data, error } = await supabase
      .from('team')
      .insert([body])
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
    console.log('Update data:', body)
    
    if (body.id) {
      // 更新单个项目
      const { data, error } = await supabase
        .from('team')
        .update(body)
        .eq('id', body.id)
        .select()

      if (error) {
        console.error('Database error:', error)
        throw error
      }

      return NextResponse.json(data[0])
    } else if (body.projects && Array.isArray(body.teams)) {
      // 更新多个项目的顺序
      const updates = body.teams.map(team => {
        return supabase
          .from('team')
          .update({ order: team.order }) // 假设您有一个 'order' 字段
          .eq('id', team.id)
      });

      const results = await Promise.all(updates);

      // 检查是否有错误
      const error = results.find(result => result.error);
      if (error) {
        console.error('Database error:', error);
        throw error;
      }

      return NextResponse.json({ message: 'Team order updated successfully' });
    } else {
      return NextResponse.json(
        { error: 'Team ID or teams array is required' },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Error updating team:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update team' },
      { status: 500 }
    );
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
