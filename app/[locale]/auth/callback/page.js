'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Cookies from 'js-cookie';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Wait for a moment to ensure cookie is set by the server
        setTimeout(async () => {
          // Check if we have an auth token in cookies
          const authToken = Cookies.get('auth_token');
          
          if (!authToken) {
            console.error('No auth token found');
            setError('Authentication failed');
            // Redirect to login page after delay
            setTimeout(() => {
              const locale = window.location.pathname.split('/')[1];
              router.push(`/${locale}/login?error=${encodeURIComponent('Authentication failed')}`);
            }, 2000);
            return;
          }
          
          // Get URL parameters
          const urlParams = new URLSearchParams(window.location.search);
          const planId = urlParams.get('plan_id');
          const redirect = urlParams.get('redirect') || urlParams.get('redirectTo');
          const finalRedirect = urlParams.get('final_redirect');
          
          console.log('Auth callback parameters:', { planId, redirect, finalRedirect });
          
          const locale = window.location.pathname.split('/')[1];
          
          // If URL has plan_id parameter and redirect=payment, redirect to payment page
          if (planId && redirect === 'payment') {
            router.push(`/${locale}/payment?plan_id=${planId}`);
          } else if (redirect && redirect.includes('teamInvitation')) {
            // 处理团队邀请重定向
            const redirectPath = redirect.startsWith('/') ? redirect : `/${redirect}`;
            console.log('重定向到团队邀请页面:', redirectPath);
            router.push(`/${locale}${redirectPath}`);
          } else if (finalRedirect && finalRedirect.includes('teamInvitation')) {
            // 处理final_redirect参数
            const finalRedirectPath = finalRedirect.startsWith('/') ? finalRedirect : `/${finalRedirect}`;
            console.log('使用final_redirect重定向到团队邀请页面:', finalRedirectPath);
            router.push(`/${locale}${finalRedirectPath}`);
          } else {
            // Otherwise redirect to dashboard
            console.log('重定向到项目页面');
            router.push(`/${locale}/projects`);
          }
        }, 1000); // Small delay to ensure cookie is set
      } catch (error) {
        console.error('Auth callback error:', error);
        setError('Authentication failed');
        
        // Redirect to login after a delay to avoid potential redirect loops
        setTimeout(() => {
          router.push(`/${window.location.pathname.split('/')[1]}/login?error=${encodeURIComponent('Authentication failed')}`);
        }, 2000);
      }
    };

    handleAuthCallback();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-semibold mb-4">
          {error ? 'Authentication Failed' : 'Authenticating...'}
        </h2>
        {error ? (
          <p className="text-red-500 mb-4">{error}</p>
        ) : (
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        )}
        {error && (
          <p className="text-gray-500">Redirecting to login page...</p>
        )}
      </div>
    </div>
  );
} 