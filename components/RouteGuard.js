'use client';

import { useEffect, useState } from 'react';
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
  '/admin/adminLogin',
];
const SPECIAL_PATHS = [
  '/auth', 
  '/reset-password', 
  '/pricing', 
  '/payment', 
  '/admin/adminLogin',
  '/teamInvitation'
]; // Special paths that can be accessed even when logged in

export default function RouteGuard({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check if it's an admin path
        const isAdminPath = pathname.startsWith('/admin');
        
        // Check auth based on path type
        let isLoggedIn = false;
        if (isAdminPath) {
          // For admin paths, check localStorage
          try {
            const adminData = localStorage.getItem('adminData');
            if (adminData) {
              const parsedData = JSON.parse(adminData);
              isLoggedIn = !!(parsedData && parsedData.email);
            }
          } catch (error) {
            console.error('Error checking admin auth:', error);
          }
        } else {
          // For regular paths, check both cookies for better reliability
          const authToken = Cookies.get('auth_token');
          const userLoggedIn = Cookies.get('user_logged_in');
          isLoggedIn = !!(authToken || userLoggedIn === 'true');
        }
        
        // Get redirect URL from query string if exists
        const searchParams = new URLSearchParams(window.location.search);
        const redirectUrl = searchParams.get('redirect');
        
        // Check if current path is public
        const isPublicPath = PUBLIC_PATHS.some(path => pathname.includes(path));
        
        // Check if current path is special (like reset password or team invitation)
        const isSpecialPath = SPECIAL_PATHS.some(path => pathname.includes(path));
        
        // Check if it's a team invitation path
        const isTeamInvitationPath = pathname.includes('/teamInvitation');
        
        // Get current locale
        const locale = pathname.split('/')[1] || 'en';

        console.log('🔒 Auth check:', { 
          path: pathname,
          isAdminPath,
          isLoggedIn,
          authToken: Cookies.get('auth_token'),
          userLoggedIn: Cookies.get('user_logged_in'),
          isPublicPath,
          isSpecialPath,
          isTeamInvitationPath,
          redirectUrl
        });

        // Handle team invitation path
        if (isTeamInvitationPath && !isLoggedIn) {
          console.log('⚠️ Accessing team invitation page but not logged in, redirecting to login');
          const redirectPath = pathname.replace(`/${locale}`, '');
          router.replace(`/${locale}/login?redirect=${encodeURIComponent(redirectPath)}`);
          return;
        }

        // Handle redirect URL for logged in users
        if (isLoggedIn && redirectUrl) {
          console.log('⚠️ User is logged in and has redirect parameter, handling redirect:', redirectUrl);
          if (redirectUrl.includes('teamInvitation')) {
            const redirectPath = redirectUrl.startsWith('/') ? redirectUrl : `/${redirectUrl}`;
            console.log('Redirecting to team invitation page:', redirectPath);
            router.replace(`/${locale}${redirectPath}`);
            return;
          }
        }

        // Handle authentication redirects
        if (!isLoggedIn && !isPublicPath && !isSpecialPath) {
          console.log('⚠️ Not logged in, redirecting to appropriate login page');
          if (isAdminPath) {
            router.replace('/admin/adminLogin');
          } else {
            router.replace(`/${locale}/login${redirectUrl ? `?redirect=${redirectUrl}` : ''}`);
          }
          return;
        }

        // Handle logged in users accessing login pages
        if (isLoggedIn && isPublicPath && !isSpecialPath && pathname !== '/') {
          console.log('⚠️ Already logged in, redirecting to appropriate dashboard');
          if (isAdminPath) {
            router.replace('/admin/adminDashboard');
          } else if (!redirectUrl) {
            router.replace(`/${locale}/projects`);
          }
          return;
        }
      } finally {
        setAuthChecked(true);
      }
    };

    checkAuth();
  }, [pathname]);

  // Don't render children until auth check is complete to prevent flash of content
  if (!authChecked) {
    return null;
  }

  return children;
} 