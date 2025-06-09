import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// 获取用户通知
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  
  if (!userId) {
    return NextResponse.json(
      { error: '用户ID不能为空' },
      { status: 400 }
    );
  }
  
  try {
    
    
    const { data, error } = await supabase
      .from('notification')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
      
    if (error) {
      console.error('API: 获取通知时发生错误:', error);
      throw error;
    }
    
    
    return NextResponse.json(data || []);
  } catch (error) {
    console.error('API: 获取通知失败:', error.message);
    return NextResponse.json(
      { error: error.message || '获取通知失败' },
      { status: 500 }
    );
  }
}

// 标记通知为已读
export async function PATCH(request) {
  try {
    const body = await request.json();
    const { userId, notificationId, markAll = false } = body;
    
    if (!userId) {
      return NextResponse.json(
        { error: '用户ID不能为空' },
        { status: 400 }
      );
    }
    
    if (markAll) {
      // 标记所有通知为已读
      const { data, error } = await supabase
        .from('notification')
        .update({ is_read: true, updated_at: new Date() })
        .eq('user_id', userId)
        .eq('is_read', false);
        
      if (error) {
        throw error;
      }
      
      return NextResponse.json({ success: true, message: '所有通知已标记为已读' });
    } else {
      // 标记单个通知为已读
      if (!notificationId) {
        return NextResponse.json(
          { error: '通知ID不能为空' },
          { status: 400 }
        );
      }
      
      const { data, error } = await supabase
        .from('notification')
        .update({ is_read: true, updated_at: new Date() })
        .eq('id', notificationId)
        .eq('user_id', userId);
        
      if (error) {
        throw error;
      }
      
      return NextResponse.json({ success: true, notificationId });
    }
  } catch (error) {
    console.error('API: 标记通知已读失败:', error.message);
    return NextResponse.json(
      { error: error.message || '标记通知已读失败' },
      { status: 500 }
    );
  }
}

// 删除通知
export async function DELETE(request) {
  const { searchParams } = new URL(request.url);
  const notificationId = searchParams.get('notificationId');
  const userId = searchParams.get('userId');
  
  if (!notificationId || !userId) {
    return NextResponse.json(
      { error: '通知ID和用户ID不能为空' },
      { status: 400 }
    );
  }
  
  try {
    const { error } = await supabase
      .from('notification')
      .delete()
      .eq('id', notificationId)
      .eq('user_id', userId);
      
    if (error) {
      throw error;
    }
    
    return NextResponse.json({ success: true, notificationId });
  } catch (error) {
    console.error('API: 删除通知失败:', error.message);
    return NextResponse.json(
      { error: error.message || '删除通知失败' },
      { status: 500 }
    );
  }
}

// 创建通知
export async function POST(request) {
  try {
    const notificationData = await request.json();
    
    if (!notificationData.user_id) {
      return NextResponse.json(
        { error: '用户ID不能为空' },
        { status: 400 }
      );
    }
    
    const { data, error } = await supabase
      .from('notification')
      .insert(notificationData)
      .select();
      
    if (error) {
      throw error;
    }
    
    return NextResponse.json(data[0]);
  } catch (error) {
    console.error('API: 创建通知失败:', error.message);
    return NextResponse.json(
      { error: error.message || '创建通知失败' },
      { status: 500 }
    );
  }
}
