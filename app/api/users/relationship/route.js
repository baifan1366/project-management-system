import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * Check if two users have a relationship (belong to the same team)
 * 
 * @param {Request} request - The request object containing targetUserId and userId
 * @returns {Promise<NextResponse>} JSON response indicating relationship status
 */
export const GET = async (req) => {
  try {
    // Get the target user ID and current user ID from the URL search params
    const url = new URL(req.url);
    const targetUserId = url.searchParams.get('targetUserId');
    const userId = url.searchParams.get('userId'); // Get current user's ID from the request
    
    // Validate IDs
    if (!targetUserId) {
      return NextResponse.json(
        { error: 'Target user ID is required' },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'Current user ID is required' },
        { status: 400 }
      );
    }

    // Validate that target user exists
    const { data: targetUser, error: targetUserError } = await supabase
      .from('user')
      .select('id')
      .eq('id', targetUserId)
      .single();

    if (targetUserError || !targetUser) {
      return NextResponse.json(
        { error: 'Target user not found' },
        { status: 404 }
      );
    }

    // First get the teams that the target user belongs to
    const { data: targetUserTeams, error: targetTeamsError } = await supabase
      .from('user_team')
      .select('team_id')
      .eq('user_id', targetUserId);

    if (targetTeamsError) {
      console.error('Error getting target user teams:', targetTeamsError);
      return NextResponse.json(
        { error: 'Failed to check relationship' },
        { status: 500 }
      );
    }

    // Extract team IDs from the results
    const targetTeamIds = targetUserTeams.map(item => item.team_id);

    // If target user has no teams, they are external
    if (targetTeamIds.length === 0) {
      return NextResponse.json({
        hasRelationship: false,
        isExternal: true,
        commonTeamCount: 0
      });
    }

    // Find teams that both users belong to
    const { data: userTeams, error: userTeamsError } = await supabase
      .from('user_team')
      .select('team_id')
      .eq('user_id', userId)
      .in('team_id', targetTeamIds);

    if (userTeamsError) {
      console.error('Error checking team relationship:', userTeamsError);
      return NextResponse.json(
        { error: 'Failed to check relationship' },
        { status: 500 }
      );
    }

    // Determine if users have a relationship based on common teams
    const hasRelationship = userTeams && userTeams.length > 0;

    return NextResponse.json({
      hasRelationship,
      isExternal: !hasRelationship,
      commonTeamCount: userTeams?.length || 0
    });
  } catch (error) {
    console.error('Error in relationship check:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}; 