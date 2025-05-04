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
import { supabase } from '@/lib/supabase'; // 导入 supabase 客户端
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

  // 获取邀请和团队信息
  useEffect(() => {
    const fetchInvitationInfo = async () => {
      try {
        setLoading(true);
        setError(null);

        // 1. 检查用户登录状态
        const { data: { user }, error: userError } = useGetUser();
        
        if (userError || !user) {
          router.push(`/${params.locale}/login?redirect=${encodeURIComponent(window.location.pathname)}`);
          throw new Error(t('notLoggedIn'));
        }

        // 2. 获取团队信息
        const teamData = await dispatch(fetchTeamById(params.teamId)).unwrap();
        if (!teamData) {
          throw new Error(t('teamNotFound'));
        }
        // 因为teamData是数组，我们需要取第一个元素
        setTeamInfo(teamData[0]);

        // 3. 获取并验证邀请信息
        const invitationsResponse = await dispatch(fetchTeamUsersInv({
          teamId: params.teamId,
          userEmail: user.email
        })).unwrap();
        
        // 确保 invitationsResponse 是数组
        const invitationsData = Array.isArray(invitationsResponse) ? invitationsResponse : [];
        
        // 查找当前用户的邀请
        const userInvitation = invitationsData.find(inv => 
          inv.user_email === user.email && 
          inv.status === 'PENDING'
        );

        if (!userInvitation) {
          throw new Error(t('invitationNotFound'));
        }

        setInvitationInfo({
          ...userInvitation,
          userId: user.id,
          created_by: userInvitation.created_by
        });

      } catch (error) {
        console.error('Error fetching invitation info:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchInvitationInfo();
  }, [params.teamId, dispatch, t, router, params.locale]);

  const handleAcceptInvitation = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!invitationInfo) {
        throw new Error(t('invalidInvitation'));
      }

      // 1. 直接从 Supabase 获取团队信息以获取 project_id
      const { data: teamData, error: teamError } = await supabase
        .from('team')
        .select('project_id')
        .eq('id', params.teamId)
        .single();

      if (teamError || !teamData) {
        throw new Error(t('teamNotFound'));
      }

      // 2. 创建团队用户关系
      await dispatch(createTeamUser({
        team_id: Number(params.teamId),
        user_id: invitationInfo.userId,
        role: invitationInfo.role,
        created_by: invitationInfo.created_by
      })).unwrap();

      // 3. 更新邀请状态为已接受
      await dispatch(updateInvitationStatus({
        invitationId: invitationInfo.id,
        status: 'ACCEPTED'
      })).unwrap();

      // 4. 使用从 team 表直接获取的 project_id
      router.push(`/${params.locale}/projects/${teamData.project_id}/${params.teamId}`);
    } catch (error) {
      console.error('Failed to accept invitation:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
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
              onClick={() => router.push('/login')}
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
              <Button
                variant="outline"
                onClick={() => router.push('/')}
              >
                {t('decline')}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

