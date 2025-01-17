import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

// GET /api/tasks
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')

    let query = supabase.from('tasks').select('*')
    
    if (projectId) {
      query = query.eq('project_id', projectId)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/tasks
export async function POST(request) {
  try {
    const body = await request.json()
    const { data, error } = await supabase
      .from('tasks')
      .insert([body])
      .select()

    if (error) throw error

    return NextResponse.json(data[0])
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
