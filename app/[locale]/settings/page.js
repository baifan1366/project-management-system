'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Bell, Lock, User, Globe, Zap, Github, Mail, Phone, Shield, Pencil } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { useTheme } from 'next-themes';
import { useDispatch } from 'react-redux';
import { updateUserProfile, connectProvider, disconnectProvider, updateUserPreference } from '@/lib/redux/features/usersSlice';

export default function SettingsPage() {
  const t = useTranslations('profile');
  const { theme, setTheme } = useTheme();
  const dispatch = useDispatch();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    bio: '',
    phone: '',
    language: 'zh',
    timezone: 'UTC+8',
    email: '',
    theme: 'light'
  });
  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    pushNotifications: true,
    weeklyDigest: true,
    mentionNotifications: true,
    taskAssignments: true,
    taskComments: true,
    dueDates: true,
    teamInvitations: true
  });
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [providerData, setProviderData] = useState({
    provider: '',
    providerId: ''
  });

  useEffect(() => {
    const getUser = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        setFormData({
          name: session.user.user_metadata?.name || '',
          bio: session.user.user_metadata?.bio || '',
          phone: session.user.user_metadata?.phone || '',
          language: session.user.user_metadata?.language || 'zh',
          timezone: session.user.user_metadata?.timezone || 'UTC+8',
          email: session.user.email || '',
          theme: session.user.user_metadata?.theme || 'light'
        });
        setNotifications({
          emailNotifications: session.user.user_metadata?.emailNotifications ?? true,
          pushNotifications: session.user.user_metadata?.pushNotifications ?? true,
          weeklyDigest: session.user.user_metadata?.weeklyDigest ?? true,
          mentionNotifications: session.user.user_metadata?.mentionNotifications ?? true,
          taskAssignments: session.user.user_metadata?.taskAssignments !== false,
          taskComments: session.user.user_metadata?.taskComments !== false,
          dueDates: session.user.user_metadata?.dueDates !== false,
          teamInvitations: session.user.user_metadata?.teamInvitations !== false
        });
        
        // 获取用户的第三方登录提供商信息
        setProviderData({
          provider: session.user.user_metadata?.provider || 'local',
          providerId: session.user.user_metadata?.provider_id || ''
        });
      }
    };

    getUser();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswords(prev => ({
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
      phone: formData.phone,
      language: formData.language,
      timezone: formData.timezone,
      theme: formData.theme
    };
    
    try {
      const resultAction = await dispatch(updateUserProfile({ 
        userId: user.id, 
        profileData 
      }));
      
      if (updateUserProfile.fulfilled.match(resultAction)) {
        await supabase.auth.updateUser({
          data: {
            name: formData.name,
            bio: formData.bio,
            phone: formData.phone,
            language: formData.language,
            timezone: formData.timezone,
            theme: formData.theme
          }
        });
        toast.success(t('saved'));
      } else {
        throw new Error(resultAction.error);
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNotifications = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // 更新用户的通知首选项
      const { error } = await supabase.auth.updateUser({
        data: {
          emailNotifications: notifications.emailNotifications,
          pushNotifications: notifications.pushNotifications,
          weeklyDigest: notifications.weeklyDigest,
          mentionNotifications: notifications.mentionNotifications,
          taskAssignments: notifications.taskAssignments,
          taskComments: notifications.taskComments,
          dueDates: notifications.dueDates,
          teamInvitations: notifications.teamInvitations
        }
      });
      
      if (error) throw error;
      
      // 使用Redux更新用户偏好
      await dispatch(updateUserPreference({ 
        userId: user.id, 
        preferenceData: { 
          notifications: {
            emailNotifications: notifications.emailNotifications,
            pushNotifications: notifications.pushNotifications,
            weeklyDigest: notifications.weeklyDigest,
            mentionNotifications: notifications.mentionNotifications,
            taskAssignments: notifications.taskAssignments,
            taskComments: notifications.taskComments,
            dueDates: notifications.dueDates,
            teamInvitations: notifications.teamInvitations
          }
        }
      }));
      
      toast.success(t('saved'));
    } catch (error) {
      console.error('Error saving notifications:', error);
      toast.error(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!user) return;
    if (passwords.newPassword !== passwords.confirmPassword) {
      toast.error(t('passwordMismatch'));
      return;
    }
    setLoading(true);
    try {
      await api.users.updatePassword(user.id, {
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword
      });
      setPasswords({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      toast.success(t('passwordChanged'));
    } catch (error) {
      console.error('Error changing password:', error);
      toast.error(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleSavePreferences = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const preferenceData = {
        language: formData.language,
        timezone: formData.timezone,
        theme
      };
      
      const resultAction = await dispatch(updateUserPreference({ 
        userId: user.id, 
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

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    try {
      setLoading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-avatar.${fileExt}`;
      
      // 创建一个专门的路径，包含用户ID，确保RLS策略可以正确应用
      const filePath = `user_${user.id}/${fileName}`;
      
      // 添加额外的元数据，帮助Supabase RLS政策识别所有者
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

      // 更新Supabase Auth用户元数据
      const { error: updateError } = await supabase.auth.updateUser({
        data: { avatar_url: publicUrl }
      });

      if (updateError) {
        console.error('更新用户数据错误:', updateError);
        throw new Error(`更新用户头像失败: ${updateError.message}`);
      }

      // 同时更新本地状态
      setUser(prev => ({
        ...prev,
        user_metadata: {
          ...prev.user_metadata,
          avatar_url: publicUrl
        }
      }));

      // 更新数据库中的用户记录
      const { error: dbError } = await supabase
        .from('user')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (dbError) {
        console.error('数据库更新错误:', dbError);
        // 不抛出错误，因为Auth用户元数据已更新
      }

      toast.success(t('avatarUpdated'));
    } catch (error) {
      console.error('头像上传失败:', error);
      toast.error(error.message || t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleConnectProvider = async (provider) => {
    if (!user) return;
    
    // 此处应该实现OAuth登录流程，获取providerId
    // 这里仅为示例，实际应该跳转到对应的OAuth授权页面
    const providerId = `sample-${provider}-id`;
    
    setLoading(true);
    try {
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
        toast.success(t('providerConnected'));
      } else {
        throw new Error(resultAction.error);
      }
    } catch (error) {
      console.error('Error connecting provider:', error);
      toast.error(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnectProvider = async (provider) => {
    if (!user) return;
    setLoading(true);
    try {
      const resultAction = await dispatch(disconnectProvider({
        userId: user.id,
        provider
      }));
      
      if (disconnectProvider.fulfilled.match(resultAction)) {
        setProviderData({
          provider: 'local',
          providerId: ''
        });
        toast.success(t('providerDisconnected'));
      } else {
        throw new Error(resultAction.error);
      }
    } catch (error) {
      console.error('Error disconnecting provider:', error);
      toast.error(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-10">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{t('title')}</h2>
          <p className="text-muted-foreground">{t('description')}</p>
        </div>

        <Tabs defaultValue="profile" className="space-y-4">
          <TabsList>
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              {t('profile')}
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              {t('notifications')}
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Lock className="h-4 w-4" />
              {t('security')}
            </TabsTrigger>
            <TabsTrigger value="preferences" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              {t('preferences')}
            </TabsTrigger>
            <TabsTrigger value="billing" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              {t('billing.title')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t('profile')}</CardTitle>
                <CardDescription>{t('description')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="relative group">
                    {user?.user_metadata?.avatar_url ? (
                      <>
                        <img
                          src={user.user_metadata.avatar_url}
                          alt={user.user_metadata.name}
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
          </TabsContent>

          <TabsContent value="notifications" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t('notifications')}</CardTitle>
                <CardDescription>{t('notificationsDesc')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>{t('emailNotifications')}</Label>
                    <p className="text-sm text-muted-foreground">
                      {t('emailNotificationsDesc')}
                    </p>
                  </div>
                  <Switch
                    checked={notifications.emailNotifications}
                    onCheckedChange={(checked) =>
                      setNotifications(prev => ({ ...prev, emailNotifications: checked }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>{t('pushNotifications')}</Label>
                    <p className="text-sm text-muted-foreground">
                      {t('pushNotificationsDesc')}
                    </p>
                  </div>
                  <Switch
                    checked={notifications.pushNotifications}
                    onCheckedChange={(checked) =>
                      setNotifications(prev => ({ ...prev, pushNotifications: checked }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>{t('weeklyDigest')}</Label>
                    <p className="text-sm text-muted-foreground">
                      {t('weeklyDigestDesc')}
                    </p>
                  </div>
                  <Switch
                    checked={notifications.weeklyDigest}
                    onCheckedChange={(checked) =>
                      setNotifications(prev => ({ ...prev, weeklyDigest: checked }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>{t('mentionNotifications')}</Label>
                    <p className="text-sm text-muted-foreground">
                      {t('mentionNotificationsDesc')}
                    </p>
                  </div>
                  <Switch
                    checked={notifications.mentionNotifications}
                    onCheckedChange={(checked) =>
                      setNotifications(prev => ({ ...prev, mentionNotifications: checked }))
                    }
                  />
                </div>
                
                <div className="pt-4 border-t">
                  <h3 className="text-lg font-medium mb-3">{t('notificationTypes')}</h3>
                  
                  <div className="grid gap-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>{t('taskAssignments')}</Label>
                        <p className="text-sm text-muted-foreground">
                          {t('taskAssignmentsDesc')}
                        </p>
                      </div>
                      <Switch
                        checked={notifications.taskAssignments}
                        onCheckedChange={(checked) =>
                          setNotifications(prev => ({ ...prev, taskAssignments: checked }))
                        }
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>{t('taskComments')}</Label>
                        <p className="text-sm text-muted-foreground">
                          {t('taskCommentsDesc')}
                        </p>
                      </div>
                      <Switch
                        checked={notifications.taskComments}
                        onCheckedChange={(checked) =>
                          setNotifications(prev => ({ ...prev, taskComments: checked }))
                        }
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>{t('dueDates')}</Label>
                        <p className="text-sm text-muted-foreground">
                          {t('dueDatesDesc')}
                        </p>
                      </div>
                      <Switch
                        checked={notifications.dueDates}
                        onCheckedChange={(checked) =>
                          setNotifications(prev => ({ ...prev, dueDates: checked }))
                        }
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>{t('teamInvitations')}</Label>
                        <p className="text-sm text-muted-foreground">
                          {t('teamInvitationsDesc')}
                        </p>
                      </div>
                      <Switch
                        checked={notifications.teamInvitations}
                        onCheckedChange={(checked) =>
                          setNotifications(prev => ({ ...prev, teamInvitations: checked }))
                        }
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button onClick={handleSaveNotifications} disabled={loading}>
                  {loading ? t('saving') : t('saveChanges')}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t('security')}</CardTitle>
                <CardDescription>{t('security')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">{t('currentPassword')}</Label>
                    <Input
                      id="currentPassword"
                      name="currentPassword"
                      type="password"
                      value={passwords.currentPassword}
                      onChange={handlePasswordChange}
                      placeholder={t('currentPassword')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">{t('newPassword')}</Label>
                    <Input
                      id="newPassword"
                      name="newPassword"
                      type="password"
                      value={passwords.newPassword}
                      onChange={handlePasswordChange}
                      placeholder={t('newPassword')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">{t('confirmPassword')}</Label>
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      value={passwords.confirmPassword}
                      onChange={handlePasswordChange}
                      placeholder={t('confirmPassword')}
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button onClick={handleChangePassword} disabled={loading}>
                  {loading ? t('saving') : t('saveChanges')}
                </Button>
              </CardFooter>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>{t('twoFactorAuth')}</CardTitle>
                <CardDescription>{t('twoFactorAuthDesc')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <Shield className="w-6 h-6 text-primary" />
                    <div>
                      <p className="font-medium">{t('authenticatorApp')}</p>
                      <p className="text-sm text-muted-foreground">{t('authenticatorAppDesc')}</p>
                    </div>
                  </div>
                  <Button variant="outline">
                    {t('setup')}
                  </Button>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <Phone className="w-6 h-6 text-primary" />
                    <div>
                      <p className="font-medium">{t('smsAuthentication')}</p>
                      <p className="text-sm text-muted-foreground">{t('smsAuthenticationDesc')}</p>
                    </div>
                  </div>
                  <Button variant="outline">
                    {t('setup')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preferences" className="space-y-4">
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
                      <option value="UTC+0">世界标准时间 (UTC+0)</option>
                      <option value="UTC-8">太平洋标准时间 (UTC-8)</option>
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
          </TabsContent>

          <TabsContent value="billing" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t('billing.title')}</CardTitle>
                <CardDescription>{t('billing.description')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4">
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-medium">{t('billing.freePlan')}</h3>
                        <p className="text-sm text-muted-foreground">{t('billing.currentPlan')}</p>
                      </div>
                      <span className="text-2xl font-bold">¥0</span>
                    </div>
                    <ul className="space-y-2 text-sm">
                      <li>✓ {t('billing.features.basicProjectManagement')}</li>
                      <li>✓ {t('billing.features.maxProjects')}</li>
                      <li>✓ {t('billing.features.basicCollaboration')}</li>
                    </ul>
                  </div>
                  <div className="border rounded-lg p-4 bg-primary/5">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-medium">{t('billing.proPlan')}</h3>
                      </div>
                      <span className="text-2xl font-bold">¥99/月</span>
                    </div>
                    <ul className="space-y-2 text-sm">
                      <li>✓ {t('billing.features.unlimitedProjects')}</li>
                      <li>✓ {t('billing.features.advancedCollaboration')}</li>
                      <li>✓ {t('billing.features.prioritySupport')}</li>
                      <li>✓ {t('billing.features.customWorkflows')}</li>
                    </ul>
                    <Button className="w-full mt-4">{t('billing.upgradePlan')}</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
} 