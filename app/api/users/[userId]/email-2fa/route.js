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
    const { userId } = await params;
    const { action, password } = await request.json();
    
    // Skip authentication check for login verification
    if (action !== 'send_code') {
      // Verify the current user matches the requested user ID
      const userData = await getCurrentUser();
      
      if (!userData || !userData.user || userData.user.id !== userId) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
    }
    
    // Get user from database to get email
    const { data: user, error: userError } = await supabase
      .from('user')
      .select('email, name, password_hash, is_email_2fa_enabled')
      .eq('id', userId)
      .single();
      
    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // If action is to send a disable code, verify password and that email 2FA is enabled
    if (action === 'send_disable_code') {
      if (!password) {
        return NextResponse.json(
          { error: 'Password is required' },
          { status: 400 }
        );
      }
      
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
    
    // If code exists, update it, otherwise create a new one
    if (existingCode) {
      await supabase
        .from('email_verification_codes')
        .update({
          code: verificationCode,
          expires_at: expirationTime,
          used: false,
        })
        .eq('id', existingCode.id);
    } else {
      await supabase
        .from('email_verification_codes')
        .insert({
          user_id: userId,
          code: verificationCode,
          type: 'TWO_FACTOR',
          expires_at: expirationTime,
          used: false
        });
    }
    
    // Create the email HTML
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333;">Two-Factor Authentication Code</h1>
        <p>Hello ${user.name},</p>
        ${action === 'send_disable_code' 
          ? `<p>You've requested to disable email-based two-factor authentication for your account. To confirm this action, please use this verification code:</p>` 
          : `<p>To complete your sign-in, please use the following verification code:</p>`
        }
        <div style="background-color: #f4f4f4; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center;">
          <h2 style="margin: 0; font-size: 32px; letter-spacing: 5px; color: #4f46e5;">${verificationCode}</h2>
        </div>
        <p>This code will expire in 5 minutes for security reasons.</p>
        ${action === 'send_disable_code'
          ? `<p><strong>Warning:</strong> If you did not request to disable two-factor authentication, please reset your password immediately as your account may be compromised.</p>`
          : `<p>If you didn't request this code, you can safely ignore this email. Someone may have typed your email address by mistake.</p>`
        }
        <p>Thank you,<br />The Support Team</p>
      </div>
    `;
    
    await sendEmail({
      to: user.email,
      subject: action === 'send_disable_code' 
        ? 'Security Alert: Confirm Disabling Two-Factor Authentication' 
        : 'Your Two-Factor Authentication Code',
      html: emailHtml,
      text: action === 'send_disable_code'
        ? `Your verification code to disable two-factor authentication is: ${verificationCode}. This code will expire in 5 minutes. If you did not request to disable 2FA, please reset your password immediately.`
        : `Your two-factor authentication code is: ${verificationCode}. This code will expire in 5 minutes.`
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
    const { userId } = await params;
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