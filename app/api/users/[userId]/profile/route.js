import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function PATCH(request, { params }) {
  try {
    const { userId } = params;
    const data = await request.json();
    const { name, language, timezone, phone, theme, google_provider_id, github_provider_id, last_login_provider } = data;

    // 更新用户表
    const { data: userData, error: userError } = await supabase
      .from('user')
      .update({
        name,
        language,
        phone,
        theme,
        google_provider_id,
        github_provider_id,
        last_login_provider,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select('*')
      .single();

    if (userError) throw userError;

    return NextResponse.json({ 
      message: 'Profile updated successfully',
      data: userData 
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }
} 