import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { createServerSupabaseClient } from '@/lib/supabase';

// JWT secret key (should be in environment variables in production)
// Try to use JWT_SECRET first, but fall back to NEXT_PUBLIC_JWT_SECRET if needed
const JWT_SECRET = process.env.JWT_SECRET || process.env.NEXT_PUBLIC_JWT_SECRET;

// For debugging
if (!JWT_SECRET) {
  console.warn('Neither JWT_SECRET nor NEXT_PUBLIC_JWT_SECRET is defined in environment variables');
}

const JWT_EXPIRY = '7d'; // Token expiry time

export async function GET(request) {
  try {
    // Create a server-side Supabase client
    const supabase = createServerSupabaseClient();
    
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const planId = searchParams.get('plan_id');
    const redirect = searchParams.get('redirect');
    
    // If there was an error in the OAuth process
    if (error) {
      console.error('OAuth callback error:', error);
      return NextResponse.redirect(
        new URL(`/${process.env.NEXT_PUBLIC_DEFAULT_LOCALE}/login?error=${encodeURIComponent('Authentication failed')}`, 
        request.url)
      );
    }
    
    // If no code is provided
    if (!code) {
      console.error('No code provided in OAuth callback');
      return NextResponse.redirect(
        new URL(`/${process.env.NEXT_PUBLIC_DEFAULT_LOCALE}/login?error=${encodeURIComponent('Authentication failed')}`, 
        request.url)
      );
    }
    
    // Exchange code for session
    const { data: authData, error: authError } = await supabase.auth.exchangeCodeForSession(code);
    
    if (authError || !authData?.session?.user) {
      console.error('Failed to exchange code for session:', authError);
      return NextResponse.redirect(
        new URL(`/${process.env.NEXT_PUBLIC_DEFAULT_LOCALE}/login?error=${encodeURIComponent('Authentication failed')}`, 
        request.url)
      );
    }
    
    const user = authData.session.user;
    const provider = user.app_metadata.provider;
    
    // Check if user already exists in our database
    const { data: existingUser, error: userError } = await supabase
      .from('user')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();
    
    if (userError) {
      console.error('Error checking existing user:', userError);
    }
    
    // Build user data from provider information
    let userData = {
      id: user.id,
      email: user.email,
      email_verified: user.email_verified || true, // OAuth emails are usually verified
      provider: provider,
      provider_id: user.identities?.[0]?.identity_data?.sub || user.id,
    };
    
    // Set provider-specific data
    if (provider === 'google') {
      userData = {
        ...userData,
        name: user.identities?.[0]?.identity_data?.full_name || user.email.split('@')[0],
        avatar_url: user.identities?.[0]?.identity_data?.avatar_url,
      };
    } else if (provider === 'github') {
      userData = {
        ...userData,
        name: user.identities?.[0]?.identity_data?.preferred_username || user.email.split('@')[0],
        avatar_url: user.identities?.[0]?.identity_data?.avatar_url,
      };
    } else if (provider === 'azure') {
      userData = {
        ...userData,
        name: user.identities?.[0]?.identity_data?.name || user.email.split('@')[0],
        avatar_url: user.identities?.[0]?.identity_data?.avatar_url,
      };
    }
    
    // If user doesn't exist, create a new user
    if (!existingUser) {
      const { error: insertError } = await supabase
        .from('user')
        .insert([userData]);
      
      if (insertError) {
        console.error('Failed to create user:', insertError);
        return NextResponse.redirect(
          new URL(`/${process.env.NEXT_PUBLIC_DEFAULT_LOCALE}/login?error=${encodeURIComponent('Failed to create user')}`, 
          request.url)
        );
      }
      
      // Create free subscription plan for the user
      const now = new Date();
      const oneYearFromNow = new Date(now);
      oneYearFromNow.setFullYear(now.getFullYear() + 1);
      
      const { error: subscriptionError } = await supabase
        .from('user_subscription_plan')
        .insert([
          {
            user_id: user.id,
            plan_id: 1, // Free plan ID
            status: 'active',
            start_date: now.toISOString(),
            end_date: oneYearFromNow.toISOString()
          },
        ]);
        
      if (subscriptionError) {
        console.error('Failed to create subscription for new user:', subscriptionError);
        // Continue anyway, as this is not critical for authentication
      }
    } else {
      // Update existing user with latest OAuth data
      const { error: updateError } = await supabase
        .from('user')
        .update({
          email_verified: user.email_verified || true,
          avatar_url: userData.avatar_url || existingUser.avatar_url,
          provider: provider,
          provider_id: userData.provider_id,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);
      
      if (updateError) {
        console.error('Failed to update user:', updateError);
      }
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id,
        email: user.email,
        name: userData.name
      }, 
      JWT_SECRET, 
      { expiresIn: JWT_EXPIRY }
    );
    
    // Get user subscription info
    const { data: subscription, error: subscriptionFetchError } = await supabase
      .from('user_subscription_plan')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1);
      
    if (subscriptionFetchError) {
      console.error('Error fetching subscription:', subscriptionFetchError);
    }
    
    // Set cookie
    const cookieStore = cookies();
    cookieStore.set('auth_token', token, { 
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
      sameSite: 'lax'
    });
    
    // Determine redirection path
    let redirectUrl = `/${process.env.NEXT_PUBLIC_DEFAULT_LOCALE}/projects`;
    
    if (redirect === 'payment' && planId) {
      redirectUrl = `/${process.env.NEXT_PUBLIC_DEFAULT_LOCALE}/payment?plan_id=${planId}`;
    }
    
    return NextResponse.redirect(new URL(redirectUrl, request.url));
  } catch (error) {
    console.error('Auth callback error:', error);
    return NextResponse.redirect(
      new URL(`/${process.env.NEXT_PUBLIC_DEFAULT_LOCALE}/login?error=${encodeURIComponent('Authentication failed')}`, 
      request.url)
    );
  }
} 