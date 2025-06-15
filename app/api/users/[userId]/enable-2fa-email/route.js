import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth/auth';

/**
 * API to enable or disable email-based 2FA
 * POST - Enable email-based 2FA
 * DELETE - Disable email-based 2FA
 */

// Enable email-based 2FA
export async function POST(request, { params }) {
  try {
    const { userId } = params;
    
    // Verify the current user matches the requested user ID
    const userData = await getCurrentUser();
    
    if (!userData || !userData.user || userData.user.id !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Update the user record to enable email-based 2FA
    const { error: updateError } = await supabase
      .from('user')
      .update({
        is_email_2fa_enabled: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);
    
    if (updateError) {
      console.error('Error enabling email 2FA:', updateError);
      return NextResponse.json(
        { error: 'Failed to enable email 2FA' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Email 2FA has been successfully enabled'
    });
  } catch (error) {
    console.error('Error enabling email 2FA:', error);
    return NextResponse.json(
      { error: 'Failed to enable email 2FA' },
      { status: 500 }
    );
  }
}

// Disable email-based 2FA
export async function DELETE(request, { params }) {
  try {
    const { userId } = params;
    
    // Verify the current user matches the requested user ID
    const userData = await getCurrentUser();
    
    if (!userData || !userData.user || userData.user.id !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Update the user record to disable email-based 2FA
    const { error: updateError } = await supabase
      .from('user')
      .update({
        is_email_2fa_enabled: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);
    
    if (updateError) {
      console.error('Error disabling email 2FA:', updateError);
      return NextResponse.json(
        { error: 'Failed to disable email 2FA' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Email 2FA has been successfully disabled'
    });
  } catch (error) {
    console.error('Error disabling email 2FA:', error);
    return NextResponse.json(
      { error: 'Failed to disable email 2FA' },
      { status: 500 }
    );
  }
} 