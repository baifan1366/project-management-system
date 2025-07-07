'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Shield, Mail } from 'lucide-react';
import { FaEye, FaEyeSlash, FaQuestionCircle, FaCheck, FaTimes } from 'react-icons/fa';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import useGetUser from '@/lib/hooks/useGetUser';
import { useDispatch } from 'react-redux';
import { updateUserData } from '@/lib/redux/features/usersSlice';

// Import 2FA components
import TOTPSetup from '@/components/2fa/TOTPSetup';
import EmailSetup from '@/components/2fa/EmailSetup';
import DisableTOTPModal from '@/components/2fa/DisableTOTPModal';
import DisableEmailModal from '@/components/2fa/DisableEmailModal';

export default function SecurityPage() {
  const t = useTranslations('profile');
  const params = useParams();
  const locale = params.locale;
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [samePasswordError, setSamePasswordError] = useState('');
  const [showPassword, setShowPassword] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false
  });
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordRequirements, setPasswordRequirements] = useState({
    minLength: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false,
  });
  
  // State for 2FA options
  const [showTotpSetup, setShowTotpSetup] = useState(false);
  const [showEmailSetup, setShowEmailSetup] = useState(false);
  const [showDisableTotpModal, setShowDisableTotpModal] = useState(false);
  const [showDisableEmailModal, setShowDisableEmailModal] = useState(false);
  
  // Get current user using the useGetUser hook
  const { user, isLoading, refreshUser: originalRefreshUser, error } = useGetUser();
  
  // Enhanced refreshUser function to bypass cache when updating security settings
  const refreshUser = async () => {
    // Reset global cache in useGetUser hook
    if (typeof originalRefreshUser === 'function') {
      try {
        // Force refresh without cache
        await originalRefreshUser();
        
        // Update Redux store with new security status
        if (user) {
          dispatch(updateUserData({
            is_mfa_enabled: user.is_mfa_enabled,
            is_email_2fa_enabled: user.is_email_2fa_enabled
          }));
        }
        return true;
      } catch (error) {
        console.error('Error refreshing user data:', error);
        return false;
      }
    }
    return false;
  };

  // Check requirements whenever password changes
  useEffect(() => {
    if (passwords.newPassword) {
      setPasswordRequirements({
        minLength: passwords.newPassword.length >= 8,
        uppercase: /[A-Z]/.test(passwords.newPassword),
        lowercase: /[a-z]/.test(passwords.newPassword),
        number: /[0-9]/.test(passwords.newPassword),
        special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+/.test(passwords.newPassword),
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
  }, [passwords.newPassword]);

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

  // Check if new password is same as current password
  const checkSamePassword = () => {
    if (passwords.newPassword && passwords.currentPassword && 
        passwords.newPassword === passwords.currentPassword) {
      setSamePasswordError(t('samePasswordError') || 'New password cannot be the same as current password');
      return true;
    } else {
      setSamePasswordError('');
      return false;
    }
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswords(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when typing
    if (name === 'newPassword') {
      setPasswordError('');
      // Check if same as current password when both fields have values
      if (passwords.currentPassword) {
        setTimeout(() => {
          checkSamePassword();
        }, 0);
      }
    } else if (name === 'confirmPassword') {
      setConfirmPasswordError('');
    } else if (name === 'currentPassword') {
      // Check if same as new password when both fields have values
      if (passwords.newPassword) {
        setTimeout(() => {
          checkSamePassword();
        }, 0);
      }
    }
  };

  const togglePasswordVisibility = (field) => {
    setShowPassword(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  // Validate password on blur
  const handlePasswordBlur = () => {
    if (passwords.newPassword) {
      const { valid, message } = validatePassword(passwords.newPassword);
      if (!valid) {
        setPasswordError(message);
      } else {
        setPasswordError('');
        // Check if same as current password
        checkSamePassword();
      }
    }
  };

  // Validate confirm password on blur
  const handleConfirmPasswordBlur = () => {
    if (passwords.confirmPassword && passwords.newPassword !== passwords.confirmPassword) {
      setConfirmPasswordError(t('passwordMismatch'));
    } else {
      setConfirmPasswordError('');
    }
  };

  const handleChangePassword = async () => {
    // Clear errors first
    setPasswordError('');
    setConfirmPasswordError('');
    setSamePasswordError('');
    
    // Validate new password format
    if (passwords.newPassword) {
      const { valid, message } = validatePassword(passwords.newPassword);
      if (!valid) {
        setPasswordError(message);
        return;
      }
    }
    
    if (passwords.newPassword !== passwords.confirmPassword) {
      setConfirmPasswordError(t('passwordMismatch'));
      return;
    }
    
    // Check if new password is same as current password
    if (checkSamePassword()) {
      return;
    }
    
    if (!user || !user.id) {
      toast.error(t('common.notAuthenticated'));
      return;
    }
    
    setLoading(true);
    try {
      await api.users.updatePassword(user.id, {
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword
      });
      
      // Reset password fields
      setPasswords({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      
      // Force refresh user data without cache
      await refreshUser();
      
      toast.success(t('passwordChanged'));
    } catch (error) {
      console.error('Error changing password:', error);
      toast.error(t('error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{t('security')}</CardTitle>
          <CardDescription>{t('security')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">{t('currentPassword')}</Label>
              <div className="relative">
                <Input
                  id="currentPassword"
                  name="currentPassword"
                  type={showPassword.currentPassword ? "text" : "password"}
                  value={passwords.currentPassword}
                  onChange={handlePasswordChange}
                  placeholder={t('currentPassword')}
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('currentPassword')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                >
                  {showPassword.currentPassword ? (
                    <FaEyeSlash className="h-5 w-5" />
                  ) : (
                    <FaEye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">{t('newPassword')}</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  name="newPassword"
                  type={showPassword.newPassword ? "text" : "password"}
                  value={passwords.newPassword}
                  onChange={handlePasswordChange}
                  onBlur={handlePasswordBlur}
                  placeholder={t('newPassword')}
                  className={passwordError ? 'border-red-500 focus:ring-red-500' : ''}
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('newPassword')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                >
                  {showPassword.newPassword ? (
                    <FaEyeSlash className="h-5 w-5" />
                  ) : (
                    <FaEye className="h-5 w-5" />
                  )}
                </button>
              </div>
              {passwordError && (
                <p className="text-sm text-red-500 mt-1">{passwordError}</p>
              )}
              
              {samePasswordError && (
                <p className="text-sm text-red-500 mt-1">{samePasswordError}</p>
              )}
              
              {/* Dynamic password requirements */}
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
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t('confirmPassword')}</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showPassword.confirmPassword ? "text" : "password"}
                  value={passwords.confirmPassword}
                  onChange={handlePasswordChange}
                  onBlur={handleConfirmPasswordBlur}
                  placeholder={t('confirmPassword')}
                  className={confirmPasswordError ? 'border-red-500 focus:ring-red-500' : ''}
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('confirmPassword')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                >
                  {showPassword.confirmPassword ? (
                    <FaEyeSlash className="h-5 w-5" />
                  ) : (
                    <FaEye className="h-5 w-5" />
                  )}
                </button>
              </div>
              {confirmPasswordError && (
                <p className="text-sm text-red-500 mt-1">{confirmPasswordError}</p>
              )}
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            onClick={handleChangePassword} 
            disabled={loading || isLoading || !!passwordError || !!confirmPasswordError || !!samePasswordError || !passwords.currentPassword || !passwords.newPassword || !passwords.confirmPassword}
          >
            {loading ? t('saving') : t('saveChanges')}
          </Button>
        </CardFooter>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>{t('twoFactorAuth')}</CardTitle>
          <CardDescription>{t('twoFactorAuthDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* TOTP Authenticator */}
          {!showTotpSetup ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Shield className="w-6 h-6 text-primary" />
                <div>
                  <p className="font-medium">{t('authenticatorApp')}</p>
                  <p className="text-sm text-muted-foreground">{t('authenticatorAppDesc')}</p>
                </div>
              </div>
              {user && user.is_mfa_enabled ? (
                <Button 
                  variant="destructive"
                  onClick={() => setShowDisableTotpModal(true)}
                >
                  {t('disable')}
                </Button>
              ) : (
                <Button 
                  variant="outline"
                  onClick={() => setShowTotpSetup(true)}
                >
                  {t('setup')}
                </Button>
              )}
            </div>
          ) : (
            <TOTPSetup 
              userId={user?.id} 
              onSetupComplete={async () => {
                setShowTotpSetup(false);
                // Update the user data to reflect the change
                await refreshUser();
                // Also explicitly update Redux store
                dispatch(updateUserData({
                  is_mfa_enabled: true
                }));
                toast.success(t('success'));
              }}
              onCancel={() => setShowTotpSetup(false)}
              locale={locale}
            />
          )}
          
          {/* Email Authentication */}
          {!showEmailSetup ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Mail className="w-6 h-6 text-primary" />
                <div>
                  <p className="font-medium">{t('emailAuthentication')}</p>
                  <p className="text-sm text-muted-foreground">{t('emailAuthenticationDesc')}</p>
                </div>
              </div>
              {user && user.is_email_2fa_enabled ? (
                <Button 
                  variant="destructive"
                  onClick={() => setShowDisableEmailModal(true)}
                >
                  {t('disable')}
                </Button>
              ) : (
                <Button 
                  variant="outline"
                  onClick={() => setShowEmailSetup(true)}
                >
                  {t('setup')}
                </Button>
              )}
            </div>
          ) : (
            <EmailSetup 
              userId={user?.id} 
              userEmail={user?.email}
              onSetupComplete={async () => {
                setShowEmailSetup(false);
                // Update the user data to reflect the change
                await refreshUser();
                // Also explicitly update Redux store
                dispatch(updateUserData({
                  is_email_2fa_enabled: true
                }));
                toast.success(t('success'));
              }}
              onCancel={() => setShowEmailSetup(false)}
              locale={locale}
            />
          )}
        </CardContent>
      </Card>
      
      {/* Disable TOTP 2FA Modal */}
      {showDisableTotpModal && (
        <DisableTOTPModal
          userId={user?.id}
          onClose={() => setShowDisableTotpModal(false)}
          onDisabled={async () => {
            setShowDisableTotpModal(false);
            // Update the user data to reflect the change
            await refreshUser();
            // Also explicitly update Redux store
            dispatch(updateUserData({
              is_mfa_enabled: false
            }));
            toast.success(t('success'));
          }}
        />
      )}
      
      {/* Disable Email 2FA Modal */}
      {showDisableEmailModal && (
        <DisableEmailModal
          userId={user?.id}
          onClose={() => setShowDisableEmailModal(false)}
          onDisabled={async () => {
            setShowDisableEmailModal(false);
            // Update the user data to reflect the change
            await refreshUser();
            // Also explicitly update Redux store
            dispatch(updateUserData({
              is_email_2fa_enabled: false
            }));
            toast.success(t('success'));
          }}
        />
      )}
    </div>
  );
} 