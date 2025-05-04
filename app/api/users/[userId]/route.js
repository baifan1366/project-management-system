import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * 根据用户ID获取用户基本信息
 * @param {Object} request - 请求对象
 * @param {Object} params - 包含userId的路由参数
 * @returns {Promise<NextResponse>} 包含用户数据的响应
 */
export async function GET(request, { params }) {
  try {
    const { userId } = params;
    
    if (!userId) {
      return NextResponse.json({ 
        success: false, 
        error: '用户ID不能为空' 
      }, { status: 400 });
    }

    // 从supabase获取用户数据，只返回需要的字段
    const { data, error } = await supabase
      .from('user')
      .select('id, name, avatar_url, email')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('获取用户数据失败:', error);
      return NextResponse.json({ 
        success: false, 
        error: '获取用户数据失败' 
      }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ 
        success: false, 
        error: '用户不存在' 
      }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      data 
    });
  } catch (error) {
    console.error('服务器错误:', error);
    return NextResponse.json({ 
      success: false, 
      error: '服务器内部错误' 
    }, { status: 500 });
  }
}
