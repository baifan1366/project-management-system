'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { User, Mail, Github, Pencil, CalendarIcon } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { useDispatch } from 'react-redux';
import { updateUserProfile, connectProvider, disconnectProvider } from '@/lib/redux/features/usersSlice';
import { useGetUser } from '@/lib/hooks/useGetUser';

export default function ProfilePage() {
  const t = useTranslations('profile');
  const dispatch = useDispatch();
  const { user, isLoading: userLoading } = useGetUser();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    bio: '',
    phone: '',
    email: ''
  });
  const [providerData, setProviderData] = useState({
    provider: '',
    providerId: ''
  });

  useEffect(() => {
    if (user) {
      updateUserData(user);
    }
  }, [user]);
  
  const updateUserData = async (session) => {
    if (!session) return;
    setFormData({
      name: session.name || '',
      bio: session.bio || '',
      phone: session.phone || '',
      email: session.email || ''
    });
    
    let provider = 'local';
    let providerId = '';
    
    if (session.google_provider_id) {
      provider = 'google';
      providerId = session.google_provider_id;
    } else if (session.github_provider_id) {
      provider = 'github';
      providerId = session.github_provider_id;
    }
    
    setProviderData({
      provider: provider,
      providerId: providerId
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setLoading(true);
    
    const profileData = {
      name: formData.name,
      bio: formData.bio,
      phone: formData.phone
    };
    
    try {
      await dispatch(updateUserProfile({ 
        userId: user.id, 
        profileData 
      }));
      toast.success(t('saved'));
  
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    try {
      setLoading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-avatar.${fileExt}`;
      const filePath = `user_${user.id}/${fileName}`;
      
      const { error: uploadError, data } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { 
          upsert: true,
          contentType: file.type,
          cacheControl: '3600'
        });

      if (uploadError) {
        console.error('上传错误详情:', uploadError);
        throw new Error(`上传头像失败: ${uploadError.message}`);
      }

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);


      if (updateError) {
        console.error('更新用户数据错误:', updateError);
        throw new Error(`更新用户头像失败: ${updateError.message}`);
      }

      const { error: dbError } = await supabase
        .from('user')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (dbError) {
        console.error('数据库更新错误:', dbError);
      }

      toast.success(t('avatarUpdated'));
    } catch (error) {
      console.error('头像上传失败:', error);
      toast.error(error.message || t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleConnectProvider = async (provider, withCalendarScope = false) => {
    if (!user) return;
    
    if (provider === 'google') {
      try {
        toast.loading(t('connectingProvider', { provider: 'Google' }));
        
        const scopes = 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly';
        
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: `${window.location.origin}/${window.location.pathname.split('/')[1]}/settings/profile`,
            scopes: scopes,
            queryParams: {
              access_type: 'offline',
              prompt: 'consent',
            },
          },
        });
        
        if (error) {
          console.error('谷歌授权错误:', error);
          toast.error(t('googleAuthError', { error: error.message }));
          throw error;
        }
        
        // 授权开始提示
        toast.success(t('authorizationStarted', { provider: 'Google' }));
      } catch (err) {
        console.error('Google sign in error:', err);
        toast.error(t('connectProviderFailed', { provider: 'Google' }));
      }
      return;
    }
    
    const providerId = `sample-${provider}-id`;
    
    setLoading(true);
    try {
      toast.loading(t('connectingProvider', { provider }));
      
      const resultAction = await dispatch(connectProvider({ 
        userId: user.id, 
        provider, 
        providerId 
      }));
      
      if (connectProvider.fulfilled.match(resultAction)) {
        setProviderData({
          provider,
          providerId
        });
        toast.success(t('providerConnected', { provider }));
      } else {
        throw new Error(resultAction.error);
      }
    } catch (error) {
      console.error('Error connecting provider:', error);
      toast.error(t('connectProviderFailed', { provider }));
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnectProvider = async (provider) => {
    if (!user) return;
    setLoading(true);
    try {
      toast.loading(t('disconnectingProvider', { provider }));
      
      const resultAction = await dispatch(disconnectProvider({
        userId: user.id,
        provider
      }));
      
      if (disconnectProvider.fulfilled.match(resultAction)) {
        setProviderData({
          provider: 'local',
          providerId: ''
        });
        toast.success(t('providerDisconnected', { provider }));
      } else {
        throw new Error(resultAction.error);
      }
    } catch (error) {
      console.error('Error disconnecting provider:', error);
      toast.error(t('disconnectProviderFailed', { provider }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{t('profile')}</CardTitle>
          <CardDescription>{t('description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative group">
              {user?.avatar_url ? (
                <>
                  <img
                    src={user.avatar_url}
                    alt={user.name}
                    className="w-20 h-20 rounded-full object-cover"
                  />
                  <div 
                    className="absolute inset-0 bg-black bg-opacity-30 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer"
                    onClick={() => document.getElementById('avatar').click()}
                  >
                    <Pencil className="w-6 h-6 text-white" />
                  </div>
                </>
              ) : (
                <>
                  <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center">
                    <User className="w-10 h-10 text-gray-500" />
                  </div>
                  <div 
                    className="absolute inset-0 bg-black bg-opacity-30 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer"
                    onClick={() => document.getElementById('avatar').click()}
                  >
                    <Pencil className="w-6 h-6 text-white" />
                  </div>
                </>
              )}
              <input
                type="file"
                id="avatar"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>
            <div className="flex-1 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">{t('name')}</Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder={t('name')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">{t('email')}</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    disabled
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">{t('phone')}</Label>
                  <Input
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder={t('phone')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bio">{t('bio')}</Label>
                  <Input
                    id="bio"
                    name="bio"
                    value={formData.bio}
                    onChange={handleInputChange}
                    placeholder={t('bio')}
                  />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleSaveProfile} disabled={loading}>
            {loading ? t('saving') : t('saveChanges')}
          </Button>
        </CardFooter>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>{t('connectedAccounts')}</CardTitle>
          <CardDescription>{t('connectedAccountsDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Mail className="w-6 h-6 text-primary" />
              <div>
                <p className="font-medium">{t('emailAccount')}</p>
                <p className="text-sm text-muted-foreground">{formData.email}</p>
              </div>
            </div>
            <Button variant="outline" disabled>
              {t('primary')}
            </Button>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Github className="w-6 h-6" />
              <div>
                <p className="font-medium">GitHub</p>
                <p className="text-sm text-muted-foreground">
                  {providerData.provider === 'github' 
                    ? t('connected') 
                    : t('notConnected')}
                </p>
              </div>
            </div>
            {providerData.provider === 'github' ? (
              <Button 
                variant="outline" 
                onClick={() => handleDisconnectProvider('github')}
                disabled={loading}
              >
                {t('disconnect')}
              </Button>
            ) : (
              <Button 
                variant="outline" 
                onClick={() => handleConnectProvider('github')}
                disabled={loading}
              >
                {t('connect')}
              </Button>
            )}
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-6 h-6 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 186.69 190.5">
                  <path fill="#4285f4" d="M95.25 77.932v36.888h51.262c-2.251 11.863-9.006 21.908-19.137 28.662l30.913 23.986c18.011-16.625 28.402-41.044 28.402-70.052 0-6.754-.606-13.249-1.732-19.483z"/>
                  <path fill="#34a853" d="m41.869 113.38 6.948 5.102-6.948-5.102-3.511 25.92c7.498 14.555 22.469 24.699 39.838 24.699 13.55 0 24.953-4.453 33.29-12.067v-.001l-30.913-23.986c-8.174 5.49-18.621 8.198-29.745 4.655z"/>
                  <path fill="#fbbc05" d="M41.87 68.175c-3.014 8.983-4.704 18.609-4.704 28.625s1.69 19.642 4.704 28.625l30.695-23.999-1.272-2.148-7.093-5.411-.693-1.18-21.637 3.488z"/>
                  <path fill="#ea4335" d="M95.25 37.737c16.709 0 31.607 5.725 43.3 16.957l27.275-27.275C148.224 9.622 123.569 0 95.25 0 65.799 0 40.588 14.675 25.59 36.094l23.116 17.85c5.239-9.374 14.858-16.207 26.024-16.207z"/>
                </svg>
              </div>
              <div>
                <p className="font-medium">Google</p>
                <p className="text-sm text-muted-foreground">
                  {providerData.provider === 'google' 
                    ? t('connected') 
                    : t('notConnected')}
                </p>
              </div>
            </div>
            {providerData.provider === 'google' ? (
              <Button 
                variant="outline" 
                onClick={() => handleDisconnectProvider('google')}
                disabled={loading}
              >
                {t('disconnect')}
              </Button>
            ) : (
              <Button 
                variant="outline" 
                onClick={() => handleConnectProvider('google')}
                disabled={loading}
              >
                {t('connect')}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('authorizations')}</CardTitle>
          <CardDescription>{t('authorizationsDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {(providerData.provider === 'google') && (
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <CalendarIcon className="w-6 h-6 text-red-500" />
                <div>
                  <p className="font-medium">{t('googleCalendar')}</p>
                  <p className="text-sm text-muted-foreground">
                    {providerData.provider === 'google' ? t('calendarConnected') : t('calendarNotConnected')}
                  </p>
                </div>
              </div>
              {providerData.provider === 'google' ? (
                <Button 
                  variant="outline"
                  disabled
                >
                  {t('connected')}
                </Button>
              ) : (
                <Button 
                  variant="outline"
                  onClick={() => handleConnectProvider('google', true)}
                >
                  {t('authorizeCalendar')}
                </Button>
              )}
            </div>
          )}
          
          {providerData.provider !== 'google' && (
            <div className="text-center py-4 text-muted-foreground">
              <p>{t('connectGoogleFirst')}</p>
              <Button 
                variant="outline" 
                className="mt-2" 
                onClick={() => handleConnectProvider('google')}
              >
                {t('connectGoogle')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 