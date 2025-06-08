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
  '/contactUs',
  '/landing'
];
const SPECIAL_PATHS = [
  '/auth', 
  '/reset-password', 
  '/pricing', 
  '/payment', 
  '/admin/adminLogin',
  '/teamInvitation',
  '/contactUs',
  '/landing'
  
]; // Special paths that can be accessed even when logged in

// Auth state cache
let lastAuthCheck = 0;
let cachedAuthState = null;
const AUTH_CHECK_INTERVAL = 60 * 1000; // Check auth only once per minute

export default function RouteGuard({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      // Only check auth if cache is expired or doesn't exist
      const now = Date.now();
      if (cachedAuthState && now - lastAuthCheck < AUTH_CHECK_INTERVAL) {
        console.log('Using cached auth state, skipping check');
        return;
      }
      
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
        // For regular paths, check cookie
        isLoggedIn = !!Cookies.get('auth_token');
      }
      
      // Update cache
      lastAuthCheck = now;
      cachedAuthState = { isLoggedIn, isAdminPath };
      
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
        hasAuthToken: Boolean(isLoggedIn),
        isPublicPath,
        isSpecialPath,
        isTeamInvitationPath,
        redirectUrl
      });

      // 使用safeNavigate函数包装所有导航操作，避免渲染期间的路由更新
      const safeNavigate = (path) => {
        // 使用setTimeout确保导航发生在渲染周期之后
        setTimeout(() => {
          if (window.location.pathname !== path) {
            console.log('🚀 Safely navigating to:', path);
            router.replace(path);
          }
        }, 0);
      };

      // Handle team invitation path
      if (isTeamInvitationPath && !isLoggedIn) {
        console.log('⚠️ Accessing team invitation page but not logged in, redirecting to login');
        const redirectPath = pathname.replace(`/${locale}`, '');
        safeNavigate(`/${locale}/login?redirect=${encodeURIComponent(redirectPath)}`);
        return;
      }

      // Handle redirect URL for logged in users
      if (isLoggedIn && redirectUrl) {
        console.log('⚠️ User is logged in and has redirect parameter, handling redirect:', redirectUrl);
        if (redirectUrl.includes('teamInvitation')) {
          const redirectPath = redirectUrl.startsWith('/') ? redirectUrl : `/${redirectUrl}`;
          console.log('Redirecting to team invitation page:', redirectPath);
          safeNavigate(`/${locale}${redirectPath}`);
          return;
        }
      }

      // Handle authentication redirects
      if (!isLoggedIn && !isPublicPath && !isSpecialPath) {
        console.log('⚠️ Not logged in, redirecting to appropriate login page');
        if (isAdminPath) {
          safeNavigate('/admin/adminLogin');
        } else {
          safeNavigate(`/${locale}/login${redirectUrl ? `?redirect=${redirectUrl}` : ''}`);
        }
        return;
      }

      // Handle logged in users accessing auth-only pages
      if (isLoggedIn && isPublicPath && !isSpecialPath && !pathname.startsWith('/pricing') && pathname !== '/') {
        console.log('⚠️ Already logged in, redirecting to appropriate dashboard');
        if (isAdminPath) {
          safeNavigate('/admin/adminDashboard');
        } else if (!redirectUrl) {
          safeNavigate(`/${locale}/projects`);
        }
        return;
      }
      
      setIsChecking(false);
    };

    // 延迟检查，确保在渲染完成后执行
    const timer = setTimeout(checkAuth, 0);
    return () => clearTimeout(timer);
  }, [pathname, router]);

  // Don't render children until auth check is complete
  // This helps prevent flashing of protected content before redirect
  return children;
} 