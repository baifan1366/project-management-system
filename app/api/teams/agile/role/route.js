import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// 创建角色
export async function POST(request) {
  try {
    // 获取请求数据
    const roleData = await request.json();
        
    // 验证数据
    if (!roleData.team_id) {
      console.error('【API错误】团队ID不能为空');
      return NextResponse.json({ error: '团队ID不能为空' }, { status: 400 });
    }
    
    if (!roleData.name) {
      console.error('【API错误】角色名称不能为空');
      return NextResponse.json({ error: '角色名称不能为空' }, { status: 400 });
    }
    
    if (!roleData.created_by) {
      console.error('【API错误】创建者ID不能为空');
      return NextResponse.json({ error: '创建者ID不能为空' }, { status: 400 });
    }
    
    // 设置创建时间
    const newRoleData = {
      ...roleData,
      created_at: new Date().toISOString()
    };
    
    // 插入数据库
    const { data: newRole, error } = await supabase
      .from('agile_role')
      .insert(newRoleData)
      .select()
      .single();
    
    if (error) {
      console.error('【API错误】创建角色失败:', error);
      throw error;
    }
        
    return NextResponse.json(newRole);
  } catch (error) {
    console.error('【API错误】处理请求时出错:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 