import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

// 获取团队的自定义字段列表
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const teamId = searchParams.get('teamId')
    const teamCFId = searchParams.get('teamCFId')

    if (!teamId) {
      return NextResponse.json({ error: '需要团队ID' }, { status: 400 })
    }

    let query = supabase
      .from('team_custom_field')
      .select(`
        *,
        custom_field (*)
      `)
      .eq('team_id', teamId)

    // 如果提供了 teamCFId，则获取单个记录
    if (teamCFId) {
      query = query.eq('id', teamCFId).single()
    } else {
      // 否则获取列表并按顺序排序
      query = query.order('order_index')
    }

    const { data, error } = await query

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
    console.log('接收到的请求体:', body);
    
    const { customFieldId, order_index, created_by } = body

    if (!teamId || !customFieldId) {
      console.log('缺少必需参数:', { teamId, customFieldId });
      return NextResponse.json({ error: '缺少必需参数' }, { status: 400 })
    }
    const { data, error } = await supabase
      .from('team_custom_field')
      .insert({
        team_id: teamId,
        custom_field_id: customFieldId,
        order_index,
        created_by: created_by
      })
      .select()
      .single()

    if (error) {
      console.error('Supabase 错误:', error);
      throw error;
    }

    console.log('创建成功，返回数据:', data);
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
