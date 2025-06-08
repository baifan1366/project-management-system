import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * Check if a user has any relationship with multiple other users in a single request
 * This endpoint supports batch operations to reduce multiple API calls
 * 
 * @param {Request} request - The request object
 * @returns {Promise<NextResponse>} JSON response with relationship data for multiple users
 */
export async function POST(request) {
  try {
    // Get the user IDs from the request body
    const { userId, targetUserIds } = await request.json();
    
    // Validate input
    if (!userId || !Array.isArray(targetUserIds) || targetUserIds.length === 0) {
      return NextResponse.json({ 
        error: 'userId and non-empty targetUserIds array are required' 
      }, { status: 400 });
    }
    
    // Initialize results object with default values
    const results = Object.fromEntries(
      targetUserIds.map(targetId => [
        targetId, 
        {
          hasRelationship: userId === targetId, // Same user has relationship with self
          isExternal: userId !== targetId, // Default to external unless proven otherwise
          commonTeamCount: 0
        }
      ])
    );

    // Filter out self-checks as they're already handled
    const idsToCheck = targetUserIds.filter(id => id !== userId);
    
    if (idsToCheck.length === 0) {
      return NextResponse.json(results);
    }
    
    // Get all teams for the target users in one query
    const { data: targetUsersTeams, error: targetTeamsError } = await supabase
      .from('user_team')
      .select('user_id, team_id')
      .in('user_id', idsToCheck);
      
    if (targetTeamsError) {
      console.error('Error fetching target users teams:', targetTeamsError);
      return NextResponse.json({ 
        error: 'Failed to fetch target users teams' 
      }, { status: 500 });
    }
    
    // Group teams by user ID
    const teamsByUser = {};
    for (const record of targetUsersTeams || []) {
      if (!teamsByUser[record.user_id]) {
        teamsByUser[record.user_id] = [];
      }
      teamsByUser[record.user_id].push(record.team_id);
    }
    
    // For users with no teams, they remain external
    // For users with teams, check if the current user is in any of them
    const usersWithTeams = Object.keys(teamsByUser);
    
    if (usersWithTeams.length > 0) {
      // Get all the teams the current user belongs to
      const { data: currentUserTeams, error: currentUserTeamsError } = await supabase
        .from('user_team')
        .select('team_id')
        .eq('user_id', userId);
        
      if (currentUserTeamsError) {
        console.error('Error fetching current user teams:', currentUserTeamsError);
        return NextResponse.json({ 
          error: 'Failed to fetch current user teams' 
        }, { status: 500 });
      }
      
      // Convert to a Set for faster lookups
      const currentUserTeamSet = new Set(
        (currentUserTeams || []).map(team => team.team_id)
      );
      
      // Update results for each user with team information
      for (const targetUserId of usersWithTeams) {
        const targetTeams = teamsByUser[targetUserId] || [];
        
        // Check for common teams
        const commonTeams = targetTeams.filter(teamId => 
          currentUserTeamSet.has(teamId)
        );
        
        // Update relationship data
        results[targetUserId] = {
          hasRelationship: commonTeams.length > 0,
          isExternal: commonTeams.length === 0,
          commonTeamCount: commonTeams.length
        };
      }
    }
    
    return NextResponse.json(results);
  } catch (error) {
    console.error('Error in batch relationship check:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
} 