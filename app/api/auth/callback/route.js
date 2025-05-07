import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { supabase } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import { handleGoogleOAuth, handleGithubOAuth } from '@/lib/auth/oauth';
import { generateTokenForUser } from '@/lib/auth/token';

// JWT secret key (should be in environment variables in production)
// Try to use JWT_SECRET first, but fall back to NEXT_PUBLIC_JWT_SECRET if needed
const JWT_SECRET = process.env.JWT_SECRET || process.env.NEXT_PUBLIC_JWT_SECRET;

// For debugging
if (!JWT_SECRET) {
  console.warn('Neither JWT_SECRET nor NEXT_PUBLIC_JWT_SECRET is defined in environment variables');
}

const JWT_EXPIRY = '7d'; // Token expiry time

// Function to exchange OAuth code for token (Google implementation)
async function exchangeGoogleCodeForToken(code) {
  try {
    const tokenEndpoint = 'https://oauth2.googleapis.com/token';
    
    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
        client_secret: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_SECRET,
        redirect_uri: `${process.env.NEXT_PUBLIC_SITE_URL}/api/auth/callback`,
        grant_type: 'authorization_code',
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Failed to exchange code for token:', errorData);
      return { error: { message: 'Failed to exchange code for token' } };
    }
    
    const tokenData = await response.json();
    return { data: tokenData, error: null };
  } catch (error) {
    console.error('Error exchanging code for token:', error);
    return { error: { message: error.message || 'Failed to exchange code for token' } };
  }
}

// Function to exchange OAuth code for token (GitHub implementation)
async function exchangeGithubCodeForToken(code) {
  try {
    const tokenEndpoint = 'https://github.com/login/oauth/access_token';
    
    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        code,
        client_id: process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID,
        client_secret: process.env.NEXT_PUBLIC_GITHUB_CLIENT_SECRET,
        redirect_uri: `${process.env.NEXT_PUBLIC_SITE_URL}/api/auth/callback`,
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Failed to exchange code for token:', errorData);
      return { error: { message: 'Failed to exchange code for token' } };
    }
    
    const tokenData = await response.json();
    return { data: tokenData, error: null };
  } catch (error) {
    console.error('Error exchanging code for token:', error);
    return { error: { message: error.message || 'Failed to exchange code for token' } };
  }
}

