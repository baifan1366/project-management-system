'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useTheme } from 'next-themes';
import { useDispatch } from 'react-redux';
import { updateUserPreference } from '@/lib/redux/features/usersSlice';

export default function PreferencesPage() {
  const t = useTranslations('profile');
  const { theme, setTheme } = useTheme();
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    language: 'zh',
    timezone: 'UTC+8',
    hourFormat: '24h'
  });

  useEffect(() => {
    const getUser = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (session?.user) {
        updateUserData(session);
      }
    };

    getUser();
  }, []);
  
  const updateUserData = async (session) => {
    if (!session?.user) return;
    
    setFormData({
      language: session.user.user_metadata?.language || 'zh',
      timezone: session.user.user_metadata?.timezone || 'UTC+8',
      hourFormat: session.user.user_metadata?.hourFormat || '24h'
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
    setLoading(true);
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;
      
      const preferenceData = {
        language: formData.language,
        timezone: formData.timezone,
        hourFormat: formData.hourFormat,
        theme
      };
      
      const resultAction = await dispatch(updateUserPreference({ 
        userId: session.user.id, 
        preferenceData 
      }));
      
      if (updateUserPreference.fulfilled.match(resultAction)) {
        await supabase.auth.updateUser({
          data: {
            language: formData.language,
            timezone: formData.timezone,
            hourFormat: formData.hourFormat,
            theme
          }
        });
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
                <option value="zh">中文</option>
                <option value="en">English</option>
                <option value="my">Malay</option>
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
                <option value="UTC+8">中国标准时间 (UTC+8)</option>
                <option value="UTC+0">格林威治标准时间 (UTC+0)</option>
                <option value="UTC-8">太平洋标准时间 (UTC-8)</option>
                <option value="UTC-5">东部标准时间 (UTC-5)</option>
                <option value="UTC+1">中欧标准时间 (UTC+1)</option>
                <option value="UTC+9">日本标准时间 (UTC+9)</option>
                <option value="UTC+10">澳大利亚东部标准时间 (UTC+10)</option>
                <option value="UTC+5.5">印度标准时间 (UTC+5.5)</option>
                <option value="UTC+7">东南亚标准时间 (UTC+7)</option>
                <option value="UTC+3">莫斯科标准时间 (UTC+3)</option>
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
                <option value="24h">24小时制 (14:30)</option>
                <option value="12h">12小时制 (2:30 PM)</option>
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