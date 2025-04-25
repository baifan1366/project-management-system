import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { supabase } from '@/lib/supabase';
import { sendPasswordResetEmail } from '@/lib/email';

// JWT secret key (should be in environment variables in production)
const JWT_SECRET = process.env.NEXT_PUBLIC_JWT_SECRET || 'your-secret-key';

// Password validation function
function isValidPassword(password) {
  // At least 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special character
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
}

// Request password reset
export async function POST(request) {
  try {
    const data = await request.json();
    const { email, locale = 'en' } = data;
    
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }
    
    // Check if user exists
    const { data: user, error: userError } = await supabase
      .from('user')
      .select('id, email, name')
      .eq('email', email.toLowerCase())
      .single();
    
    if (userError || !user) {
      // Don't reveal if email exists or not for security
      return NextResponse.json({ 
        success: true, 
        message: 'If your email exists in our system, you will receive password reset instructions.'
      });
    }
    
    // Generate reset token
    const resetToken = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
    
    // Add expiration time (1 hour from now)
    const tokenExpires = new Date();
    tokenExpires.setHours(tokenExpires.getHours() + 1);
    
    // Save reset token to user
    const { error: updateError } = await supabase
      .from('user')
      .update({
        reset_password_token: resetToken,
        reset_password_expires: tokenExpires.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);
    
    if (updateError) {
      console.error('Error saving reset token:', updateError);
      return NextResponse.json({ error: 'Failed to process password reset' }, { status: 500 });
    }
    
    // Send password reset email
    const emailResult = await sendPasswordResetEmail({
      to: user.email,
      name: user.name,
      token: resetToken,
      locale
    });
    
    if (!emailResult.success) {
      console.error('Failed to send password reset email:', emailResult.error);
      return NextResponse.json({ error: 'Failed to send password reset email' }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      message: 'Password reset instructions sent to your email'
    });
  } catch (error) {
    console.error('Password reset request error:', error);
    return NextResponse.json({ error: 'Failed to process password reset' }, { status: 500 });
  }
}

// Verify and set new password
export async function PUT(request) {
  try {
    const data = await request.json();
    const { token, password, confirmPassword } = data;
    
    if (!token || !password || !confirmPassword) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }
    
    if (password !== confirmPassword) {
      return NextResponse.json({ error: 'Passwords do not match' }, { status: 400 });
    }
    
    if (!isValidPassword(password)) {
      return NextResponse.json({ 
        error: 'Password must be at least 8 characters long and include uppercase, lowercase, number, and special character' 
      }, { status: 400 });
    }
    
    try {
      // Verify token
      const decoded = jwt.verify(token, JWT_SECRET);
      const { userId } = decoded;
      
      // Find user with this token
      const { data: user, error: userError } = await supabase
        .from('user')
        .select('*')
        .eq('id', userId)
        .eq('reset_password_token', token)
        .single();
      
      if (userError || !user) {
        return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 });
      }
      
      // Check if token is expired
      const tokenExpires = new Date(user.reset_password_expires);
      if (tokenExpires < new Date()) {
        return NextResponse.json({ error: 'Password reset token has expired' }, { status: 400 });
      }
      
      // Update password in Supabase Auth
      const { error: authUpdateError } = await supabase.auth.admin.updateUserById(
        userId,
        { password }
      );
      
      if (authUpdateError) {
        console.error('Auth password update error:', authUpdateError);
        return NextResponse.json({ error: 'Failed to update password' }, { status: 500 });
      }
      
      // Clear reset token
      const { error: updateError } = await supabase
        .from('user')
        .update({
          reset_password_token: null,
          reset_password_expires: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);
      
      if (updateError) {
        console.error('Error clearing reset token:', updateError);
        // Continue anyway since we've already changed the password
      }
      
      return NextResponse.json({
        success: true,
        message: 'Password has been updated successfully'
      });
    } catch (tokenError) {
      console.error('Token verification error:', tokenError);
      return NextResponse.json({ error: 'Invalid password reset token' }, { status: 400 });
    }
  } catch (error) {
    console.error('Password reset error:', error);
    return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 });
  }
} 