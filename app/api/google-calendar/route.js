import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// 调用Google Calendar API获取事件
async function getCalendarEvents(accessToken, startDate, endDate) {
  try {
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${startDate}T00:00:00Z&timeMax=${endDate}T23:59:59Z&singleEvents=true&orderBy=startTime`, 
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );
    
    if (!response.ok) {
      const error = await response.json();
      console.error('Google Calendar API错误:', error);
      
      // 处理特定错误类型
      if (error?.error?.status === 'PERMISSION_DENIED' || error?.error?.code === 403) {
        throw new Error('权限被拒绝: 请确保您已授予日历读取权限');
      }
      
      if (error?.error?.status === 'UNAUTHENTICATED' || error?.error?.code === 401) {
        throw new Error('认证失败: 请重新登录您的Google账号');
      }
      
      throw new Error(error?.error?.message || '获取Google日历事件失败');
    }
    
    const data = await response.json();
    return data.items || [];
  } catch (error) {
    console.error('获取日历事件错误:', error);
    throw error;
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
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Failed to refresh access token:', error);
      return null;
    }

    const data = await response.json();
    return {
      access_token: data.access_token,
      expires_in: data.expires_in,
      token_type: data.token_type,
    };
  } catch (error) {
    console.error('Error refreshing access token:', error);
    return null;
  }
}

async function updateUserMetadata(userId, accessToken, refreshToken) {
  try {
    const { error } = await supabase.auth.updateUser({
      data: {
        google_tokens: {
          access_token: accessToken,
          refresh_token: refreshToken,
          updated_at: new Date().toISOString()
        }
      }
    });

    if (error) {
      console.error('Failed to update user metadata:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error updating user metadata:', error);
    return false;
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start');
    const endDate = searchParams.get('end');
    let accessToken = searchParams.get('access_token');
    const refreshToken = searchParams.get('refresh_token');

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    if (!accessToken && !refreshToken) {
      return NextResponse.json(
        { error: 'No valid tokens provided' },
        { status: 401 }
      );
    }

    // If we only have a refresh token, try to get a new access token
    if (!accessToken && refreshToken) {
      const tokenData = await refreshAccessToken(refreshToken);
      if (!tokenData) {
        return NextResponse.json(
          { error: 'Failed to refresh access token' },
          { status: 401 }
        );
      }
      accessToken = tokenData.access_token;
    }

    // Fetch calendar events
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${startDate}T00:00:00Z&timeMax=${endDate}T23:59:59Z&singleEvents=true&orderBy=startTime`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (response.status === 401 && refreshToken) {
      // Token expired, try to refresh
      const tokenData = await refreshAccessToken(refreshToken);
      if (!tokenData) {
        return NextResponse.json(
          { error: 'Failed to refresh access token' },
          { status: 401 }
        );
      }

      // Retry with new access token
      const retryResponse = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${startDate}T00:00:00Z&timeMax=${endDate}T23:59:59Z&singleEvents=true&orderBy=startTime`,
        {
          headers: {
            Authorization: `Bearer ${tokenData.access_token}`,
          },
        }
      );

      if (!retryResponse.ok) {
        return NextResponse.json(
          { error: 'Failed to fetch calendar events' },
          { status: retryResponse.status }
        );
      }

      const events = await retryResponse.json();

      // Update user metadata with new tokens
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await updateUserMetadata(session.user.id, tokenData.access_token, refreshToken);
      }

      return NextResponse.json(events);
    }

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch calendar events' },
        { status: response.status }
      );
    }

    const events = await response.json();
    return NextResponse.json(events);
  } catch (error) {
    console.error('Error in Google Calendar API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// 创建事件
export async function POST(request) {
  try {
    // 获取请求数据
    const requestData = await request.json();
    const { eventData, accessToken, refreshToken, conferenceDataVersion = 0, sendNotifications = false } = requestData;
    
    if (!eventData) {
      return NextResponse.json(
        { error: 'Event data is required' },
        { status: 400 }
      );
    }
    
    // 使用前端传递的token
    let token = accessToken;
    
    // 如果没有访问令牌，但有刷新令牌，尝试刷新
    if (!token && refreshToken) {
      token = await refreshAccessToken(refreshToken);
    }
    
    if (!token) {
      return NextResponse.json(
        { error: 'No access token available' },
        { status: 401 }
      );
    }
    
    // 构建API URL，添加参数
    let apiUrl = `https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=${conferenceDataVersion}`;
    
    // 如果需要发送邀请通知
    if (sendNotifications) {
      apiUrl += '&sendUpdates=all'; // all, externalOnly, none
    }
    
    // 调用Google Calendar API创建事件
    const response = await fetch(
      apiUrl,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventData),
      }
    );
    
    if (!response.ok) {
      const error = await response.json();
      console.error('Google Calendar API创建事件错误:', error);
      
      // 处理特定错误类型
      if (error?.error?.status === 'PERMISSION_DENIED' || error?.error?.code === 403) {
        throw new Error('权限被拒绝: 请确保您已授予日历写入权限');
      }
      
      if (error?.error?.status === 'UNAUTHENTICATED' || error?.error?.code === 401) {
        throw new Error('认证失败: 请重新登录您的Google账号');
      }
      
      if (error?.error?.message?.includes('insufficient authentication scopes')) {
        throw new Error('权限范围不足: 请重新登录并授予完整日历访问权限');
      }
      
      throw new Error(error?.error?.message || '创建事件失败');
    }
    
    const data = await response.json();
    
    return NextResponse.json({ event: data });
  } catch (error) {
    console.error('API Error:', error);
    
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.status || 500 }
    );
  }
} 