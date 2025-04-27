'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { FaSpinner, FaCheckCircle } from 'react-icons/fa';
import LogoImage from '../../../public/logo.png';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/lib/hooks/useAuth';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const t = useTranslations('auth');
  
  // Use our auth hook for forgot password
  const { forgotPassword, passwordResetRequested, error: authError, status: authStatus } = useAuth();
  
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Handle email change
  const handleEmailChange = (e) => {
    setEmail(e.target.value);
  };

  // Monitor auth status changes
  useEffect(() => {
    if (authStatus === 'failed' && authError) {
      setError(authError);
      setLoading(false);
    } else if (passwordResetRequested) {
      setSuccess(true);
      setLoading(false);
    }
  }, [authStatus, authError, passwordResetRequested]);

  // Submit form
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    // Basic email validation
    if (!email.includes('@') || !email.includes('.')) {
      setError(t('forgotPassword.invalidEmail'));
      setLoading(false);
      return;
    }
    
    // Call the forgotPassword function from our auth hook
    await forgotPassword({
      email,
    });
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
              {t('forgotPassword.title')}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-8">
              {t('forgotPassword.subtitle')}
            </p>
          </div>

          {success ? (
            <div className="text-center py-4">
              <FaCheckCircle className="h-12 w-12 mx-auto text-green-500" />
              <p className="mt-4 text-green-600 dark:text-green-400 font-semibold">
                {t('forgotPassword.emailSent')}
              </p>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                {t('forgotPassword.checkInbox')}
              </p>
              <div className="mt-6">
                <Link 
                  href="/login" 
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {t('forgotPassword.backToLogin')}
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <input
                  type="email"
                  value={email}
                  onChange={handleEmailChange}
                  placeholder={t('forgotPassword.emailPlaceholder')}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                  required
                />
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
                {loading ? (
                  <div className="flex items-center justify-center">
                    <FaSpinner className="animate-spin h-5 w-5 mr-2" />
                    {t('forgotPassword.sending')}
                  </div>
                ) : (
                  t('forgotPassword.button')
                )}
              </button>
            </form>
          )}

          <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
            {t('forgotPassword.remembered')}{' '}
            <Link href="/login" className="text-blue-600 dark:text-blue-400 hover:underline">
              {t('forgotPassword.login')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
} 