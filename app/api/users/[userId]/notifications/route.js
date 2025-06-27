import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function PATCH(request, { params }) {
  try {
    const { userId } = params;
    const notifications = await request.json();

    // Create a notifications object to store all settings
    const notificationsData = {
      notifications_enabled: notifications.pushNotifications,
      pushNotifications: notifications.pushNotifications,
      addedChatNotifications: notifications.addedChatNotifications, 
      mentionNotifications: notifications.mentionNotifications,
      inviteMeetingNotifications: notifications.inviteMeetingNotifications,
      taskAssignments: notifications.taskAssignments,
      taskComments: notifications.taskComments,
      teamAnnouncements: notifications.teamAnnouncements,
      teamInvitations: notifications.teamInvitations,
      dueDates: notifications.dueDates,
      weeklyDigest: notifications.weeklyDigest
    };

    // Update the user table with the JSONB notifications field
    const { data: userData, error: userError } = await supabase
      .from('user')
      .update({
        notifications_settings: notificationsData,
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