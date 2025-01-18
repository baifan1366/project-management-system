import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { inter } from '@/lib/fonts';
import "../../globals.css";

export const metadata = {
  title: 'Team Sync - Pricing',
  description: 'Choose the perfect plan for your team',
};

export default function PricingLayout({ children }) {
  const t = useTranslations('nav');

  return (
    <html lang="en" className={inter.className}>
      <body className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        {/* 简洁的导航栏 */}
        <nav className="border-b bg-white/80 backdrop-blur-sm fixed w-full z-10">
          <div className="container mx-auto px-4 py-4">
            <div className="flex justify-between items-center">
              <Link href="/" className="text-xl font-bold text-primary">
                Team Sync
              </Link>
              <div className="flex gap-4">
                <Link 
                  href="/dashboard" 
                  className="px-4 py-2 rounded-md hover:bg-gray-100 transition-colors"
                >
                  {t('home')}
                </Link>
                <Link 
                  href="/login" 
                  className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
                >
                  {t('login')}
                </Link>
                <Link 
                  href="/signup" 
                  className="px-4 py-2 border border-primary text-primary rounded-md hover:bg-primary/5 transition-colors"
                >
                  {t('signup')}
                </Link>
              </div>
            </div>
          </div>
        </nav>

        {/* 内容区域 */}
        <main className="pt-20">
          {children}
        </main>

        {/* 简单的页脚 */}
        <footer className="border-t mt-20">
          <div className="container mx-auto px-4 py-8">
            <div className="grid md:grid-cols-4 gap-8">
              <div>
                <h3 className="font-bold mb-4">Team Sync</h3>
                <p className="text-sm text-gray-600">现代化的团队协作与项目管理平台</p>
              </div>
              <div>
                <h3 className="font-bold mb-4">产品</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li><Link href="/features">功能</Link></li>
                  <li><Link href="/pricing">定价</Link></li>
                  <li><Link href="/security">安全</Link></li>
                </ul>
              </div>
              <div>
                <h3 className="font-bold mb-4">资源</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li><Link href="/blog">博客</Link></li>
                  <li><Link href="/docs">文档</Link></li>
                  <li><Link href="/help">帮助中心</Link></li>
                </ul>
              </div>
              <div>
                <h3 className="font-bold mb-4">公司</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li><Link href="/about">关于我们</Link></li>
                  <li><Link href="/contact">联系我们</Link></li>
                  <li><Link href="/careers">加入我们</Link></li>
                </ul>
              </div>
            </div>
            <div className="border-t mt-8 pt-8 text-center text-sm text-gray-600">
              <p>© 2024 Team Sync. All rights reserved.</p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
} 