'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from 'sonner';
import { useDispatch } from 'react-redux';
import { updateUserPreference } from '@/lib/redux/features/usersSlice';
import { useGetUser } from '@/lib/hooks/useGetUser';
import { Skeleton } from "@/components/ui/skeleton";

// Default notification settings
const DEFAULT_NOTIFICATION_SETTINGS = {
  "notifications_enabled": true, 
  "pushNotifications": true, 
  "addedChatNotifications": true, 
  "mentionNotifications": true, 
  "inviteMeetingNotifications": true, 
  "taskAssignments": true, 
  "teamAnnouncements": true, 
  "teamInvitations": true
};

// Skeleton loading component for notification settings
const NotificationSkeleton = () => {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-4 w-2/3 mt-2" />
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Master toggle skeleton */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-60 mt-1" />
            </div>
            <Skeleton className="h-6 w-12 rounded-full" />
          </div>

          {/* Section divider */}
          <div className="pt-6 border-t">
            <Skeleton className="h-6 w-32 mb-5" />
            
            <div className="space-y-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={`channel-${i}`} className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Skeleton className="h-5 w-36" />
                    <Skeleton className="h-4 w-52 mt-1" />
                  </div>
                  <Skeleton className="h-6 w-12 rounded-full" />
                </div>
              ))}
            </div>
          </div>
          
          {/* Second section */}
          <div className="pt-6 border-t">
            <Skeleton className="h-6 w-36 mb-5" />
            
            <div className="space-y-6">
              {[1, 2, 3].map((i) => (
                <div key={`type-${i}`} className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-4 w-48 mt-1" />
                  </div>
                  <Skeleton className="h-6 w-12 rounded-full" />
                </div>
              ))}
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Skeleton className="h-10 w-28" />
        </CardFooter>
      </Card>
    </div>
  );
};

