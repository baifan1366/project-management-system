'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // 1. 获取当前会话信息
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) throw sessionError;

        const user = session.user;

        // 2. 检查用户是否已经存在
        const { data: existingProfile, error: profileError } = await supabase
          .from('user')
          .select('*')
          .eq('id', user.id)
          .single();

        if (existingProfile) {
          // 如果用户存在，更新 email_verified 状态
          const { error: updateError } = await supabase
            .from('user')
            .update({
              email_verified: user.email_verified,
              updated_at: new Date().toISOString()
            })
            .eq('id', user.id);

          if (updateError) throw updateError;
        } else {
          // 3. 如果用户不存在，创建新用户配置文件
          const provider = user.app_metadata.provider;
          let userData = {
            id: user.id,
            email: user.email,
            email_verified: user.email_verified,
            provider: provider,
            provider_id: user.identities?.[0]?.identity_data?.sub || user.id,
          };

          // 根据提供商设置名称和头像
          if (provider === 'google') {
            userData = {
              ...userData,
              name: user.identities?.[0]?.identity_data?.full_name || user.email.split('@')[0],
              avatar_url: user.identities?.[0]?.identity_data?.avatar_url,
            };
          } else if (provider === 'github') {
            userData = {
              ...userData,
              name: user.identities?.[0]?.identity_data?.preferred_username || user.email.split('@')[0],
              avatar_url: user.identities?.[0]?.identity_data?.avatar_url,
            };
          } else {
            // 本地注册用户
            userData = {
              ...userData,
              name: user.user_metadata.name || user.email.split('@')[0],
              avatar_url: user.user_metadata.avatar_url,
            };
          }

          const { error: insertError } = await supabase
            .from('user')
            .insert([userData]);

          if (insertError) throw insertError;
        }

        // 4. 重定向到仪表板
        router.push(`${window.location.origin}/${window.location.pathname.split('/')[1]}/projects`,);
      } catch (error) {
        console.error('Auth callback error:', error);
        router.push(`${window.location.origin}/${window.location.pathname.split('/')[1]}/login?error='` + encodeURIComponent(error.message || 'Authentication failed'));
      }
    };

    handleAuthCallback();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-semibold mb-4">Authenticating...</h2>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
      </div>
    </div>
  );
} 