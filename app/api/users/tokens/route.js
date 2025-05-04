import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth/auth';

/**
 * API endpoint to get OAuth provider tokens for the authenticated user
 * For security, this should only be callable from the client by authenticated users
 */
export async function GET(request) {
  try {
    // Get authentication status
    const userData = await getCurrentUser();
    
    if (!userData || !userData.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Get provider parameter from query string
    const { searchParams } = new URL(request.url);
    const provider = searchParams.get('provider');
    
    if (!provider) {
      return NextResponse.json(
        { error: 'Provider parameter is required' },
        { status: 400 }
      );
    }
    
    // Check if user is connected with the requested provider
    const user = userData.user;
    let isConnected = false;
    
    // Check if user is connected with the requested provider using provider-specific ID fields
    if (provider === 'google') {
      isConnected = !!user.google_provider_id;
    } else if (provider === 'github') {
      isConnected = !!user.github_provider_id;
    }
    
    if (!isConnected) {
      return NextResponse.json(
        { error: `User is not connected with ${provider}` },
        { status: 404 }
      );
    }
    
    // Get tokens directly from user table
    if (provider === 'google') {
      const accessToken = user.google_access_token;
      const refreshToken = user.google_refresh_token;
      const expiresAt = user.google_token_expires_at;
      
      if (!refreshToken) {
        return NextResponse.json(
          { error: 'No refresh token available for Google. Please connect your account.' },
          { status: 404 }
        );
      }
      
      // Check if access token is expired and needs refresh
      const isExpired = expiresAt && (Date.now() > expiresAt);
      
      if (isExpired || !accessToken) {
        try {
          // Refresh the token
          const refreshedTokens = await refreshGoogleToken(refreshToken);
          
          if (refreshedTokens.access_token) {
            // Update the user record with the new token
            const { error: updateError } = await supabase
              .from('user')
              .update({
                google_access_token: refreshedTokens.access_token,
                google_token_expires_at: Date.now() + (refreshedTokens.expires_in * 1000),
                updated_at: new Date().toISOString()
              })
              .eq('id', user.id);
              
            if (updateError) {
              console.error('Failed to update Google token:', updateError);
            }
            
            // Return the refreshed tokens
            return NextResponse.json({
              access_token: refreshedTokens.access_token,
              refresh_token: refreshToken,
              expires_at: Date.now() + (refreshedTokens.expires_in * 1000)
            });
          }
        } catch (refreshError) {
          console.error('Error refreshing Google token:', refreshError);
          return NextResponse.json(
            { error: 'Failed to refresh Google token. Please reconnect your account.' },
            { status: 401 }
          );
        }
      } else {
        // Return existing tokens
        return NextResponse.json({
          access_token: accessToken,
          refresh_token: refreshToken,
          expires_at: expiresAt
        });
      }
    } else if (provider === 'github') {
      const accessToken = user.github_access_token;
      
      if (!accessToken) {
        return NextResponse.json(
          { error: 'No access token available for GitHub. Please connect your account.' },
          { status: 404 }
        );
      }
      
      return NextResponse.json({
        access_token: accessToken,
        refresh_token: user.github_refresh_token || null
      });
    }
    
    // If we get here, provider isn't properly supported
    return NextResponse.json(
      { error: `No valid tokens available for ${provider}. Please connect your account.` },
      { status: 404 }
    );
  } catch (error) {
    console.error('Error in tokens API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Helper function to refresh Google access token
 */
async function refreshGoogleToken(refreshToken) {
  try {
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
      const error = await response.json();
      throw new Error(`Failed to refresh token: ${JSON.stringify(error)}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error refreshing Google token:', error);
    throw error;
  }
} 