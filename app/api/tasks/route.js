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

export async function PATCH(request) {
    try {
        // 从URL获取taskId
        const url = new URL(request.url);
        const pathParts = url.pathname.split('/');
        const taskId = pathParts[pathParts.length - 1];
        
        // 确保taskId存在并且是有效的
        if (!taskId || isNaN(parseInt(taskId))) {
            return NextResponse.json({ error: '无效的任务ID' }, { status: 400 });
        }
        
        // 获取请求体
        const taskData = await request.json();
        
        // 更新数据库
        const { data, error } = await supabase
            .from('task')
            .update(taskData)
            .eq('id', taskId)
            .select();
        
        if (error) {
            console.error('更新任务失败:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }
        
        if (!data || data.length === 0) {
            return NextResponse.json({ error: '未找到任务' }, { status: 404 });
        }
        
        return NextResponse.json(data[0]);
    } catch (error) {
        console.error('处理更新任务请求时出错:', error);
        return NextResponse.json({ error: '更新任务时发生错误' }, { status: 500 });
    }
}