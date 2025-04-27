import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export async function GET(request) {
  try {
    // Create a server-side Supabase client
    const supabase = createServerSupabaseClient();
    
    const { searchParams } = new URL(request.url);
    const redirect = searchParams.get('redirect');
    const planId = searchParams.get('plan_id');
    
    // Build redirect URL
    let redirectUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/${process.env.NEXT_PUBLIC_DEFAULT_LOCALE}/auth/callback`;
    
    // Add plan_id and redirect params if they exist
    if (redirect === 'payment' && planId) {
      redirectUrl += `?redirect=payment&plan_id=${planId}`;
    }
    
    // Redirect to Supabase OAuth
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: redirectUrl,
        scopes: 'read:user user:email',
      },
    });
    
    if (error) {
      console.error('GitHub OAuth error:', error);
      return NextResponse.redirect(
        new URL(`/${process.env.NEXT_PUBLIC_DEFAULT_LOCALE}/login?error=${encodeURIComponent(error.message)}`, 
        request.url)
      );
    }
    
    // Redirect to the provided URL
    return NextResponse.redirect(data.url);
  } catch (error) {
    console.error('GitHub OAuth route error:', error);
    return NextResponse.redirect(
      new URL(`/${process.env.NEXT_PUBLIC_DEFAULT_LOCALE}/login?error=${encodeURIComponent('Failed to authenticate with GitHub')}`, 
      request.url)
    );
  }
} 