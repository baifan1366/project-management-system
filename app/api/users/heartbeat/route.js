import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getUserId } from '@/lib/auth/auth';

/**
 * Record a user heartbeat (POST)
 * Updates the user's heartbeat timestamp
 */
export async function POST() {
  try {
    const userId = await getUserId();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // First check if the user already has a heartbeat record
    const { data: existingHeartbeat } = await supabase
      .from('user_heartbeats')
      .select('id')
      .eq('user_id', userId)
      .single();
    
    let result;
    
    if (existingHeartbeat) {
      // Update existing heartbeat
      result = await supabase
        .from('user_heartbeats')
        .update({ 
          last_heartbeat: new Date().toISOString() 
        })
        .eq('user_id', userId);
    } else {
      // Create new heartbeat record
      result = await supabase
        .from('user_heartbeats')
        .insert({ 
          user_id: userId,
          last_heartbeat: new Date().toISOString() 
        });
    }
    
    if (result.error) {
      console.error('Error updating heartbeat:', result.error);
      return NextResponse.json(
        { error: 'Failed to update heartbeat' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating heartbeat:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 