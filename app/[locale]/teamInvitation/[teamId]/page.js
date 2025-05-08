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
          console.log("用户未登录，重定向到登录页面");
          const currentPath = window.location.pathname;
          
          // 使用不带locale前缀的路径，因为登录页面会自动添加locale
          const redirectPath = currentPath.replace(`/${params.locale}`, '');
          
          const searchParams = new URLSearchParams();
          searchParams.append('redirect', redirectPath);
          
          console.log(`重定向到登录页面，参数: ${searchParams.toString()}`);
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

      // 1. 再次验证邀请状态
      const { data: currentInvitation } = await supabase
        .from('user_team_invitation')
        .select('*')
        .eq('id', invitationInfo.id)
        .single();

      if (!currentInvitation || currentInvitation.status !== 'PENDING') {
        throw new Error(t('invitationNoLongerValid'));
      }

      // 2. 验证用户不是已经是团队成员
      const { data: existingMember } = await supabase
        .from('user_team')
        .select('*')
        .eq('team_id', params.teamId)
        .eq('user_id', user.id)
        .single();

      if (existingMember) {
        throw new Error(t('alreadyTeamMember'));
      }

      // 3. 获取团队信息以获取 project_id
      const { data: teamData, error: teamError } = await supabase
        .from('team')
        .select('project_id')
        .eq('id', params.teamId)
        .single();

      if (teamError || !teamData) {
        throw new Error(t('teamNotFound'));
      }

      // 4. 创建团队用户关系
      await dispatch(createTeamUser({
        team_id: Number(params.teamId),
        user_id: invitationInfo.userId,
        role: invitationInfo.role,
        created_by: invitationInfo.created_by
      })).unwrap();

      // 5. 更新邀请状态为已接受
      await dispatch(updateInvitationStatus({
        invitationId: invitationInfo.id,
        status: 'ACCEPTED'
      })).unwrap();

      // 6. 重定向到项目页面
      router.push(`/${params.locale}/projects/${teamData.project_id}/${params.teamId}`);
    } catch (error) {
      // console.error('Failed to accept invitation:', error);
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
      <Card className="max-w-[600px] mx-auto mt-8">
        <CardContent className="pt-6">
          <div className="text-center text-red-500">
            <p>{error}</p>
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

