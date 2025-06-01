import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// 删除"待改进"
export async function DELETE(request, { params }) {
  try {
    const sprintId = params.sprintId;
    const index = parseInt(params.index, 10);
    
    console.log('【API接收参数】删除待改进:', { sprintId, index });
    
    // 验证数据
    if (!sprintId) {
      console.error('【API错误】冲刺ID不能为空');
      return NextResponse.json({ error: '冲刺ID不能为空' }, { status: 400 });
    }
    
    if (isNaN(index) || index < 0) {
      console.error('【API错误】索引无效');
      return NextResponse.json({ error: '索引无效' }, { status: 400 });
    }
    
    // 首先获取当前冲刺数据
    const { data: sprint, error: fetchError } = await supabase
      .from('team_agile')
      .select('to_improve')
      .eq('id', sprintId)
      .single();
    
    if (fetchError) {
      console.error(`【API错误】获取冲刺ID ${sprintId} 失败:`, fetchError);
      throw fetchError;
    }
    
    // 处理to_improve字段
    const currentToImprove = sprint.to_improve || [];
    
    if (index >= currentToImprove.length) {
      console.error('【API错误】索引超出范围');
      return NextResponse.json({ error: '索引超出范围' }, { status: 400 });
    }
    
    // 删除指定索引的项
    const newToImprove = [
      ...currentToImprove.slice(0, index),
      ...currentToImprove.slice(index + 1)
    ];
    
    // 更新冲刺
    const { data: updatedSprint, error: updateError } = await supabase
      .from('team_agile')
      .update({ to_improve: newToImprove })
      .eq('id', sprintId)
      .select()
      .single();
    
    if (updateError) {
      console.error(`【API错误】更新冲刺ID ${sprintId} 失败:`, updateError);
      throw updateError;
    }
    
    console.log(`【API响应】冲刺ID ${sprintId} 已删除待改进项:`, updatedSprint);
    
    return NextResponse.json(updatedSprint);
  } catch (error) {
    console.error('【API错误】处理请求时出错:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 