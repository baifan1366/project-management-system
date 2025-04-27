import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { supabase } from '@/lib/supabase';
import { sendVerificationEmail } from '@/lib/email';

// JWT secret key (should be in environment variables in production)
// Try to use JWT_SECRET first, but fall back to NEXT_PUBLIC_JWT_SECRET if needed
const JWT_SECRET = process.env.JWT_SECRET || process.env.NEXT_PUBLIC_JWT_SECRET;

// For debugging
if (!JWT_SECRET) {
  console.warn('Neither JWT_SECRET nor NEXT_PUBLIC_JWT_SECRET is defined in environment variables');
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    
    if (!token) {
      return NextResponse.json({ error: 'Verification token is required' }, { status: 400 });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, JWT_SECRET);
      const { userId, email } = decoded;

      // Find user with this token
      const { data: user, error: userError } = await supabase
        .from('user')
        .select('*')
        .eq('id', userId)
        .eq('verification_token', token)
        .single();

      if (userError || !user) {
        return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 });
      }

      // Check if token is expired
      const tokenExpires = new Date(user.verification_token_expires);
      if (tokenExpires < new Date()) {
        return NextResponse.json({ error: 'Verification token has expired' }, { status: 400 });
      }

      // Update user record
      const { error: updateError } = await supabase
        .from('user')
        .update({
          email_verified: true,
          verification_token: null,
          verification_token_expires: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (updateError) {
        console.error('Error updating user:', updateError);
        return NextResponse.json({ error: 'Failed to verify email' }, { status: 500 });
      }

      // Also update Supabase Auth user
      const { error: authUpdateError } = await supabase.auth.admin.updateUserById(
        userId,
        { email_confirm: true }
      );

      if (authUpdateError) {
        console.error('Error updating auth user:', authUpdateError);
        // Continue anyway since we've already updated our own database
      }

      // Return success JSON response instead of redirect
      return NextResponse.json({ 
        success: true, 
        message: 'Email verified successfully',
        redirectUrl: '/login?verified=true'
      });
    } catch (tokenError) {
      console.error('Token verification error:', tokenError);
      return NextResponse.json({ error: 'Invalid verification token' }, { status: 400 });
    }
  } catch (error) {
    console.error('Verification error:', error);
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const data = await request.json();
    const { email, locale = 'en' } = data;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Find user by email
    const { data: user, error: userError } = await supabase
      .from('user')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if already verified
    if (user.email_verified) {
      return NextResponse.json({ 
        success: true,
        message: 'Email is already verified'
      });
    }

    // Generate new verification token
    const verificationToken = jwt.sign(
      { userId: user.id, email },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Add expiration time (24 hours from now)
    const tokenExpires = new Date();
    tokenExpires.setHours(tokenExpires.getHours() + 24);

    // Update user with new token
    const { error: updateError } = await supabase
      .from('user')
      .update({
        verification_token: verificationToken,
        verification_token_expires: tokenExpires.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Error updating verification token:', updateError);
      return NextResponse.json({ error: 'Failed to generate verification token' }, { status: 500 });
    }

    // Send verification email
    const emailResult = await sendVerificationEmail({
      to: email,
      name: user.name,
      token: verificationToken,
      locale
    });

    if (!emailResult.success) {
      console.error('Failed to send verification email:', emailResult.error);
      return NextResponse.json({ error: 'Failed to send verification email' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Verification email sent'
    });
  } catch (error) {
    console.error('Resend verification error:', error);
    return NextResponse.json({ error: 'Failed to send verification email' }, { status: 500 });
  }
} 