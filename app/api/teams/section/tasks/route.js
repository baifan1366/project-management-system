import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'
import { useGetUser } from '@/lib/hooks/useGetUser';
import { processTaskTagValues } from '@/lib/api';

// 帮助函数：获取标签ID
async function getTagIdByName(tagName) {
  try {
    const { data, error } = await supabase
      .from('tag')
      .select('id')
      .eq('name', tagName)
      .single();
      
    if (error) {
      console.error(`获取${tagName}标签失败:`, error);
      return null;
    }
    
    return data?.id || null;
  } catch (error) {
    console.error(`获取${tagName}标签时发生错误:`, error);
    return null;
  }
}

// GET /api/tasks
export async function GET(request) {
  try {
    const searchParams = new URL(request.url).searchParams
    const teamId = searchParams.get('teamId')
    const sectionId = searchParams.get('sectionId')
    const taskId = searchParams.get('taskId')
    const userId = searchParams.get('userId')
    const fetchAll = searchParams.get('fetchAll') === 'true'
    
    // 获取Assignee标签ID
    const assigneeTagId = await getTagIdByName('Assignee');
    
    // 如果未能获取到assigneeTagId，使用默认值"2"作为后备
    const effectiveAssigneeTagId = assigneeTagId || "2";
    
    let data = []
    
    // 获取当前登录用户
    if (userId === 'current') {
      const { user } = useGetUser();
      
      if (userError) throw userError
      
      if (user) {
        // 获取用户创建的任务
        const { data: createdTasks, error: createdError } = await supabase
          .from('task')
          .select('*')
          .eq('created_by', user.id);
          
        if (createdError) {
          console.error('Error fetching tasks created by current user:', createdError);
          throw createdError;
        }
        
        // 获取所有任务，然后在代码中过滤
        const { data: allTasks, error: allTasksError } = await supabase
          .from('task')
          .select('*');
          
        if (allTasksError) {
          console.error('Error fetching all tasks:', allTasksError);
          throw allTasksError;
        }
        
        // 过滤出分配给当前用户的任务
        const assignedTasks = allTasks.filter(task => {
          if (!task.tag_values) return false;
          
          // 使用动态获取的assignee标签ID
          const assigneeValue = task.tag_values[effectiveAssigneeTagId];
          
          // 处理assignee为数组的情况
          if (Array.isArray(assigneeValue)) {
            return assigneeValue.includes(user.id);
          }
          
          // 处理assignee为单个值的情况
          return assigneeValue === user.id;
        });
        
        // 合并两个数组并去重
        const allUserTasks = [...createdTasks];
        
        assignedTasks.forEach(task => {
          if (!allUserTasks.some(t => t.id === task.id)) {
            allUserTasks.push(task);
          }
        });
        
        data = allUserTasks;
      } else {
        throw new Error('User not authenticated')
      }
    }
    // 获取所有任务
    else if (fetchAll) {
      const { data: tasksData, error: tasksError } = await supabase
        .from('task')
        .select('*');
        
      if (tasksError) {
        console.error('Error fetching all tasks:', tasksError);
        throw tasksError;
      }
      
      data = tasksData || [];
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
      // 获取用户创建的任务
      const { data: createdTasks, error: createdError } = await supabase
        .from('task')
        .select('*')
        .eq('created_by', userId);
        
      if (createdError) {
        console.error('Error fetching tasks created by user:', createdError);
        throw createdError;
      }
      
      // For tasks where the user is assigned, we need to use containment query on tag_values JSONB
      // Unfortunately, direct equality on nested JSONB is complex in Postgres
      // For now, we'll fetch all tasks and filter on the server side
      const { data: allTasks, error: allTasksError } = await supabase
        .from('task')
        .select('*');
        
      if (allTasksError) {
        console.error('Error fetching all tasks:', allTasksError);
        throw allTasksError;
      }
      
      // Filter tasks where the user is assigned in tag_values
      const assignedTasks = allTasks.filter(task => {
        if (!task.tag_values) return false;
        
        // 使用动态获取的assignee标签ID
        const assigneeValue = task.tag_values[effectiveAssigneeTagId];
        
        // 处理assignee为数组的情况
        if (Array.isArray(assigneeValue)) {
          return assigneeValue.includes(userId);
        }
        
        // 处理assignee为单个值的情况
        return assigneeValue === userId;
      });
      
      // Combine created and assigned tasks, removing duplicates
      const allUserTasks = [...createdTasks];
      
      assignedTasks.forEach(task => {
        if (!allUserTasks.some(t => t.id === task.id)) {
          allUserTasks.push(task);
        }
      });
      
      data = allUserTasks;
    }
    // 如果提供了章节ID，则获取该章节下的所有任务
    else if (sectionId) {
      // 首先从section表获取task_ids数组
      const { data: sectionData, error: sectionError } = await supabase
        .from('section')
        .select('task_ids')
        .eq('id', sectionId)
        .single()
        .order('id', { ascending: true });
        
      if (sectionError) throw sectionError
      
      if (sectionData && sectionData.task_ids && sectionData.task_ids.length > 0) {
        // 然后根据task_ids数组获取任务详情
        const { data: tasksData, error: tasksError } = await supabase
          .from('task')
          .select('*')
          .in('id', sectionData.task_ids)
          .order('id', { ascending: true })
          
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
        .order('id', { ascending: true })
        
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
    
    // 返回前统一处理所有任务的tag_values格式
    if (Array.isArray(data)) {
      data = data.map(task => processTaskTagValues(task, effectiveAssigneeTagId));
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
    
    // Basic validation - 修改验证逻辑，支持tag_values
    if (!body || (!body.title && !body.tag_values)) {
      return NextResponse.json(
        { error: 'Missing required fields. Need either title or tag_values' },
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

// PATCH /api/tasks - Update a task
export async function PATCH(request) {
  try {
    const body = await request.json()
    
    if (!body.id) {
      return NextResponse.json(
        { error: 'Task ID is required' },
        { status: 400 }
      )
    }

    // 确保 updated_at 存在
    const updateData = {
      ...body,
      updated_at: body.updated_at || new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('task')
      .update(updateData)
      .eq('id', body.id)
      .select()

    if (error) {
      console.error('Database error:', error)
      throw error
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: 'Task not found or update failed' },
        { status: 404 }
      )
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
    const teamId = searchParams.get('teamId')
    
    if (!id) {
      return NextResponse.json(
        { error: 'Task ID is required' },
        { status: 400 }
      )
    }

    if (!teamId) {
      return NextResponse.json(
        { error: '团队ID是必需参数' },
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
