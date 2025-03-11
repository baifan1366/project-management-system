import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function PATCH(request, { params }) {
  try {
    const { userId } = await params;
    const { currentPassword, newPassword } = await request.json();

    // 使用 Supabase Auth API 更新密码
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) throw error;

    return NextResponse.json({ 
      message: 'Password updated successfully' 
    });
  } catch (error) {
    console.error('Error updating password:', error);
    return NextResponse.json(
      { error: 'Failed to update password' },
      { status: 500 }
    );
  }
} 