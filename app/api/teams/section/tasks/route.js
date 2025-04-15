import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

// GET /api/tasks
export async function GET(request) {
  try {
    const searchParams = new URL(request.url).searchParams
    const teamId = searchParams.get('teamId')
    const sectionId = searchParams.get('sectionId')
    const taskId = searchParams.get('taskId')
    const userId = searchParams.get('userId')
    const fetchAll = searchParams.get('fetchAll') === 'true'
    
    let data = []
    
    // 获取当前登录用户
    if (userId === 'current') {
      const { data: userData, error: userError } = await supabase.auth.getUser()
      
      if (userError) throw userError
      
      if (userData && userData.user) {
        const { data: tasksData, error: tasksError } = await supabase
          .from('task')
          .select('*')
          .eq('assignee_id', userData.user.id)
          
        if (tasksError) throw tasksError
        
        data = tasksData || []
      } else {
        throw new Error('User not authenticated')
      }
    }
    // 获取所有任务
    else if (fetchAll) {
      const { data: tasksData, error: tasksError } = await supabase
        .from('task')
        .select('*')
        .order('created_at', { ascending: false })
        
      if (tasksError) throw tasksError
      
      data = tasksData || []
    }
    // 如果提供了特定任务ID，则只获取该任务
    else if (taskId) {
      const { data: taskData, error: taskError } = await supabase
        .from('task')
        .select('*')
        .eq('id', taskId)
        .single()
        
      if (taskError) throw taskError
      
      data = taskData ? [taskData] : []
    } 
    // 如果提供了用户ID，则获取分配给该用户的所有任务
    else if (userId) {
      const { data: tasksData, error: tasksError } = await supabase
        .from('task')
        .select('*')
        .eq('assignee_id', userId)
        
      if (tasksError) throw tasksError
      
      data = tasksData || []
    }
    // 如果提供了章节ID，则获取该章节下的所有任务
    else if (sectionId) {
      // 首先从section表获取task_ids数组
      const { data: sectionData, error: sectionError } = await supabase
        .from('section')
        .select('task_ids')
        .eq('id', sectionId)
        .single()
        
      if (sectionError) throw sectionError
      
      if (sectionData && sectionData.task_ids && sectionData.task_ids.length > 0) {
        // 然后根据task_ids数组获取任务详情
        const { data: tasksData, error: tasksError } = await supabase
          .from('task')
          .select('*')
          .in('id', sectionData.task_ids)
          
        if (tasksError) throw tasksError
        
        data = tasksData || []
      }
    }
    // 如果提供了团队ID，获取该团队所有章节下的任务
    else if (teamId) {
      // 获取团队下所有章节
      const { data: sectionsData, error: sectionsError } = await supabase
        .from('section')
        .select('task_ids')
        .eq('team_id', teamId)
        
      if (sectionsError) throw sectionsError
      
      if (sectionsData && sectionsData.length > 0) {
        // 收集所有章节的任务ID
        const allTaskIds = []
        sectionsData.forEach(section => {
          if (section.task_ids && section.task_ids.length > 0) {
            allTaskIds.push(...section.task_ids)
          }
        })
        
        if (allTaskIds.length > 0) {
          // 获取所有任务的详情
          const { data: tasksData, error: tasksError } = await supabase
            .from('task')
            .select('*')
            .in('id', [...new Set(allTaskIds)]) // 去重
            
          if (tasksError) throw tasksError
          
          data = tasksData || []
        }
      }
    }
    
    return NextResponse.json(data, { status: 200 })
  } catch (error) {
    console.error('Error fetching tasks:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/tasks
export async function POST(request) {
  try {
    const body = await request.json()
    
    // Basic validation
    if (!body || !body.title) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('task')
      .insert([body])
      .select()

    if (error) throw error

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: 'Failed to create task' },
        { status: 500 }
      )
    }

    return NextResponse.json(data[0], { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PUT /api/tasks - Update a task
export async function PUT(request) {
  try {
    const body = await request.json()
    console.log('Update data:', body)
    
    if (!body.id) {
      return NextResponse.json(
        { error: 'Task ID is required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('task')
      .update(body)
      .eq('id', body.id)
      .select()

    if (error) {
      console.error('Database error:', error)
      throw error
    }

    return NextResponse.json(data[0])
  } catch (error) {
    console.error('Error updating task:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update task' },
      { status: 500 }
    )
  }
}

// DELETE /api/tasks - Delete a task
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json(
        { error: 'Task ID is required' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('task')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Database error:', error)
      throw error
    }

    return NextResponse.json(
      { message: 'Task deleted successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error deleting task:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete task' },
      { status: 500 }
    )
  }
}
