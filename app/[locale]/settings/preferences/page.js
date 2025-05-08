'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from 'sonner';
import { useTheme } from 'next-themes';
import { useDispatch } from 'react-redux';
import { updateUserPreference } from '@/lib/redux/features/usersSlice';
import { useGetUser } from '@/lib/hooks/useGetUser';

export default function PreferencesPage() {
  const t = useTranslations('profile');
  const { theme, setTheme } = useTheme();
  const dispatch = useDispatch();
  const { user: currentUser, isLoading: userLoading } = useGetUser();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    language: 'en',
    timezone: 'UTC+0',
    hourFormat: '24h'
  });

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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
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
      } else {
        throw new Error(resultAction.error);
      }
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast.error(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

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
                checked={theme === 'dark'}
                onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="language">{t('language')}</Label>
              <select
                id="language"
                name="language"
                value={formData.language}
                onChange={handleInputChange}
                className="w-full p-2 border rounded-md"
              >
                <option value="zh">{t('languages.chinese')}</option>
                <option value="en">{t('languages.english')}</option>
                <option value="my">{t('languages.malay')}</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="timezone">{t('timezone')}</Label>
              <select
                id="timezone"
                name="timezone"
                value={formData.timezone}
                onChange={handleInputChange}
                className="w-full p-2 border rounded-md"
              >
                <option value="UTC+8">{t('timezones.utc8')}</option>
                <option value="UTC+0">{t('timezones.utc0')}</option>
                <option value="UTC-8">{t('timezones.utc-8')}</option>
                <option value="UTC-5">{t('timezones.utc-5')}</option>
                <option value="UTC+1">{t('timezones.utc1')}</option>
                <option value="UTC+9">{t('timezones.utc9')}</option>
                <option value="UTC+10">{t('timezones.utc10')}</option>
                <option value="UTC+5.5">{t('timezones.utc55')}</option>
                <option value="UTC+7">{t('timezones.utc7')}</option>
                <option value="UTC+3">{t('timezones.utc3')}</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="hourFormat">{t('timeFormat')}</Label>
              <select
                id="hourFormat"
                name="hourFormat"
                value={formData.hourFormat}
                onChange={handleInputChange}
                className="w-full p-2 border rounded-md"
              >
                <option value="24h">{t('hourFormats.format24h')}</option>
                <option value="12h">{t('hourFormats.format12h')}</option>
              </select>
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