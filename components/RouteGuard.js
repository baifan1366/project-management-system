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
  '/admin/adminLogin',
];
const SPECIAL_PATHS = ['/auth', '/reset-password', '/pricing', '/payment', '/admin/adminLogin' ]; // 特殊路径，即使用户已登录也允许访问

export default function RouteGuard({ children }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // 忽略所有管理员页面，让管理员布局处理它们的认证
    if (pathname.startsWith('/admin') && pathname !== '/admin/adminLogin') {
      return; // 管理员路由由它们自己的布局处理认证
    }

    const checkAuth = async () => {
      // check for auth_token (will only work if not httpOnly)
      const isLoggedIn = Cookies.get('auth_token');
      
      // 检查是否是公开路径 - 使用更精确的匹配
      const isPublicPath = PUBLIC_PATHS.some(path => {
        // 确保精确匹配路径，避免部分匹配
        if (path.endsWith('/')) {
          return pathname === path || pathname.startsWith(path);
        }
        return pathname === path;
      });
      
      // 检查是否是特殊路径（如重置密码）
      const isSpecialPath = SPECIAL_PATHS.some(path => pathname.startsWith(path));
      
      // Get current locale
      const locale = pathname.split('/')[1] || 'en';

      console.log('🔒 Auth check:', { 
        path: pathname,
        isLoggedIn,
        hasAuthToken: Boolean(isLoggedIn),
        authTokenPrefix: isLoggedIn ? `${isLoggedIn.substring(0, 10)}...` : null,
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