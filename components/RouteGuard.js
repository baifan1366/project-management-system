'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Cookies from 'js-cookie';

const PUBLIC_PATHS = [
  '/login',
  '/signup',
  '/forgot-password',
  '/auth/callback',
  '/auth/verify',
  '/terms',
  '/privacy',
  '/adminLogin',
];
const SPECIAL_PATHS = ['/auth', '/reset-password', '/pricing', '/payment', '/adminLogin' ]; // Special paths that can be accessed even when logged in

export default function RouteGuard({ children }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const checkAuth = async () => {
      // Check for user logged in flag (non-httpOnly cookie)
      const isLoggedIn = Cookies.get('user_logged_in') === 'true';
      
      // Legacy check for auth_token (will only work if not httpOnly)
      const authToken = Cookies.get('auth_token');
      
      // Debug: List all cookies
      const allCookies = Cookies.get();
      console.log('🍪 All Cookies:', allCookies);
      
      // Check if current path is public
      const isPublicPath = PUBLIC_PATHS.some(path => pathname.includes(path));
      
      // Check if current path is special (like reset password)
      const isSpecialPath = SPECIAL_PATHS.some(path => pathname.includes(path));
      
      // Get current locale
      const locale = pathname.split('/')[1] || 'en';

      console.log('🔒 Auth check:', { 
        path: pathname,
        isLoggedIn,
        hasAuthToken: Boolean(authToken),
        authTokenPrefix: authToken ? `${authToken.substring(0, 10)}...` : null,
        isPublicPath,
        isSpecialPath
      });

      // If user is not logged in and not accessing public or special paths, redirect to login
      if (!isLoggedIn && !isPublicPath && !isSpecialPath) {
        console.log('⚠️ Not logged in, redirecting to login');
        router.replace(`/${locale}/login`);
        return;
      }

      // If user is logged in and accessing login/signup pages (but not special paths), redirect to projects
      if (isLoggedIn && isPublicPath && !isSpecialPath && pathname !== '/') {
        console.log('⚠️ Already logged in, redirecting to projects');
        router.replace(`/${locale}/projects`);
        return;
      }
    };

    checkAuth();
  }, [pathname, router]);

  return children;
} 