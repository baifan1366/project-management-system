import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// 连接第三方账号
export async function POST(request, { params }) {
  try {
    const { userId } = params;
    const data = await request.json();
    const { provider, providerId, providerIdField } = data;

    // 验证请求数据
    if (!provider || !providerId) {
      return NextResponse.json(
        { error: 'Provider and providerId are required' },
        { status: 400 }
      );
    }

    // 确定要更新的字段
    const updateFields = {
      last_login_provider: provider,
      updated_at: new Date().toISOString()
    };
    
    // 根据provider类型设置正确的字段
    updateFields[providerIdField || `${provider}_provider_id`] = providerId;

    // 更新用户表，添加provider信息
    const { data: userData, error: userError } = await supabase
      .from('user')
      .update(updateFields)
      .eq('id', userId)
      .select('*')
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
    const providerIdField = searchParams.get('providerIdField') || `${provider}_provider_id`;

    if (!provider) {
      return NextResponse.json(
        { error: 'Provider parameter is required' },
        { status: 400 }
      );
    }

    // 构建更新对象
    const updateFields = {
      updated_at: new Date().toISOString()
    };
    updateFields[providerIdField] = null;
    
    // 如果当前登录提供者是要解除绑定的提供者，则重置为local
    const { data: userData, error: getUserError } = await supabase
      .from('user')
      .select('last_login_provider')
      .eq('id', userId)
      .single();
      
    if (getUserError) throw getUserError;
    
    if (userData.last_login_provider === provider) {
      updateFields.last_login_provider = 'local';
    }

    // 更新用户表，移除provider信息
    const { data: updatedUserData, error: userError } = await supabase
      .from('user')
      .update(updateFields)
      .eq('id', userId)
      .select('*')
      .single();

    if (userError) throw userError;

    return NextResponse.json({ 
      message: 'Provider disconnected successfully',
      data: updatedUserData 
    });
  } catch (error) {
    console.error('Error disconnecting provider:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect provider' },
      { status: 500 }
    );
  }
} 