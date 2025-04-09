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
          .maybeSingle();

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
            
            // 保存Google令牌到用户元数据
            if (user.provider_token || user.provider_refresh_token) {
              try {
                await supabase.auth.updateUser({
                  data: {
                    google_tokens: {
                      access_token: user.provider_token,
                      refresh_token: user.provider_refresh_token,
                      updated_at: new Date().toISOString()
                    }
                  }
                });
                console.log('成功保存Google令牌到用户元数据');
              } catch (error) {
                console.error('保存Google令牌到用户元数据失败:', error);
              }
            }
          } else if (provider === 'github') {
            userData = {
              ...userData,
              name: user.identities?.[0]?.identity_data?.preferred_username || user.email.split('@')[0],
              avatar_url: user.identities?.[0]?.identity_data?.avatar_url,
            };
          } else if (provider === 'azure') {
            userData = {
              ...userData,
              name: user.identities?.[0]?.identity_data?.name || user.email.split('@')[0],
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
          
          // 4. 为新用户创建免费订阅计划
          const now = new Date();
          const oneYearFromNow = new Date(now);
          oneYearFromNow.setFullYear(now.getFullYear() + 1);
          
          const { error: subscriptionError } = await supabase
            .from('user_subscription_plan')
            .insert([
              {
                user_id: user.id,
                plan_id: 1, // 免费计划ID
                status: 'active',
                start_date: now.toISOString(),
                end_date: oneYearFromNow.toISOString()
              },
            ]);

          if (subscriptionError) {
            console.error('Failed to create subscription:', subscriptionError);
            // 继续处理，即使订阅创建失败
          } else {
            console.log('Free subscription created for user:', user.id);
          }
        }

        // 5. 检查用户是否已有订阅计划
        const { data: existingSubscription, error: subscriptionCheckError } = await supabase
          .from('user_subscription_plan')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1);
          
        // 如果没有订阅，创建一个免费订阅
        if ((!existingSubscription || existingSubscription.length === 0) && !subscriptionCheckError) {
          const now = new Date();
          const oneYearFromNow = new Date(now);
          oneYearFromNow.setFullYear(now.getFullYear() + 1);
          
          const { error: createSubscriptionError } = await supabase
            .from('user_subscription_plan')
            .insert([
              {
                user_id: user.id,
                plan_id: 1, // 免费计划ID
                status: 'active',
                start_date: now.toISOString(),
                end_date: oneYearFromNow.toISOString()
              },
            ]);

          if (createSubscriptionError) {
            console.error('Failed to create subscription for existing user:', createSubscriptionError);
          } else {
            console.log('Free subscription created for existing user:', user.id);
          }
        }

        // 6. 获取URL参数
        const urlParams = new URLSearchParams(window.location.search);
        const planId = urlParams.get('plan_id');
        const redirect = urlParams.get('redirect');

        // 如果URL中有plan_id参数并且redirect=payment，则跳转到payment页面
        if (planId && redirect === 'payment') {
          router.push(`${process.env.NEXT_PUBLIC_SITE_URL}/${window.location.pathname.split('/')[1]}/payment?plan_id=${planId}&user_id=${user.id}`);
        } else {
          // 否则重定向到仪表板
          router.push(`${process.env.NEXT_PUBLIC_SITE_URL}/${window.location.pathname.split('/')[1]}/projects`);
        }
      } catch (error) {
        console.error('Auth callback error:', error);
        router.push(`${process.env.NEXT_PUBLIC_SITE_URL}/${window.location.pathname.split('/')[1]}/login`);
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