import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const redirect = searchParams.get('redirect');
    const planId = searchParams.get('plan_id');
    const redirectTo = searchParams.get('redirectTo');
    const calendar = searchParams.get('calendar') === 'true';
    const requestCalendarAccess = searchParams.get('requestCalendarAccess') === 'true';
    
    
    // Build Google OAuth URL
    const googleOAuthEndpoint = 'https://accounts.google.com/o/oauth2/v2/auth';
    
    // 整合回调参数
    const callbackParams = new URLSearchParams();
    callbackParams.append('provider', 'google');
    
    // 处理团队邀请页面的重定向
    if (redirect && redirect.includes('teamInvitation')) {
      callbackParams.append('redirect', redirect);
    }
    
    // If a custom redirect is provided (like for calendar), use that
    if (redirectTo) {
      callbackParams.append('final_redirect', redirectTo);
    }
    
    // Determine needed scopes
    let scopes = 'email profile';
    
    // If calendar access is requested, add calendar scopes
    if (calendar || requestCalendarAccess || (redirectTo && redirectTo.includes('/calendar'))) {
      scopes += ' https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly';
    }
    
    // Construct Google OAuth URL
    const oauthUrl = new URL(googleOAuthEndpoint);
    oauthUrl.searchParams.append('client_id', process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);
    oauthUrl.searchParams.append('redirect_uri', `${process.env.NEXT_PUBLIC_SITE_URL}/api/auth/callback`);
    oauthUrl.searchParams.append('response_type', 'code');
    oauthUrl.searchParams.append('scope', scopes);
    oauthUrl.searchParams.append('access_type', 'offline');
    oauthUrl.searchParams.append('prompt', 'consent');
    
    // 简化 state 参数，不再使用完整 URL，而是用一个简单的参数字符串
    oauthUrl.searchParams.append('state', callbackParams.toString());
    
    // Redirect to Google OAuth URL
    return NextResponse.redirect(oauthUrl.toString());
  } catch (error) {
    console.error('Google OAuth route error:', error);
    return NextResponse.redirect(
      new URL(`/en/login?error=${encodeURIComponent('Failed to authenticate with Google')}`, 
      request.url)
    );
  }
} 