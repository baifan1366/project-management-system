import { NextResponse } from 'next/server';
import { updateUserActivity, setUserOffline, getUserId } from '@/lib/auth/auth';

/**
 * Update user's online status (POST)
 * Sets a user as online and updates last activity
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

    const success = await updateUserActivity(userId);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Failed to update status' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating online status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Set user as offline (DELETE)
 */
export async function DELETE() {
  try {
    const userId = await getUserId();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const success = await setUserOffline(userId);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Failed to update status' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error setting offline status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Get all online users (GET)
 */
export async function GET() {
  try {
    const { supabase } = await import('@/lib/supabase');
    
    const { data, error } = await supabase
      .from('user')
      .select('id, name, email, avatar_url, is_online, last_seen_at')
      .eq('is_online', true);
    
    if (error) {
      throw error;
    }
    
    return NextResponse.json({ users: data });
  } catch (error) {
    console.error('Error fetching online users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch online users' },
      { status: 500 }
    );
  }
}
