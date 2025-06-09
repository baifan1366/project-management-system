import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Refresh access token from Google
async function refreshAccessToken(refreshToken) {
  try {
    
    
    
    
    
    // Check if GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are defined
    if (!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || !process.env.NEXT_PUBLIC_GOOGLE_CLIENT_SECRET) {
      console.error("Missing Google OAuth credentials in environment variables");
      return null;
    }
    
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
        client_secret: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Failed to refresh access token. Status:', response.status);
      console.error('Error details:', JSON.stringify(errorData));
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

// Update user's Google tokens in the custom user table
async function updateUserTokens(userId, accessToken, refreshToken) {
  try {
    // Calculate the expiration timestamp (usually 1 hour from now)
    const expiresAt = Math.floor(Date.now() / 1000) + 3600;
    
    // Update the user table directly
    const { error } = await supabase
      .from('user')
      .update({
        google_access_token: accessToken,
        google_refresh_token: refreshToken,
        google_token_expires_at: expiresAt,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) {
      console.error('Failed to update user tokens:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error updating user tokens:', error);
    return false;
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    
    const { refresh_token: refreshToken, userId } = body;

    if (!refreshToken) {
      console.error("Missing refresh token in request");
      return NextResponse.json(
        { error: 'Refresh token is required' },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const tokenData = await refreshAccessToken(refreshToken);
    if (!tokenData) {
      console.error("Failed to refresh token from Google");
      return NextResponse.json(
        { error: 'Failed to refresh access token' },
        { status: 401 }
      );
    }

    // Update user's tokens in the database
    const success = await updateUserTokens(
      userId,
      tokenData.access_token,
      refreshToken
    );

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to update user tokens' },
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