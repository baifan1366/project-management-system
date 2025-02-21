'use client';

import { useTranslations } from 'next-intl';
import { MainNav } from './MainNav';
import { Button } from './ui/button';
import { Plus, Bell, User } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useState } from 'react';
import { ProfileDialog } from './ui/ProfileDialog';

export function Header() {
  const t = useTranslations();
  const [isProfileOpen, setProfileOpen] = useState(false);

  return (
    <div className="fixed inset-y-0 left-0 z-50 w-16 border-r bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex flex-col h-full">
        <div className="p-3">
          <div className="flex items-center justify-center mb-4">
            <span className="text-xl font-bold">TS</span>
          </div>
        </div>
        <MainNav />
        <div className="mt-auto p-3 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex flex-col items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="icon" variant="ghost" className="w-10 h-10">
                    <Bell size={20} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  {t('common.notifications')}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="icon" variant="ghost" className="w-10 h-10" onClick={() => setProfileOpen(true)}>
                    <User size={20} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  {t('common.profile')}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>
      <ProfileDialog isOpen={isProfileOpen} onClose={() => setProfileOpen(false)} />
    </div>
  );
}
