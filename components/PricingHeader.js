import { useTranslations } from 'next-intl';
import  LanguageSwitcher  from './LanguageSwitcher';
import { ThemeToggle } from './ui/ThemeToggle';
import Link from 'next/link';

export function PricingHeader() {
  const t = useTranslations('Header');

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4">
          <Link href="/" className="flex items-center space-x-2">
            <span className="font-bold">{t('projectName')}</span>
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-end space-x-4">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
} 