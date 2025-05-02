import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

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
async function searchProjects(query, limit = 10) {
  // 首先尝试使用全文搜索
  const { data: tsData, error: tsError } = await supabase
    .from('project')
    .select('*')
    .textSearch('tsv_searchable', query, {
      type: 'plain',
      config: 'english'
    })
    .order('updated_at', { ascending: false })
    .limit(limit);
  
  if (tsError) {
    console.error('项目全文搜索失败:', tsError);
    
    // 失败后回退到模糊搜索
    const { data, error } = await supabase
      .from('project')
      .select('*')
      .or(`project_name.ilike.%${query}%,description.ilike.%${query}%`)
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
}

// 搜索任务
async function searchTasks(query, limit = 10) {
  try {
    // 首先尝试使用全文搜索
    const { data: tsData, error: tsError } = await supabase
      .from('task')
      .select('*')
      .textSearch('tsv_searchable', query, {
        type: 'plain',
        config: 'english'
      })
      .order('updated_at', { ascending: false })
      .limit(limit);
    
    if (tsError) {
      console.error('任务全文搜索失败:', { message: tsError.message, details: tsError.details, hint: tsError.hint, code: tsError.code });
      
      // 失败后回退到模糊搜索
      const { data, error } = await supabase
        .from('task')
        .select('*')
        .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
        .order('updated_at', { ascending: false })
        .limit(limit);
      
      if (error) {
        console.error('任务模糊搜索失败:', { message: error.message, details: error.details, hint: error.hint, code: error.code });
        return [];
      }
      
      return data.map(task => ({
        ...task,
        type: 'task'
      }));
    }
    
    return (tsData || []).map(task => ({
      ...task,
      type: 'task'
    }));
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
      type: 'plain',
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
async function searchTeams(query) {
  try {
    // 首先尝试使用全文搜索
    const { data: tsData, error: tsError } = await supabase
      .from('team')
      .select(`
        *,
        project(project_name),
        created_by_user:created_by (name)
      `)
      .textSearch('tsv_searchable', query, {
        type: 'plain',
        config: 'english'
      })
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
async function searchMessages(query) {
  // 使用全文搜索
  const { data, error } = await supabase
    .from('chat_message')
    .select(`
      *,
      chat:session_id (name)
    `)
    .textSearch('tsv_content', query, {
      type: 'plain',
      config: 'english'
    })
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
}

// GET方法处理搜索请求
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query') || '';
    const userId = searchParams.get('userId');
    const type = searchParams.get('type'); // Get the search type (mention, etc.)
    const sessionId = searchParams.get('sessionId'); // Get the chat session ID
    
    // 如果查询过短，返回空结果
    if (query.length < 2) {
      return NextResponse.json({
        results: [],
        message: '查询词太短'
      });
    }
    
    // For mentions, we need to limit results and prioritize recent items
    if (type === 'mention') {
      const results = [];
      
      // Users (limit to 5 for mentions)
      const users = await searchUsers(query, 5, sessionId);
      results.push(...users);
      
      // Projects (limit to 3 for mentions)
      const projects = await searchProjects(query, 3);
      results.push(...projects);
      
      // Tasks (limit to 3 for mentions)
      const tasks = await searchTasks(query, 3);
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
      searchProjects(query),
      searchTasks(query),
      searchUsers(query, 10, sessionId),
      searchTeams(query),
      searchMessages(query)
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