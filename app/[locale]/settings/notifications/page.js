'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useDispatch } from 'react-redux';
import { updateUserPreference } from '@/lib/redux/features/usersSlice';

export default function NotificationsPage() {
  const t = useTranslations('profile');
  const dispatch = useDispatch();
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
    
    setUser(session.user);
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
  };

  const handleSaveNotifications = async () => {
    if (!user) return;
    setLoading(true);
    try {
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