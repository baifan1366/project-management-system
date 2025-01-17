import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();

/** @type {import('next').NextConfig} */
const nextConfig = {
  // 在这里添加其他 Next.js 配置选项
};

export default withNextIntl(nextConfig);