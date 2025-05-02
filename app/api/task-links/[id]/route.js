import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

// Handle DELETE request to remove a task link by ID
export async function DELETE(request, { params }) {
  try {
    const { id } = params;

    // 首先获取要删除的任务链接数据
    const { data: oldLink, error: fetchError } = await supabase
      .from('task_links')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    // 删除链接
    const { error } = await supabase
      .from('task_links')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 返回成功消息和旧数据
    return NextResponse.json({
      success: true,
      message: "deleteTaskLink successful",
      deleted_data: oldLink
    }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}