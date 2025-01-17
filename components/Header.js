'use client';

import { useTranslations } from 'next-intl';
import { MainNav } from './MainNav';
import LanguageSwitcher from './LanguageSwitcher';
import { ThemeToggle } from './ui/ThemeToggle';

export function Header() {
  const t = useTranslations();

  return (
    <header className="border-b">
      <div className="flex h-16 items-center px-4 container">
        <div className="mr-8">
          <h2 className="text-lg font-bold">{t('app.title')}</h2>
        </div>
        <MainNav />
        <div className="ml-auto flex items-center space-x-4">
          <ThemeToggle />
          <LanguageSwitcher />
        </div>
      </div>
    </header>
  );
}
