import createIntlMiddleware from 'next-intl/middleware';


// 创建国际化中间件
const intlMiddleware = createIntlMiddleware({
  locales: ['en', 'zh', 'my'],
  defaultLocale: 'en',
  localePrefix: 'always'
});

export async function middleware(request) {
    // 应用国际化中间件
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
     */
    '/((?!api|_next/static|_next/image|penggy.webp|penguin.glb|favicon.ico).*)',
    '/:locale(en|zh|my)/:path*'
  ]
};
