import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * Check if a user has any relationship with another user
 * This endpoint is designed for direct frontend calls
 * Users are considered related if they are in any teams within the same project
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
    
    // Get project IDs for the target user's teams
    const targetTeamIds = targetUserTeams.map(team => team.team_id);
    
    // Get projects associated with these teams
    const { data: targetTeamProjects, error: projectsError } = await supabase
      .from('team')
      .select('project_id')
      .in('id', targetTeamIds);
      
    if (projectsError) {
      console.error('Error fetching target team projects:', projectsError);
      return NextResponse.json({ 
        error: 'Failed to fetch target team projects' 
      }, { status: 500 });
    }
    
    // If no projects found, they are external
    if (!targetTeamProjects || targetTeamProjects.length === 0) {
      return NextResponse.json({
        hasRelationship: false,
        isExternal: true,
        commonTeamCount: 0
      });
    }
    
    // Get unique project IDs
    const targetProjectIds = [...new Set(targetTeamProjects.map(team => team.project_id))];
    
    // Check if current user has any teams in these projects
    const { data: currentUserProjectTeams, error: userProjectTeamsError } = await supabase
      .from('user_team')
      .select('user_team.team_id, team.project_id')
      .eq('user_team.user_id', userId)
      .in('team.project_id', targetProjectIds)
      .join('team', { 'user_team.team_id': 'team.id' });
      
    if (userProjectTeamsError) {
      console.error('Error checking common project teams:', userProjectTeamsError);
      return NextResponse.json({ 
        error: 'Failed to check common project teams' 
      }, { status: 500 });
    }
    
    // Return relationship data
    const hasRelationship = currentUserProjectTeams && currentUserProjectTeams.length > 0;
    
    return NextResponse.json({
      hasRelationship,
      isExternal: !hasRelationship,
      commonTeamCount: currentUserProjectTeams?.length || 0
    });
  } catch (error) {
    console.error('Error in relationship check:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
} 