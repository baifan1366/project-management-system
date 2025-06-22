import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// 创建冲刺
export async function POST(request) {
  try {
    // 获取请求数据
    let data;
    try {
      data = await request.json();
      
    } catch (parseError) {
      console.error('【API错误】解析请求JSON失败:', parseError);
      return NextResponse.json({ 
        error: '无效的请求格式，请确保发送正确的JSON数据' 
      }, { status: 400 });
    }
    
    // 验证数据是否存在
    if (!data) {
      console.error('【API错误】请求体为空');
      return NextResponse.json({ error: '请求体不能为空' }, { status: 400 });
    }
        
    // 验证数据
    if (!data.team_id) {
      console.error('【API错误】团队ID不能为空');
      return NextResponse.json({ error: '团队ID不能为空' }, { status: 400 });
    }
    
    if (!data.name) {
      console.error('【API错误】冲刺名称不能为空');
      return NextResponse.json({ error: '冲刺名称不能为空' }, { status: 400 });
    }
    
    if (!data.created_by) {
      console.error('【API错误】创建者ID不能为空');
      return NextResponse.json({ error: '创建者ID不能为空' }, { status: 400 });
    }
    
    // 设置默认状态为PLANNING
    const sprintData = {
      ...data,
      status: data.status || 'PLANNING',
      created_at: new Date().toISOString()
    };
    
    // 插入数据库
    const { data: newSprint, error } = await supabase
      .from('team_agile')
      .insert(sprintData)
      .select()
      .single();
    
    if (error) {
      console.error('【API错误】创建冲刺失败:', error);
      throw error;
    }
        
    return NextResponse.json(newSprint);
  } catch (error) {
    console.error('【API错误】处理请求时出错:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 