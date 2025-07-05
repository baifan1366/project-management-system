'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { FaEye, FaEyeSlash, FaQuestionCircle, FaCheckCircle, FaTimesCircle, FaSpinner, FaCheck, FaTimes } from 'react-icons/fa';
import LogoImage from '../../../public/logo.png';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/lib/hooks/useAuth';

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations('auth');
  
  // Get token from URL
  const token = searchParams.get('token');
  
  // Use our auth hook for password reset
  const { resetPassword, passwordResetSuccess, error: authError, status: authStatus } = useAuth();
  
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showPasswordTooltip, setShowPasswordTooltip] = useState(false);
  const [tokenValidated, setTokenValidated] = useState(false);
  const [tokenError, setTokenError] = useState('');
  const [verifyingToken, setVerifyingToken] = useState(true);
  const [refreshingToken, setRefreshingToken] = useState(false);
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
  
  // Check if token exists and validate it
  useEffect(() => {
    if (!token) {
      setTokenError('Missing password reset token');
      setVerifyingToken(false);
      return;
    }
    
    // Validate token format (basic check)
    try {
      const tokenParts = token.split('.');
      if (tokenParts.length !== 3) {
        throw new Error('Invalid token format');
      }
      
      // Verify token with server
      const verifyToken = async () => {
        try {
          
          setVerifyingToken(true);
          const response = await fetch('/api/auth/verify/token', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ token, type: 'reset' })
          });
          
          const data = await response.json();
          
          
          if (response.ok && data.valid) {
            
            setTokenValidated(true);
          } else {
            console.error('Token validation failed:', data.error);
            
            // Handle token expiration specifically
            if (data.error && (data.error.includes('expired') || data.error.includes('Expired'))) {
              
              setRefreshingToken(true);
              
              // Try refreshing the token through our refresh endpoint
              try {
                const refreshResponse = await fetch('/api/auth/refresh/token', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({ token, type: 'reset' })
                });
                
                const refreshData = await refreshResponse.json();
                
                
                if (refreshResponse.ok && refreshData.success) {
                  
                  // Use the new token if provided
                  if (refreshData.token) {
                    // Redirect to reset page with new token
                    
                    const currentPath = window.location.pathname;
                    const baseResetPath = currentPath.split('?')[0];
                    router.push(`${baseResetPath}?token=${refreshData.token}`);
                    return;
                  } else {
                    // If no new token but success is true, proceed with current token
                    
                    setTokenValidated(true);
                    setRefreshingToken(false);
                    return;
                  }
                } else {
                  console.error('Failed to refresh token:', refreshData.error);
                  setTokenError(refreshData.error || 'Could not refresh expired token');
                }
              } catch (refreshError) {
                console.error('Error during token refresh:', refreshError);
                setTokenError('Network error during token refresh');
              } finally {
                setRefreshingToken(false);
              }
            } else {
              // Not an expiration error
              setTokenError(data.error || 'Token validation failed');
            }
            
            setTokenValidated(false);
          }
        } catch (error) {
          console.error('Token verification error:', error);
          // On network error - proceed with client-side validation
          setTokenValidated(true);
        } finally {
          setVerifyingToken(false);
        }
      };
      
      // Actually perform server validation
      verifyToken();
      
    } catch (error) {
      console.error('Token validation error:', error);
      setTokenError('Invalid token format');
      setVerifyingToken(false);
    }
  }, [token, router]);
  
  // Handle auth status changes
  useEffect(() => {
    if (authStatus === 'failed' && authError) {
      setError(authError);
      setLoading(false);
      
      // Special handling for expired token
      if (authError.includes('expired') || authError.includes('Invalid')) {
        setTokenValidated(false);
        setTokenError(authError);
      }
    } else if (passwordResetSuccess) {
      setSuccess(true);
      setLoading(false);
      
      // Redirect to login after successful password reset
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    }
  }, [authStatus, authError, passwordResetSuccess, router]);
  
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
    
    // Check passwords match
    if (formData.password !== formData.confirmPassword) {
      setError(t('resetPassword.passwordMismatch'));
      setLoading(false);
      return;
    }
    
    // Validate password requirements
    const allRequirementsMet = Object.values(passwordRequirements).every(req => req === true);
    if (!allRequirementsMet) {
      let errorMessage = '';
      if (!passwordRequirements.minLength) {
        errorMessage = t('password.minLength');
      } else if (!passwordRequirements.uppercase) {
        errorMessage = t('password.uppercase');
      } else if (!passwordRequirements.lowercase) {
        errorMessage = t('password.lowercase');
      } else if (!passwordRequirements.number) {
        errorMessage = t('password.number');
      } else if (!passwordRequirements.special) {
        errorMessage = t('password.special');
      }
      setError(errorMessage);
      setLoading(false);
      return;
    }
    
    // Reset password using our auth hook
    await resetPassword({
      token,
      password: formData.password,
      confirmPassword: formData.confirmPassword,
    });
  };
  
  // If token is being verified, show loading state
  if (verifyingToken || refreshingToken) {
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
                {refreshingToken ? t('resetPassword.refreshing') : t('resetPassword.verifying')}
              </h2>
              
              <div className="flex justify-center py-4">
                <FaSpinner className="h-12 w-12 animate-spin text-pink-500" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // If token is missing or invalid, show error
  if (!tokenValidated) {
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
                {t('resetPassword.error')}
              </h2>
              
              <div className="text-center py-4">
                <FaTimesCircle className="h-12 w-12 mx-auto text-red-500" />
                <p className="mt-4 text-red-600 dark:text-red-400 font-semibold">
                  {tokenError.includes('expired') ? t('resetPassword.tokenExpired') :
                   tokenError === 'Missing password reset token' ? t('resetPassword.missingToken') : 
                   tokenError === 'Invalid token format' ? t('resetPassword.invalidToken') : 
                   tokenError}
                </p>
                <div className="mt-6">
                  <Link 
                    href="/forgot-password" 
                    className="text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {t('resetPassword.requestNewLink')}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // If password reset successful, show success message
  if (success) {
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
                {t('resetPassword.successTitle')}
              </h2>
              
              <div className="text-center py-4">
                <FaCheckCircle className="h-12 w-12 mx-auto text-green-500" />
                <p className="mt-4 text-green-600 dark:text-green-400 font-semibold">
                  {t('resetPassword.successMessage')}
                </p>
                <p className="mt-2 text-gray-600 dark:text-gray-400">
                  {t('resetPassword.redirecting')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Normal form view
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
              {t('resetPassword.title')}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-8">
              {t('resetPassword.subtitle')}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder={t('resetPassword.newPassword')}
                value={formData.password}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 pr-20"
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
            
            {/* Password requirements visualization */}
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

            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                name="confirmPassword"
                placeholder={t('resetPassword.confirmPassword')}
                value={formData.confirmPassword}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 pr-12"
              />
              <button
                type="button"
                onClick={toggleConfirmPasswordVisibility}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 focus:outline-none"
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
              disabled={loading || !formData.password.trim() || !formData.confirmPassword.trim()}
              className="w-full py-3 px-4 bg-pink-600 hover:bg-pink-700 dark:bg-pink-500 dark:hover:bg-pink-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <FaSpinner className="animate-spin h-5 w-5 mr-2" />
                  {t('resetPassword.processing')}
                </div>
              ) : (
                t('resetPassword.button')
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
            {t('resetPassword.remembered')}{' '}
            <Link href="/login" className="text-blue-600 dark:text-blue-400 hover:underline">
              {t('resetPassword.login')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
} 