'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const PUBLIC_PATHS = [
  '/login',
  '/signup',
  '/forgot-password',
  '/auth/callback',
  '/auth/verify',
  '/terms',
  '/privacy',
];
const SPECIAL_PATHS = ['/reset-password', '/pricing']; // 特殊路径，即使用户已登录也允许访问

export default function RouteGuard({ children }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const checkAuth = async () => {
      // 获取 session 状态
      const { data: { session } } = await supabase.auth.getSession();
      
      // 检查是否是公开路径
      const isPublicPath = PUBLIC_PATHS.some(path => pathname.includes(path));
      
      // 检查是否是特殊路径（如重置密码）
      const isSpecialPath = SPECIAL_PATHS.some(path => pathname.includes(path));
      
      // 获取当前语言
      const locale = pathname.split('/')[1] || 'en';

      console.log('🔒 Session check:', { 
        path: pathname,
        hasSession: Boolean(session),
        isPublicPath,
        isSpecialPath,
        userId: session?.user?.id
      });

      // 如果用户未登录且访问的不是公开路径或特殊路径，重定向到登录页面
      if (!session && !isPublicPath && !isSpecialPath) {
        router.replace(`/${locale}/login`);
        return;
      }

      // 如果用户已登录且访问登录/注册页面（但不是特殊路径），重定向到项目页面
      if (session && isPublicPath && !isSpecialPath && pathname !== '/') {
        router.replace(`/${locale}/projects`);
        return;
      }
    };

    checkAuth();
  }, [pathname, router]);

  return children;
} 