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
        
        if (sessionError) {
          console.log(" is session get bu dao ");
          throw sessionError;
        }

        const user = session.user;

        // 2. 检查用户是否已经存在 - 使用 maybeSingle() 而不是 single()
        const { data: existingProfile, error: profileError } = await supabase
          .from('user')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();
        
        if (profileError) {
          console.error("Error checking for existing profile:", profileError);
          throw profileError;
        }

        if (!existingProfile) {
          // 3. 如果用户不存在，创建新用户配置文件
          const provider = user.app_metadata.provider;
          let userData = {
            id: user.id,
            email: user.email,
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

          if (insertError) {
            console.log(" is insert bu dao table ");
            throw insertError;
          }
          
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
                status: 'ACTIVE',
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

        // 5. 检查用户是否已有订阅计划 - 避免使用 single() 方法
        const { data: existingSubscription, error: subscriptionCheckError } = await supabase
          .from('user_subscription_plan')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1);
        
        if (subscriptionCheckError) {
          console.error("Error checking subscription:", subscriptionCheckError);
          // 可以决定是否抛出或继续
        }
        
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
                status: 'ACTIVE',
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

        // 6. 重定向到仪表板
        router.push(`${process.env.NEXT_PUBLIC_SITE_URL}/${window.location.pathname.split('/')[1]}/projects`);
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