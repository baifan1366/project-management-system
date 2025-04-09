import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

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
      token_type: data.token_type
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

export async function POST(request) {
  try {
    const { refreshToken } = await request.json();

    if (!refreshToken) {
      return NextResponse.json(
        { error: 'Refresh token is required' },
        { status: 400 }
      );
    }

    const tokenData = await refreshAccessToken(refreshToken);
    if (!tokenData) {
      return NextResponse.json(
        { error: 'Failed to refresh access token' },
        { status: 401 }
      );
    }

    // Get the current session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'No active session found' },
        { status: 401 }
      );
    }

    // Update user metadata with new tokens
    const success = await updateUserMetadata(
      session.user.id,
      tokenData.access_token,
      refreshToken
    );

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to update user metadata' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      access_token: tokenData.access_token,
      expires_in: tokenData.expires_in,
      token_type: tokenData.token_type,
    });
  } catch (error) {
    console.error('Error in token refresh endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 