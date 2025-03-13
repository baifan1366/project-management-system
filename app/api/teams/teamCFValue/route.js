import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

// 获取团队自定义字段值列表
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const teamId = searchParams.get('teamId')
    const customFieldId = searchParams.get('customFieldId')

    if (!teamId || !customFieldId) {
      return NextResponse.json({ error: '缺少必需参数' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('team_custom_field_value')
      .select('*')
      .eq('team_custom_field_id', customFieldId)

    if (error) throw error

    return NextResponse.json({ data })
  } catch (error) {
    console.error('获取团队自定义字段值失败:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// 创建团队自定义字段值
export async function POST(request) {
  try {
    const { searchParams } = new URL(request.url)
    const teamId = searchParams.get('teamId')
    const customFieldId = searchParams.get('customFieldId')
    const body = await request.json()
    const { name, description, icon, value } = body

    if (!teamId || !customFieldId) {
      return NextResponse.json({ error: '缺少必需参数' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('team_custom_field_value')
      .insert({
        team_custom_field_id: customFieldId,
        name,
        description,
        icon,
        value
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ data })
  } catch (error) {
    console.error('创建团队自定义字段值失败:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// 更新团队自定义字段值
export async function PATCH(request) {
  try {
    const { searchParams } = new URL(request.url)
    const teamId = searchParams.get('teamId')
    const customFieldId = searchParams.get('customFieldId')
    const valueId = searchParams.get('customFieldValueId')
    const body = await request.json()
    const { name, description, icon, value } = body

    if (!teamId || !customFieldId || !valueId) {
      return NextResponse.json({ error: '缺少必需参数' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('team_custom_field_value')
      .update({
        name,
        description,
        icon,
        value,
        updated_at: new Date().toISOString()
      })
      .eq('id', valueId)
      .eq('team_custom_field_id', customFieldId)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ data })
  } catch (error) {
    console.error('更新团队自定义字段值失败:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// 删除团队自定义字段值
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url)
    const teamId = searchParams.get('teamId')
    const customFieldId = searchParams.get('customFieldId')
    const valueId = searchParams.get('customFieldValueId')

    if (!teamId || !customFieldId || !valueId) {
      return NextResponse.json({ error: '缺少必需参数' }, { status: 400 })
    }

    const { error } = await supabase
      .from('team_custom_field_value')
      .delete()
      .eq('id', valueId)
      .eq('team_custom_field_id', customFieldId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('删除团队自定义字段值失败:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
