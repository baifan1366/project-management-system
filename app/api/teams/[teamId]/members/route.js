import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * GET handler to fetch members of a team
 * @route GET /api/teams/:teamId/members
 */
export async function GET(request, { params }) {
  try {
    const { teamId } = params;

    if (!teamId) {
      return NextResponse.json(
        { error: 'Team ID is required' },
        { status: 400 }
      );
    }

    // Fetch all team members with their roles
    const { data: teamMembers, error: teamMembersError } = await supabase
      .from('user_team')
      .select(`
        user_id,
        role,
        created_at,
        profile:user_id (
          email,
          name,
          avatar_url
        )
      `)
      .eq('team_id', teamId);

    if (teamMembersError) {
      console.error('Database error fetching team members:', teamMembersError);
      throw teamMembersError;
    }

    // Format members for the frontend
    const formattedMembers = teamMembers.map(member => ({
      user_id: member.user_id,
      role: member.role,
      email: member.profile?.email,
      name: member.profile?.name,
      avatar_url: member.profile?.avatar_url,
      joined_at: member.created_at
    }));

    return NextResponse.json(formattedMembers);
  } catch (error) {
    console.error('Error fetching team members:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch team members' },
      { status: 500 }
    );
  }
} 