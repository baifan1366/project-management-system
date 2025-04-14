import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

// 获取所有任务
export async function GET(request) {
    try {
        // 不再依赖服务器认证，而是简单地返回所有任务
        // 注意：在实际生产环境中，你应该添加一些访问控制机制，例如请求标头中的API密钥
        
        // 查询数据库获取所有任务
        const { data, error } = await supabase
            .from('task')
            .select('*');

        if (error) {
            console.error('获取所有任务失败:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error('处理获取所有任务请求时出错:', error);
        return NextResponse.json({ error: '获取所有任务时发生错误' }, { status: 500 });
    }
} 