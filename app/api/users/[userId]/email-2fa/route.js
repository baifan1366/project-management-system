import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth/auth';
import { generateEmailVerificationCode } from '@/lib/auth/2fa';
import { sendEmail } from '@/lib/email';

/**
 * API for email-based 2FA
 * POST - Send verification code to user's email
 * PUT - Verify the provided code
 */

// API to send verification code
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
    
    // Get user from database to get email
    const { data: user, error: userError } = await supabase
      .from('user')
      .select('email, name')
      .eq('id', userId)
      .single();
      
    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Generate a 6-digit code
    const verificationCode = generateEmailVerificationCode();
    
    // Store the code in the database with expiration time (5 minutes)
    const expirationTime = new Date();
    expirationTime.setMinutes(expirationTime.getMinutes() + 5);
    
    // Check if a code already exists for this user
    const { data: existingCode } = await supabase
      .from('email_verification_codes')
      .select('id')
      .eq('user_id', userId)
      .eq('type', 'TWO_FACTOR')
      .single();
    
    if (existingCode) {
      // Update existing code
      const { error: updateError } = await supabase
        .from('email_verification_codes')
        .update({
          code: verificationCode,
          expires_at: expirationTime.toISOString(),
          created_at: new Date().toISOString(),
          used: false
        })
        .eq('id', existingCode.id);
      
      if (updateError) {
        console.error('Error updating verification code:', updateError);
        return NextResponse.json(
          { error: 'Failed to send verification code' },
          { status: 500 }
        );
      }
    } else {
      // Insert new code
      const { error: insertError } = await supabase
        .from('email_verification_codes')
        .insert({
          user_id: userId,
          code: verificationCode,
          expires_at: expirationTime.toISOString(),
          type: 'TWO_FACTOR',
          used: false
        });
      
      if (insertError) {
        console.error('Error inserting verification code:', insertError);
        return NextResponse.json(
          { error: 'Failed to send verification code' },
          { status: 500 }
        );
      }
    }
    
    // Send email with the code
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Your Verification Code</h2>
        <p>Hello ${user.name || 'User'},</p>
        <p>Your two-factor authentication code is:</p>
        <div style="background-color: #f4f4f4; padding: 10px; font-size: 24px; font-weight: bold; text-align: center; letter-spacing: 5px; margin: 20px 0;">
          ${verificationCode}
        </div>
        <p>This code will expire in 5 minutes.</p>
        <p>If you didn't request this code, please ignore this email or contact support if you have concerns.</p>
        <p>Best regards,<br>Team Sync</p>
      </div>
    `;
    
    await sendEmail({
      to: user.email,
      subject: 'Your Two-Factor Authentication Code',
      html: emailHtml,
      text: `Your two-factor authentication code is: ${verificationCode}. This code will expire in 5 minutes.`
    });
    
    return NextResponse.json({
      success: true,
      message: 'Verification code sent',
      expiresAt: expirationTime.toISOString()
    });
  } catch (error) {
    console.error('Error sending verification code:', error);
    return NextResponse.json(
      { error: 'Failed to send verification code' },
      { status: 500 }
    );
  }
}

// API to verify the code
export async function PUT(request, { params }) {
  try {
    const { userId } = params;
    const { code } = await request.json();
    
    if (!code) {
      return NextResponse.json(
        { error: 'Verification code is required' },
        { status: 400 }
      );
    }
    
    // Get the verification code from the database
    const { data: verificationData, error: verificationError } = await supabase
      .from('email_verification_codes')
      .select('*')
      .eq('user_id', userId)
      .eq('code', code)
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
    const now = new Date();
    const expiresAt = new Date(verificationData.expires_at);
    
    if (now > expiresAt) {
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
    
    // Generate a session token for authenticated 2FA
    // This will be stored in a cookie by the frontend to indicate that 2FA has been completed
    const twoFactorToken = generateTwoFactorToken(userId);
    
    return NextResponse.json({
      success: true,
      twoFactorToken
    });
  } catch (error) {
    console.error('Error verifying code:', error);
    return NextResponse.json(
      { error: 'Failed to verify code' },
      { status: 500 }
    );
  }
}

/**
 * Generate a token for 2FA verification
 * @param {string} userId - The user ID
 * @returns {string} - A token string
 */
function generateTwoFactorToken(userId) {
  const timestamp = Date.now();
  const randomPart = Math.random().toString(36).substring(2, 15);
  return `${userId}_${timestamp}_${randomPart}`;
} 