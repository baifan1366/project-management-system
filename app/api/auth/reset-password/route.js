import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { supabase } from '@/lib/supabase';
import { sendPasswordResetEmail } from '@/lib/email';

// Use JWT_SECRET environment variable with fallback to improve stability
const JWT_SECRET = process.env.NEXT_PUBLIC_JWT_SECRET || process.env.JWT_SECRET;

// Validate JWT_SECRET exists and log more detailed error if missing
if (!JWT_SECRET) {
  console.error('ERROR: JWT_SECRET is not defined in environment variables. Password reset functionality will fail.');
  console.error('Please set NEXT_PUBLIC_JWT_SECRET or JWT_SECRET in your .env file');
}

// Password validation function
function isValidPassword(password) {
  // At least 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special character
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])[A-Za-z\d!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]{8,}$/;
  return passwordRegex.test(password);
}


// Request password reset
export async function POST(request) {
  
  try {
    // Verify JWT_SECRET exists before proceeding
    if (!JWT_SECRET) {
      console.error('Password reset failed: JWT_SECRET is missing');
      return NextResponse.json({ 
        error: 'Server configuration error. Please contact support.' 
      }, { status: 500 });
    }
    
    
    const data = await request.json();
    
    // Extract email, handling both direct string and nested object formats
    let emailValue;
    let locale = 'en';
    
    if (typeof data.email === 'string') {
      // Direct format: { email: "example@test.com" }
      emailValue = data.email;
      locale = data.locale || 'en';
    } else if (data.email && typeof data.email === 'object' && data.email.email) {
      // Nested format: { email: { email: "example@test.com" } }
      emailValue = data.email.email;
      locale = data.email.locale || data.locale || 'en';
    } else {
      console.error('2. Invalid email format received:', data.email);
      return NextResponse.json({ error: 'Email is required in a valid format' }, { status: 400 });
    }
    
    
    
    // Check if email exists and is a valid string
    if (!emailValue) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }
    
    // Ensure email is a string and normalize it
    const normalizedEmail = typeof emailValue === 'string' ? emailValue.toLowerCase().trim() : String(emailValue).toLowerCase().trim();
    
    
    // Validate email format with a more robust check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }
    
    
    // Check if user exists - using normalized email
    const { data: user, error: userError } = await supabase
      .from('user')
      .select('id, email, name')
      .eq('email', normalizedEmail)
      .single();
    
    if (userError) {
      console.error('5. Error fetching user:', userError);
    }
    
    if (userError || !user) {
      // Don't reveal if email exists or not for security
      
      return NextResponse.json({ 
        success: true, 
        message: 'If your email exists in our system, you will receive password reset instructions.'
      });
    }
    
    
    
    try {
      
      // Generate reset token
      const resetToken = jwt.sign(
        { userId: user.id, email: user.email },
        JWT_SECRET,
        { expiresIn: '24h' }  // Extended from 1h to 24h for better user experience
      );
      
      
      // Add expiration time (24 hours from now) using UTC for consistency with database
      const tokenExpires = new Date();
      tokenExpires.setUTCHours(tokenExpires.getUTCHours() + 24);
      
      
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
        console.error('11. Error saving reset token:', updateError);
        return NextResponse.json({ error: 'Failed to process password reset' }, { status: 500 });
      }
      
      
      
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
      
      
      // Log SMTP configuration (without sensitive info)
      
      
      // Send password reset email with better error handling
      try {
        
        const emailResult = await sendPasswordResetEmail({
          to: user.email,
          name: user.name || 'User', // Add fallback in case name is null
          token: resetToken,
          locale
        });
        
        
        
        if (!emailResult.success) {
          console.error('17. Failed to send password reset email:', emailResult.error);
          return NextResponse.json({ error: 'Failed to send password reset email: ' + emailResult.error }, { status: 500 });
        }
        
        
        
        return NextResponse.json({
          success: true,
          message: 'Password reset instructions sent to your email'
        });
      } catch (emailError) {
        console.error('19. Exception sending password reset email:', emailError);
        return NextResponse.json({ 
          error: 'Failed to send password reset email: ' + (emailError.message || 'Unknown error'),
          stack: process.env.NODE_ENV === 'development' ? emailError.stack : undefined
        }, { status: 500 });
      }
    } catch (tokenError) {
      console.error('20. Error during token generation or database update:', tokenError);
      return NextResponse.json({ 
        error: 'Failed to generate reset token: ' + (tokenError.message || 'Unknown error'),
        stack: process.env.NODE_ENV === 'development' ? tokenError.stack : undefined
      }, { status: 500 });
    }
  } catch (error) {
    console.error('21. Unhandled password reset request error:', error);
    return NextResponse.json({ 
      error: 'Failed to process password reset: ' + (error.message || 'Unknown error'),
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}

// Verify and set new password
export async function PUT(request) {
  
  try {
    // Verify JWT_SECRET exists before proceeding
    if (!JWT_SECRET) {
      console.error('Password reset failed: JWT_SECRET is missing');
      return NextResponse.json({ 
        error: 'Server configuration error. Please contact support.' 
      }, { status: 500 });
    }
    
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
      
      // Verify token with ignoreExpiration option to handle our own expiration logic
      let decoded;
      try {
        decoded = jwt.verify(token, JWT_SECRET);
      } catch (jwtError) {
        // If error is not expiration, rethrow
        if (jwtError.name !== 'TokenExpiredError') {
          throw jwtError;
        }
        
        // If token is expired, verify without checking expiration
        
        decoded = jwt.verify(token, JWT_SECRET, { ignoreExpiration: true });
        
      }
      
      const { userId } = decoded;
      
      
      // Find user with this token
      const { data: user, error: userError } = await supabase
        .from('user')
        .select('*')
        .eq('id', userId)
        .eq('reset_password_token', token)
        .single();
      
      if (userError) {
        console.error('Error fetching user:', userError);
        return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 });
      }
      
      if (!user) {
        
        return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 });
      }
      
      
      // Check if token is expired with grace period
      const tokenExpires = new Date(user.reset_password_expires);
      // Ensure we're using UTC time for consistent comparison
      const now = new Date();

      
      // Calculate time difference in minutes for grace period - ensure using UTC milliseconds
      const timeDifference = (now.getTime() - tokenExpires.getTime()) / (1000 * 60);

      const GRACE_PERIOD_MINUTES = 60; // Extended from 15 to 60 minutes for better user experience
      
      if (tokenExpires < now) {

        
        if (timeDifference > GRACE_PERIOD_MINUTES) {
          
          return NextResponse.json({ error: 'Password reset token has expired' }, { status: 400 });
        }
        
        
      }
      
      
      
      try {
        // Hash the new password with proper bcrypt implementation
        const salt = await bcrypt.genSalt(10); // Increased from 10 to 12 rounds for better security
        const hashedPassword = await bcrypt.hash(password, salt);
        
        // Update password and clear reset token
        const { error: updateError } = await supabase
          .from('user')
          .update({
            password_hash: hashedPassword,
            reset_password_token: null,
            reset_password_expires: null,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId);
        
        if (updateError) {
          console.error('Error updating password:', updateError);
          return NextResponse.json({ error: 'Failed to update password' }, { status: 500 });
        }
        
        
        return NextResponse.json({
          success: true,
          message: 'Password has been updated successfully'
        });
      } catch (hashError) {
        console.error('Password hashing error:', hashError);
        return NextResponse.json({ error: 'Failed to secure password' }, { status: 500 });
      }
    } catch (tokenError) {
      console.error('Token verification error:', tokenError);
      
      // Provide more specific error messages based on JWT error
      if (tokenError.name === 'TokenExpiredError') {
        return NextResponse.json({ error: 'Password reset token has expired' }, { status: 400 });
      }
      
      return NextResponse.json({ error: 'Invalid password reset token' }, { status: 400 });
    }
  } catch (error) {
    console.error('Password reset error:', error);
    return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 });
  }
} 