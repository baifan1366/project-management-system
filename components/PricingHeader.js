import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Button } from './ui/button';
import { ChevronDown, Menu, User } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from './ui/dropdown-menu';
import { useSelector } from 'react-redux';
import { ProfilePopover } from './ui/ProfilePopover';
import { Popover, PopoverTrigger } from './ui/popover';
import { useState } from 'react';
import { useGetUser } from '@/lib/hooks/useGetUser';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import LogoImage from '../public/logo.png';

export function PricingHeader() {
  const t = useTranslations('Header');
  const { user, isLoading } = useGetUser();
  const [isProfileOpen, setProfileOpen] = useState(false);
  const pathname = usePathname();

  // Hide header on payment page
  if (pathname?.includes('/payment')) {
    return null;
  }

  const navItems = [
    { href: '/landing', label: t('features') },
    { href: '/pricing', label: t('pricing') },
    { href: '/aboutUs', label: t('about') },
    { href: '/contactUs', label: t('contact') },
    { href: '/terms-and-conditions', label: t('terms') },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background">
      <div className="px-4 sm:px-6 lg:px-8 flex h-16 items-center justify-between">
        {/* Logo and Brand */}
        <div className="flex items-center gap-6">
          <Link href="/landing" className="flex items-center space-x-2">
            <Image
              src={LogoImage}
              alt="Logo"
              width={32}
              height={32}
              className="w-8 h-8"
            />
            <span className="text-xl font-bold">{t('projectName')}</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4">
          {/* Mobile Navigation */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[200px]">
              {navItems.map((item) => (
                <DropdownMenuItem key={item.href} asChild>
                  <Link href={item.href}>{item.label}</Link>
                </DropdownMenuItem>
              ))}
              {!user && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/login">{t('login')}</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/signup">{t('signup')}</Link>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Auth Buttons or User Profile */}
          {!user && !isLoading ? (
            <div className="hidden md:flex items-center gap-2">
              <Button variant="ghost" asChild>
                <Link href="/login">{t('login')}</Link>
              </Button>
              <Button asChild>
                <Link href="/signup">{t('signup')}</Link>
              </Button>
            </div>
          ) : user && (
            <Popover open={isProfileOpen} onOpenChange={setProfileOpen}>
              <PopoverTrigger asChild>
                <Button size="icon" variant="ghost" className="w-10 h-10">
                  <User size={20} />
                </Button>
              </PopoverTrigger>
              <ProfilePopover onClose={() => setProfileOpen(false)} />
            </Popover>
          )}
        </div>
      </div>
    </header>
  );
} 