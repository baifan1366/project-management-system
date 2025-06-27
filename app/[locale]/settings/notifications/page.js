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

export default function NotificationsPage() {
  const t = useTranslations('profile');
  const dispatch = useDispatch();
  const { user: currentUser, isLoading: userLoading } = useGetUser();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState({
    notifications_enabled: true,
    pushNotifications: true,
    addedChatNotifications: true,
    mentionNotifications: true,
    inviteMeetingNotifications: true,
    taskAssignments: true,
    taskComments: true,
    dueDates: true,
    teamAnnouncements: true,
    teamInvitations: true,
    weeklyDigest: true
  });

  useEffect(() => {
    if (currentUser) {
      updateUserData(currentUser);
    }
  }, [currentUser]);
  
  const updateUserData = (user) => {
    if (!user) return;
    
    setUser(user);
    
    // Load notification settings from user object if available
    if (user.notifications_settings) {
      setNotifications(user.notifications_settings);
    } else {
      // Fallback to localStorage or default values
      try {
        const storedNotifications = localStorage.getItem(`notifications_${user.id}`);
        if (storedNotifications) {
          setNotifications(JSON.parse(storedNotifications));
        }
      } catch (error) {
        console.error('Error loading notifications from localStorage:', error);
        // Use default values if both methods fail
      }
    }
  };

  const handleSaveNotifications = async () => {
    if (!user) return;
    setLoading(true);
    try {
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
      
      toast.success(t('saved'));
    } catch (error) {
      console.error('Error saving notifications:', error);
      toast.error(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{t('notifications')}</CardTitle>
          <CardDescription>{t('notificationsDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
                setNotifications(prev => ({ 
                  ...prev, 
                  pushNotifications: checked,
                  notifications_enabled: checked
                }))
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
              <Label>{t('addedChatNotifications')}</Label>
              <p className="text-sm text-muted-foreground">
                {t('addedChatNotificationsDesc', { fallback: 'Receive notifications when you are added to a chat.' })}
              </p>
            </div>
            <Switch
              checked={notifications.addedChatNotifications}
              onCheckedChange={(checked) =>
                setNotifications(prev => ({ ...prev, addedChatNotifications: checked }))
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
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>{t('inviteMeetingNotifications')}</Label>
              <p className="text-sm text-muted-foreground">
                {t('inviteMeetingNotificationsDesc', { fallback: 'Receive notifications for meeting invitations.' })}
              </p>
            </div>
            <Switch
              checked={notifications.inviteMeetingNotifications}
              onCheckedChange={(checked) =>
                setNotifications(prev => ({ ...prev, inviteMeetingNotifications: checked }))
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
                  <Label>{t('teamAnnouncements')}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t('teamAnnouncementsDesc', { fallback: 'Receive notifications for team announcements.' })}
                  </p>
                </div>
                <Switch
                  checked={notifications.teamAnnouncements}
                  onCheckedChange={(checked) =>
                    setNotifications(prev => ({ ...prev, teamAnnouncements: checked }))
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
    </div>
  );
} 