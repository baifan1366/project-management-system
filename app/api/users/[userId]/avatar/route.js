import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function PATCH(request, { params }) {
  try {
    const { userId } = params;
    const { avatar_url } = await request.json();

    if (!avatar_url) {
      return NextResponse.json(
        { error: 'Avatar URL is required' },
        { status: 400 }
      );
    }

    // Update the user's avatar URL in the database
    const { data: userData, error: userError } = await supabase
      .from('user')
      .update({ 
        avatar_url,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select('*')
      .single();

    if (userError) {
      console.error('Avatar update error:', userError);
      return NextResponse.json(
        { error: `Failed to update avatar: ${userError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      message: 'Avatar updated successfully',
      data: userData 
    });
  } catch (error) {
    console.error('Error updating avatar:', error);
    return NextResponse.json(
      { error: 'Failed to update avatar' },
      { status: 500 }
    );
  }
} 