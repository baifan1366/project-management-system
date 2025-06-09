import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Check if user has Google Calendar permissions
async function checkCalendarScope(accessToken) {
  try {
    // Try a simple API request that requires calendar permissions
    const response = await fetch(
      'https://www.googleapis.com/calendar/v3/users/me/calendarList', 
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );
    
    // If request is successful, user has calendar permissions
    if (response.ok) {
      return true;
    }
    
    // Check specific errors
    const error = await response.json();
    if (error?.error?.status === 'PERMISSION_DENIED' || 
        error?.error?.code === 403 || 
        error?.error?.message?.includes('insufficient authentication scopes')) {
      // User doesn't have calendar permission
      return false;
    }
    
    // Other errors, might be authentication issues
    return false;
  } catch (error) {
    console.error('Error checking calendar permissions:', error);
    return false;
  }
}

// Refresh access token
async function refreshAccessToken(refreshToken) {
  try {
    // Add logging for debugging
    
    
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
      const errorData = await response.json();
      console.error('Token refresh failed:', errorData);
      throw new Error('Failed to refresh access token');
    }
    
    const data = await response.json();
    
    return data.access_token;
  } catch (error) {
    console.error('Error refreshing access token:', error);
    throw error;
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
    // Get request data
    const requestData = await request.json();
    const { access_token, refresh_token, user_id } = requestData;
    
    // Use token from frontend
    let token = access_token;
    
    // If no access token but we have a refresh token, try to refresh
    if (!token && refresh_token) {
      token = await refreshAccessToken(refresh_token);
      
      // If refresh was successful and we have a user ID, update the tokens in database
      if (token && user_id) {
        await updateUserTokens(user_id, token, refresh_token);
      }
    }
    
    if (!token) {
      return NextResponse.json(
        { hasCalendarScope: false, error: 'No access token available' },
        { status: 401 }
      );
    }
    
    // Check if user has calendar permissions
    const hasCalendarScope = await checkCalendarScope(token);
    
    return NextResponse.json({ 
      hasCalendarScope,
      access_token: token  // Return the new token if it was refreshed
    });
  } catch (error) {
    console.error('API Error:', error);
    
    return NextResponse.json(
      { hasCalendarScope: false, error: error.message || 'Internal server error' },
      { status: error.status || 500 }
    );
  }
} 