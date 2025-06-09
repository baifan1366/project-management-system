import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// 更新冲刺
export async function PATCH(request, { params }) {
  try {
    const sprintId = params.sprintId;
    // 获取请求数据
    const sprintData = await request.json();
        
    // 验证数据
    if (!sprintId) {
      console.error('【API错误】冲刺ID不能为空');
      return NextResponse.json({ error: '冲刺ID不能为空' }, { status: 400 });
    }
    
    // 防止更新敏感字段
    const { id, created_at, ...safeData } = sprintData;
    
    // 更新冲刺
    const { data: updatedSprint, error } = await supabase
      .from('team_agile')
      .update(safeData)
      .eq('id', sprintId)
      .select()
      .single();
    
    if (error) {
      console.error(`【API错误】更新冲刺ID ${sprintId} 失败:`, error);
      throw error;
    }
        
    return NextResponse.json(updatedSprint);
  } catch (error) {
    console.error('【API错误】处理请求时出错:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 