import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

// 获取单个任务
export async function GET(request, { params }) {
    const taskId = params.taskId;
    
    if (!taskId || isNaN(parseInt(taskId))) {
        return NextResponse.json({ error: '无效的任务ID' }, { status: 400 });
    }
    
    const { data, error } = await supabase
        .from('task')
        .select('*')
        .eq('id', taskId)
        .single();
        
    if (error) {
        console.error('获取任务失败:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    if (!data) {
        return NextResponse.json({ error: '未找到任务' }, { status: 404 });
    }
    
    return NextResponse.json(data);
}

// 更新任务
export async function PATCH(request, { params }) {
    try {
        const taskId = params.taskId;
        
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

// 删除任务
export async function DELETE(request, { params }) {
    try {
        const taskId = params.taskId;
        
        if (!taskId || isNaN(parseInt(taskId))) {
            return NextResponse.json({ error: '无效的任务ID' }, { status: 400 });
        }
        
        const { error } = await supabase
            .from('task')
            .delete()
            .eq('id', taskId);
        
        if (error) {
            console.error('删除任务失败:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }
        
        return NextResponse.json({ message: '任务删除成功' });
    } catch (error) {
        console.error('处理删除任务请求时出错:', error);
        return NextResponse.json({ error: '删除任务时发生错误' }, { status: 500 });
    }
} 