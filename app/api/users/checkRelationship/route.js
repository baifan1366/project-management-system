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
    
    // Get teams the current user belongs to
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
    
    if (!currentUserTeams || currentUserTeams.length === 0) {
      return NextResponse.json({
        hasRelationship: false,
        isExternal: true,
        commonTeamCount: 0
      });
    }
    
    // Get projects for the current user's teams
    const currentUserTeamIds = currentUserTeams.map(team => team.team_id);
    
    const { data: currentUserProjects, error: currentUserProjectsError } = await supabase
      .from('team')
      .select('project_id')
      .in('id', currentUserTeamIds);
      
    if (currentUserProjectsError) {
      console.error('Error fetching current user projects:', currentUserProjectsError);
      return NextResponse.json({ 
        error: 'Failed to fetch current user projects' 
      }, { status: 500 });
    }
    
    // Convert to a Set for faster lookups
    const currentUserProjectSet = new Set(
      (currentUserProjects || []).map(team => team.project_id)
    );
    
    // Check for common projects
    const commonProjects = targetProjectIds.filter(projectId => 
      currentUserProjectSet.has(projectId)
    );
    
    // Return relationship data
    const hasRelationship = commonProjects.length > 0;
    
    return NextResponse.json({
      hasRelationship,
      isExternal: !hasRelationship,
      commonTeamCount: commonProjects.length
    });
  } catch (error) {
    console.error('Error in relationship check:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
} 