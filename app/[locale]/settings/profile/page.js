'use client';

import { useState, useEffect, useCallback } from 'react';
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
    phone: '',
    email: ''
  });
  const [phoneError, setPhoneError] = useState('');
  const [providerData, setProviderData] = useState({
    googleConnected: false,
    githubConnected: false,
    googleProviderId: '',
    githubProviderId: '',
    hasCalendarScope: false
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
      phone: session.phone || '',
      email: session.email || ''
    });
    
    const googleConnected = !!session.google_provider_id;
    
    setProviderData({
      googleConnected,
      githubConnected: !!session.github_provider_id,
      googleProviderId: session.google_provider_id || '',
      githubProviderId: session.github_provider_id || '',
      hasCalendarScope: false // Will check this separately
    });
    
    // Check calendar scope if Google is connected
    if (googleConnected) {
      checkCalendarScope();
    }
  };

  // Phone validation function
  const validatePhone = (phone) => {
    // Allow empty phone numbers (optional field)
    if (!phone) return { valid: true, message: '' };
    
    // Basic phone validation: minimum 7 digits, can contain +, -, (), and spaces
    const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,4}[-\s.]?[0-9]{1,9}$/;
    
    if (!phoneRegex.test(phone)) {
      return { valid: false, message: t('phoneInvalid') || 'Please enter a valid phone number' };
    }
    
    // Check minimum digits (excluding non-numeric characters)
    const digitsOnly = phone.replace(/\D/g, '');
    if (digitsOnly.length < 7) {
      return { valid: false, message: t('phoneMinDigits') || 'Phone number must have at least 7 digits' };
    }
    
    return { valid: true, message: '' };
  };

  // Move the checkCalendarScope function to useCallback to prevent dependency loops
  const checkCalendarScope = useCallback(async () => {
    try {
      // Check if user has Google connected
      if (!user?.google_provider_id) {
        return;
      }
      
      // Get tokens from our tokens API
      const response = await fetch('/api/users/tokens?provider=google', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        console.error('Failed to fetch Google tokens');
        setProviderData(prev => ({
          ...prev,
          hasCalendarScope: false
        }));
        return;
      }
      
      const tokenData = await response.json();
      
      // Check calendar scope with tokens
      const scopeResponse = await fetch('/api/check-calendar-scope', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token
        }),
      });
      
      if (!scopeResponse.ok) {
        console.error('Failed to check calendar scope');
        setProviderData(prev => ({
          ...prev,
          hasCalendarScope: false
        }));
        return;
      }
      
      const scopeData = await scopeResponse.json();
      
      setProviderData(prev => ({
        ...prev,
        hasCalendarScope: scopeData.hasCalendarScope
      }));
      
    } catch (error) {
      console.error('Error checking calendar scope:', error);
      setProviderData(prev => ({
        ...prev,
        hasCalendarScope: false
      }));
    }
  }, [user, setProviderData]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear phone error when typing
    if (name === 'phone') {
      setPhoneError('');
    }
  };

  // Validate phone on blur
  const handlePhoneBlur = () => {
    if (formData.phone) {
      const { valid, message } = validatePhone(formData.phone);
      if (!valid) {
        setPhoneError(message);
      } else {
        setPhoneError('');
      }
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    
    // Validate phone before saving
    const { valid, message } = validatePhone(formData.phone);
    if (!valid) {
      setPhoneError(message);
      return;
    }
    
    setLoading(true);
    
    const profileData = {
      name: formData.name,
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

    let toastId;
    try {
      setLoading(true);
      toastId = toast.loading(t('uploading'));
      
      // 1. Upload the file to Supabase Storage
      const fileExt = file.name.split('.').pop();
      // Generate random 8-character alphanumeric string
      const randomString = Array(8).fill(0).map(() => Math.random().toString(36).charAt(2)).join('');
      const fileName = `avatar-${user.id}-${randomString}.${fileExt}`;
      const filePath = fileName;
      
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { 
          upsert: true,
          contentType: file.type,
          cacheControl: '3600',
          public: true
        });

      if (uploadError) {
        console.error('上传错误详情:', uploadError);
        throw new Error(`上传头像失败: ${uploadError.message}`);
      }

      // 2. Get the public URL for the uploaded file
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // 3. Update avatar URL via the API endpoint instead of direct DB update
      const response = await fetch(`/api/users/${user.id}/avatar`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ avatar_url: publicUrl }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`更新用户头像失败: ${error.message || response.statusText}`);
      }

      // 4. Update the user state
      dispatch(updateUserProfile({ 
        userId: user.id, 
        profileData: { avatar_url: publicUrl }
      }));
      
      toast.dismiss(toastId);
      toast.success(t('avatarUpdated'));
    } catch (error) {
      console.error('头像上传失败:', error);
      toast.dismiss(toastId);
      toast.error(error.message || t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleConnectProvider = async (provider, withCalendarScope = false) => {
    if (!user) return;
    
    // For OAuth providers, use custom OAuth APIs
    if (provider === 'google' || provider === 'github') {
      try {
        const toastId = toast.loading(t('connectingProvider', { provider: provider === 'google' ? 'Google' : 'GitHub' }));
        
        // Build the redirect URL
        let redirectUrl = `/api/auth/${provider.toLowerCase()}`;
        const searchParams = new URLSearchParams();
        
        // Add redirectTo parameter to return to profile page
        searchParams.append('redirectTo', `${window.location.origin}/${window.location.pathname.split('/')[1]}/settings/profile`);
        
        // Add calendar scope if requested for Google
        if (provider === 'google' && withCalendarScope) {
          // Add calendar flag to request calendar permissions
          searchParams.append('calendar', 'true');
        }
        
        // Append search params to redirect URL
        redirectUrl += `?${searchParams.toString()}`;
        
        // Dismiss loading toast before redirect
        toast.dismiss(toastId);
        
        // Redirect to the OAuth endpoint
        window.location.href = redirectUrl;
        
        // Show authorization started toast
        toast.success(t('authorizationStarted', { provider: provider === 'google' ? 'Google' : 'GitHub' }));
        
      } catch (err) {
        console.error(`${provider} sign in error:`, err);
        toast.error(t('connectProviderFailed', { provider: provider === 'google' ? 'Google' : 'GitHub' }));
      }
      return;
    }
    
    // For other providers (fallback, should not be used)
    const providerId = `sample-${provider}-id`;
    const providerIdField = provider === 'google' ? 'google_provider_id' : 'github_provider_id';
    
    setLoading(true);
    try {
      const toastId = toast.loading(t('connectingProvider', { provider }));
      
      const resultAction = await dispatch(connectProvider({ 
        userId: user.id, 
        provider, 
        providerId,
        providerIdField
      }));
      
      toast.dismiss(toastId);
      
      if (connectProvider.fulfilled.match(resultAction)) {
        setProviderData(prev => ({
          ...prev,
          [provider === 'google' ? 'googleConnected' : 'githubConnected']: true,
          [provider === 'google' ? 'googleProviderId' : 'githubProviderId']: providerId
        }));
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
      const toastId = toast.loading(t('disconnectingProvider', { provider }));
      
      const providerIdField = provider === 'google' ? 'google_provider_id' : 'github_provider_id';
      
      const resultAction = await dispatch(disconnectProvider({
        userId: user.id,
        provider,
        providerIdField
      }));
      
      toast.dismiss(toastId);
      
      if (disconnectProvider.fulfilled.match(resultAction)) {
        setProviderData(prev => ({
          ...prev,
          [provider === 'google' ? 'googleConnected' : 'githubConnected']: false,
          [provider === 'google' ? 'googleProviderId' : 'githubProviderId']: ''
        }));
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

  // Add useEffect to check calendar scope when page loads or when URL includes auth completion parameters
  useEffect(() => {
    // Check if we just completed an OAuth flow by checking URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const authCompleted = urlParams.get('auth') === 'success';
    const provider = urlParams.get('provider');
    
    if (authCompleted && provider === 'google' && user?.google_provider_id) {
      // After Google auth is completed, need to check calendar scope
      checkCalendarScope();
    }
  }, [user, checkCalendarScope]);

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
                    onBlur={handlePhoneBlur}
                    placeholder="+1 (123) 456-7890"
                    className={phoneError ? 'border-red-500 focus:ring-red-500' : ''}
                  />
                  {phoneError && (
                    <p className="text-sm text-red-500 mt-1">{phoneError}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleSaveProfile} disabled={loading || !!phoneError}>
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
                  {providerData.githubConnected 
                    ? t('connected') 
                    : t('notConnected')}
                </p>
              </div>
            </div>
            {providerData.githubConnected ? (
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
                  {providerData.googleConnected
                    ? t('connected') 
                    : t('notConnected')}
                </p>
              </div>
            </div>
            {providerData.googleConnected ? (
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
          {providerData.googleConnected && (
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <CalendarIcon className="w-6 h-6 text-red-500" />
                <div>
                  <p className="font-medium">{t('googleCalendar')}</p>
                  <p className="text-sm text-muted-foreground">
                    {providerData.hasCalendarScope ? t('calendarConnected') : t('calendarNotConnected')}
                  </p>
                </div>
              </div>
              {providerData.hasCalendarScope ? (
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
          
          {!providerData.googleConnected && (
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