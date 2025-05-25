import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// 更新成员角色
export async function PATCH(request, { params }) {
  try {
    const memberId = params.memberId;
    // 获取请求数据
    const data = await request.json();
    
    console.log('【API接收参数】更新成员角色:', { memberId, data });
    
    // 验证数据
    if (!memberId) {
      console.error('【API错误】成员ID不能为空');
      return NextResponse.json({ error: '成员ID不能为空' }, { status: 400 });
    }
    
    if (!data.role_id) {
      console.error('【API错误】角色ID不能为空');
      return NextResponse.json({ error: '角色ID不能为空' }, { status: 400 });
    }
    
    // 更新成员角色
    const { data: updatedMember, error } = await supabase
      .from('agile_member')
      .update({ role_id: data.role_id })
      .eq('id', memberId)
      .select()
      .single();
    
    if (error) {
      console.error(`【API错误】更新成员ID ${memberId} 角色失败:`, error);
      throw error;
    }
    
    console.log(`【API响应】成员ID ${memberId} 角色已更新:`, updatedMember);
    
    return NextResponse.json(updatedMember);
  } catch (error) {
    console.error('【API错误】处理请求时出错:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 删除成员角色
export async function DELETE(request, { params }) {
  try {
    const memberId = params.memberId;
    
    console.log('【API接收参数】删除成员角色:', { memberId });
    
    // 验证数据
    if (!memberId) {
      console.error('【API错误】成员ID不能为空');
      return NextResponse.json({ error: '成员ID不能为空' }, { status: 400 });
    }
    
    // 删除成员角色
    const { data, error } = await supabase
      .from('agile_member')
      .delete()
      .eq('id', memberId)
      .select()
      .single();
    
    if (error) {
      console.error(`【API错误】删除成员ID ${memberId} 失败:`, error);
      throw error;
    }
    
    console.log(`【API响应】成员ID ${memberId} 已删除`);
    
    return NextResponse.json({ success: true, id: memberId, deleted: data });
  } catch (error) {
    console.error('【API错误】处理请求时出错:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}