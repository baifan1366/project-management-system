'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useDispatch } from 'react-redux';
import { fetchTeamById } from '@/lib/redux/features/teamSlice';
import { fetchTeamUsersInv } from '@/lib/redux/features/teamUserInvSlice';
import { createTeamUser } from '@/lib/redux/features/teamUserSlice';
import { updateInvitationStatus } from '@/lib/redux/features/teamUserInvSlice';
import { useTranslations } from 'next-intl';
import { supabase } from '@/lib/supabase';
import { useGetUser } from '@/lib/hooks/useGetUser';
import { handleInvitationAccepted } from '@/components/team/TeamGuard';
import { getSubscriptionLimit, trackSubscriptionUsage } from '@/lib/subscriptionService';
import { limitExceeded } from '@/lib/redux/features/subscriptionSlice';
import { AlertTriangle } from 'lucide-react';

export default function TeamInvitation() {
  const t = useTranslations('TeamInvitation');
  const [invitationInfo, setInvitationInfo] = useState(null);
  const [teamInfo, setTeamInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const params = useParams();
  const router = useRouter();
  const dispatch = useDispatch();
  const { user, isLoading: userLoading } = useGetUser();

  // 获取邀请和团队信息
  useEffect(() => {
    const fetchInvitationInfo = async () => {
      try {
        setLoading(true);
        setError(null);

        // 1. 检查用户登录状态
        if (userLoading) {
          return; // 等待用户状态加载完成
        }

        if (!user) {
          const currentPath = window.location.pathname;
          
          // 使用不带locale前缀的路径，因为登录页面会自动添加locale
          const redirectPath = currentPath.replace(`/${params.locale}`, '');
          
          const searchParams = new URLSearchParams();
          searchParams.append('redirect', redirectPath);
          
          router.push(`/${params.locale}/login?${searchParams.toString()}`);
          return;
        }

        // 2. 获取团队信息
        const teamData = await dispatch(fetchTeamById(params.teamId)).unwrap();
        if (!teamData || teamData.length === 0) {
          throw new Error(t('teamNotFound'));
        }
        setTeamInfo(teamData[0]);

        // 3. 获取并验证邀请信息
        const invitationsResponse = await dispatch(fetchTeamUsersInv({
          teamId: params.teamId,
          userEmail: user.email
        })).unwrap();
        
        const invitationsData = Array.isArray(invitationsResponse) ? invitationsResponse : [];
        
        // 查找当前用户的有效邀请
        const userInvitation = invitationsData.find(inv => {
          // 检查邀请是否过期（默认7天）
          const invitationDate = new Date(inv.created_at);
          const expirationDate = new Date(invitationDate.getTime() + 7 * 24 * 60 * 60 * 1000);
          const now = new Date();

          return inv.user_email === user.email && 
                 inv.status === 'PENDING' &&
                 now <= expirationDate;
        });

        if (!userInvitation) {
          // 检查是否已经是团队成员
          const { data: existingMember } = await supabase
            .from('user_team')
            .select('*')
            .eq('team_id', params.teamId)
            .eq('user_id', user.id)
            .single();

          if (existingMember) {
            throw new Error(t('alreadyTeamMember'));
          }

          // 检查是否已经接受或拒绝邀请
          const expiredInvitation = invitationsData.find(inv => 
            inv.user_email === user.email && 
            inv.status !== 'PENDING'
          );

          if (expiredInvitation) {
            throw new Error(
              expiredInvitation.status === 'ACCEPTED' 
                ? t('invitationAlreadyAccepted')
                : t('invitationDeclined')
            );
          }

          throw new Error(t('invitationNotFound'));
        }

        setInvitationInfo({
          ...userInvitation,
          userId: user.id,
          created_by: userInvitation.created_by
        });

      } catch (error) {
        // console.error('Error fetching invitation info:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchInvitationInfo();
  }, [params.teamId, dispatch, t, router, params.locale, user, userLoading]);

  const handleAcceptInvitation = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!invitationInfo) {
        throw new Error(t('invalidInvitation'));
      }

      // 1. Get the subscription owner's ID
      const ownerId = invitationInfo.created_by;
      if (!ownerId) {
        throw new Error('Subscription owner not found on invitation.');
      }

      // 2. Check the owner's subscription limit
      const limitCheck = await getSubscriptionLimit(ownerId, 'invite_member');
      if (!limitCheck.allowed) {
        // Here, you might want to inform the user that the team is full.
        // For simplicity, we'll throw an error. A better UX could guide them.
        throw new Error(t('teamIsFullError') || 'This team is full. The owner needs to upgrade their plan.');
      }

      // 3. Re-validate invitation status (existing logic)
      const { data: currentInvitation, error: invitationError } = await supabase
        .from('user_team_invitation')
        .select('*')
        .eq('id', invitationInfo.id)
        .single();
      
      if (invitationError) {
        console.error("Invitation fetch error:", invitationError);
        throw new Error(t('invitationNotFound'));
      }

      if (!currentInvitation || currentInvitation.status !== 'PENDING') {
        throw new Error(t('invitationNoLongerValid'));
      }

      // 4. Verify user is not already a member (existing logic)
      const { data: existingMembers, error: memberCheckError } = await supabase
        .from('user_team')
        .select('*')
        .eq('team_id', params.teamId)
        .eq('user_id', user.id);

      if (memberCheckError) {
        console.error("Member check error:", memberCheckError);
      } else if (existingMembers && existingMembers.length > 0) {
        throw new Error(t('alreadyTeamMember'));
      }

      // 5. Get team info (existing logic)
      const { data: teamData, error: teamError } = await supabase
        .from('team')
        .select('project_id')
        .eq('id', params.teamId)
        .single();

      if (teamError || !teamData) {
        throw new Error(t('teamNotFound'));
      }

      // 6. Add user to the team (existing logic)
      const { error: userTeamError } = await supabase
        .from('user_team')
        .insert({
          team_id: Number(params.teamId),
          user_id: user.id,
          role: invitationInfo.role,
          created_by: invitationInfo.created_by
        });

      if (userTeamError) {
        console.error("Team user creation error:", userTeamError);
        throw new Error(userTeamError.message || t('acceptInvitationFailed'));
      }

      // 7. Increment the subscription count for the owner
      await trackSubscriptionUsage({
        userId: ownerId,
        actionType: 'invite_member',
        entityType: 'teamMembers'
      });

      // 8. Update invitation status to ACCEPTED (existing logic)
      const { error: updateError } = await supabase
        .from('user_team_invitation')
        .update({ status: 'ACCEPTED' })
        .eq('id', invitationInfo.id);

      if (updateError) {
        console.error("Invitation update error:", updateError);
        // Note: At this point the user is in the team, but the invite status failed to update.
        // This might need a cleanup mechanism, but for now we'll throw.
        throw new Error(updateError.message || t('acceptInvitationFailed'));
      }

      // 9. Redirect to the project page (existing logic)
      window.location.href = `/${params.locale}/projects/${teamData.project_id}`;
    } catch (error) {
      console.error("Accept invitation error:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading || userLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="max-w-[600px] mx-auto mt-8 border-red-500/50">
        <CardContent className="pt-8">
          <div className="text-center text-red-500 flex flex-col items-center space-y-4">
            <AlertTriangle className="w-16 h-16 text-red-500" />
            <p className="text-lg font-semibold">{error}</p>
            <Button
              onClick={() => router.push(`/${params.locale}`)}
              className="mt-4"
              variant="outline"
            >
              {t('backToHome')}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-[600px] mx-auto mt-8">
      <CardHeader>
        <h2 className="text-2xl font-semibold">{t('teamInvitation')}</h2>
      </CardHeader>
      <CardContent>
        {invitationInfo && teamInfo && (
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-base">
                <span className="font-medium">{t('teamName')}:</span> {teamInfo?.name || ''}
              </p>
              <p className="text-base">
                <span className="font-medium">{t('role')}:</span> {t(invitationInfo.role)}
              </p>
              <p className="text-sm text-muted-foreground">
                {t('invitationDescription')}
              </p>
            </div>
            
            <div className="flex space-x-4 pt-4">
              <Button
                onClick={handleAcceptInvitation}
                disabled={loading}
              >
                {loading ? t('accepting') : t('acceptInvitation')}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

