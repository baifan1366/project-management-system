'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Shield, Phone } from 'lucide-react';
import { FaEye, FaEyeSlash, FaQuestionCircle, FaCheck, FaTimes } from 'react-icons/fa';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import useGetUser from '@/lib/hooks/useGetUser';

export default function SecurityPage() {
  const t = useTranslations('profile');
  const [loading, setLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
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
  
  // Get current user using the useGetUser hook
  const { user, isLoading } = useGetUser();

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

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswords(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when typing
    if (name === 'newPassword') {
      setPasswordError('');
    } else if (name === 'confirmPassword') {
      setConfirmPasswordError('');
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
      setPasswords({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      toast.success(t('passwordChanged'));
    } catch (error) {
      console.error('Error changing password:', error);
      toast.error(t('common.error'));
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
            disabled={loading || isLoading || !!passwordError || !!confirmPasswordError || !passwords.currentPassword || !passwords.newPassword || !passwords.confirmPassword}
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
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Shield className="w-6 h-6 text-primary" />
              <div>
                <p className="font-medium">{t('authenticatorApp')}</p>
                <p className="text-sm text-muted-foreground">{t('authenticatorAppDesc')}</p>
              </div>
            </div>
            <Button variant="outline">
              {t('setup')}
            </Button>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Phone className="w-6 h-6 text-primary" />
              <div>
                <p className="font-medium">{t('smsAuthentication')}</p>
                <p className="text-sm text-muted-foreground">{t('smsAuthenticationDesc')}</p>
              </div>
            </div>
            <Button variant="outline">
              {t('setup')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 