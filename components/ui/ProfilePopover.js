import { PopoverContent } from '@/components/ui/popover';
import { useTranslations } from 'next-intl';
import { Button } from './button';
import { ChevronRight, Settings, User, Zap, LogOut } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import LanguageSwitcher from '../LanguageSwitcher';
import { ThemeToggle } from './ThemeToggle';

export function ProfilePopover({ onClose }) {
  const t = useTranslations();
  const router = useRouter();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
      }
    };

    getUser();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const menuItems = [
    {
      icon: <Zap className="w-4 h-4" />,
      label: t('profile.upgrade'),
      href: '/upgrade'
    },
    {
      icon: <User className="w-4 h-4" />,
      label: t('profile.refer'),
      href: '/refer'
    },
    {
      icon: <Settings className="w-4 h-4" />,
      label: t('profile.settings'),
      href: '/settings'
    }
  ];

  return (
    <PopoverContent className="w-64" side="right">
      {user && (
        <div className="flex flex-col">
          <div className="px-4 pb-2 border-b">
            <div className="flex items-center gap-3">
              {user.avatar_url ? (
                <img 
                  src={user.avatar_url} 
                  alt={user.name} 
                  className="w-10 h-8 rounded-full"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                  <User className="w-6 h-6 text-gray-500" />
                </div>
              )}
              <div>
                <h4 className="font-medium text-sm">{user.user_metadata.name}</h4>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>
            </div>
          </div>
          
          <div className="py-2">
            {menuItems.map((item, index) => (
              <Button
                key={index}
                variant="ghost"
                className="w-full justify-between px-4 py-2 h-auto font-normal"
                onClick={() => router.push(item.href)}
              >
                <div className="flex items-center gap-3">
                  {item.icon}
                  <span>{item.label}</span>
                </div>
                <ChevronRight className="w-4 h-4" />
              </Button>
            ))}
            <LanguageSwitcher/>
            <ThemeToggle/>
          </div>

          <div className="border-t py-2">
            <Button
              variant="ghost"
              className="w-full justify-start px-4 py-2 h-auto font-normal text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={handleSignOut}
            >
              <div className="flex items-center gap-3">
                <LogOut className="w-4 h-4" />
                <span>{t('profile.signOut')}</span>
              </div>
            </Button>
          </div>
        </div>
      )}
    </PopoverContent>
  );
} 