import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/auth';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const userData = await getCurrentUser();
    
    // Check if token exists but is invalid
    const cookieStore = cookies();
    const token = await cookieStore.get('auth_token')?.value;
    
    if (token && !userData) {
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
    
    return NextResponse.json({
      success: true,
      data: userData
    });
  } catch (error) {
    console.error('Error getting current user:', error);
    return NextResponse.json(
      { error: 'Failed to get user data' },
      { status: 500 }
    );
  }
} 