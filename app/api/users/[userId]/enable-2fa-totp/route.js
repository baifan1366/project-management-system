import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth/auth';
import { generateTOTPSecret, generateQRCode, validateTOTP, encrypt } from '@/lib/auth/2fa';

const ENCRYPTION_KEY = process.env.MFA_ENCRYPTION_KEY || process.env.NEXT_PUBLIC_JWT_SECRET;

/**
 * API to generate TOTP secret and QR code for 2FA setup
 * GET - Generate and return the TOTP setup data
 * POST - Verify the token and enable 2FA
 */

// Generate TOTP secret and QR code
export async function GET(request, { params }) {
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
    
    // Get user from database to get email
    const { data: user, error: userError } = await supabase
      .from('user')
      .select('email')
      .eq('id', userId)
      .single();
      
    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Generate new TOTP secret
    const totpData = generateTOTPSecret(userId, user.email);
    
    // Generate QR code
    const qrCode = await generateQRCode(totpData.otpauthURL);
    
    // Store the secret in session storage temporarily
    // Note: In a real-world scenario, this should be encrypted and stored more securely
    // For this demo, we're using cookies to store the temporary secret
    const response = NextResponse.json({
      success: true,
      qrCode,
      secret: totpData.secret  // Sending the secret for manual entry if needed
    });
    
    // Set a cookie with the temporary secret
    response.cookies.set('temp_totp_secret', encrypt(totpData.secret, ENCRYPTION_KEY), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 15 * 60, // 15 minutes in seconds
      path: '/',
      sameSite: 'lax'
    });
    
    return response;
  } catch (error) {
    console.error('Error generating 2FA setup:', error);
    return NextResponse.json(
      { error: 'Failed to generate 2FA setup' },
      { status: 500 }
    );
  }
}

// Verify token and enable 2FA
export async function POST(request, { params }) {
  try {
    const { userId } = params;
    const { token } = await request.json();
    
    // Verify the current user matches the requested user ID
    const userData = await getCurrentUser();
    
    if (!userData || !userData.user || userData.user.id !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get the temporary secret from cookies
    const tempSecretEncrypted = request.cookies.get('temp_totp_secret')?.value;
    
    if (!tempSecretEncrypted) {
      return NextResponse.json(
        { error: 'TOTP setup expired or not found' },
        { status: 400 }
      );
    }
    
    try {
      // Decrypt the temporary secret
      const tempSecret = decrypt(tempSecretEncrypted, ENCRYPTION_KEY);
      
      // Validate the token
      const isValid = validateTOTP(token, tempSecret);
      
      if (!isValid) {
        return NextResponse.json(
          { error: 'Invalid verification code' },
          { status: 400 }
        );
      }
      
      // Save the secret to the user record and enable 2FA
      const { error: updateError } = await supabase
        .from('user')
        .update({
          mfa_secret: encrypt(tempSecret, ENCRYPTION_KEY),
          is_mfa_enabled: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);
      
      if (updateError) {
        console.error('Error updating user with 2FA:', updateError);
        return NextResponse.json(
          { error: 'Failed to enable 2FA' },
          { status: 500 }
        );
      }
      
      // Clear the temporary secret cookie
      const response = NextResponse.json({
        success: true,
        message: '2FA has been successfully enabled'
      });
      
      response.cookies.set('temp_totp_secret', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 0,
        path: '/',
        sameSite: 'lax'
      });
      
      return response;
    } catch (error) {
      console.error('Error processing 2FA verification:', error);
      return NextResponse.json(
        { error: 'Failed to process verification' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error enabling 2FA:', error);
    return NextResponse.json(
      { error: 'Failed to enable 2FA' },
      { status: 500 }
    );
  }
}

// Helper function to decrypt
function decrypt(encryptedText, encryptionKey) {
  // Import here to avoid circular dependency
  const { decrypt: decryptFunc } = require('@/lib/auth/2fa');
  return decryptFunc(encryptedText, encryptionKey);
} 