'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { cn } from "@/lib/utils";
import LanguageSwitcher from './LanguageSwitcher';
import { useLocale } from 'next-intl';

export function MainNav() {
  const pathname = usePathname();
  const t = useTranslations();
  const locale = useLocale();

  const routes = [
    {
      href: `/${locale}`,
      label: t('nav.home'),
      active: pathname === `/${locale}`,
    },
    {
      href: `/${locale}/projects`,
      label: t('nav.projects'),
      active: pathname === `/${locale}/projects`,
    },
    {
      href: `/${locale}/tasks`,
      label: t('nav.tasks'),
      active: pathname === `/${locale}/tasks`,
    },
  ];

  return (
    <nav className="flex items-center space-x-6">
      {routes.map((route) => (
        <Link
          key={route.href}
          href={route.href}
          className={cn(
            "text-sm font-medium transition-colors hover:text-primary",
            route.active ? "text-black dark:text-white" : "text-muted-foreground"
          )}
        >
          {route.label}
        </Link>
      ))}
    </nav>
  );
}
