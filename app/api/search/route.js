import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

/**
 * 搜索API
 * 
 * 实现了基于用户权限的搜索:
 * - 项目搜索: 只返回用户通过团队关系有权访问的项目
 * - 任务搜索: 只返回用户通过团队关系有权访问的任务
 * - 团队搜索: 只返回用户所属的团队
 * - 消息搜索: 只返回用户参与的聊天中的消息
 */

// 记录搜索历史
async function recordSearchHistory(searchTerm, userId = null) {
  try {
    // 检查是否已存在相同搜索词
    const { data: existingSearch, error: fetchError } = await supabase
      .from('search_history')
      .select('id, count')
      .eq('search_term', searchTerm)
      .single();
    
    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116是"无结果"错误
      console.error('获取搜索历史失败:', fetchError);
      return;
    }
    
    if (existingSearch) {
      // 更新计数
      const { error: updateError } = await supabase
        .from('search_history')
        .update({ 
          count: existingSearch.count + 1,
          user_id: userId || existingSearch.user_id,
          last_searched_at: new Date().toISOString()
        })
        .eq('id', existingSearch.id);
      
      if (updateError) {
        console.error('更新搜索历史失败:', updateError);
      }
    } else {
      // 插入新记录
      const { error: insertError } = await supabase
        .from('search_history')
        .insert({ 
          search_term: searchTerm,
          user_id: userId,
          count: 1
        });
      
      if (insertError) {
        console.error('插入搜索历史失败:', insertError);
      }
    }
  } catch (error) {
    console.error('记录搜索历史失败:', error);
  }
}

// 搜索项目
async function searchProjects(query, limit = 10, userId = null) {
  // 如果没有用户ID，返回空结果
  if (!userId) {
    return [];
  }

  try {
    // 获取用户有访问权限的项目ID列表
    const { data: accessibleTeams, error: teamsError } = await supabase
      .from('user_team')
      .select('team:team_id (project_id)')
      .eq('user_id', userId);
    
    if (teamsError) {
      console.error('获取用户团队失败:', teamsError);
      return [];
    }
    
    // 提取用户有权限访问的项目ID
    const projectIds = [...new Set(accessibleTeams
      .map(item => item.team?.project_id)
      .filter(id => id !== null && id !== undefined))];
    
    if (projectIds.length === 0) {
      return [];
    }
    
    // 首先尝试使用全文搜索
    const { data: tsData, error: tsError } = await supabase
      .from('project')
      .select('*')
      .textSearch('tsv_searchable', query, {
        type: 'websearch',
        config: 'english'
      })
      .in('id', projectIds)
      .order('updated_at', { ascending: false })
      .limit(limit);
    
    if (tsError) {
      console.error('项目全文搜索失败:', tsError);
      
      // 失败后回退到模糊搜索
      const { data, error } = await supabase
        .from('project')
        .select('*')
        .or(`project_name.ilike.%${query}%,description.ilike.%${query}%`)
        .in('id', projectIds)
        .order('updated_at', { ascending: false })
        .limit(limit);
      
      if (error) {
        console.error('项目模糊搜索失败:', error);
        return [];
      }
      
      return data.map(project => ({
        ...project,
        type: 'project'
      }));
    }
    
    return (tsData || []).map(project => ({
      ...project,
      type: 'project'
    }));
  } catch (error) {
    console.error('搜索项目时发生异常:', error);
    return [];
  }
}

