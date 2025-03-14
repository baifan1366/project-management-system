'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function RouteGuard({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [authorized, setAuthorized] = useState(false);

  // 定义公共路径
  const publicPaths = [
    '/login',
    '/signup',
    '/forgot-password',
    '/auth/callback',
    '/auth/verify',
    '/pricing', // 添加 pricing 到公共路径
    '/terms',
    '/privacy',
  ];

  useEffect(() => {
    // 检查当前路径是否是公共路径
    const isPublicPath = () => {
      // 移除语言前缀 (例如 /en/login -> /login)
      const pathWithoutLocale = pathname.replace(/^\/[a-z]{2}\//, '/');
      return publicPaths.some(pp => pathWithoutLocale === pp || pathWithoutLocale.startsWith(pp));
    };

    // 认证检查
    const authCheck = async () => {
      // 如果是公共路径，允许访问
      if (isPublicPath()) {
        setAuthorized(true);
        return;
      }

      // 检查用户是否已登录
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // 用户已登录，允许访问
        setAuthorized(true);
      } else {
        // 用户未登录，重定向到登录页面
        setAuthorized(false);
        
        // 获取当前语言
        const locale = pathname.split('/')[1] || 'en';
        router.push(`/${locale}/login`);
      }
    };

    authCheck();
    
    // 监听路由变化
    const unsubscribe = supabase.auth.onAuthStateChange((event, session) => {
      authCheck();
    });

    return () => unsubscribe.data.subscription.unsubscribe();
  }, [pathname, router]);

  return authorized ? children : null;
} 