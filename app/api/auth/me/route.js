import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/auth';
import { cookies } from 'next/headers';

export async function GET(request) {
  const startTime = Date.now();
  try {
    // Get user data from either authorization header or cookie
    const userData = await getCurrentUser();
    
    // Check if token exists but is invalid
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    const authHeader = request.headers.get('Authorization');
    
    // Check if token exists in either header or cookie
    const hasToken = !!(token || authHeader);
    
    if (hasToken && !userData) {
      // If there's a token but no user data, it's likely an expired or invalid token
      return NextResponse.json(
        { 
          error: 'Unauthorized', 
          code: 'TOKEN_EXPIRED',
          message: 'Your session has expired. Please login again.'
        },
        { status: 401 }
      );
    }
    
    if (!userData) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const endTime = Date.now();
    
    
    return NextResponse.json({
      success: true,
      data: userData
    });
  } catch (error) {
    const endTime = Date.now();
    console.error(`/api/auth/me failed in ${endTime - startTime}ms:`, error);
    
    return NextResponse.json(
      { error: 'Failed to get user data' },
      { status: 500 }
    );
  }
} 