// 搜索任务
async function searchTasks(query, limit = 10, userId = null) {
  // 如果没有用户ID，返回空结果
  if (!userId) {
    console.log("搜索任务: 未提供userId, 返回空结果");
    return [];
  }

  try {
    // 获取用户有访问权限的团队ID列表
    const { data: accessibleTeams, error: teamsError } = await supabase
      .from('user_team')
      .select('team_id')
      .eq('user_id', userId);
    
    if (teamsError) {
      console.error('获取用户团队失败:', teamsError);
      return [];
    }
    
    // 提取用户有权限访问的团队ID
    const teamIds = [...new Set(accessibleTeams.map(item => item.team_id))];
    
    if (teamIds.length === 0) {
      console.log("搜索任务: 用户没有任何团队权限，返回空结果");
      return [];
    }

    // 获取这些团队关联的section
    const { data: sections, error: sectionsError } = await supabase
      .from('section')
      .select('id, task_ids')
      .in('team_id', teamIds);
    
    if (sectionsError) {
      console.error('获取团队section失败:', sectionsError);
      return [];
    }
    
    // 提取所有section中的task_ids
    const taskIds = [...new Set(sections
      .flatMap(section => section.task_ids || [])
      .filter(id => id !== null && id !== undefined))];
    
    if (taskIds.length === 0) {
      console.log("搜索任务: 未找到任何任务ID，返回空结果");
      return [];
    }

    console.log("搜索任务: 找到taskIds =", taskIds.slice(0, 10), taskIds.length > 10 ? `... 和 ${taskIds.length - 10} 个更多` : '');

    // 由于task和project表之间没有直接的外键关系，我们只查询task表的数据
    // 首先尝试使用全文搜索
    const { data: tsData, error: tsError } = await supabase
      .from('task')
      .select(`*`)
      .textSearch('tsv_searchable', query, {
        type: 'websearch',
        config: 'english'
      })
      .in('id', taskIds)
      .order('updated_at', { ascending: false })
      .limit(limit);
    
    if (tsError) {
      console.error('任务全文搜索失败:', { message: tsError.message, details: tsError.details, hint: tsError.hint, code: tsError.code });
      
      // 失败后回退到模糊搜索 - 重点搜索 tag_values["1"] 字段，这是存储任务名称的主要位置
      const { data, error } = await supabase
        .from('task')
        .select(`*`)
        .or(`tag_values->>"1".ilike.%${query}%, tag_values->>name.ilike.%${query}%, tag_values->>title.ilike.%${query}%, tag_values->>description.ilike.%${query}%`) 
        .in('id', taskIds)
        .order('updated_at', { ascending: false })
        .limit(limit);
      
      if (error) {
        console.error('任务模糊搜索失败:', { message: error.message, details: error.details, hint: error.hint, code: error.code });
        return [];
      }
      
      // 打印调试信息
      console.log(`搜索任务: 模糊搜索找到 ${data.length} 个任务`);
      if (data.length > 0) {
        data.forEach((task, index) => {
          console.log(`任务[${index}] ID=${task.id}, tag_values=`, JSON.stringify(task.tag_values).substring(0, 100) + (JSON.stringify(task.tag_values).length > 100 ? '...' : ''));
        });
      }
      
      return data.map(task => {
        // 优先使用tag_values["1"]作为任务名称，这是存储任务标题的主要字段
        const taskName = task.tag_values?.["1"] || task.tag_values?.name || task.tag_values?.title || `Task ${task.id}`;
        
        // 我们需要手动获取项目信息，因为没有直接的外键关系
        return {
          ...task,
          type: 'task',
          // 提取并规范化常用字段，方便前端展示
          title: taskName,
          description: task.tag_values?.description || '',
          // 由于没有project关系，我们不能直接获取project_name
          project_name: '',
          project_id: null
        };
      });
    }
    
    // 打印调试信息
    console.log(`搜索任务: 全文搜索找到 ${tsData ? tsData.length : 0} 个任务`);
    if (tsData && tsData.length > 0) {
      tsData.forEach((task, index) => {
        console.log(`任务[${index}] ID=${task.id}, tag_values=`, JSON.stringify(task.tag_values).substring(0, 100) + (JSON.stringify(task.tag_values).length > 100 ? '...' : ''));
      });
    }
    
    return (tsData || []).map(task => {
      // 优先使用tag_values["1"]作为任务名称，这是存储任务标题的主要字段
      const taskName = task.tag_values?.["1"] || task.tag_values?.name || task.tag_values?.title || `Task ${task.id}`;
      
      return {
        ...task,
        type: 'task',
        // 提取并规范化常用字段，方便前端展示
        title: taskName,
        description: task.tag_values?.description || '',
        // 由于没有project关系，我们不能直接获取project_name
        project_name: '',
        project_id: null
      };
    });
  } catch (error) {
    console.error('搜索任务时发生异常:', error);
    return [];
  }
}

// 搜索用户
async function searchUsers(query, limit = 10, sessionId = null) {
  // If sessionId is provided, only return users who are participants in that chat session
  if (sessionId) {
    const { data: participants, error: participantsError } = await supabase
      .from('chat_participant')
      .select('user_id')
      .eq('session_id', sessionId);
    
    if (participantsError) {
      console.error('获取聊天参与者失败:', participantsError);
      return [];
    }
    
    // Get the user IDs of the participants
    const participantUserIds = participants.map(p => p.user_id);
    
    if (participantUserIds.length === 0) {
      return [];
    }
    
    // Get users that match the query and are participants in the chat session
    const { data, error } = await supabase
      .from('user')
      .select('*')
      .in('id', participantUserIds)
      .or(`name.ilike.%${query}%,email.ilike.%${query}%`)
      .order('updated_at', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error('搜索聊天参与者失败:', error);
      return [];
    }
    
    return (data || []).map(user => ({
      ...user,
      type: 'user'
    }));
  }
  
  // Regular user search when no sessionId is provided (existing code)
  // 首先尝试使用全文搜索
  const { data: tsData, error: tsError } = await supabase
    .from('user')
    .select('*')
    .textSearch('tsv_searchable', query, {
      type: 'websearch',
      config: 'english'
    })
    .order('updated_at', { ascending: false })
    .limit(limit);
  
  if (tsError) {
    console.error('用户全文搜索失败:', tsError);
    
    // 失败后回退到模糊搜索
    const { data, error } = await supabase
      .from('user')
      .select('*')
      .or(`name.ilike.%${query}%,email.ilike.%${query}%`)
      .order('updated_at', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error('搜索用户失败:', error);
      return [];
    }
    
    return (data || []).map(user => ({
      ...user,
      type: 'user'
    }));
  }
  
  return (tsData || []).map(user => ({
    ...user,
    type: 'user'
  }));
}

