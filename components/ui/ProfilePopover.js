import { PopoverContent } from '@/components/ui/popover';
import { useTranslations } from 'next-intl';
import { Button } from './button';
import { ChevronRight, Settings, User, Zap, LogOut, Sparkles, Workflow, Bot } from 'lucide-react';
import { useRouter } from 'next/navigation';
import LanguageSwitcher from '../LanguageSwitcher';
import { ThemeToggle } from './ThemeToggle';
import { useAuth } from '@/lib/hooks/useAuth';
import useGetUser from '@/lib/hooks/useGetUser';

export function ProfilePopover({ onClose }) {
  const t = useTranslations();
  const router = useRouter();
  const { user } = useGetUser();
  const { logout } = useAuth();

  const handleSignOut = async () => {
    try {
      // Use the logout function from useAuth hook
      const result = await logout();
      
      if (!result.success) {
        console.error('Sign out error:', result.error);
      }
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const menuItems = [
    {
      icon: <Zap className="w-4 h-4" />,
      label: t('profile.upgrade'),
      href: '/settings/subscription',
      isUpgrade: true
    },
    {
      icon: <Settings className="w-4 h-4" />,
      label: t('profile.settings'),
      href: '/settings'
    },
        {
      icon: <Bot className="w-4 h-4" />,
      label: t('nav.chat') + ' AI',
      href: '/chat?mode=ai',
      isAIChat: true
    },
    {
      icon: <Sparkles className="w-4 h-4" />,
      label: t('nav.taskAssistant'),
      href: '/task-assistant'
    },
    {
      icon: <Workflow className="w-4 h-4" />,
      label: t('nav.aiWorkFlow'),
      href: '/ai-workflow'
    }
  ];

  return (
    <PopoverContent className="w-64" side="right">
      {user && (
        <div className="flex flex-col">
          <div className=" pb-2 border-b">
            <div className="flex items-center gap-3">
              {user.avatar_url ? (
                <img 
                  src={user.avatar_url} 
                  alt={user.name} 
                  className="w-8 h-8 rounded-full"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                  <User className="w-6 h-6 text-gray-500" />
                </div>
              )}
              <div>
                <h4 className="font-medium text-sm max-w-[90%] break-words">{user.name}</h4>
                <p className="text-sm text-muted-foreground max-w-[95%] break-words">{user.email}</p>
              </div>
            </div>
          </div>
          
          <div className="py-2">
            {menuItems.map((item, index) => (
              <Button
                key={index}
                variant="ghost"
                className={`w-full justify-between px-4 py-2 h-auto font-normal ${
                  item.isUpgrade ? 'text-yellow-600 hover:text-white hover:bg-yellow-600' : ''
                }`}
                onClick={() => router.push(item.href)}
              >
                <div className="flex items-center gap-3">
                  {item.icon}
                  <span>{item.label}</span>
                </div>
              </Button>
            ))}
          </div>

          <div className="border-t py-2">
            <Button
              variant="ghost"
              className="w-full justify-start px-4 py-2 h-auto font-normal text-red-600 hover:text-white hover:bg-red-600"
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