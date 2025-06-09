import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * Check if a user has any relationship with multiple other users in a single request
 * This endpoint supports batch operations to reduce multiple API calls
 * Users are considered related if they are in any teams within the same project
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
    
    // Check if there are any teams to process
    if (!targetUsersTeams || targetUsersTeams.length === 0) {
      return NextResponse.json(results);
    }

    // Get all team IDs to fetch projects
    const teamIds = [...new Set(targetUsersTeams.map(record => record.team_id))];
    
    // Get projects for these teams
    const { data: teamProjects, error: projectsError } = await supabase
      .from('team')
      .select('id, project_id')
      .in('id', teamIds);
      
    if (projectsError) {
      console.error('Error fetching team projects:', projectsError);
      return NextResponse.json({ 
        error: 'Failed to fetch team projects' 
      }, { status: 500 });
    }
    
    // Map teams to their projects
    const teamToProjectMap = {};
    for (const team of teamProjects || []) {
      teamToProjectMap[team.id] = team.project_id;
    }
    
    // Group users by projects they belong to
    const userProjectsMap = {};
    for (const record of targetUsersTeams) {
      const projectId = teamToProjectMap[record.team_id];
      if (!projectId) continue;
      
      if (!userProjectsMap[record.user_id]) {
        userProjectsMap[record.user_id] = new Set();
      }
      userProjectsMap[record.user_id].add(projectId);
    }
    
    // Get all projects the current user belongs to
    const { data: currentUserTeams, error: currentUserTeamsError } = await supabase
      .from('user_team')
      .select('user_team.team_id, team.project_id')
      .eq('user_team.user_id', userId)
      .join('team', { 'user_team.team_id': 'team.id' });
      
    if (currentUserTeamsError) {
      console.error('Error fetching current user teams:', currentUserTeamsError);
      return NextResponse.json({ 
        error: 'Failed to fetch current user teams' 
      }, { status: 500 });
    }
    
    // Get the current user's projects
    const currentUserProjectSet = new Set(
      (currentUserTeams || []).map(record => record.project_id)
    );
    
    // Update results for each target user based on project relationships
    for (const targetUserId in userProjectsMap) {
      const targetUserProjects = userProjectsMap[targetUserId];
      
      // Check for common projects
      const commonProjects = [...targetUserProjects].filter(projectId => 
        currentUserProjectSet.has(projectId)
      );
      
      // Update relationship data
      results[targetUserId] = {
        hasRelationship: commonProjects.length > 0,
        isExternal: commonProjects.length === 0,
        commonTeamCount: commonProjects.length // This now represents common projects count
      };
    }
    
    return NextResponse.json(results);
  } catch (error) {
    console.error('Error in batch relationship check:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
} 