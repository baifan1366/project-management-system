import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { validateTOTP } from '@/lib/auth/2fa';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

// JWT secret key (should be in environment variables in production)
// Try to use JWT_SECRET first, but fall back to NEXT_PUBLIC_JWT_SECRET if needed
const JWT_SECRET = process.env.JWT_SECRET || process.env.NEXT_PUBLIC_JWT_SECRET;
const JWT_EXPIRY = '7d'; // Token expiry time
const ENCRYPTION_KEY = process.env.MFA_ENCRYPTION_KEY || process.env.NEXT_PUBLIC_JWT_SECRET;

/**
 * API endpoint to verify 2FA tokens during login
 * POST - Verify TOTP token or email code and complete login
 */
export async function POST(request) {
  try {
    const { userId, token: verificationToken, method } = await request.json();
    
    if (!userId || !verificationToken || !method) {
      return NextResponse.json(
        { error: 'User ID, token, and method are required' },
        { status: 400 }
      );
    }
    
    // Get user from database
    const { data: user, error: userError } = await supabase
      .from('user')
      .select('*, email_verified, mfa_secret, is_mfa_enabled, is_email_2fa_enabled')
      .eq('id', userId)
      .single();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    let isTokenValid = false;
    
    if (method === 'totp') {
      // Verify TOTP token
      if (!user.is_mfa_enabled || !user.mfa_secret) {
        return NextResponse.json(
          { error: 'TOTP 2FA is not enabled for this user' },
          { status: 400 }
        );
      }
      
      // Decrypt the secret and verify
      const secret = decryptMfaSecret(user.mfa_secret);
      isTokenValid = validateTOTP(verificationToken, secret);
    } else if (method === 'email') {
      // Verify email code
      if (!user.is_email_2fa_enabled) {
        return NextResponse.json(
          { error: 'Email 2FA is not enabled for this user' },
          { status: 400 }
        );
      }
      
      // Check if code exists and is valid
      const { data: verificationData, error: verificationError } = await supabase
        .from('email_verification_codes')
        .select('*')
        .eq('user_id', userId)
        .eq('code', verificationToken)
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
      
      // Mark code as used
      await supabase
        .from('email_verification_codes')
        .update({ used: true })
        .eq('id', verificationData.id);
      
      isTokenValid = true;
    } else {
      return NextResponse.json(
        { error: 'Invalid 2FA method' },
        { status: 400 }
      );
    }
    
    if (!isTokenValid) {
      return NextResponse.json(
        { error: 'Invalid verification code' },
        { status: 401 }
      );
    }
    
    // Token is valid, complete login process
    // Update last seen timestamp
    await supabase
      .from('user')
      .update({ 
        last_seen_at: new Date().toISOString(),
        is_online: true
      })
      .eq('id', userId);
    
    // Generate JWT token
    const jwtToken = jwt.sign(
      { 
        userId: user.id,
        email: user.email,
        name: user.name
      }, 
      JWT_SECRET, 
      { expiresIn: JWT_EXPIRY }
    );
    
    // Get user subscription info
    const { data: subscription } = await supabase
      .from('user_subscription_plan')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1);
    
    // Set cookie with improved settings
    const cookieOptions = {
      httpOnly: false, // Better security by not allowing JavaScript access
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
      path: '/',
      sameSite: 'lax' // Better compatibility with third-party contexts while maintaining security
    };
    
    try {
      // Create cookies store once and reuse it
      const cookieStore = cookies();
      await cookieStore.set('auth_token', jwtToken, cookieOptions);
      
      // For client-side detection of login state (non-sensitive)
      await cookieStore.set('user_logged_in', 'true', {
        ...cookieOptions,
        httpOnly: false // Allow JavaScript to read this cookie
      });
      
    } catch (cookieError) {
      console.error('Error setting cookies:', cookieError);
      // Continue with response but log the issue
    }
    
    // Remove sensitive data
    delete user.password_hash;
    delete user.verification_token;
    delete user.verification_token_expires;
    delete user.mfa_secret;
    
    return NextResponse.json({
      success: true,
      data: {
        user,
        subscription: subscription?.[0] || null
      }
    });
  } catch (error) {
    console.error('2FA verification error:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
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
  
  // Import decrypt function here to avoid circular dependency
  const { decrypt } = require('@/lib/auth/2fa');
  return decrypt(encryptedSecret, ENCRYPTION_KEY);
} 