import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function PATCH(request, { params }) {
  try {
    const { userId } = params;
    const notifications = await request.json();

    // 更新用户表中的通知设置
    const { data: userData, error: userError } = await supabase
      .from('user')
      .update({
        notifications_enabled: notifications.emailNotifications || notifications.pushNotifications,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .single();

    if (userError) throw userError;

    // 存储详细的通知偏好设置
    const { error: prefError } = await supabase
      .from('user_preferences')
      .upsert({
        user_id: userId,
        email_notifications: notifications.emailNotifications,
        push_notifications: notifications.pushNotifications,
        weekly_digest: notifications.weeklyDigest,
        mention_notifications: notifications.mentionNotifications,
        updated_at: new Date().toISOString()
      });

    if (prefError) throw prefError;

    return NextResponse.json({ 
      message: 'Notification settings updated successfully',
      data: userData 
    });
  } catch (error) {
    console.error('Error updating notification settings:', error);
    return NextResponse.json(
      { error: 'Failed to update notification settings' },
      { status: 500 }
    );
  }
} 