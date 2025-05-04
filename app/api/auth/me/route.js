import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/auth';

export async function GET() {
  try {
    const userData = await getCurrentUser();
    
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