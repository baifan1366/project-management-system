import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server';

export async function GET(request,{ params }) {
  try {
    const { userId } = params;

    let data, error

    if (userId) {
      // Fetch a specific project by ID
      ({ data, error } = await supabase
        .from('project')
        .select('*')
        .eq('created_by', userId))
    } else {
      // Fetch all projects
      ({ data, error } = await supabase
        .from('project')
        .select('*'))
    }

    if (error) {
      console.error('Database error:', error)
      throw error
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching projects:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch projects' },
      { status: 500 }
    )
  }
}