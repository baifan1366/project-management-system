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
    emailNotifications: true,
    pushNotifications: true,
    weeklyDigest: true,
    mentionNotifications: true,
    taskAssignments: true,
    taskComments: true,
    dueDates: true,
    teamInvitations: true
  });

  useEffect(() => {
    if (currentUser) {
      updateUserData(currentUser);
    }
  }, [currentUser]);
  
  const updateUserData = (user) => {
    if (!user) return;
    
    setUser(user);
    
    // Load notification settings from localStorage
    try {
      const storedNotifications = localStorage.getItem(`notifications_${user.id}`);
      if (storedNotifications) {
        setNotifications(JSON.parse(storedNotifications));
      }
    } catch (error) {
      console.error('Error loading notifications from localStorage:', error);
      // Fallback to default values if localStorage fails
    }
  };

  const handleSaveNotifications = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Save to localStorage
      localStorage.setItem(`notifications_${user.id}`, JSON.stringify(notifications));
      
      // Update Redux store
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
    </div>
  );
} 