// 搜索团队
async function searchTeams(query, userId = null) {
  // 如果没有用户ID，返回空结果
  if (!userId) {
    return [];
  }

  try {
    // 获取用户所属的团队ID
    const { data: userTeams, error: userTeamError } = await supabase
      .from('user_team')
      .select('team_id')
      .eq('user_id', userId);
    
    if (userTeamError) {
      console.error('获取用户团队失败:', userTeamError);
      return [];
    }
    
    const teamIds = userTeams.map(ut => ut.team_id);
    
    if (teamIds.length === 0) {
      return [];
    }
    
    // 首先尝试使用全文搜索
    const { data: tsData, error: tsError } = await supabase
      .from('team')
      .select(`
        *,
        project(project_name),
        created_by_user:created_by (name)
      `)
      .textSearch('tsv_searchable', query, {
        type: 'websearch',
        config: 'english'
      })
      .in('id', teamIds)
      .order('updated_at', { ascending: false })
      .limit(10);
    
    if (tsError) {
      console.error('团队全文搜索失败:', { message: tsError.message, details: tsError.details, hint: tsError.hint, code: tsError.code });
      
      // 失败后回退到模糊搜索
      const { data, error } = await supabase
        .from('team')
        .select(`
          *,
          project(project_name),
          created_by_user:created_by (name)
        `)
        .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
        .in('id', teamIds)
        .order('updated_at', { ascending: false })
        .limit(10);
      
      if (error) {
        console.error('团队模糊搜索失败:', { message: error.message, details: error.details, hint: error.hint, code: error.code });
        return [];
      }
      
      return (data || []).map(team => ({
        ...team,
        project_name: team.project?.project_name,
        creator_name: team.created_by_user?.name,
        type: 'team'
      }));
    }
    
    return (tsData || []).map(team => ({
      ...team,
      project_name: team.project?.project_name,
      creator_name: team.created_by_user?.name,
      type: 'team'
    }));
  } catch (error) {
    console.error('搜索团队时发生异常:', error);
    return [];
  }
}

// 搜索消息
async function searchMessages(query, userId = null) {
  // 如果没有用户ID，返回空结果
  if (!userId) {
    return [];
  }
  
  try {
    // 获取用户参与的聊天会话
    const { data: userSessions, error: sessionError } = await supabase
      .from('chat_participant')
      .select('session_id')
      .eq('user_id', userId);
    
    if (sessionError) {
      console.error('获取用户聊天会话失败:', sessionError);
      return [];
    }
    
    const sessionIds = userSessions.map(us => us.session_id);
    
    if (sessionIds.length === 0) {
      return [];
    }
    
    // 使用全文搜索
    const { data, error } = await supabase
      .from('chat_message')
      .select(`
        *,
        chat:session_id (name)
      `)
      .textSearch('tsv_content', query, {
        type: 'websearch',
        config: 'english'
      })
      .in('session_id', sessionIds)
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (error) {
      console.error('搜索消息失败:', error);
      return [];
    }
    
    return (data || []).map(message => ({
      ...message,
      chat_name: message.chat?.name,
      type: 'message'
    }));
  } catch (error) {
    console.error('搜索消息时发生异常:', error);
    return [];
  }
}

// GET方法处理搜索请求
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query') || '';
    const userId = searchParams.get('userId');
    const type = searchParams.get('type'); // Get the search type (mention, etc.)
    const sessionId = searchParams.get('sessionId'); // Get the chat session ID
    
    
    
    // // 如果查询过短，返回空结果
    // if (query.length < 2) {
    //   return NextResponse.json({
    //     results: [],
    //     message: '查询词太短'
    //   });
    // }
    
    // For mentions, we need to limit results and prioritize recent items
    if (type === 'mention') {
      const results = [];
      
      // Users (limit to 5 for mentions)
      const users = await searchUsers(query, 5, sessionId);
      results.push(...users);
      
      // Projects (limit to 3 for mentions)
      const projects = await searchProjects(query, 3, userId);
      results.push(...projects);
      
      // Tasks (limit to 3 for mentions)
      const tasks = await searchTasks(query, 3, userId);
      results.push(...tasks);
      
      return NextResponse.json({
        results,
      });
    }
    
    // 记录搜索历史
    if (query) {
      await recordSearchHistory(query, userId);
    }
    
    // 并行执行多个搜索
    const [
      projects,
      tasks,
      users,
      teams,
      messages
    ] = await Promise.all([
      searchProjects(query, 10, userId),
      searchTasks(query, 10, userId),
      searchUsers(query, 10, sessionId),
      searchTeams(query, userId),
      searchMessages(query, userId)
    ]);
    
    // 合并结果
    const results = [
      ...projects,
      ...tasks,
      ...users,
      ...teams,
      ...messages
    ];
    
    
    
    return NextResponse.json({
      results
    });
  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json({
      error: '搜索失败',
      details: error.message
    }, { status: 500 });
  }
} 