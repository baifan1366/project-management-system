import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function PATCH(request, { params }) {
  try {
    const { userId } = await params;
    const data = await request.json();
    const { language, timezone, theme, hour_format } = data;

    // 更新用户表
    const { data: userData, error: userError } = await supabase
      .from('user')
      .update({
        language,
        theme,
        timezone,
        hour_format,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select('*')
      .single();

    if (userError) throw userError;

    return NextResponse.json({ 
      message: 'Settings updated successfully',
      data: userData 
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
} 