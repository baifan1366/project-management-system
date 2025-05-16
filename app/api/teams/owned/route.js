import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * GET handler to fetch teams where a user is an owner
 * @route GET /api/teams/owned
 */
export async function GET(request) {
  try {
    // Get userId from query params
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Fetch teams where the user has an OWNER role
    const { data: userTeams, error: userTeamsError } = await supabase
      .from('user_team')
      .select(`
        team_id,
        team:team_id (
          id,
          name,
          description,
          project_id,
          created_at
        )
      `)
      .eq('user_id', userId)
      .eq('role', 'OWNER');

    if (userTeamsError) {
      console.error('Database error fetching owned teams:', userTeamsError);
      throw userTeamsError;
    }

    // Format teams for the frontend
    const formattedTeams = userTeams
      .map(item => item.team)
      .filter(team => team !== null);

    return NextResponse.json(formattedTeams);
  } catch (error) {
    console.error('Error fetching owned teams:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch owned teams' },
      { status: 500 }
    );
  }
} 