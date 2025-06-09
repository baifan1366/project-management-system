import createIntlMiddleware from 'next-intl/middleware';
import { NextResponse } from 'next/server';

// 创建国际化中间件
const intlMiddleware = createIntlMiddleware({
  locales: ['en', 'zh', 'my'],
  defaultLocale: 'en',
  localePrefix: 'always'
});

export async function middleware(request) {
    // Handle API routes with authentication headers
    if (request.nextUrl.pathname.startsWith('/api')) {
        // Forward the auth token from cookies to Authorization header
        const authToken = request.cookies.get('auth_token')?.value;
        
        // Clone the request headers
        const requestHeaders = new Headers(request.headers);
        
        // Add Authorization header if token exists
        if (authToken) {
            requestHeaders.set('Authorization', `Bearer ${authToken}`);
        }
        
        // Return response with modified headers
        return NextResponse.next({
            request: {
                headers: requestHeaders,
            },
        });
    }
    
    // For non-API routes, apply internationalization middleware
    return intlMiddleware(request);
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
     * /admin (Admin routes)
     */
    '/((?!api|_next/static|_next/image|.*\\.png|.*\\.webp|.*\\.glb|favicon.ico|admin).*)',
    '/:locale(en|zh|my)/:path*'
  ]
};
