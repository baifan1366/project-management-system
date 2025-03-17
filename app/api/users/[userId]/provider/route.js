import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// 连接第三方账号
export async function POST(request, { params }) {
  try {
    const { userId } = params;
    const data = await request.json();
    const { provider, providerId } = data;

    // 验证请求数据
    if (!provider || !providerId) {
      return NextResponse.json(
        { error: 'Provider and providerId are required' },
        { status: 400 }
      );
    }

    // 更新用户表，添加provider信息
    const { data: userData, error: userError } = await supabase
      .from('user')
      .update({
        provider,
        provider_id: providerId,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .single();

    if (userError) throw userError;

    return NextResponse.json({ 
      message: 'Provider connected successfully',
      data: userData 
    });
  } catch (error) {
    console.error('Error connecting provider:', error);
    return NextResponse.json(
      { error: 'Failed to connect provider' },
      { status: 500 }
    );
  }
}

// 解除第三方账号绑定
export async function DELETE(request, { params }) {
  try {
    const { userId } = params;
    const { searchParams } = new URL(request.url);
    const provider = searchParams.get('provider');

    if (!provider) {
      return NextResponse.json(
        { error: 'Provider parameter is required' },
        { status: 400 }
      );
    }

    // 更新用户表，移除provider信息
    const { data: userData, error: userError } = await supabase
      .from('user')
      .update({
        provider: 'local',
        provider_id: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .eq('provider', provider)
      .single();

    if (userError) throw userError;

    return NextResponse.json({ 
      message: 'Provider disconnected successfully',
      data: userData 
    });
  } catch (error) {
    console.error('Error disconnecting provider:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect provider' },
      { status: 500 }
    );
  }
} 