// Function to get user info from providers
async function getUserInfo(tokenData, provider) {
  try {
    let userInfoEndpoint, headers, userData = {};
    
    if (provider === 'google') {
      userInfoEndpoint = 'https://www.googleapis.com/oauth2/v2/userinfo';
      headers = {
        'Authorization': `Bearer ${tokenData.access_token}`
      };
    } else if (provider === 'github') {
      userInfoEndpoint = 'https://api.github.com/user';
      headers = {
        'Authorization': `token ${tokenData.access_token}`,
        'Accept': 'application/json'
      };
    } else {
      return { error: { message: 'Unsupported provider' } };
    }
    
    const response = await fetch(userInfoEndpoint, {
      headers
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Failed to get user info:', errorData);
      return { error: { message: 'Failed to get user info' } };
    }
    
    const userInfo = await response.json();
    
    // 为用户生成一个 UUID，而不是使用 Google/GitHub 的 ID
    const userId = uuidv4();
    
    // Format user data based on provider
    if (provider === 'google') {
      userData = {
        id: userId, // 使用生成的 UUID
        email: userInfo.email,
        email_verified: true,
        google_provider_id: userInfo.id.toString(), // 保存 Google ID
        name: userInfo.name || userInfo.email.split('@')[0],
        avatar_url: userInfo.picture,
        identities: [{
          identity_data: {
            sub: userInfo.id,
            full_name: userInfo.name,
            avatar_url: userInfo.picture
          }
        }]
      };
    } else if (provider === 'github') {
      // Get email from GitHub if not included in user info
      let email = userInfo.email;
      if (!email) {
        const emailsResponse = await fetch('https://api.github.com/user/emails', {
          headers
        });
        if (emailsResponse.ok) {
          const emails = await emailsResponse.json();
          const primaryEmail = emails.find(e => e.primary) || emails[0];
          if (primaryEmail) {
            email = primaryEmail.email;
          }
        }
      }
      
      userData = {
        id: userId, // 使用生成的 UUID
        email: email,
        email_verified: true,
        github_provider_id: userInfo.id.toString(), // 保存 GitHub ID
        name: userInfo.name || userInfo.login || email.split('@')[0],
        avatar_url: userInfo.avatar_url,
        identities: [{
          identity_data: {
            sub: userInfo.id.toString(),
            preferred_username: userInfo.login,
            avatar_url: userInfo.avatar_url
          }
        }]
      };
    }
    
    return { data: userData, error: null };
  } catch (error) {
    console.error('Error getting user info:', error);
    return { error: { message: error.message || 'Failed to get user info' } };
  }
}

/**
 * OAuth callback handler - receives auth code, exchanges for tokens,
 * creates or updates user, sets auth cookie
 */
export async function GET(request) {
  const searchParams = new URL(request.url).searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  
  if (!code) {
    return NextResponse.redirect(new URL('/en/login?error=no_code', request.url));
  }
  
  try {
    // Parse state parameter to get provider and redirect URL
    const stateParams = new URLSearchParams(state);
    const provider = stateParams.get('provider');
    // 获取重定向URL
    const finalRedirect = stateParams.get('final_redirect');
    const redirectParam = stateParams.get('redirect');
    const planId = stateParams.get('plan_id');
    
    console.log('OAuth回调参数:', { provider, finalRedirect, redirectParam, planId });
    
    // 构建重定向URL
    let redirectUrl = '/projects'; // 默认重定向到项目页面
    
    if (finalRedirect) {
      // 优先使用final_redirect
      redirectUrl = finalRedirect;
    } else if (redirectParam === 'payment' && planId) {
      // 支付页面重定向
      redirectUrl = `/payment?plan_id=${planId}`;
    } else if (redirectParam && redirectParam.includes('teamInvitation')) {
      // 团队邀请页面重定向
      redirectUrl = redirectParam;
    }
    
    console.log('最终重定向URL:', redirectUrl);
    
    if (!provider) {
      return NextResponse.redirect(new URL('/en/login?error=invalid_state', request.url));
    }
    
    let userData;
    let tokens;
    
    // Exchange auth code for tokens based on provider
    try {
      if (provider === 'google') {
        ({ userData, tokens } = await handleGoogleOAuth(code));
      } else if (provider === 'github') {
        ({ userData, tokens } = await handleGithubOAuth(code));
      } else {
        return NextResponse.redirect(new URL(`/en/login?error=unsupported_provider&provider=${provider}`, request.url));
      }
    } catch (oauthError) {
      console.error(`OAuth error with ${provider}:`, oauthError);
      return NextResponse.redirect(new URL(`/en/login?error=oauth_error&provider=${provider}`, request.url));
    }
    
    if (!userData || !userData.email) {
      return NextResponse.redirect(new URL(`/en/login?error=missing_user_data&provider=${provider}`, request.url));
    }
    
    // Check if user exists by provider ID
    const providerIdField = `${provider}_provider_id`;
    const providerId = userData[providerIdField];
    
    if (!providerId) {
      return NextResponse.redirect(new URL(`/en/login?error=missing_provider_id&provider=${provider}`, request.url));
    }
    
    let userId;
    
    try {
      // Check if user exists by provider ID
      let { data: existingUserByProvider } = await supabase
        .from('user')
        .select('*')
        .eq(providerIdField, providerId)
        .maybeSingle();
      
      // If not found by provider-specific ID field, check by email
      let existingUserByEmail;
      if (!existingUserByProvider) {
        let { data: userByEmail } = await supabase
          .from('user')
          .select('*')
          .eq('email', userData.email)
          .maybeSingle();
          
        existingUserByEmail = userByEmail;
      }
      
      // User exists by provider - update tokens
      if (existingUserByProvider) {
        userId = existingUserByProvider.id;
        
        // Update user with new tokens and data
        const updateData = {
          name: userData.name || existingUserByProvider.name,
          [`${provider}_access_token`]: tokens.access_token,
          updated_at: new Date().toISOString(),
          last_login_provider: provider,
        };
        
        // Add refresh token if available
        if (tokens.refresh_token) {
          updateData[`${provider}_refresh_token`] = tokens.refresh_token;
        }
        
        // Add expiration if available
        if (tokens.expires_in) {
          updateData[`${provider}_token_expires_at`] = Date.now() + (tokens.expires_in * 1000);
        }
        
        const { error: updateError } = await supabase
          .from('user')
          .update(updateData)
          .eq('id', userId);
          
        if (updateError) {
          console.error('Error updating user:', updateError);
          throw new Error('Failed to update user');
        }
      }
      // User exists by email - bind provider to existing account
      else if (existingUserByEmail) {
        userId = existingUserByEmail.id;
        
        // Update the existing user with provider information
        const updateData = {
          [`${provider}_provider_id`]: providerId,
          [`${provider}_access_token`]: tokens.access_token,
          last_login_provider: provider,
          updated_at: new Date().toISOString(),
        };
        
        // Add refresh token if available
        if (tokens.refresh_token) {
          updateData[`${provider}_refresh_token`] = tokens.refresh_token;
        }
        
        // Add expiration if available
        if (tokens.expires_in) {
          updateData[`${provider}_token_expires_at`] = Date.now() + (tokens.expires_in * 1000);
        }
        
        // Update connected_providers array to include this provider
        let connectedProviders = existingUserByEmail.connected_providers || [];
        if (typeof connectedProviders === 'string') {
          try {
            connectedProviders = JSON.parse(connectedProviders);
          } catch (e) {
            connectedProviders = [];
          }
        }
        
        if (!connectedProviders.includes(provider)) {
          connectedProviders.push(provider);
          updateData.connected_providers = JSON.stringify(connectedProviders);
        }
        
        const { error: updateError } = await supabase
          .from('user')
          .update(updateData)
          .eq('id', userId);
          
        if (updateError) {
          console.error('Error binding provider to user:', updateError);
          throw new Error('Failed to bind provider to existing account');
        }
      }
      // Create new user
      else {
        // Generate UUID for new user
        userId = uuidv4();
        
        // Build connected providers array
        const connectedProviders = [provider];
        
        // Prepare user data
        const newUser = {
          id: userId,
          email: userData.email,
          name: userData.name,
          [`${provider}_provider_id`]: providerId,
          [`${provider}_access_token`]: tokens.access_token,
          connected_providers: JSON.stringify(connectedProviders),
          last_login_provider: provider,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        
        // Add refresh token if available
        if (tokens.refresh_token) {
          newUser[`${provider}_refresh_token`] = tokens.refresh_token;
        }
        
        // Add expiration if available
        if (tokens.expires_in) {
          newUser[`${provider}_token_expires_at`] = Date.now() + (tokens.expires_in * 1000);
        }
        
        const { error: insertError } = await supabase
          .from('user')
          .insert([newUser]);
          
        if (insertError) {
          console.error('Error creating user:', insertError);
          throw new Error('Failed to create user');
        }
      }
    } catch (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.redirect(new URL(`/en/login?error=database_error&message=${encodeURIComponent(dbError.message)}`, request.url));
    }
    
    try {
      // Generate JWT for authentication
      const token = await generateTokenForUser(userId);
      
      // Set auth cookie - cookies() 需要改用独立的cookieOperation变量
      const cookieOperation = cookies();
      await cookieOperation.set('auth_token', token, {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 30 * 24 * 60 * 60, // 30 days
      });
      
      // 重定向到指定的URL
      const locale = 'en'; // 默认使用英文locale
      
      // 处理不同类型的重定向URL
      let finalDestination;
      
      if (redirectUrl.startsWith('/') && !redirectUrl.startsWith(`/${locale}`)) {
        // 如果是相对路径并且没有locale前缀
        finalDestination = `/${locale}${redirectUrl}`;
      } else if (redirectUrl.startsWith('/')) {
        // 如果已经包含了locale前缀
        finalDestination = redirectUrl;
      } else {
        // 其他情况，确保添加locale前缀
        finalDestination = `/${locale}/${redirectUrl}`;
      }
      
      console.log('最终重定向目标:', finalDestination);
      
      // Redirect to specified URL or dashboard
      return NextResponse.redirect(new URL(finalDestination, request.url));
    } catch (authError) {
      console.error('Authentication error:', authError);
      return NextResponse.redirect(new URL(`/en/login?error=auth_error&message=${encodeURIComponent(authError.message)}`, request.url));
    }
  } catch (error) {
    console.error('Error in OAuth callback:', error);
    return NextResponse.redirect(new URL(`/en/login?error=server_error&message=${encodeURIComponent(error.message)}`, request.url));
  }
} 