import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET(request) {
    const { data, error } = await supabase
        .from('task')
        .select('*')
            
    if (error) {
        console.error(error)
        return NextResponse.json({ error: '获取任务失败' }, { status: 500 })
    }
        
    return NextResponse.json(data)
}

export async function POST(request) {
    const body = await request.json()
    const { data, error } = await supabase
    .from('task')
    .insert([body])
    .select()
    
    if(error) {
        console.error(error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    // 返回第一个元素而不是数组
    return NextResponse.json(data[0])
}