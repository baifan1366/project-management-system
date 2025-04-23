import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

// 获取用户任务
export async function GET(request) {
    try {
        // 获取查询参数
        const url = new URL(request.url);
        const userId = url.searchParams.get('userId');

        // 确保提供了userId
        if (!userId) {
            return NextResponse.json({ error: '缺少用户ID参数' }, { status: 400 });
        }
        
        // 如果前端请求使用'current'作为userId，我们需要拒绝，因为服务器无法确定当前用户
        if (userId === 'current') {
            return NextResponse.json({ 
                error: '服务器端无法识别"current"用户，请从客户端传入明确的用户ID' 
            }, { status: 400 });
        }
        
        // 获取用户创建的任务
        const { data: createdTasks, error: createdError } = await supabase
            .from('task')
            .select('*')
            .eq('created_by', userId);
            
        if (createdError) {
            console.error('获取用户创建的任务失败:', createdError);
            return NextResponse.json({ error: createdError.message }, { status: 500 });
        }
        
        // 返回用户创建的任务
        // 注意：由于JSONB查询复杂性，我们暂时只返回用户创建的任务
        // 在前端我们可以使用过滤器来处理assignee_id
        console.log(`成功获取用户创建的任务，找到 ${createdTasks.length} 个任务`);
        return NextResponse.json(createdTasks);
    } catch (error) {
        console.error('处理获取用户任务请求时出错:', error);
        return NextResponse.json({ error: '获取用户任务时发生错误' }, { status: 500 });
    }
} 