'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from 'sonner';
import { useTheme } from 'next-themes';
import { useDispatch } from 'react-redux';
import { updateUserPreference } from '@/lib/redux/features/usersSlice';
import { useGetUser } from '@/lib/hooks/useGetUser';
import { useRouter, usePathname } from 'next/navigation';

export default function PreferencesPage() {
  const t = useTranslations('profile');
  const { theme, setTheme, resolvedTheme } = useTheme();
  const dispatch = useDispatch();
  const { user: currentUser, isLoading: userLoading } = useGetUser();
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const [formData, setFormData] = useState({
    language: 'en',
    timezone: 'UTC+0',
    hourFormat: '24h'
  });

  // Handle hydration mismatch by only showing the actual theme state after mounting
  useEffect(() => {
    setMounted(true);
    
    // If user has a stored theme preference in the database, apply it
    if (currentUser?.theme) {
      setTheme(currentUser.theme);
    }
  }, [setTheme, currentUser]);

  useEffect(() => {
    if (currentUser) {
      updateUserData(currentUser);
    }
  }, [currentUser]);
  
  const updateUserData = (user) => {
    if (!user) return;
    
    setFormData({
      language: user.language || 'en',
      timezone: user.timezone || 'UTC+0',
      hourFormat: user.hour_format || '24h'
    });
  };

  const handleInputChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSavePreferences = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {      
      const preferenceData = {
        language: formData.language,
        timezone: formData.timezone,
        hour_format: formData.hourFormat,
        theme
      };
      
      // Update in database via Redux
      const resultAction = await dispatch(updateUserPreference({ 
        userId: currentUser.id, 
        preferenceData 
      }));
      
      if (updateUserPreference.fulfilled.match(resultAction)) {
        toast.success(t('saved'));
        
        // If language was changed, redirect to the new locale version of the page
        const currentLocale = pathname.split('/')[1]; // Extract current locale from URL
        if (formData.language !== currentLocale) {
          // Replace current locale with new language in URL and navigate
          const newPath = pathname.replace(`/${currentLocale}/`, `/${formData.language}/`);
          router.push(newPath);
        }
      } else {
        throw new Error(resultAction.error);
      }
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast.error(t('error'));
    } finally {
      setLoading(false);
    }
  };

  // Only show the UI when mounted to prevent hydration mismatch
  if (!mounted) {
    return null;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{t('preferences')}</CardTitle>
          <CardDescription>{t('preferences')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>{t('darkMode')}</Label>
                <p className="text-sm text-muted-foreground">
                  {t('theme')}
                </p>
              </div>
              <Switch
                checked={resolvedTheme === 'dark'}
                onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="language">{t('language')}</Label>
              <Select
                value={formData.language}
                onValueChange={(value) => handleInputChange('language', value)}
              >
                <SelectTrigger id="language">
                  <SelectValue placeholder={t('selectLanguage')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="zh">{t('languages.chinese')}</SelectItem>
                  <SelectItem value="en">{t('languages.english')}</SelectItem>
                  <SelectItem value="my">{t('languages.malay')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="timezone">{t('timezone')}</Label>
              <Select
                value={formData.timezone}
                onValueChange={(value) => handleInputChange('timezone', value)}
              >
                <SelectTrigger id="timezone">
                  <SelectValue placeholder={t('selectTimezone')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UTC+8">{t('timezones.utc8')}</SelectItem>
                  <SelectItem value="UTC+0">{t('timezones.utc0')}</SelectItem>
                  <SelectItem value="UTC-8">{t('timezones.utc-8')}</SelectItem>
                  <SelectItem value="UTC-5">{t('timezones.utc-5')}</SelectItem>
                  <SelectItem value="UTC+1">{t('timezones.utc1')}</SelectItem>
                  <SelectItem value="UTC+9">{t('timezones.utc9')}</SelectItem>
                  <SelectItem value="UTC+10">{t('timezones.utc10')}</SelectItem>
                  <SelectItem value="UTC+5.5">{t('timezones.utc55')}</SelectItem>
                  <SelectItem value="UTC+7">{t('timezones.utc7')}</SelectItem>
                  <SelectItem value="UTC+3">{t('timezones.utc3')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="hourFormat">{t('timeFormat')}</Label>
              <Select
                value={formData.hourFormat}
                onValueChange={(value) => handleInputChange('hourFormat', value)}
              >
                <SelectTrigger id="hourFormat">
                  <SelectValue placeholder={t('selectTimeFormat')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="24h">{t('hourFormats.format24h')}</SelectItem>
                  <SelectItem value="12h">{t('hourFormats.format12h')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleSavePreferences} disabled={loading}>
            {loading ? t('saving') : t('saveChanges')}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
} 