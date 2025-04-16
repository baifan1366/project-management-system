'use client';

import { useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { FaGoogle, FaGithub, FaEye, FaEyeSlash, FaQuestionCircle } from 'react-icons/fa';
import { supabase } from '@/lib/supabase';
import LogoImage from '../../../public/logo.png';
import { useTranslations } from 'next-intl';

export default function SignupPage() {
  const router = useRouter();
  const params = useParams();
  const formRef = useRef(null);
  const t = useTranslations('auth');
  
  // 获取当前语言
  const locale = params.locale || 'en';
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showPasswordTooltip, setShowPasswordTooltip] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  const togglePasswordTooltip = () => {
    setShowPasswordTooltip(!showPasswordTooltip);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            name: formData.name,
          },
          emailRedirectTo:  `${process.env.NEXT_PUBLIC_SITE_URL}/${window.location.pathname.split('/')[1]}/auth/callback`,
        },
      });

      if (signUpError) throw signUpError;

      if (authData?.user) {
        const { error: profileError } = await supabase
          .from('user')
          .insert([
            {
              id: authData.user.id,
              name: formData.name,
              email: formData.email,
              provider: 'local',
              email_verified: false,
              avatar_url: authData.user.user_metadata?.avatar_url,
            },
          ]);

        if (profileError) throw profileError;
        
        setVerificationSent(true);
      }
    } catch (err) {
      console.error('Signup error:', err);
      setError(err.message || 'Failed to sign up. Please try again.');
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
          redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/${window.location.pathname.split('/')[1]}/auth/callback`,
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
          redirectTo:  `${process.env.NEXT_PUBLIC_SITE_URL}/${window.location.pathname.split('/')[1]}/auth/callback`,
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
  //         redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/${window.location.pathname.split('/')[1]}/auth/callback`,
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

  const handleResendVerification = async () => {
    setError('');
    setLoading(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: formData.email,
        options: {
          emailRedirectTo: `${window.location.origin}/${window.location.pathname.split('/')[1]}/auth/callback`,
        },
      });

      if (error) throw error;
      setError('Verification email has been resent. Please check your inbox.');
    } catch (err) {
      console.error('Resend verification error:', err);
      setError(err.message || 'Failed to resend verification email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (verificationSent) {
    return (
      <div className="min-h-screen min-w-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 dotted-bg">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                {t('login.emailVerification.title')}
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {t('login.emailVerification.description')} <strong>{formData.email}</strong>. 
                Please check your email and click the link to verify your account.
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('login.emailVerification.spam')}{' '}
                <button
                  onClick={handleResendVerification}
                  disabled={loading}
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? t('login.emailVerification.resending') : t('login.emailVerification.resend')}
                </button>
              </p>
              {error && (
                <p className={`mt-4 text-sm ${error.includes('resent') ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {error}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen min-w-screen  bg-gray-50 dark:bg-gray-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 dotted-bg">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
          <div className="text-center">
            <Image
              src={LogoImage}
              alt="Logo"
              width={64}
              height={64}
              className="mx-auto mb-6"
            />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {t('signup.title')}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-8">
              {t('signup.subtitle')} 😊
            </p>
          </div>

          <div className="space-y-4">
            <button
              onClick={handleGoogleSignIn}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <FaGoogle className="w-5 h-5 text-red-500" />
              Sign up with Google
            </button>

            <button
              onClick={handleGithubSignIn}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <FaGithub className="w-5 h-5" />
              Sign up with GitHub
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

          <form onSubmit={handleSubmit} className="space-y-4" ref={formRef}>
            <div>
              <input
                type="text"
                name="name"
                placeholder="Full Name"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                required
              />
            </div>

            <div>
              <input
                type="email"
                name="email"
                placeholder="Email Address"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                required
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
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center space-x-2">
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 focus:outline-none flex items-center justify-center"
                  aria-label={showPassword ? t('password.hide') : t('password.show')}
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

            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                name="confirmPassword"
                placeholder="Confirm Password"
                value={formData.confirmPassword}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 pr-12"
                required
              />
              <button
                type="button"
                onClick={toggleConfirmPasswordVisibility}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 focus:outline-none"
                aria-label={showConfirmPassword ? t('password.hide') : t('password.show')}
              >
                {showConfirmPassword ? (
                  <FaEyeSlash className="h-5 w-5" />
                ) : (
                  <FaEye className="h-5 w-5" />
                )}
              </button>
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
              {loading ? t('signup.loading') : t('signup.button')}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
            {t('signup.agree')}{' '}
            <Link href="/terms" className="text-blue-600 dark:text-blue-400 hover:underline">
              {t('signup.termsOfService')}
            </Link>
          </p>

          <p className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
            {t('signup.alreadyAccount')}{' '}
            <Link href="/login" className="text-blue-600 dark:text-blue-400 hover:underline">
              {t('signup.login')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
} 