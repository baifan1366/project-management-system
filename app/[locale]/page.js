'use client';

import { useTranslations } from 'next-intl';

export default function HomePage() {
  const t = useTranslations();

  return (
    <div className="flex flex-col items-center justify-center space-y-4">
      <h1 className="text-4xl font-bold">{t('app.title')}</h1>
      <p className="text-xl text-muted-foreground">{t('app.description')}</p>
    </div>
  );
}
