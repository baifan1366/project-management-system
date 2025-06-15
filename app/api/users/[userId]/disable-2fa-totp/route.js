import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth/auth';
import { validateTOTP } from '@/lib/auth/2fa';
import bcrypt from 'bcryptjs';

/**
 * API to disable TOTP-based 2FA
 * POST - Validate password and token before disabling 2FA
 */
export async function POST(request, { params }) {
  try {
    const { userId } = params;
    const { password, token } = await request.json();
    
    // Validate input
    if (!password) {
      return NextResponse.json(
        { error: 'Password is required' },
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
    
    // Get user from database including password hash and MFA secret
    const { data: user, error: userError } = await supabase
      .from('user')
      .select('password_hash, mfa_secret, is_mfa_enabled')
      .eq('id', userId)
      .single();
      
    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Verify 2FA is actually enabled
    if (!user.is_mfa_enabled || !user.mfa_secret) {
      return NextResponse.json(
        { error: '2FA is not enabled' },
        { status: 400 }
      );
    }
    
    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid password' },
        { status: 401 }
      );
    }
    
    // If token is provided, verify it
    if (token) {
      // Need to decrypt the stored secret first
      const secret = decryptMfaSecret(user.mfa_secret);
      const isTokenValid = validateTOTP(token, secret);
      
      if (!isTokenValid) {
        return NextResponse.json(
          { error: 'Invalid verification code' },
          { status: 401 }
        );
      }
    }
    
    // Disable 2FA
    const { error: updateError } = await supabase
      .from('user')
      .update({
        mfa_secret: null,
        is_mfa_enabled: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);
    
    if (updateError) {
      console.error('Error disabling 2FA:', updateError);
      return NextResponse.json(
        { error: 'Failed to disable 2FA' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: '2FA has been successfully disabled'
    });
  } catch (error) {
    console.error('Error disabling 2FA:', error);
    return NextResponse.json(
      { error: 'Failed to disable 2FA' },
      { status: 500 }
    );
  }
}

/**
 * Helper function to decrypt MFA secret
 * @param {string} encryptedSecret - The encrypted MFA secret
 * @returns {string} - The decrypted secret
 */
function decryptMfaSecret(encryptedSecret) {
  if (!encryptedSecret) return null;
  
  const ENCRYPTION_KEY = process.env.MFA_ENCRYPTION_KEY || process.env.NEXT_PUBLIC_JWT_SECRET;
  
  // Import decrypt function here to avoid circular dependency
  const { decrypt } = require('@/lib/auth/2fa');
  return decrypt(encryptedSecret, ENCRYPTION_KEY);
} 