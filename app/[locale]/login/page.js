'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { FaGoogle, FaGithub, FaEye, FaEyeSlash, FaQuestionCircle } from 'react-icons/fa';
import { supabase } from '@/lib/supabase';
import LogoImage from '../../../public/logo.png';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/lib/hooks/useAuth';
import useGetUser from '@/lib/hooks/useGetUser';

export default function LoginPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const rememberMeRef = useRef(null);
  const t = useTranslations('auth');
  
  // 获取当前语言
  const locale = params.locale || 'en';
  
  // 只获取计划ID参数
  const planId = searchParams.get('plan_id');
  const redirect = searchParams.get('redirect');
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordTooltip, setShowPasswordTooltip] = useState(false);

  // Use our custom auth hook
  const { login, error: authError } = useAuth();

  // 处理重定向逻辑
  const handleRedirect = (user) => {
    if (!user) return;
    
    // 如果有重定向参数，并且是支付页面，且有计划ID
    if (redirect === 'payment' && planId) {
      console.log('重定向到支付页面，计划ID:', planId);
      
      // 只传递计划ID
      router.push(`/${locale}/payment?plan_id=${planId}`);
    } else {
      // 默认重定向到项目页面
      console.log('重定向到项目页面');
      router.replace(`/${locale}/projects`);
    }
  };

  // 检查用户是否已登录
  useEffect(() => {
    const checkUser = async () => {
      const { user, error } = useGetUser();
      
      if (!error && user) {
        console.log('用户已登录，处理重定向');
        handleRedirect(user);
      }
    };
    
    checkUser();
  }, []);

  // 构建重定向 URL，只包含计划ID
  const buildRedirectUrl = () => {
    // 基本回调 URL
    let redirectUrl =`${process.env.NEXT_PUBLIC_SITE_URL}/${window.location.pathname.split('/')[1]}/auth/callback`
    
    // 如果有重定向参数和计划ID，添加到 URL
    if (redirect === 'payment' && planId) {
      redirectUrl += `?redirect=payment&plan_id=${planId}`;
    }
    
    return redirectUrl;
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleRememberMeChange = (e) => {
    setRememberMe(e.target.checked);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // If remember me is checked, set form's autocomplete attribute to "on"
      if (rememberMe && rememberMeRef.current) {
        rememberMeRef.current.setAttribute('autocomplete', 'on');
      }

      // Use our custom login function
      const result = await login(formData);

      if (result.success) {
        // Use redirect handling function
        handleRedirect(result.data.user);
      } else {
        setError(result.error || 'Failed to sign in. Please check your credentials and try again.');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || 'Failed to sign in. Please check your credentials and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: buildRedirectUrl(),
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });
      if (error) throw error;
    } catch (err) {
      console.error('Google sign in error:', err);
      setError(err.message || 'Failed to sign in with Google. Please try again.');
      setLoading(false);
    }
  };

  const handleGithubSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: buildRedirectUrl(),
          scopes: 'read:user user:email',
        },
      });
      if (error) throw error;
    } catch (err) {
      console.error('GitHub sign in error:', err);
      setError(err.message || 'Failed to sign in with GitHub. Please try again.');
      setLoading(false);
    }
  };

  // const handleMicrosoftSignIn = async () => {
  //   setError('');
  //   setLoading(true);
  //   try {
  //     const { error } = await supabase.auth.signInWithOAuth({
  //       provider: 'azure',
  //       options: {
  //         redirectTo: buildRedirectUrl(),
  //         scopes: 'email profile openid',
  //       },
  //     });
  //     if (error) throw error;
  //   } catch (err) {
  //     console.error('Microsoft sign in error:', err);
  //     setError(err.message || 'Failed to sign in with Microsoft. Please try again.');
  //     setLoading(false);
  //   }
  // };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const togglePasswordTooltip = () => {
    setShowPasswordTooltip(!showPasswordTooltip);
  };

  return (
    <div className="min-h-screen min-w-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 dotted-bg">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
          <div className="text-center">
            <Image
              src={LogoImage}
              alt="Logo"
              width={64}
              height={64}
              className="mx-auto mb-6"
              priority
            />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {t('login.title')}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-8">
              {t('login.subtitle')} 👋
            </p>
          </div>

          <div className="space-y-4">
            <button
              onClick={handleGoogleSignIn}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <FaGoogle className="w-5 h-5 text-red-500" />
              Sign in with Google
            </button>

            <button
              onClick={handleGithubSignIn}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <FaGithub className="w-5 h-5" />
              Sign in with GitHub
            </button>

          </div>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300 dark:border-gray-600" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                Or continue with email
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" ref={rememberMeRef} autoComplete={rememberMe ? 'on' : 'off'}>
            <div>
              <input
                type="email"
                name="email"
                placeholder="Email Address"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                required
                autoComplete={rememberMe ? 'email' : 'off'}
              />
            </div>

            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Password"
                value={formData.password}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 pr-20"
                required
                autoComplete={rememberMe ? 'current-password' : 'off'}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center space-x-2">
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 focus:outline-none flex items-center justify-center"
                >
                  {showPassword ? (
                    <FaEyeSlash className="h-5 w-5" />
                  ) : (
                    <FaEye className="h-5 w-5" />
                  )}
                </button>
                <div className="relative flex items-center">
                  <button
                    type="button"
                    onMouseEnter={togglePasswordTooltip}
                    onMouseLeave={togglePasswordTooltip}
                    className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 focus:outline-none flex items-center justify-center"
                    aria-label={t('password.requirements')}
                  >
                    <FaQuestionCircle className="h-4 w-4" />
                  </button>
                  {showPasswordTooltip && (
                    <div className="absolute bottom-full right-0 mb-2 w-64 p-3 bg-white dark:bg-gray-700 rounded-lg shadow-lg text-xs text-gray-600 dark:text-gray-200 z-10">
                      <p className="font-semibold mb-1">{t('password.requirementsTitle')}</p>
                      <ul className="space-y-1 list-disc pl-4">
                        <li>{t('password.minLength')}</li>
                        <li>{t('password.uppercase')}</li>
                        <li>{t('password.lowercase')}</li>
                        <li>{t('password.number')}</li>
                        <li>{t('password.special')}</li>
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  checked={rememberMe}
                  onChange={handleRememberMeChange}
                />
                <label htmlFor="remember-me" className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                  {t('password.rememberMe')}
                </label>
              </div>

              <Link href="/forgot-password" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
                {t('login.forgotPassword')}
              </Link>
            </div>

            {error && (
              <div className="text-red-500 dark:text-red-400 text-sm text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-pink-600 hover:bg-pink-700 dark:bg-pink-500 dark:hover:bg-pink-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {loading ? t('login.loading') : t('login.button')}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
            {t('login.noAccount')}{' '}
            <Link href="/signup" className="text-blue-600 dark:text-blue-400 hover:underline">
              {t('login.signup')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
} 