import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// API endpoint to debug cookies
export async function GET() {
  try {
    // 确保cookies()被await
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth_token');
    const allCookies = cookieStore.getAll();
    
    // Log cookies to server console
    console.log('Server cookies:', {
      authToken: authToken ? {
        name: authToken.name,
        value: `${authToken.value.substring(0, 10)}...`, // Safely log part of token
        path: authToken.path,
        expires: authToken.expires,
      } : null,
      allCookies: allCookies.map(c => ({
        name: c.name,
        path: c.path,
        expires: c.expires,
      }))
    });
    
    // Return cookie info (except full values for security)
    return NextResponse.json({
      hasAuthToken: Boolean(authToken),
      authTokenInfo: authToken ? {
        name: authToken.name,
        prefix: `${authToken.value.substring(0, 10)}...`,
        length: authToken.value.length,
        path: authToken.path,
        expires: authToken.expires,
      } : null,
      allCookies: allCookies.map(c => ({
        name: c.name,
        path: c.path,
        expires: c.expires,
      }))
    });
  } catch (error) {
    console.error('Cookie debug error:', error);
    return NextResponse.json(
      { error: 'Failed to read cookies' },
      { status: 500 }
    );
  }
} 