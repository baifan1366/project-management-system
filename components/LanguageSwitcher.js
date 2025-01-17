'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { Button } from "@/components/ui/button"

export default function LanguageSwitcher() {
  const pathname = usePathname();
  const router = useRouter();
  const locale = useLocale();

  const switchLocale = () => {
    const newLocale = locale === 'en' ? 'zh' : 'en';
    const newPathname = pathname.replace(`/${locale}`, `/${newLocale}`);
    router.push(newPathname);
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={switchLocale}
    >
      {locale === 'en' ? '中文' : 'English'}
    </Button>
  );
}
