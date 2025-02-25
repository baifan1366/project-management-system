import createMiddleware from 'next-intl/middleware';
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';

const PUBLIC_PATHS = ['/login', '/signup', '/auth/callback'];

async function middleware(request) {
  const pathname = request.nextUrl.pathname;

  // 检查是否是公开路径
  const isPublicPath = PUBLIC_PATHS.some(path => 
    pathname.includes(path) || pathname === '/'
  );

  // 创建 supabase 客户端
  const res = NextResponse.next();
  const supabase = createMiddlewareClient(
    { 
      req: request, 
      res 
    },
    {
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_KEY
    }
  );
  
  // 检查会话状态
  const { data: { session } } = await supabase.auth.getSession();

  // 如果用户未登录且访问的不是公开路径，重定向到登录页面
  if (!session && !isPublicPath) {
    const locale = pathname.split('/')[1]; // 获取当前语言
    return NextResponse.redirect(new URL(`/${locale}/login`, request.url));
  }

  // 如果用户已登录且访问登录/注册页面，重定向到仪表板
  if (session && isPublicPath && pathname !== '/') {
    const locale = pathname.split('/')[1]; // 获取当前语言
    return NextResponse.redirect(new URL(`/${locale}/dashboard`, request.url));
  }

  // 应用国际化中间件
  const intlMiddleware = createMiddleware({
    locales: ['en', 'zh', 'my'],
    defaultLocale: 'en',
    localePrefix: 'always'
  });

  return intlMiddleware(request);
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)']
};

export default middleware;
