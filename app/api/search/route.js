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
async function searchProjects(query) {
  // 首先尝试使用全文搜索
  const { data: tsData, error: tsError } = await supabase
    .from('project')
    .select('*')
    .textSearch('tsv_searchable', query, {
      type: 'plain',
      config: 'english'
    })
    .order('updated_at', { ascending: false })
    .limit(10);
  
  if (tsError) {
    console.error('项目全文搜索失败:', tsError);
    
    // 失败后回退到模糊搜索
    const { data, error } = await supabase
      .from('project')
      .select('*')
      .or(`project_name.ilike.%${query}%,description.ilike.%${query}%`)
      .order('updated_at', { ascending: false })
      .limit(10);
    
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
async function searchTasks(query) {
  // 首先尝试使用全文搜索
  const { data: tsData, error: tsError } = await supabase
    .from('task')
    .select(`
      *,
      project:project_id (project_name)
    `)
    .textSearch('tsv_searchable', query, {
      type: 'plain',
      config: 'english'
    })
    .order('updated_at', { ascending: false })
    .limit(10);
  
  if (tsError) {
    console.error('任务全文搜索失败:', tsError);
    
    // 失败后回退到模糊搜索
    const { data, error } = await supabase
      .from('task')
      .select(`
        *,
        project:project_id (project_name)
      `)
      .or(`tag_values::text.ilike.%${query}%`)
      .order('updated_at', { ascending: false })
      .limit(10);
    
    if (error) {
      console.error('任务模糊搜索失败:', error);
      return [];
    }
    
    return data.map(task => ({
      ...task,
      project_name: task.project?.project_name,
      type: 'task'
    }));
  }
  
  return (tsData || []).map(task => ({
    ...task,
    project_name: task.project?.project_name,
    type: 'task'
  }));
}

// 搜索用户
async function searchUsers(query) {
  // 首先尝试使用全文搜索
  const { data: tsData, error: tsError } = await supabase
    .from('user')
    .select('*')
    .textSearch('tsv_searchable', query, {
      type: 'plain',
      config: 'english'
    })
    .order('updated_at', { ascending: false })
    .limit(10);
  
  if (tsError) {
    console.error('用户全文搜索失败:', tsError);
    
    // 失败后回退到模糊搜索
    const { data, error } = await supabase
      .from('user')
      .select('*')
      .or(`name.ilike.%${query}%,email.ilike.%${query}%`)
      .order('updated_at', { ascending: false })
      .limit(10);
    
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
  // 首先尝试使用全文搜索
  const { data: tsData, error: tsError } = await supabase
    .from('team')
    .select(`
      *,
      project:project_id (project_name),
      created_by_user:created_by (name)
    `)
    .textSearch('tsv_searchable', query, {
      type: 'plain',
      config: 'english'
    })
    .order('updated_at', { ascending: false })
    .limit(10);
  
  if (tsError) {
    console.error('团队全文搜索失败:', tsError);
    
    // 失败后回退到模糊搜索
    const { data, error } = await supabase
      .from('team')
      .select(`
        *,
        project:project_id (project_name),
        created_by_user:created_by (name)
      `)
      .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
      .order('updated_at', { ascending: false })
      .limit(10);
    
    if (error) {
      console.error('团队模糊搜索失败:', error);
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
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  
  if (!query || !query.trim()) {
    return NextResponse.json({ results: [] });
  }
  
  const searchTerm = query.trim();
  let allResults = [];
  let session;
  
  try {
    // 获取当前用户ID（如果已登录）
    const { data, error } = await supabase.auth.getSession();
    if (!error && data.session) {
      session = data.session;
    }
    
    // 记录搜索历史
    await recordSearchHistory(searchTerm, session?.user?.id);
    
    // 并行执行所有搜索
    const [projectResults, taskResults, userResults, teamResults, messageResults] = await Promise.all([
      searchProjects(searchTerm),
      searchTasks(searchTerm),
      searchUsers(searchTerm),
      searchTeams(searchTerm),
      searchMessages(searchTerm)
    ]);
    
    // 合并所有结果
    allResults = [
      ...projectResults,
      ...taskResults,
      ...userResults,
      ...teamResults,
      ...messageResults
    ];
    
    // 按相关性排序（简单实现：最新的排在前面）
    allResults.sort((a, b) => {
      const dateA = new Date(a.updated_at || a.created_at);
      const dateB = new Date(b.updated_at || b.created_at);
      return dateB - dateA;
    });
    
    return NextResponse.json({ results: allResults });
  } catch (error) {
    console.error('搜索失败:', error);
    return NextResponse.json({ results: [], error: 'Search failed' }, { status: 500 });
  }
} 