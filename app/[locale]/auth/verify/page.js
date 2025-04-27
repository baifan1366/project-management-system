'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { FaCheckCircle, FaTimesCircle, FaSpinner } from 'react-icons/fa';
import LogoImage from '../../../../public/logo.png';
import { useTranslations } from 'next-intl';

export default function VerifyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations('auth');
  
  const [status, setStatus] = useState('loading'); // loading, success, error
  const [message, setMessage] = useState('');
  
  useEffect(() => {
    const token = searchParams.get('token');
    
    if (!token) {
      setStatus('error');
      setMessage('Missing verification token');
      return;
    }
    
    const verifyEmail = async () => {
      try {
        // Make a request to the verification API
        const response = await fetch(`/api/auth/verify?token=${token}`);
        
        // Check for JSON response
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          
          if (!response.ok) {
            setStatus('error');
            setMessage(data.error || 'Failed to verify email');
          } else {
            setStatus('success');
            setMessage(data.message || 'Your email has been verified successfully!');
            
            // Redirect to the URL provided by the API or default to login
            const redirectUrl = data.redirectUrl || '/login?verified=true';
            
            // Redirect after a short delay
            setTimeout(() => {
              router.push(redirectUrl);
            }, 3000);
          }
        } else {
          // Handle non-JSON response (fallback)
          if (response.redirected) {
            router.push(response.url);
          } else if (!response.ok) {
            setStatus('error');
            setMessage('Failed to verify email');
          } else {
            setStatus('success');
            setMessage('Your email has been verified successfully!');
            setTimeout(() => {
              router.push('/login?verified=true');
            }, 3000);
          }
        }
      } catch (error) {
        console.error('Verification error:', error);
        setStatus('error');
        setMessage('An error occurred during verification. Please try again.');
      }
    };
    
    verifyEmail();
  }, [searchParams, router]);
  
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
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              {t('emailVerification.title')}
            </h2>
            
            {status === 'loading' && (
              <div className="text-center py-4">
                <FaSpinner className="animate-spin h-8 w-8 mx-auto text-blue-500" />
                <p className="mt-4 text-gray-600 dark:text-gray-400">
                  {t('emailVerification.loading')}
                </p>
              </div>
            )}
            
            {status === 'success' && (
              <div className="text-center py-4">
                <FaCheckCircle className="h-12 w-12 mx-auto text-green-500" />
                <p className="mt-4 text-green-600 dark:text-green-400 font-semibold">
                  {message}
                </p>
                <p className="mt-2 text-gray-600 dark:text-gray-400">
                  {t('emailVerification.redirecting')}
                </p>
              </div>
            )}
            
            {status === 'error' && (
              <div className="text-center py-4">
                <FaTimesCircle className="h-12 w-12 mx-auto text-red-500" />
                <p className="mt-4 text-red-600 dark:text-red-400 font-semibold">
                  {message}
                </p>
                <div className="mt-6">
                  <Link 
                    href="/login" 
                    className="text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {t('emailVerification.backToLogin')}
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 