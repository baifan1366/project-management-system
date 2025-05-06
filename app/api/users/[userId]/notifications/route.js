import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function PATCH(request, { params }) {
  try {
    const { userId } = params;
    const notifications = await request.json();

    // Create a notifications object to store all settings
    const notificationsData = {
      emailNotifications: notifications.emailNotifications,
      pushNotifications: notifications.pushNotifications,
      weeklyDigest: notifications.weeklyDigest,
      mentionNotifications: notifications.mentionNotifications,
      taskAssignments: notifications.taskAssignments,
      taskComments: notifications.taskComments,
      dueDates: notifications.dueDates,
      teamInvitations: notifications.teamInvitations
    };

    // Update the user table with the JSONB notifications field
    const { data: userData, error: userError } = await supabase
      .from('user')
      .update({
        notifications_settings: notificationsData,
        notifications_enabled: notifications.emailNotifications || notifications.pushNotifications,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select('*')
      .single();

    if (userError) throw userError;

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