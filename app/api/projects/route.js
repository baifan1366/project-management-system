import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

// GET /api/projects
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('project')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/projects
export async function POST(request) {
  try {
    const body = await request.json()
    const { data, error } = await supabase
      .from('project')
      .insert([body])
      .select()

    if (error) throw error
    
    return NextResponse.json(data[0])
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
