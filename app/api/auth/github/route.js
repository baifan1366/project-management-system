import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const redirect = searchParams.get('redirect');
    const planId = searchParams.get('plan_id');
    const redirectTo = searchParams.get('redirectTo');
    
    
    
    // Build GitHub OAuth URL
    const githubOAuthEndpoint = 'https://github.com/login/oauth/authorize';
    
    // 整合回调参数
    const callbackParams = new URLSearchParams();
    callbackParams.append('provider', 'github');
    
    // Add plan_id and redirect params if they exist
    if (redirect === 'payment' && planId) {
      callbackParams.append('redirect', 'payment');
      callbackParams.append('plan_id', planId);
    } 
    // 处理团队邀请页面的重定向
    else if (redirect && redirect.includes('teamInvitation')) {
      callbackParams.append('redirect', redirect);
    }
    
    // If a custom redirect is provided, use that
    if (redirectTo) {
      callbackParams.append('final_redirect', redirectTo);
    }
    
    // Construct GitHub OAuth URL
    const oauthUrl = new URL(githubOAuthEndpoint);
    oauthUrl.searchParams.append('client_id', process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID);
    oauthUrl.searchParams.append('redirect_uri', `${process.env.NEXT_PUBLIC_SITE_URL}/api/auth/callback`);
    oauthUrl.searchParams.append('scope', 'read:user user:email');
    
    // 简化 state 参数，不再使用完整 URL，而是用一个简单的参数字符串
    oauthUrl.searchParams.append('state', callbackParams.toString());
    
    // Redirect to GitHub OAuth URL
    return NextResponse.redirect(oauthUrl.toString());
  } catch (error) {
    console.error('GitHub OAuth route error:', error);
    return NextResponse.redirect(
      new URL(`/en/login?error=${encodeURIComponent('Failed to authenticate with GitHub')}`, 
      request.url)
    );
  }
} 