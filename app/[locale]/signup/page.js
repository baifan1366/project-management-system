'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { FaGoogle, FaGithub, FaEye, FaEyeSlash, FaQuestionCircle, FaCheck, FaTimes } from 'react-icons/fa';
import LogoImage from '../../../public/logo.png';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/lib/hooks/useAuth';

export default function SignupPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const formRef = useRef(null);
  const t = useTranslations('auth');
  
  // Get current locale
  const locale = params.locale || 'en';
  
  // Get query parameters
  const planId = searchParams.get('plan_id');
  const redirect = searchParams.get('redirect');
  
  // Use our custom auth hook
  const { signup, resendVerification, verificationSent, error: authError } = useAuth();
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [nameError, setNameError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showPasswordTooltip, setShowPasswordTooltip] = useState(false);
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

  // Name validation function
  const validateName = (name) => {
    if (name.length > 50) {
      return { valid: false, message: t('validationRules.userNameMax') };
    }
    return { valid: true, message: '' };
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    
    // Clear errors when user types
    if (e.target.name === 'password') {
      setPasswordError('');
    }
    if (e.target.name === 'name') {
      setNameError('');
    }
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

  // Validate name on blur
  const handleNameBlur = () => {
    if (formData.name) {
      const { valid, message } = validateName(formData.name);
      if (!valid) {
        setNameError(message);
      } else {
        setNameError('');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setPasswordError('');
    setNameError('');
    
    // Validate name length
    const nameValidation = validateName(formData.name);
    if (!nameValidation.valid) {
      setNameError(nameValidation.message);
      return;
    }
    
    // Validate password format
    const { valid, message } = validatePassword(formData.password);
    if (!valid) {
      setPasswordError(message);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const result = await signup(formData);

      if (!result.success) {
        setError(result.error || 'Failed to sign up. Please try again.');
      }
      // The verification sent state is handled by the Redux store
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
      // Redirect to Google OAuth endpoint
      const redirectUrl = `/api/auth/google${redirect === 'payment' && planId ? `?redirect=payment&plan_id=${planId}` : ''}`;
      window.location.href = redirectUrl;
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
      // Redirect to GitHub OAuth endpoint
      const redirectUrl = `/api/auth/github${redirect === 'payment' && planId ? `?redirect=payment&plan_id=${planId}` : ''}`;
      window.location.href = redirectUrl;
    } catch (err) {
      console.error('GitHub sign in error:', err);
      setError(err.message || 'Failed to sign in with GitHub. Please try again.');
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setError('');
    setLoading(true);
    try {
      const result = await resendVerification(formData.email);
      
      if (!result.success) {
        setError(result.error || 'Failed to resend verification email. Please try again.');
      } else {
        setError('Verification email has been resent. Please check your inbox.');
      }
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
                onBlur={handleNameBlur}
                className={`w-full px-4 py-3 rounded-lg border ${nameError ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'} bg-transparent dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400`}
                required
              />
              {nameError && (
                <p className="text-sm text-red-500 mt-1">{nameError}</p>
              )}
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
                onBlur={handlePasswordBlur}
                className={`w-full px-4 py-3 rounded-lg border ${passwordError ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'} bg-transparent dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 pr-20`}
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
              </div>
            </div>
            
            {/* Password requirements visualization */}
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