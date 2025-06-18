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
    const { userId } = await params;
    
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
    const { userId } = await params;
    const { password, verificationCode } = await request.json();
    
    // Validate input
    if (!password) {
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 }
      );
    }
    
    if (!verificationCode) {
      return NextResponse.json(
        { error: 'Verification code is required' },
        { status: 400 }
      );
    }
    
    // Verify the current user matches the requested user ID
    const userData = await getCurrentUser();
    
    if (!userData || !userData.user || userData.user.id !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get user from database including password hash
    const { data: user, error: userError } = await supabase
      .from('user')
      .select('password_hash, is_email_2fa_enabled')
      .eq('id', userId)
      .single();
      
    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Verify 2FA is actually enabled
    if (!user.is_email_2fa_enabled) {
      return NextResponse.json(
        { error: 'Email 2FA is not enabled' },
        { status: 400 }
      );
    }
    
    // Verify password
    const bcrypt = require('bcryptjs');
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid password' },
        { status: 401 }
      );
    }
    
    // Verify the email verification code
    const { data: verificationData, error: verificationError } = await supabase
      .from('email_verification_codes')
      .select('*')
      .eq('user_id', userId)
      .eq('code', verificationCode)
      .eq('type', 'TWO_FACTOR')
      .eq('used', false)
      .single();
    
    if (verificationError || !verificationData) {
      return NextResponse.json(
        { error: 'Invalid verification code' },
        { status: 401 }
      );
    }
    
    // Check if code has expired
    // Use UTC time for comparison to avoid timezone issues
    const now = new Date();
    const expiresAt = new Date(verificationData.expires_at);
    
    // Add 8 hours to the expiration time to account for UTC+8 timezone
    const adjustedExpiresAt = new Date(expiresAt.getTime() + (8 * 60 * 60 * 1000));
    
    if (now > adjustedExpiresAt) {
      return NextResponse.json(
        { error: 'Verification code has expired' },
        { status: 401 }
      );
    }
    
    // Mark the code as used
    await supabase
      .from('email_verification_codes')
      .update({ used: true })
      .eq('id', verificationData.id);
    
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