export default function NotificationsPage() {
  const t = useTranslations('profile');
  const dispatch = useDispatch();
  const { user: currentUser, isLoading: userLoading } = useGetUser();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState(DEFAULT_NOTIFICATION_SETTINGS);

  useEffect(() => {
    if (currentUser) {
      console.log('Current user loaded:', currentUser);
      console.log('Notification settings:', currentUser.notifications_settings);
      updateUserData(currentUser);
    }
  }, [currentUser]);
  
  const updateUserData = (user) => {
    if (!user) return;
    
    setUser(user);
    
    // Load notification settings from user object if available
    if (user.notifications_settings) {
      console.log('Using notification settings from user object:', user.notifications_settings);
      // Make sure we have all required fields, fallback to defaults for missing ones
      const mergedSettings = {
        ...DEFAULT_NOTIFICATION_SETTINGS,
        ...user.notifications_settings
      };
      setNotifications(mergedSettings);
    } else {
      console.log('No notification settings found in user object, using defaults');
      // Fallback to localStorage or default values
      try {
        const storedNotifications = localStorage.getItem(`notifications_${user.id}`);
        if (storedNotifications) {
          const parsedSettings = JSON.parse(storedNotifications);
          console.log('Using notification settings from localStorage:', parsedSettings);
          setNotifications({
            ...DEFAULT_NOTIFICATION_SETTINGS,
            ...parsedSettings
          });
        } else {
          console.log('No settings in localStorage, using defaults');
          setNotifications(DEFAULT_NOTIFICATION_SETTINGS);
        }
      } catch (error) {
        console.error('Error loading notifications from localStorage:', error);
        // Use default values if both methods fail
        setNotifications(DEFAULT_NOTIFICATION_SETTINGS);
      }
    }
  };

  const handleSaveNotifications = async () => {
    if (!user) return;
    setLoading(true);
    try {
      console.log('Saving notification settings:', notifications);
      
      // Update notification settings via API
      const response = await fetch(`/api/users/${user.id}/notifications`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(notifications),
      });

      if (!response.ok) {
        throw new Error('Failed to update notification settings');
      }
      
      // Update Redux store
      await dispatch(updateUserPreference({ 
        userId: user.id, 
        preferenceData: { 
          notifications_settings: notifications
        }
      }));
      
      // Save to localStorage as backup
      localStorage.setItem(`notifications_${user.id}`, JSON.stringify(notifications));
      
      toast.success(t('saved'));
    } catch (error) {
      console.error('Error saving notifications:', error);
      toast.error(t('error'));
    } finally {
      setLoading(false);
    }
  };

  // Handler for master notifications toggle
  const handleMasterToggle = (checked) => {
    if (checked) {
      // When enabling, just enable the master switch but keep individual settings as they were
      setNotifications(prev => ({ ...prev, notifications_enabled: checked }));
    } else {
      // When disabling, update the master switch only - individual settings remain unchanged
      // but will be effectively disabled due to the master switch being off
      setNotifications(prev => ({ ...prev, notifications_enabled: checked }));
    }
  };

  if (userLoading) {
    return <NotificationSkeleton />;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{t('notifications')}</CardTitle>
          <CardDescription>{t('notificationsDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>{t('enableAllNotifications')}</Label>
              <p className="text-sm text-muted-foreground">
                {t('enableAllNotificationsDesc', { fallback: 'Enable or disable all notifications at once.' })}
              </p>
            </div>
            <Switch
              checked={notifications.notifications_enabled}
              onCheckedChange={handleMasterToggle}
            />
          </div>

          <div className="pt-6 border-t">
            <h3 className="text-lg font-medium mb-5">{t('notificationChannels')}</h3>

            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{t('pushNotifications')}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t('pushNotificationsDesc')}
                  </p>
                </div>
                <Switch
                  checked={notifications.pushNotifications && notifications.notifications_enabled}
                  onCheckedChange={(checked) =>
                    setNotifications(prev => ({ ...prev, pushNotifications: checked }))
                  }
                  disabled={!notifications.notifications_enabled}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{t('addedChatNotifications')}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t('addedChatNotificationsDesc', { fallback: 'Receive notifications when you are added to a chat.' })}
                  </p>
                </div>
                <Switch
                  checked={notifications.addedChatNotifications && notifications.notifications_enabled}
                  onCheckedChange={(checked) =>
                    setNotifications(prev => ({ ...prev, addedChatNotifications: checked }))
                  }
                  disabled={!notifications.notifications_enabled}
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
                  checked={notifications.mentionNotifications && notifications.notifications_enabled}
                  onCheckedChange={(checked) =>
                    setNotifications(prev => ({ ...prev, mentionNotifications: checked }))
                  }
                  disabled={!notifications.notifications_enabled}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{t('inviteMeetingNotifications')}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t('inviteMeetingNotificationsDesc', { fallback: 'Receive notifications for meeting invitations.' })}
                  </p>
                </div>
                <Switch
                  checked={notifications.inviteMeetingNotifications && notifications.notifications_enabled}
                  onCheckedChange={(checked) =>
                    setNotifications(prev => ({ ...prev, inviteMeetingNotifications: checked }))
                  }
                  disabled={!notifications.notifications_enabled}
                />
              </div>
            </div>
          </div>
          
          <div className="pt-6 border-t">
            <h3 className="text-lg font-medium mb-5">{t('notificationTypes')}</h3>
            
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{t('taskAssignments')}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t('taskAssignmentsDesc')}
                  </p>
                </div>
                <Switch
                  checked={notifications.taskAssignments && notifications.notifications_enabled}
                  onCheckedChange={(checked) =>
                    setNotifications(prev => ({ ...prev, taskAssignments: checked }))
                  }
                  disabled={!notifications.notifications_enabled}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{t('teamAnnouncements')}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t('teamAnnouncementsDesc', { fallback: 'Receive notifications for team announcements.' })}
                  </p>
                </div>
                <Switch
                  checked={notifications.teamAnnouncements && notifications.notifications_enabled}
                  onCheckedChange={(checked) =>
                    setNotifications(prev => ({ ...prev, teamAnnouncements: checked }))
                  }
                  disabled={!notifications.notifications_enabled}
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
                  checked={notifications.teamInvitations && notifications.notifications_enabled}
                  onCheckedChange={(checked) =>
                    setNotifications(prev => ({ ...prev, teamInvitations: checked }))
                  }
                  disabled={!notifications.notifications_enabled}
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
    </div>
  );
} 