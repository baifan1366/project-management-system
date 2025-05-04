import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

// GET /api/projects/:id/team - Get teams for a specific project where the user is a member
export async function GET(request, { params }) {
  try {
    const projectId = params.id
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      )
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // First, get all teams for the project
    let { data: teams, error: teamsError } = await supabase
      .from('team')
      .select('*')
      .eq('project_id', projectId)

    if (teamsError) {
      console.error('Database error:', teamsError)
      throw teamsError
    }

    if (!teams || teams.length === 0) {
      return NextResponse.json([])
    }

    // Get the teams where the user is a member
    const teamIds = teams.map(team => team.id)
    let { data: userTeams, error: userTeamsError } = await supabase
      .from('user_team')
      .select('team_id')
      .eq('user_id', userId)
      .in('team_id', teamIds)

    if (userTeamsError) {
      console.error('Database error:', userTeamsError)
      throw userTeamsError
    }

    if (!userTeams || userTeams.length === 0) {
      return NextResponse.json([])
    }

    // Filter teams where the user is a member
    const userTeamIds = userTeams.map(ut => ut.team_id)
    const userAccessibleTeams = teams.filter(team => userTeamIds.includes(team.id))

    return NextResponse.json(userAccessibleTeams)
  } catch (error) {
    console.error('Error fetching teams:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch teams' },
      { status: 500 }
    )
  }
}
