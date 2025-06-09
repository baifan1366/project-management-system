import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

// GET /api/projects - Get all projects
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')

    let data, error

    if (projectId) {
      // Fetch a specific project by ID
      ({ data, error } = await supabase
        .from('project')
        .select('*')
        .eq('id', projectId))
    } else {
      // Fetch all projects
      ({ data, error } = await supabase
        .from('project')
        .select('*'))
    }

    if (error) {
      console.error('Database error:', error)
      throw error
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching projects:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch projects' },
      { status: 500 }
    )
  }
}

// POST /api/projects - Create a new project
export async function POST(request) {
  try {
    const body = await request.json()
    
    if (!body || Object.keys(body).length === 0) {
      return NextResponse.json(
        { error: 'Invalid request data' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('project')
      .insert([body])
      .select()

    if (error) {
      console.error('Database error:', error)
      throw error
    }
    
    return NextResponse.json(data[0], { status: 201 })
  } catch (error) {
    console.error('Error creating project:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create project' },
      { status: 500 }
    )
  }
}

// PUT /api/projects - Update a project or project order
export async function PUT(request) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')

    const body = await request.json()
    
    if (projectId) {
      // 更新单个项目
      const { data, error } = await supabase
        .from('project')
        .update(body)
        .eq('id', projectId)
        .select()

      if (error) {
        console.error('Database error:', error)
        throw error
      }

      return NextResponse.json(data[0])
    } else if (body.projects && Array.isArray(body.projects)) {
      // 更新多个项目的顺序
      const updates = body.projects.map(project => {
        return supabase
          .from('project')
          .update({ order: project.order }) // 假设您有一个 'order' 字段
          .eq('id', project.id)
      });

      const results = await Promise.all(updates);

      // 检查是否有错误
      const error = results.find(result => result.error);
      if (error) {
        console.error('Database error:', error);
        throw error;
      }

      return NextResponse.json({ message: 'Project order updated successfully' });
    } else {
      return NextResponse.json(
        { error: 'Project ID or projects array is required' },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Error updating project:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update project' },
      { status: 500 }
    );
  }
}

// DELETE /api/projects - Delete a project
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('project')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Database error:', error)
      throw error
    }

    return NextResponse.json(
      { message: 'Project deleted successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error deleting project:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete project' },
      { status: 500 }
    )
  }
}
