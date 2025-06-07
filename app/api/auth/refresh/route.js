import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { supabase } from '@/lib/supabase';
import { generateTokenForUser } from '@/lib/auth/token';

// JWT secret key (should be in environment variables in production)
const JWT_SECRET = process.env.JWT_SECRET || process.env.NEXT_PUBLIC_JWT_SECRET;

/**
 * Endpoint to refresh the authentication token
 * This is used when the client detects the token is about to expire
 */
export async function POST() {
  try {
    // Get current token
    const token = (await cookies()).get('auth_token')?.value;
    
    if (!token) {
      return NextResponse.json(
        { error: 'No token provided' },
        { status: 401 }
      );
    }
    
    if (!JWT_SECRET) {
      console.error('JWT secret is not defined. Cannot verify token.');
      return NextResponse.json(
        { error: 'Authentication configuration error' },
        { status: 500 }
      );
    }
    
    try {
      // Verify the existing token
      const decoded = jwt.verify(token, JWT_SECRET);
      const userId = decoded.userId;
      
      if (!userId) {
        return NextResponse.json(
          { error: 'Invalid token' },
          { status: 401 }
        );
      }
      
      // Check if user exists in database
      const { data: user, error } = await supabase
        .from('user')
        .select('id, email, name')
        .eq('id', userId)
        .single();
        
      if (error || !user) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 401 }
        );
      }
      
      // Generate a new token
      const newToken = await generateTokenForUser(userId);
      
      // Set cookie with improved settings
      const cookieOptions = {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
        path: '/',
        sameSite: 'lax'
      };
      
      const cookieStore = await cookies();
      await cookieStore.set('auth_token', newToken, cookieOptions);
      
      // For client-side detection
      await cookieStore.set('user_logged_in', 'true', {
        ...cookieOptions,
        httpOnly: false
      });
      
      return NextResponse.json({
        success: true,
        message: 'Token refreshed successfully'
      });
    } catch (verifyError) {
      console.error('Token verification failed:', verifyError);
      
      // If token is expired but still parseable, try to extract userId and issue a new token
      if (verifyError.name === 'TokenExpiredError') {
        try {
          // Decode without verification to extract the userId
          const decodedPayload = jwt.decode(token);
          
          if (decodedPayload && decodedPayload.userId) {
            const userId = decodedPayload.userId;
            
            // Verify user exists in database
            const { data: user, error } = await supabase
              .from('user')
              .select('id')
              .eq('id', userId)
              .single();
              
            if (!error && user) {
              // Generate a new token
              const newToken = await generateTokenForUser(userId);
              
              // Set cookie with improved settings
              const cookieOptions = {
                httpOnly: false,
                secure: process.env.NODE_ENV === 'production',
                maxAge: 7 * 24 * 60 * 60,
                path: '/',
                sameSite: 'lax'
              };
              
              const cookieStore = await cookies();
              await cookieStore.set('auth_token', newToken, cookieOptions);
              
              // For client-side detection
              await cookieStore.set('user_logged_in', 'true', {
                ...cookieOptions,
                httpOnly: false
              });
              
              return NextResponse.json({
                success: true,
                message: 'Token renewed after expiration'
              });
            }
          }
        } catch (decodeError) {
          console.error('Failed to decode expired token:', decodeError);
        }
      }
      
      // Clear any existing cookies if we couldn't refresh the token
      const cookieStore = await cookies();
      await cookieStore.delete('auth_token');
      await cookieStore.delete('user_logged_in');
      
      return NextResponse.json(
        { 
          error: 'Authentication expired', 
          code: 'TOKEN_EXPIRED',
          message: 'Your session has expired. Please login again.'
        },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('Token refresh error:', error);
    return NextResponse.json(
      { error: 'Token refresh failed' },
      { status: 500 }
    );
  }
} 