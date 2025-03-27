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

export async function GET(request) {
  try {
    // 获取查询参数
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start');
    const endDate = searchParams.get('end');
    const accessToken = searchParams.get('access_token');
    const refreshToken = searchParams.get('refresh_token');
    
    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Start and end dates are required' },
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
    
    // 获取日历事件
    const events = await getCalendarEvents(token, startDate, endDate);
    
    return NextResponse.json({ events });
  } catch (error) {
    console.error('API Error:', error);
    
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.status || 500 }
    );
  }
}

// 创建事件
export async function POST(request) {
  try {
    // 获取请求数据
    const requestData = await request.json();
    const { eventData, accessToken, refreshToken } = requestData;
    
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
    
    // 调用Google Calendar API创建事件
    const response = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events',
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