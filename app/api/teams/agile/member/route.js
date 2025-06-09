import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// 分配角色
export async function POST(request) {
  try {
    // 获取请求数据
    const memberData = await request.json();
      
    // 验证数据
    if (!memberData.user_id) {
      console.error('【API错误】用户ID不能为空');
      return NextResponse.json({ error: '用户ID不能为空' }, { status: 400 });
    }
    
    if (!memberData.role_id) {
      console.error('【API错误】角色ID不能为空');
      return NextResponse.json({ error: '角色ID不能为空' }, { status: 400 });
    }
    
    if (!memberData.agile_id) {
      console.error('【API错误】敏捷ID不能为空');
      return NextResponse.json({ error: '敏捷ID不能为空' }, { status: 400 });
    }
    
    // 设置创建时间
    const newMemberData = {
      ...memberData,
      created_at: new Date().toISOString()
    };
    
    // 检查是否已存在该用户的记录
    const { data: existingMember, error: checkError } = await supabase
      .from('agile_member')
      .select('*')
      .eq('user_id', memberData.user_id)
      .eq('agile_id', memberData.agile_id)
      .maybeSingle();
    
    if (checkError) {
      console.error('【API错误】检查现有成员失败:', checkError);
      throw checkError;
    }
    
    let result;
    
    if (existingMember) {
      // 更新现有记录
      const { data: updatedMember, error: updateError } = await supabase
        .from('agile_member')
        .update({ role_id: memberData.role_id })
        .eq('id', existingMember.id)
        .select()
        .single();
      
      if (updateError) {
        console.error('【API错误】更新成员角色失败:', updateError);
        throw updateError;
      }
      
      result = updatedMember;
    } else {
      // 插入新记录
      const { data: newMember, error: insertError } = await supabase
        .from('agile_member')
        .insert(newMemberData)
        .select()
        .single();
      
      if (insertError) {
        console.error('【API错误】分配角色失败:', insertError);
        throw insertError;
      }
      
      result = newMember;
    }
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('【API错误】处理请求时出错:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 