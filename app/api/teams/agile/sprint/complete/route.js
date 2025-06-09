import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// 完成冲刺
export async function PATCH(request) {
  try {
    // 获取请求数据
    const { sprintId } = await request.json();
        
    // 验证数据
    if (!sprintId) {
      console.error('【API错误】冲刺ID不能为空');
      return NextResponse.json({ error: '冲刺ID不能为空' }, { status: 400 });
    }
    
    // 更新冲刺状态为COMPLETED
    const { data: updatedSprint, error } = await supabase
      .from('team_agile')
      .update({ 
        status: 'COMPLETED',
        end_date: new Date().toISOString()
      })
      .eq('id', sprintId)
      .select()
      .single();
    
    if (error) {
      console.error(`【API错误】更新冲刺ID ${sprintId} 状态失败:`, error);
      throw error;
    }
        
    return NextResponse.json(updatedSprint);
  } catch (error) {
    console.error('【API错误】处理请求时出错:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 