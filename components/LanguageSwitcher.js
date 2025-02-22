'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { Globe } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const languages = [
  { code: 'en', label: 'English' },
  { code: 'my', label: 'Malay' },
  { code: 'zh', label: 'Chinese' },
];

export default function LanguageSwitcher() {
  const pathname = usePathname();
  const router = useRouter();
  const locale = useLocale();

  const handleLocaleChange = (newLocale) => {
    const newPathname = pathname.replace(`/${locale}`, `/${newLocale}`);
    router.push(newPathname);
  };

  const currentLanguage = languages.find(lang => lang.code.startsWith(locale)) || languages[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-3 w-full px-4 py-2 text-sm rounded-md hover:bg-accent hover:text-accent-foreground">
        <Globe className="w-4 h-4" />
        <span>{currentLanguage.label}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[200px] max-h-[400px] overflow-y-auto">
        {languages.map((language) => (
          <DropdownMenuItem
            key={language.code}
            onClick={() => handleLocaleChange(language.code.split('-')[0])}
            className="flex items-center gap-2 cursor-pointer"
          >
            {language.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}