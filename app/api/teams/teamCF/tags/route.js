import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

// 获取自定义字段关联的标签
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const teamId = searchParams.get('teamId')
    const teamCFId = searchParams.get('teamCFId')

    if (!teamId || !teamCFId) {
      return NextResponse.json({ error: '需要团队ID和自定义字段ID' }, { status: 400 })
    }

    // 获取自定义字段信息以获取关联的标签ID
    const { data: fieldData, error: fieldError } = await supabase
      .from('team_custom_field')
      .select('tag_ids')
      .eq('id', teamCFId)
      .eq('team_id', teamId)
      .single()
      .order('id', { ascending: true })
    
    if (fieldError) {
      console.error('获取字段标签ID失败:', fieldError)
      return NextResponse.json({ error: fieldError.message }, { status: 500 })
    }
    
    const tagIds = fieldData?.tag_ids || []
    
    // 如果有标签ID，获取标签详细信息
    if (tagIds.length > 0) {
      const { data: tagData, error: tagError } = await supabase
        .from('tag')
        .select('*')
        .in('id', tagIds)
        .order('id', { ascending: true })
        
      if (tagError) {
        console.error('获取标签详情失败:', tagError)
        return NextResponse.json({ error: tagError.message }, { status: 500 })
      }
      
      // 返回标签ID和详细信息
      return NextResponse.json({ 
        tag_ids: tagIds,
        tags: tagData 
      })
    }
    
    // 无标签时仅返回空数组
    return NextResponse.json({ 
      tag_ids: tagIds,
      tags: [] 
    })
  } catch (error) {
    console.error('获取字段关联标签失败:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// 更新自定义字段关联的标签
export async function PATCH(request) {
  try {
    const { searchParams } = new URL(request.url)
    const teamId = searchParams.get('teamId')
    const teamCFId = searchParams.get('teamCFId')
    const { tagIds } = await request.json()

    if (!teamId || !teamCFId) {
      return NextResponse.json({ error: '需要团队ID和自定义字段ID' }, { status: 400 })
    }

    if (!Array.isArray(tagIds)) {
      return NextResponse.json({ error: '标签ID必须是数组' }, { status: 400 })
    }

    // 注意：关于tag_ids的数据类型
    // 在JavaScript中，tag_ids应始终作为数组处理，无论是存储还是读取
    // 数据库中tag_ids存储方式:
    // - PostgreSQL的JSON或JSONB类型：直接存储为JSON数组 [1, 2, 3]
    // - 如果使用字符串类型存储：会被序列化为 "1,2,3" 或 "[1,2,3]"
    // 
    // 区别在于：
    // 1. 如果tag_ids存为字符串 "[1,2,3]"，需要用JSON.parse()解析
    // 2. 如果tag_ids存为数组，可以直接使用
    // 3. Supabase通常会自动处理JSON类型与JavaScript数组的转换

    // 更新自定义字段关联的标签
    const { data, error } = await supabase
      .from('team_custom_field')
      .update({ tag_ids: tagIds })
      .eq('id', teamCFId)
      .eq('team_id', teamId)
      .select()
      .single()

    if (error) {
      console.error('更新标签关联失败:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // 获取更新后的标签详情
    if (tagIds.length > 0) {
      const { data: tagData, error: tagError } = await supabase
        .from('tag')
        .select('*')
        .in('id', tagIds)
      
      if (tagError) {
        console.error('获取更新后的标签详情失败:', tagError)
        return NextResponse.json({ error: tagError.message }, { status: 500 })
      }
      
      return NextResponse.json({ 
        success: true, 
        data: { ...data, tags: tagData } 
      })
    }

    return NextResponse.json({ 
      success: true, 
      data: { ...data, tags: [] } 
    })
  } catch (error) {
    console.error('更新标签关联失败:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
