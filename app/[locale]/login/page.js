'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { FaGoogle, FaGithub, FaEye, FaEyeSlash, FaQuestionCircle, FaCheck, FaTimes } from 'react-icons/fa';
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
  const [passwordError, setPasswordError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordTooltip, setShowPasswordTooltip] = useState(false);
  const { user, isLoading: userLoading } = useGetUser();
  // Use our custom auth hook
  const { login, error: authError } = useAuth();
  const [passwordRequirements, setPasswordRequirements] = useState({
    minLength: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false,
  });

  // Check requirements whenever password changes
  useEffect(() => {
    if (formData.password) {
      setPasswordRequirements({
        minLength: formData.password.length >= 8,
        uppercase: /[A-Z]/.test(formData.password),
        lowercase: /[a-z]/.test(formData.password),
        number: /[0-9]/.test(formData.password),
        special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+/.test(formData.password),
      });
    } else {
      setPasswordRequirements({
        minLength: false,
        uppercase: false,
        lowercase: false,
        number: false,
        special: false,
      });
    }
  }, [formData.password]);

  // Password validation function
  const validatePassword = (password) => {
    // Check if all requirements are met
    const allRequirementsMet = Object.values(passwordRequirements).every(req => req === true);
    
    if (!allRequirementsMet) {
      // Find the first requirement that's not met
      if (!passwordRequirements.minLength) {
        return { valid: false, message: t('password.minLength') };
      } else if (!passwordRequirements.uppercase) {
        return { valid: false, message: t('password.uppercase') };
      } else if (!passwordRequirements.lowercase) {
        return { valid: false, message: t('password.lowercase') };
      } else if (!passwordRequirements.number) {
        return { valid: false, message: t('password.number') };
      } else if (!passwordRequirements.special) {
        return { valid: false, message: t('password.special') };
      }
    }
    
    return { valid: true, message: '' };
  };

  // 添加自动重定向检查
  useEffect(() => {
    // 如果用户已登录且不在加载中，检查是否需要重定向
    if (user && !userLoading) {
      
      // 添加小延迟确保页面完全加载
      const timer = setTimeout(() => {
        if (redirect && redirect.includes('teamInvitation')) {
          // 如果是团队邀请页面，重定向回邀请页面
          // 确保路径格式正确（添加前导斜杠如果没有）
          const redirectPath = redirect.startsWith('/') ? redirect : `/${redirect}`;
          
          router.push(`/${locale}${redirectPath}`);
        } else {
          // 默认重定向到项目页面
          
          router.replace(`/${locale}/projects`);
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [user, userLoading, redirect, planId, locale, router]);

  // 处理重定向逻辑
  const handleRedirect = (user) => {
    if (!user) return;
    
    
    
    if (redirect && redirect.includes('teamInvitation')) {
      // 如果是团队邀请页面，重定向回邀请页面
      // 确保路径格式正确（添加前导斜杠如果没有）
      const redirectPath = redirect.startsWith('/') ? redirect : `/${redirect}`;
      
      router.push(`/${locale}${redirectPath}`);
    } else {
      // 默认重定向到项目页面
      
      router.replace(`/${locale}/projects`);
    }
  };

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
    
    // Clear password error when user types
    if (e.target.name === 'password') {
      setPasswordError('');
    }
  };

  const handleRememberMeChange = (e) => {
    setRememberMe(e.target.checked);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setPasswordError('');
    
    // Validate password format
    const { valid, message } = validatePassword(formData.password);
    if (!valid) {
      setPasswordError(message);
      return;
    }
    
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
      // Redirect to our custom Google OAuth endpoint
      let url = `/api/auth/google`;
      
      // 构建查询参数
      const params = new URLSearchParams();
      
      // Add redirect and plan_id parameters if needed
      if (redirect === 'payment' && planId) {
        params.append('redirect', 'payment');
        params.append('plan_id', planId);
      } else if (redirect) {
        // 传递任何重定向URL，包括团队邀请
        params.append('redirect', redirect);
      }
      
      // 添加查询参数到URL
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      
      
      // Redirect to our custom OAuth endpoint
      window.location.href = url;
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
      // Redirect to our custom GitHub OAuth endpoint
      let url = `/api/auth/github`;
      
      // 构建查询参数
      const params = new URLSearchParams();
      
      // Add redirect and plan_id parameters if needed
      if (redirect === 'payment' && planId) {
        params.append('redirect', 'payment');
        params.append('plan_id', planId);
      } else if (redirect) {
        // 传递任何重定向URL，包括团队邀请
        params.append('redirect', redirect);
      }
      
      // 添加查询参数到URL
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      
      
      // Redirect to our custom OAuth endpoint
      window.location.href = url;
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

  // Validate password on blur
  const handlePasswordBlur = () => {
    if (formData.password) {
      const { valid, message } = validatePassword(formData.password);
      if (!valid) {
        setPasswordError(message);
      } else {
        setPasswordError('');
      }
    }
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
                onBlur={handlePasswordBlur}
                className={`w-full px-4 py-3 rounded-lg border ${passwordError ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'} bg-transparent dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 pr-20`}
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
                </div>
              </div>
            </div>
            
            {/* Password requirements visualization - conditionally shown */}
            {formData.password.length > 0 && (
              <div className="text-xs text-gray-600 dark:text-gray-300 mt-1 space-y-1">
                <p className="font-semibold">{t('password.requirementsTitle')}</p>
                <ul className="space-y-1">
                  <li className="flex items-center">
                    {passwordRequirements.minLength ? (
                      <FaCheck className="h-4 w-4 text-green-500 mr-2" />
                    ) : (
                      <FaTimes className="h-4 w-4 text-red-500 mr-2" />
                    )}
                    <span className={passwordRequirements.minLength ? "text-green-500" : "text-red-500"}>
                      {t('password.minLength')}
                    </span>
                  </li>
                  <li className="flex items-center">
                    {passwordRequirements.uppercase ? (
                      <FaCheck className="h-4 w-4 text-green-500 mr-2" />
                    ) : (
                      <FaTimes className="h-4 w-4 text-red-500 mr-2" />
                    )}
                    <span className={passwordRequirements.uppercase ? "text-green-500" : "text-red-500"}>
                      {t('password.uppercase')}
                    </span>
                  </li>
                  <li className="flex items-center">
                    {passwordRequirements.lowercase ? (
                      <FaCheck className="h-4 w-4 text-green-500 mr-2" />
                    ) : (
                      <FaTimes className="h-4 w-4 text-red-500 mr-2" />
                    )}
                    <span className={passwordRequirements.lowercase ? "text-green-500" : "text-red-500"}>
                      {t('password.lowercase')}
                    </span>
                  </li>
                  <li className="flex items-center">
                    {passwordRequirements.number ? (
                      <FaCheck className="h-4 w-4 text-green-500 mr-2" />
                    ) : (
                      <FaTimes className="h-4 w-4 text-red-500 mr-2" />
                    )}
                    <span className={passwordRequirements.number ? "text-green-500" : "text-red-500"}>
                      {t('password.number')}
                    </span>
                  </li>
                  <li className="flex items-center">
                    {passwordRequirements.special ? (
                      <FaCheck className="h-4 w-4 text-green-500 mr-2" />
                    ) : (
                      <FaTimes className="h-4 w-4 text-red-500 mr-2" />
                    )}
                    <span className={passwordRequirements.special ? "text-green-500" : "text-red-500"}>
                      {t('password.special')}
                    </span>
                  </li>
                </ul>
              </div>
            )}

            {passwordError && (
              <div className="text-red-500 dark:text-red-400 text-sm">
                {passwordError}
              </div>
            )}

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