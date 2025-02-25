import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();

/** @type {import('next').NextConfig} */
const nextConfig = {
  // 启用实验性的应用目录功能
  experimental: {
    appDir: true,
  },
  // 配置中间件
  middleware: {
    // 确保中间件在所有路由上运行
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
  },
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*'
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, OPTIONS'
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type'
          }
        ]
      }
    ]
  }
};

export default withNextIntl(nextConfig);