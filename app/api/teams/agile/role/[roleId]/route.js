import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// 更新角色
export async function PATCH(request, { params }) {
  try {
    const roleId = params.roleId;
    // 获取请求数据
    const roleData = await request.json();
    
    console.log('【API接收参数】更新角色:', { roleId, roleData });
    
    // 验证数据
    if (!roleId) {
      console.error('【API错误】角色ID不能为空');
      return NextResponse.json({ error: '角色ID不能为空' }, { status: 400 });
    }
    
    // 防止更新敏感字段
    const { id, created_at, ...safeData } = roleData;
    
    // 更新角色
    const { data: updatedRole, error } = await supabase
      .from('agile_role')
      .update(safeData)
      .eq('id', roleId)
      .select()
      .single();
    
    if (error) {
      console.error(`【API错误】更新角色ID ${roleId} 失败:`, error);
      throw error;
    }
    
    console.log(`【API响应】角色ID ${roleId} 已更新:`, updatedRole);
    
    return NextResponse.json(updatedRole);
  } catch (error) {
    console.error('【API错误】处理请求时出错:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 删除角色
export async function DELETE(request, { params }) {
  try {
    const roleId = params.roleId;
    
    console.log('【API接收参数】删除角色:', { roleId });
    
    // 验证数据
    if (!roleId) {
      console.error('【API错误】角色ID不能为空');
      return NextResponse.json({ error: '角色ID不能为空' }, { status: 400 });
    }
    
    // 删除角色
    const { data, error } = await supabase
      .from('agile_role')
      .delete()
      .eq('id', roleId)
      .select()
      .single();
    
    if (error) {
      console.error(`【API错误】删除角色ID ${roleId} 失败:`, error);
      throw error;
    }
    
    console.log(`【API响应】角色ID ${roleId} 已删除`);
    
    return NextResponse.json({ success: true, id: roleId, deleted: data });
  } catch (error) {
    console.error('【API错误】处理请求时出错:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 