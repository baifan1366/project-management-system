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
import TwoFactorVerification from '@/components/2fa/TwoFactorVerification';

export default function LoginPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const rememberMeRef = useRef(null);
  const t = useTranslations('auth');
  
  // Get current language
  const locale = params.locale || 'en';
  
  // Get plan ID parameter
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
  
  // State for 2FA verification
  const [showTwoFactor, setShowTwoFactor] = useState(false);
  const [twoFactorInfo, setTwoFactorInfo] = useState({ userId: '', types: [] });
  
  // Form type state (login or emailVerification)
  const [formType, setFormType] = useState('login');
  const [resendLoading, setResendLoading] = useState(false);

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

  // Auto-redirect check
  useEffect(() => {
    // If user is already logged in and not loading, check if redirect is needed
    if (user && !userLoading) {
      
      // Add small delay to ensure page is fully loaded
      const timer = setTimeout(() => {
        if (redirect && redirect.includes('teamInvitation')) {
          // If it's a team invitation page, redirect back to invitation page
          // Ensure path format is correct (add leading slash if missing)
          const redirectPath = redirect.startsWith('/') ? redirect : `/${redirect}`;
          
          router.push(`/${locale}${redirectPath}`);
        } else {
          // Default redirect to projects page
          router.replace(`/${locale}/projects`);
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [user, userLoading, redirect, planId, locale, router]);

  // Handle redirect logic
  const handleRedirect = (user) => {
    if (!user) return;
    
    if (redirect && redirect.includes('teamInvitation')) {
      // If it's a team invitation page, redirect back to invitation page
      // Ensure path format is correct (add leading slash if missing)
      const redirectPath = redirect.startsWith('/') ? redirect : `/${redirect}`;
      
      router.push(`/${locale}${redirectPath}`);
    } else {
      // Default redirect to projects page
      router.replace(`/${locale}/projects`);
    }
  };

  // Build redirect URL, only include plan ID
  const buildRedirectUrl = () => {
    // Base callback URL
    let redirectUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/${window.location.pathname.split('/')[1]}/auth/callback`;
    
    // If there is redirect param and plan ID, add to URL
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

      // Make direct API call instead of using login hook
      // to properly handle 2FA response
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'login',
          ...formData
        }),
      });

      const result = await response.json();
      
      // Debug: log the entire login response
      console.log('Login API Response:', result);

      // Check if 2FA is required
      if (result.requiresTwoFactor) {
        // Redirect to 2FA verification page - using the same approach for all login methods
        const twoFactorTypes = result.twoFactorTypes?.join(',') || 'totp';
        const redirectTarget = searchParams.get('redirect') || '/projects';
        router.push(`/${locale}/login/verify-2fa?userId=${result.userId}&twoFactorTypes=${twoFactorTypes}&redirect=${encodeURIComponent(redirectTarget)}`);
      } else if (response.ok) {
        // Normal login success
        if (result.data && result.data.user) {
          handleRedirect(result.data.user);
        } else {
          // If we don't have user data but login was successful,
          // redirect to default location anyway
          router.replace(`/${locale}/projects`);
        }
      } else {
        // Handle login error
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
      
      // Build query parameters
      const params = new URLSearchParams();
      
      // Add redirect and plan_id parameters if needed
      if (redirect === 'payment' && planId) {
        params.append('redirect', 'payment');
        params.append('plan_id', planId);
      } else if (redirect) {
        // Pass any redirect URL, including team invitations
        params.append('redirect', redirect);
      }
      
      // Add query parameters to URL
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
      
      // Build query parameters
      const params = new URLSearchParams();
      
      // Add redirect and plan_id parameters if needed
      if (redirect === 'payment' && planId) {
        params.append('redirect', 'payment');
        params.append('plan_id', planId);
      } else if (redirect) {
        // Pass any redirect URL, including team invitations
        params.append('redirect', redirect);
      }
      
      // Add query parameters to URL
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

  // Handle resending verification email
  const handleResendVerification = async () => {
    setResendLoading(true);
    try {
      // Your resend verification logic here
      setResendLoading(false);
    } catch (error) {
      console.error('Error resending verification:', error);
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-screen min-w-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 dotted-bg">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
          {showTwoFactor ? (
            <TwoFactorVerification 
              userId={twoFactorInfo.userId}
              types={twoFactorInfo.types}
              locale={locale}
              onVerified={(data) => {
                // Handle successful verification
                if (data && data.data && data.data.user) {
                  handleRedirect(data.data.user);
                } else {
                  // Fallback
                  router.push(`/${locale}/dashboard`);
                }
              }}
              onCancel={() => {
                setShowTwoFactor(false);
                setTwoFactorInfo({ userId: '', types: [] });
              }}
            />
          ) : (
            <>
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

              <form onSubmit={handleSubmit} ref={rememberMeRef} className="mt-6">
                {formType === 'login' && (
                  <>
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          {t('email')}
                        </label>
                        <input
                          id="email"
                          name="email"
                          type="email"
                          autoComplete="email"
                          required
                          value={formData.email}
                          onChange={handleChange}
                          className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                          placeholder="john@example.com"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            {t('login.password')}
                          </label>
                          <Link
                            href={`/${locale}/forgot-password`}
                            className="text-xs text-primary hover:underline"
                          >
                            {t('login.forgotPassword')}
                          </Link>
                        </div>
                        <div className="relative">
                          <input
                            id="password"
                            name="password"
                            type={showPassword ? "text" : "password"}
                            autoComplete="current-password"
                            required
                            value={formData.password}
                            onChange={handleChange}
                            onBlur={handlePasswordBlur}
                            className={`w-full px-4 py-3 rounded-lg border ${passwordError ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'} bg-transparent dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400`}
                            placeholder="••••••••"
                          />
                          <button
                            type="button"
                            onClick={togglePasswordVisibility}
                            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            {showPassword ? (
                              <FaEyeSlash size={18} title={t('password.hide')} />
                            ) : (
                              <FaEye size={18} title={t('password.show')} />
                            )}
                          </button>
                        </div>
                        {passwordError && (
                          <p className="text-red-500 text-xs mt-1">{passwordError}</p>
                        )}

                        <div className="flex items-center mt-4">
                          <input
                            id="remember-me"
                            name="remember-me"
                            type="checkbox"
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            checked={rememberMe}
                            onChange={handleRememberMeChange}
                          />
                          <label
                            htmlFor="remember-me"
                            className="ml-2 block text-sm text-gray-600 dark:text-gray-400"
                          >
                            {t('password.rememberMe')}
                          </label>
                        </div>
                      </div>

                      <div>
                        <button 
                          type="submit" 
                          className="w-full py-3 px-4 bg-pink-600 hover:bg-pink-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50" 
                          disabled={loading}
                        >
                          {loading ? t('login.loading') : t('login.button')}
                        </button>
                      </div>

                      {error && (
                        <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-md">
                          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                        </div>
                      )}
                    </div>

                    <div className="mt-6">
                      <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t border-gray-300 dark:border-gray-700"></div>
                        </div>
                        <div className="relative flex justify-center text-xs">
                          <span className="px-2 bg-white dark:bg-gray-800 text-gray-500">
                            {t('login.noAccount')}
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 text-center">
                        <Link 
                          href={`/${locale}/signup${planId ? `?plan_id=${planId}` : ''}`}
                          className="text-blue-400 hover:underline text-sm"
                        >
                          {t('login.signup')}
                        </Link>
                      </div>
                    </div>
                  </>
                )}

                {formType === 'emailVerification' && (
                  <>
                    <div className="text-center">
                      <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-md">
                        <h3 className="text-lg font-medium mb-4">{t('login.emailVerification.title')}</h3>
                        <p className="text-sm mb-1">{t('login.emailVerification.description')}</p>
                        <p className="text-sm font-medium">{formData.email}</p>
                      </div>
                      <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                        {t('login.emailVerification.spam')}{' '}
                        <button
                          type="button"
                          onClick={handleResendVerification}
                          className="text-primary hover:underline"
                          disabled={resendLoading}
                        >
                          {resendLoading ? t('login.emailVerification.resending') : t('login.emailVerification.resend')}
                        </button>
                      </p>
                    </div>
                  </>
                )}
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
} 