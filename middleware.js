import { NextResponse } from 'next/server';
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import createIntlMiddleware from 'next-intl/middleware';

const PUBLIC_PATHS = ['/login', '/signup', '/auth/callback'];

// 创建国际化中间件
const intlMiddleware = createIntlMiddleware({
  locales: ['en', 'zh', 'my'],
  defaultLocale: 'en',
  localePrefix: 'always'
});

export async function middleware(request) {
  console.log('🚀 Middleware triggered for path:', request.nextUrl.pathname);
  
  const pathname = request.nextUrl.pathname;
  
  // 检查是否是公开路径
  const isPublicPath = PUBLIC_PATHS.some(path => 
    pathname.includes(path) || pathname === '/'
  );

  try {
    // 创建响应对象
    const res = NextResponse.next();
    
    // 创建 supabase 客户端
    const supabase = createMiddlewareClient({ req: request, res });
    
    // 检查会话状态
    const { data: { session } } = await supabase.auth.getSession();
    
    console.log('🔒 Session check:', { 
      path: pathname,
      hasSession: !!session,
      isPublicPath,
      userId: session?.user?.id
    });

    // 如果用户未登录且访问的不是公开路径，重定向到登录页面
    if (!session && !isPublicPath) {
      const locale = pathname.split('/')[1] || 'en';
      const loginUrl = new URL(`/${locale}/login`, request.url);
      console.log('🔄 Redirecting to login:', loginUrl.toString());
      return NextResponse.redirect(loginUrl);
    }

    // 如果用户已登录且访问登录/注册页面，重定向到项目页面
    if (session && isPublicPath && pathname !== '/') {
      const locale = pathname.split('/')[1] || 'en';
      const projectUrl = new URL(`/${locale}/projects`, request.url);
      console.log('🔄 Redirecting to project:', projectUrl.toString());
      return NextResponse.redirect(projectUrl);
    }

    // 应用国际化中间件
    const response = intlMiddleware(request);
    
    // 复制响应头
    response.headers.forEach((value, key) => {
      res.headers.set(key, value);
    });

    return res;

  } catch (error) {
    console.error('❌ Middleware error:', error);
    return NextResponse.next();
  }
}

// 更新 matcher 配置以包含更多特定路径
export const config = {
  matcher: [
    /*
     * 匹配所有路径除了:
     * /api (API routes)
     * /_next (Next.js 内部路由)
     * /_static (静态文件)
     * /favicon.ico (浏览器图标)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
    '/:locale(en|zh|my)/:path*'
  ]
};
