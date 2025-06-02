import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { supabase } from '@/lib/supabase';
import { sendVerificationEmail } from '@/lib/email';
import { v4 as uuidv4 } from 'uuid';

// JWT secret key (should be in environment variables in production)
// Try to use JWT_SECRET first, but fall back to NEXT_PUBLIC_JWT_SECRET if needed
const JWT_SECRET = process.env.JWT_SECRET || process.env.NEXT_PUBLIC_JWT_SECRET;

// For debugging
if (!JWT_SECRET) {
  console.warn('Neither JWT_SECRET nor NEXT_PUBLIC_JWT_SECRET is defined in environment variables');
}

const JWT_EXPIRY = '7d'; // Token expiry time

// Email validation function
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Password validation function
function isValidPassword(password) {
  // At least 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special character
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])[A-Za-z\d!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]{8,}$/;
  return passwordRegex.test(password);
}


export async function POST(request) {
  try {
    const data = await request.json();
    const { action } = data;

    if (action === 'login') {
      return handleLogin(data);
    } else if (action === 'signup') {
      return handleSignup(data);
    } else if (action === 'logout') {
      return handleLogout();
    } else {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Auth API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Handler for user login
async function handleLogin(data) {
  const { email, password } = data;

  // Input validation
  if (!email || !password) {
    return NextResponse.json(
      { error: 'Email and password are required' },
      { status: 400 }
    );
  }

  if (!isValidEmail(email)) {
    return NextResponse.json(
      { error: 'Invalid email format' },
      { status: 400 }
    );
  }

  try {
    // Find the user by email
    const { data: user, error } = await supabase
      .from('user')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();

    if (error || !user) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    
    if (!isMatch) {
      console.log(`Failed login attempt for user: ${user.email} - Invalid password`);
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Check if the account is verified
    if (user.email_verified === false) {
      return NextResponse.json(
        { error: 'Please verify your email address before logging in', needVerification: true },
        { status: 403 }
      );
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id,
        email: user.email,
        name: user.name
      }, 
      JWT_SECRET, 
      { expiresIn: JWT_EXPIRY }
    );

    // Update last seen timestamp
    await supabase
      .from('user')
      .update({ 
        last_seen_at: new Date().toISOString(),
        is_online: true
      })
      .eq('id', user.id);

    // Get user subscription info
    const { data: subscription } = await supabase
      .from('user_subscription_plan')
      .select('*')
      .eq('user_id', user.id)
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
      await cookieStore.set('auth_token', token, cookieOptions);
      
      // For client-side detection of login state (non-sensitive)
      await cookieStore.set('user_logged_in', 'true', {
        ...cookieOptions,
        httpOnly: false // Allow JavaScript to read this cookie
      });
      
      // Log all cookies for debugging
      const allCookies = await cookieStore.getAll();
      console.log('All cookies:', Object.fromEntries(allCookies.map(c => [c.name, c.value])));
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
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
}

// Handler for user signup
async function handleSignup(data) {
  const { name, email, password, confirmPassword, locale = 'en' } = data;

  // Input validation
  if (!name || !email || !password || !confirmPassword) {
    return NextResponse.json(
      { error: 'All fields are required' },
      { status: 400 }
    );
  }

  if (password !== confirmPassword) {
    return NextResponse.json(
      { error: 'Passwords do not match' },
      { status: 400 }
    );
  }

  if (!isValidEmail(email)) {
    return NextResponse.json(
      { error: 'Invalid email format' },
      { status: 400 }
    );
  }

  if (!isValidPassword(password)) {
    return NextResponse.json(
      { error: 'Password must be at least 8 characters long and include uppercase, lowercase, number, and special character' },
      { status: 400 }
    );
  }

  try {
    // Check if email already exists
    const { data: existingUser } = await supabase
      .from('user')
      .select('id')
      .eq('email', email.toLowerCase())
      .single();

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 409 }
      );
    }

    // Generate a UUID for the user
    const userId = uuidv4();
    
    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Generate verification token
    const verificationToken = jwt.sign(
      { userId, email },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Add expiration time (24 hours from now)
    const tokenExpires = new Date();
    tokenExpires.setHours(tokenExpires.getHours() + 24);

    // Create the user in our database
    const { error: userError } = await supabase
      .from('user')
      .insert([
        {
          id: userId,
          name,
          email: email.toLowerCase(),
          email_verified: false,
          password_hash: hashedPassword,
          verification_token: verificationToken,
          verification_token_expires: tokenExpires.toISOString()
        },
      ]);

    if (userError) {
      console.error('User creation error:', userError);
      return NextResponse.json(
        { error: `Failed to create user profile: ${userError.message}` },
        { status: 500 }
      );
    }

    // Create free subscription plan for the user
    const now = new Date();
    
    // 获取 plan_id=1 的 billing interval
    const { data: planData, error: planError } = await supabase
      .from('subscription_plan')
      .select('billing_interval')
      .eq('id', 1)
      .single();

    if (planError) {
      console.error('Error fetching plan details:', planError);
    }

    // 检查 billing_interval 是否为 NULL
    let endDate = null;
    if (planData && planData.billing_interval) {
      const oneYearFromNow = new Date(now);
      oneYearFromNow.setFullYear(now.getFullYear() + 1);
      endDate = oneYearFromNow.toISOString();
    }
    
    await supabase
      .from('user_subscription_plan')
      .insert([
        {
          user_id: userId,
          plan_id: 1, // Free plan ID
          status: 'active',
          start_date: now.toISOString(),
          end_date: endDate // 如果 billing_interval 为 NULL，end_date 也为 NULL
        },
      ]);

    // Send verification email but don't block registration if it fails
    let emailResult = { success: false, error: null };
    
    // Complete the registration process regardless of email status
    const response = {
      success: true,
      message: 'User registered successfully.',
      verification: true,
      emailSent: false,
      userId: userId
    };

    // Try to send email in the background
    try {
      emailResult = await sendVerificationEmail({
        to: email,
        name,
        token: verificationToken,
        locale
      });

      response.emailSent = emailResult.success;
      
      if (emailResult.success) {
        response.message += ' Please check your email to verify your account.';
      } else {
        console.error('Failed to send verification email:', emailResult.error);
        response.message += ' We were unable to send a verification email at this time.';
      }
    } catch (emailError) {
      console.error('Error sending verification email:', emailError);
      response.message += ' We were unable to send a verification email at this time.';
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: `Registration failed: ${error.message}` },
      { status: 500 }
    );
  }
}

// Handler for user logout
async function handleLogout() {
  try {
    // Clear the auth cookie
    const cookieStore = cookies();
    await cookieStore.delete('auth_token');
    await cookieStore.delete('user_logged_in');
    
    // Log cookies after clearing
    const remainingCookies = await cookieStore.getAll();
    console.log('Cookies after logout:', Object.fromEntries(remainingCookies.map(c => [c.name, c.value])));

    return NextResponse.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Logout failed' },
      { status: 500 }
    );
  }
} 