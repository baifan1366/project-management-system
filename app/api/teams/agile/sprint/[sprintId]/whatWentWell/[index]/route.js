import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// 删除"进展顺利"
export async function DELETE(request, { params }) {
  try {
    const sprintId = params.sprintId;
    const index = parseInt(params.index, 10);
        
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
      .select('what_went_well')
      .eq('id', sprintId)
      .single();
    
    if (fetchError) {
      console.error(`【API错误】获取冲刺ID ${sprintId} 失败:`, fetchError);
      throw fetchError;
    }
    
    // 处理what_went_well字段
    const currentWhatWentWell = sprint.what_went_well || [];
    
    if (index >= currentWhatWentWell.length) {
      console.error('【API错误】索引超出范围');
      return NextResponse.json({ error: '索引超出范围' }, { status: 400 });
    }
    
    // 删除指定索引的项
    const newWhatWentWell = [
      ...currentWhatWentWell.slice(0, index),
      ...currentWhatWentWell.slice(index + 1)
    ];
    
    // 更新冲刺
    const { data: updatedSprint, error: updateError } = await supabase
      .from('team_agile')
      .update({ what_went_well: newWhatWentWell })
      .eq('id', sprintId)
      .select()
      .single();
    
    if (updateError) {
      console.error(`【API错误】更新冲刺ID ${sprintId} 失败:`, updateError);
      throw updateError;
    }
        
    return NextResponse.json(updatedSprint);
  } catch (error) {
    console.error('【API错误】处理请求时出错:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 