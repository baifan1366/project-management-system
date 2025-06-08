import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * Check if a user has any relationship with another user
 * This endpoint is designed for direct frontend calls
 * 
 * @param {Request} request - The request object
 * @returns {Promise<NextResponse>} JSON response with relationship data
 */
export async function POST(request) {
  try {
    // Get the user IDs from the request body
    const { userId, targetUserId } = await request.json();
    
    // Validate input
    if (!userId || !targetUserId) {
      return NextResponse.json({ 
        error: 'Both userId and targetUserId are required' 
      }, { status: 400 });
    }
    
    // Skip if trying to check relationship with self
    if (userId === targetUserId) {
      return NextResponse.json({
        hasRelationship: true,
        isExternal: false,
        commonTeamCount: 0
      });
    }
    
    // Get the teams that the target user belongs to
    const { data: targetUserTeams, error: targetTeamsError } = await supabase
      .from('user_team')
      .select('team_id')
      .eq('user_id', targetUserId);
      
    if (targetTeamsError) {
      console.error('Error fetching target user teams:', targetTeamsError);
      return NextResponse.json({ 
        error: 'Failed to fetch target user teams' 
      }, { status: 500 });
    }
    
    // If target user has no teams, they are external
    if (!targetUserTeams || targetUserTeams.length === 0) {
      return NextResponse.json({
        hasRelationship: false,
        isExternal: true,
        commonTeamCount: 0
      });
    }
    
    // Extract team IDs
    const targetTeamIds = targetUserTeams.map(team => team.team_id);
    
    // Check if current user is in any of those teams
    const { data: commonTeams, error: commonTeamsError } = await supabase
      .from('user_team')
      .select('team_id')
      .eq('user_id', userId)
      .in('team_id', targetTeamIds);
      
    if (commonTeamsError) {
      console.error('Error checking common teams:', commonTeamsError);
      return NextResponse.json({ 
        error: 'Failed to check common teams' 
      }, { status: 500 });
    }
    
    // Return relationship data
    const hasRelationship = commonTeams && commonTeams.length > 0;
    
    return NextResponse.json({
      hasRelationship,
      isExternal: !hasRelationship,
      commonTeamCount: commonTeams?.length || 0
    });
  } catch (error) {
    console.error('Error in relationship check:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
} 