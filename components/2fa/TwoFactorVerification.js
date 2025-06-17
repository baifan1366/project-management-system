'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from 'sonner';
import { Loader2, Mail, Lock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

/**
 * TwoFactorVerification component for verifying 2FA during login
 */
export default function TwoFactorVerification({ userId, types = [], onVerified, onCancel, locale = 'en' }) {
  const router = useRouter();
  const t = useTranslations('auth');
  
  // Prioritize TOTP over email by rearranging the types array
  const prioritizedTypes = [...types].sort((a, b) => {
    if (a === 'totp') return -1;
    if (b === 'totp') return 1;
    return 0;
  });
  
  const [activeMethod, setActiveMethod] = useState(prioritizedTypes[0] || 'totp');
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(0);
  
  useEffect(() => {
    // If email is enabled, automatically send a code
    if (types.includes('email') && activeMethod === 'email') {
      sendEmailCode();
    }
  }, [activeMethod]);
  
  useEffect(() => {
    // Countdown for resending email code
    let timer;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);
  
  const sendEmailCode = async () => {
    if (countdown > 0) return;
    
    setSending(true);
    setError('');
    
    try {
      const response = await fetch(`/api/users/${userId}/email-2fa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send_code' }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to send verification code');
      }
      
      // Start countdown for resend (60 seconds)
      setCountdown(60);
      toast.success(t('login.codeSent') || 'Verification code sent to your email');
    } catch (error) {
      console.error('Error sending verification code:', error);
      setError(error.message || 'Failed to send verification code');
    } finally {
      setSending(false);
    }
  };
  
  const verifyTwoFactor = async () => {
    if (!token || (activeMethod === 'totp' && (token.length !== 6 || !/^\d+$/.test(token)))) {
      setError(activeMethod === 'totp' 
        ? t('login.totpCodeError') || 'Please enter a valid 6-digit code from your authenticator app' 
        : t('login.emailCodeError') || 'Please enter the verification code from your email');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/auth/verify-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          token,
          method: activeMethod
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Verification failed');
      }
      
      toast.success(t('login.verificationSuccess') || 'Verification successful');
      
      if (onVerified) {
        onVerified(data);
      } else {
        // Default behavior: redirect to dashboard
        router.push(`/${locale}/dashboard`);
      }
    } catch (error) {
      console.error('Verification error:', error);
      setError(error.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>{t('login.twoFactorAuth') || 'Two-Factor Authentication'}</CardTitle>
        <CardDescription>
          {t('login.enterCode') || 'Please enter the verification code to continue'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Method selector if multiple methods are available */}
        {types.length > 1 && (
          <div className="space-y-2">
            <Label>{t('login.verificationMethod') || 'Verification Method'}</Label>
            <div className="flex space-x-2">
              {prioritizedTypes.map(type => (
                <Button
                  key={type}
                  variant={activeMethod === type ? 'default' : 'outline'}
                  onClick={() => {
                    setActiveMethod(type);
                    setToken('');
                    setError('');
                  }}
                  className="flex-1"
                >
                  {type === 'totp' ? (
                    <>
                      <Lock className="w-4 h-4 mr-2" />
                      {t('login.authenticatorApp') || 'App'}
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4 mr-2" />
                      {t('login.email') || 'Email'}
                    </>
                  )}
                </Button>
              ))}
            </div>
          </div>
        )}
        
        <div className="space-y-2">
          {activeMethod === 'totp' ? (
            <>
              <Label htmlFor="token">{t('login.enterTotpCode') || 'Enter the 6-digit code from your authenticator app'}</Label>
              <Input
                id="token"
                value={token}
                onChange={(e) => setToken(e.target.value.trim())}
                placeholder={t('login.digitCode') || '6-digit code'}
                maxLength={6}
                className="text-center text-lg tracking-widest"
                autoComplete="one-time-code"
              />
            </>
          ) : (
            <>
              <Label htmlFor="token">{t('login.enterEmailCode') || 'Enter the verification code sent to your email'}</Label>
              <Input
                id="token"
                value={token}
                onChange={(e) => setToken(e.target.value.trim())}
                placeholder={t('login.verificationCode') || 'Verification code'}
                className="text-center text-lg tracking-widest"
                autoComplete="one-time-code"
              />
              <div className="text-right mt-2">
                <Button
                  variant="link"
                  size="sm"
                  onClick={sendEmailCode}
                  disabled={sending || countdown > 0}
                  className="p-0 h-auto"
                >
                  {sending ? 
                    (t('login.sending') || 'Sending...') : 
                    countdown > 0 ? 
                      `${t('login.resendIn') || 'Resend in'} ${countdown}s` : 
                      (t('login.resendCode') || 'Resend code')}
                </Button>
              </div>
            </>
          )}
          {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="ghost" onClick={onCancel} disabled={loading}>
          {t('login.cancel') || 'Cancel'}
        </Button>
        <Button onClick={verifyTwoFactor} disabled={loading || !token}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t('login.verifying') || 'Verifying...'}
            </>
          ) : (
            t('login.verify') || 'Verify'
          )}
        </Button>
      </CardFooter>
    </Card>
  );
} 