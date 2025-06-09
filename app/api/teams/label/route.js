import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const teamId = searchParams.get('id')

    let data, error

    if (teamId) {
      ({ data, error } = await supabase
        .from('team')
        .select('label')
        .eq('id', teamId)
        .single())
    } 
    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: error.message || '获取团队失败' },
        { status: 500 }
      )
    }

    return NextResponse.json(data || {})
  } catch (error) {
    console.error('Error fetching teams:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch teams' },
      { status: 500 }
    )
  }
}

//each column has data like {"TAGS": [""], "MULTI-SELECT": [""], "SINGLE-SELECT": ["{\"label\":\"Completed\",\"value\":\"completed\",\"color\":\"#10b981\"}", "{\"label\":\"In Progress\",\"value\":\"inProgress\",\"color\":\"#123456\"}"], "TAGS-SELECTED": [""], "MULTI-SELECTED": [""], "SINGLE-SELECTED": "{\"label\":\"Completed\",\"value\":\"completed\",\"color\":\"#10b981\"}"}
//PUT for update whole column label, the data is like {"TAGS": ["Completed", "In Progress"], "MULTI-SELECT": ["Completed", "In Progress"], "SINGLE-SELECT": ["Completed", "In Progress"], "TAGS-SELECTED": ["Completed", "In Progress"], "MULTI-SELECTED": ["Completed", "In Progress"], "SINGLE-SELECTED": "Completed"}
export async function PUT(request) {
  try {
    const { searchParams } = new URL(request.url)
    const label = await request.json()
    const teamId = searchParams.get('id')

    // 更新标签数据
    const { data, error } = await supabase
      .from('team')
      .update({ label })
      .eq('id', teamId)
      .select('label')
      .single()

    if (error) {
      console.error('Error updating label:', error)
      return NextResponse.json(
        { error: 'Failed to update label: ' + error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(data, { status: 200 })
  } catch (error) {
    console.error('Error updating label:', error)
    return NextResponse.json(
      { error: 'Failed to update label: ' + (error.message || 'Unknown error') },
      { status: 500 }
    )
  }
}