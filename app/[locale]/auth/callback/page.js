'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // 1. Get current session information
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session error:', sessionError);
          setError('Failed to get session');
          return;
        }

        // Handle case when no session exists
        if (!sessionData || !sessionData.session) {
          console.error('No session found');
          // Redirect to login page after delay
          setTimeout(() => {
            const locale = window.location.pathname.split('/')[1];
            router.push(`/${locale}/login?error=${encodeURIComponent('Authentication failed')}`);
          }, 2000);
          return;
        }

        const user = sessionData.session.user;

        // 2. Check if user already exists
        const { data: existingProfile, error: profileError } = await supabase
          .from('user')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        if (existingProfile) {
          // If user exists, update email_verified status
          const { error: updateError } = await supabase
            .from('user')
            .update({
              email_verified: user.email_verified,
              updated_at: new Date().toISOString()
            })
            .eq('id', user.id);

          if (updateError) throw updateError;
        } else {
          // 3. If user doesn't exist, create new profile
          const provider = user.app_metadata.provider;
          let userData = {
            id: user.id,
            email: user.email,
            email_verified: user.email_verified,
            provider: provider,
            provider_id: user.identities?.[0]?.identity_data?.sub || user.id,
          };

          // Set name and avatar based on provider
          if (provider === 'google') {
            userData = {
              ...userData,
              name: user.identities?.[0]?.identity_data?.full_name || user.email.split('@')[0],
              avatar_url: user.identities?.[0]?.identity_data?.avatar_url,
            };
            
            // Save Google tokens to user metadata
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
                console.log('Successfully saved Google tokens to user metadata');
              } catch (error) {
                console.error('Failed to save Google tokens to user metadata:', error);
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
            // Local signup user
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
          
          // 4. Create free subscription plan for new user
          const now = new Date();
          const oneYearFromNow = new Date(now);
          oneYearFromNow.setFullYear(now.getFullYear() + 1);
          
          const { error: subscriptionError } = await supabase
            .from('user_subscription_plan')
            .insert([
              {
                user_id: user.id,
                plan_id: 1, // Free plan ID
                status: 'active',
                start_date: now.toISOString(),
                end_date: oneYearFromNow.toISOString()
              },
            ]);

          if (subscriptionError) {
            console.error('Failed to create subscription:', subscriptionError);
            // Continue processing even if subscription creation fails
          } else {
            console.log('Free subscription created for user:', user.id);
          }
        }

        // 5. Check if user already has subscription plan
        const { data: existingSubscription, error: subscriptionCheckError } = await supabase
          .from('user_subscription_plan')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1);
          
        // If no subscription exists, create a free one
        if ((!existingSubscription || existingSubscription.length === 0) && !subscriptionCheckError) {
          const now = new Date();
          const oneYearFromNow = new Date(now);
          oneYearFromNow.setFullYear(now.getFullYear() + 1);
          
          const { error: createSubscriptionError } = await supabase
            .from('user_subscription_plan')
            .insert([
              {
                user_id: user.id,
                plan_id: 1, // Free plan ID
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

        // 6. Get URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const planId = urlParams.get('plan_id');
        const redirect = urlParams.get('redirect');

        // If URL has plan_id parameter and redirect=payment, redirect to payment page
        if (planId && redirect === 'payment') {
          router.push(`${process.env.NEXT_PUBLIC_SITE_URL}/${window.location.pathname.split('/')[1]}/payment?plan_id=${planId}&user_id=${user.id}`);
        } else {
          // Otherwise redirect to dashboard
          router.push(`${process.env.NEXT_PUBLIC_SITE_URL}/${window.location.pathname.split('/')[1]}/projects`);
        }
      } catch (error) {
        console.error('Auth callback error:', error);
        setError('Authentication failed');
        
        // Redirect to login after a delay to avoid potential redirect loops
        setTimeout(() => {
          router.push(`${process.env.NEXT_PUBLIC_SITE_URL}/${window.location.pathname.split('/')[1]}/login?error=${encodeURIComponent('Authentication failed')}`);
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