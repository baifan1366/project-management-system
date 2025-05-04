import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * GET handler to fetch chat sessions for a user
 * @route GET /api/chat/sessions
 */
export async function GET(request) {
  try {
    // Get userId from query params
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    // Fetch chat sessions where the user is a participant
    const { data: sessionData, error } = await supabase
      .from('chat_participant')
      .select(`
        session_id,
        chat_session (
          id,
          type,
          name,
          created_at,
          updated_at
        )
      `)
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching chat sessions:', error);
      return NextResponse.json({ error: 'Failed to fetch chat sessions' }, { status: 500 });
    }

    // Format sessions for the frontend
    const formattedSessions = sessionData.map(item => ({
      id: item.chat_session.id,
      name: item.chat_session.name,
      type: item.chat_session.type,
      created_at: item.chat_session.created_at,
      updated_at: item.chat_session.updated_at
    }));

    return NextResponse.json(formattedSessions);
  } catch (error) {
    console.error('Error in chat sessions API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 