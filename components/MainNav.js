'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { cn } from "@/lib/utils";
import { Home, FolderKanban, CheckSquare } from 'lucide-react';
import { useLocale } from 'next-intl';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function MainNav() {
  const pathname = usePathname();
  const t = useTranslations();
  const locale = useLocale();

  const routes = [
    {
      href: `/${locale}`,
      label: t('nav.home'),
      icon: Home,
      active: pathname === `/${locale}`,
    },
    {
      href: `/${locale}/projects`,
      label: t('nav.projects'),
      icon: FolderKanban,
      active: pathname === `/${locale}/projects`,
    },
    {
      href: `/${locale}/tasks`,
      label: t('nav.tasks'),
      icon: CheckSquare,
      active: pathname === `/${locale}/tasks`,
    },
  ];

  return (
    <TooltipProvider>
      <nav className="flex-1 px-2 py-4">
        {routes.map((route) => {
          const Icon = route.icon;
          return (
            <Tooltip key={route.href}>
              <TooltipTrigger asChild>
                <Link
                  href={route.href}
                  className={cn(
                    "flex items-center justify-center w-10 h-10 rounded-lg transition-colors",
                    route.active 
                      ? "bg-accent text-accent-foreground" 
                      : "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground"
                  )}
                >
                  <Icon size={20} />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">
                {route.label}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </nav>
    </TooltipProvider>
  );
}
