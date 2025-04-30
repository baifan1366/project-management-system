import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET(request) {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (id) {
        // 获取单个标签
        const { data, error } = await supabase
            .from('tag')
            .select('*')
            .eq('id', id)
            .single()
            
        if (error) {
            console.error(error)
            return NextResponse.json({ error: '获取标签失败' }, { status: 500 })
        }
        
        return NextResponse.json(data)
    } else {
        // 获取所有标签
        const { data, error } = await supabase
            .from('tag')
            .select('*')
            .order('id', { ascending: true })
            .eq('default', true)
            
        if (error) {
            console.error(error)
            return NextResponse.json({ error: '获取标签列表失败' }, { status: 500 })
        }
        
        return NextResponse.json(data)
    }
}

export async function POST(request) {
    const body = await request.json()
    const { data, error } = await supabase
    .from('tag')
    .insert([body])
    .select()
    
    if(error) {
        console.error(error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    // 返回第一个元素而不是数组
    return NextResponse.json(data[0])
}