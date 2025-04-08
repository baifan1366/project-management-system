import { NextResponse } from 'next/server';

// 检查用户是否拥有谷歌日历权限
async function checkCalendarScope(accessToken) {
  try {
    // 尝试调用一个需要日历权限的简单API请求
    const response = await fetch(
      'https://www.googleapis.com/calendar/v3/users/me/calendarList', 
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );
    
    // 如果请求成功，用户具有日历权限
    if (response.ok) {
      return true;
    }
    
    // 检查特定错误
    const error = await response.json();
    if (error?.error?.status === 'PERMISSION_DENIED' || 
        error?.error?.code === 403 || 
        error?.error?.message?.includes('insufficient authentication scopes')) {
      // 用户没有日历权限
      return false;
    }
    
    // 其他错误，可能是认证问题
    return false;
  } catch (error) {
    console.error('检查日历权限错误:', error);
    return false;
  }
}

// 刷新访问令牌
async function refreshAccessToken(refreshToken) {
  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.NEXT_PUBLIC_SUPABASE_GOOGLE_CLIENT_ID,
        client_secret: process.env.NEXT_PUBLIC_SUPABASE_GOOGLE_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to refresh access token');
    }
    
    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error('Error refreshing access token:', error);
    throw error;
  }
}

export async function POST(request) {
  try {
    // 获取请求数据
    const requestData = await request.json();
    const { access_token, refresh_token } = requestData;
    
    // 使用前端传递的token
    let token = access_token;
    
    // 如果没有访问令牌，但有刷新令牌，尝试刷新
    if (!token && refresh_token) {
      token = await refreshAccessToken(refresh_token);
    }
    
    if (!token) {
      return NextResponse.json(
        { hasCalendarScope: false, error: 'No access token available' },
        { status: 401 }
      );
    }
    
    // 检查是否有日历权限
    const hasCalendarScope = await checkCalendarScope(token);
    
    return NextResponse.json({ hasCalendarScope });
  } catch (error) {
    console.error('API Error:', error);
    
    return NextResponse.json(
      { hasCalendarScope: false, error: error.message || 'Internal server error' },
      { status: error.status || 500 }
    );
  }
} 