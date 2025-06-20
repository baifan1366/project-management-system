import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const teamId = searchParams.get('teamId')
    const userId = searchParams.get('userId')

    if (!teamId) {
      return NextResponse.json({ error: 'Team ID is required' }, { status: 400 })
    }

    // Query to get user role in the team
    let query = supabase
      .from('user_team')
      .select('role')
      .eq('team_id', teamId)
    
    // If userId is provided, filter by that specific user
    if (userId) {
      query = query.eq('user_id', userId)
    }

    const { data, error } = await query.single()

    if (error) {
      console.error('Error fetching team user role:', error)
      return NextResponse.json({ error: 'Failed to fetch user role' }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'User is not a member of this team' }, { status: 404 })
    }

    return NextResponse.json({ role: data.role })
  } catch (error) {
    console.error('Error in teamUserRoles route:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}