import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request) {
  try {
    // 获取URL参数
    const { searchParams } = new URL(request.url);
    const agileId = searchParams.get('agileId');
    
    console.log('【API接收参数】获取敏捷详情:', { agileId });
    
    if (!agileId) {
      console.error('【API错误】敏捷ID不能为空');
      return NextResponse.json({ error: '敏捷ID不能为空' }, { status: 400 });
    }
    
    // 从数据库获取敏捷详情
    const { data, error } = await supabase
      .from('team_agile')
      .select('*')
      .eq('id', agileId)
      .single();
    
    if (error) {
      console.error(`【API错误】获取敏捷ID ${agileId} 详情失败:`, error);
      throw error;
    }
    
    console.log(`【API响应】敏捷ID ${agileId} 详情:`, data ? '成功' : '无数据');
    
    return NextResponse.json(data || null);
  } catch (error) {
    console.error('【API错误】处理请求时出错:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 