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
const SPECIAL_PATHS = [
  '/auth', 
  '/reset-password', 
  '/pricing', 
  '/payment', 
  '/adminLogin',
  '/teamInvitation'
]; // Special paths that can be accessed even when logged in

export default function RouteGuard({ children }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const checkAuth = async () => {
      // check for auth_token (will only work if not httpOnly)
      const isLoggedIn = Cookies.get('auth_token');
      
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
        isLoggedIn,
        hasAuthToken: Boolean(isLoggedIn),
        authTokenPrefix: isLoggedIn ? `${isLoggedIn.substring(0, 10)}...` : null,
        isPublicPath,
        isSpecialPath,
        isTeamInvitationPath,
        redirectUrl
      });

      // 如果是团队邀请页面且未登录，则重定向到登录页面并携带redirect参数
      if (isTeamInvitationPath && !isLoggedIn) {
        console.log('⚠️ 访问团队邀请页面但未登录，重定向到登录页面');
        const redirectPath = pathname.replace(`/${locale}`, '');
        router.replace(`/${locale}/login?redirect=${encodeURIComponent(redirectPath)}`);
        return;
      }

      // 如果用户已登录并且URL中有redirect参数，直接处理重定向
      if (isLoggedIn && redirectUrl) {
        console.log('⚠️ 用户已登录且有重定向参数，处理重定向:', redirectUrl);
        const locale = pathname.split('/')[1] || 'en';
        
        if (redirectUrl.includes('teamInvitation')) {
          const redirectPath = redirectUrl.startsWith('/') ? redirectUrl : `/${redirectUrl}`;
          console.log('重定向到团队邀请页面:', redirectPath);
          router.replace(`/${locale}${redirectPath}`);
          return;
        }
      }

      // If user is not logged in and not accessing public or special paths, redirect to login
      if (!isLoggedIn && !isPublicPath && !isSpecialPath) {
        console.log('⚠️ Not logged in, redirecting to login');
        router.replace(`/${locale}/login${redirectUrl ? `?redirect=${redirectUrl}` : ''}`);
        return;
      }

      // If user is logged in and accessing login/signup pages (but not special paths), redirect to projects
      // 避免自动重定向到项目页面如果存在自定义重定向URL
      if (isLoggedIn && isPublicPath && !isSpecialPath && pathname !== '/' && !redirectUrl) {
        console.log('⚠️ Already logged in, redirecting to projects');
        router.replace(`/${locale}/projects`);
        return;
      }
    };

    checkAuth();
  }, [pathname, router]);

  return children;
} 