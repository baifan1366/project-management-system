import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

// 获取团队的自定义字段列表
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const teamId = searchParams.get('teamId')

    if (!teamId) {
      return NextResponse.json({ error: '需要团队ID' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('team_custom_field')
      .select(`
        *,
        custom_field (*)
      `)
      .eq('team_id', teamId)
      .order('order_index')

    if (error) throw error

    return NextResponse.json({ data })
  } catch (error) {
    console.error('获取团队自定义字段失败:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// 创建团队自定义字段
export async function POST(request) {
  try {
    const { searchParams } = new URL(request.url)
    const teamId = searchParams.get('teamId')
    const body = await request.json()
    const { customFieldId, config } = body

    if (!teamId || !customFieldId) {
      return NextResponse.json({ error: '缺少必需参数' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('team_custom_field')
      .insert({
        team_id: teamId,
        custom_field_id: customFieldId,
        config,
        is_enabled: true
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ data })
  } catch (error) {
    console.error('创建团队自定义字段失败:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// 删除团队自定义字段
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url)
    const teamId = searchParams.get('teamId')
    const customFieldId = searchParams.get('customFieldId')

    if (!teamId || !customFieldId) {
      return NextResponse.json({ error: '缺少必需参数' }, { status: 400 })
    }

    const { error } = await supabase
      .from('team_custom_field')
      .delete()
      .eq('team_id', teamId)
      .eq('custom_field_id', customFieldId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('删除团队自定义字段失败:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// 更新团队自定义字段顺序
export async function PATCH(request) {
  try {
    const { searchParams } = new URL(request.url)
    const teamId = searchParams.get('teamId')
    const { orderedFields } = await request.json()

    if (!teamId || !orderedFields || !Array.isArray(orderedFields)) {
      return NextResponse.json({ error: '缺少必需参数或格式不正确' }, { status: 400 })
    }

    // 使用简单的循环更新每个字段的顺序
    for (let i = 0; i < orderedFields.length; i++) {
      const field = orderedFields[i]
      const { error } = await supabase
        .from('team_custom_field')
        .update({ order_index: i })
        .eq('id', field.id)
        .eq('team_id', teamId)
      
      if (error) throw error
    }

    // 获取更新后的字段列表
    const { data: updatedFields, error: fetchError } = await supabase
      .from('team_custom_field')
      .select(`
        *,
        custom_field (*)
      `)
      .eq('team_id', teamId)
      .order('order_index')

    if (fetchError) throw fetchError

    return NextResponse.json({ data: updatedFields })
  } catch (error) {
    console.error('更新团队自定义字段顺序失败:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
