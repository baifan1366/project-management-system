'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import TwoFactorVerification from '@/components/2fa/TwoFactorVerification';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function VerifyTwoFactorPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();
  const locale = params.locale || 'en';
  const [loading, setLoading] = useState(true);
  const t = useTranslations('auth');
  
  // Get params from URL
  const userId = searchParams.get('userId');
  const twoFactorTypes = searchParams.get('twoFactorTypes')?.split(',') || ['totp'];
  const redirectUrl = searchParams.get('redirect') || '/projects';
  
  // Check if params are valid
  useEffect(() => {
    if (!userId) {
      toast.error('Missing user ID parameter');
      router.push(`/${locale}/login`);
      return;
    }
    
    setLoading(false);
  }, [userId, router, locale]);
  
  // Handle successful verification
  const handleVerified = (data) => {
    // Add safety checks for data structure
    console.log("2FA verification result:", data);
    
    // Redirect to the original destination or default
    const target = redirectUrl.startsWith('/') ? redirectUrl : `/${redirectUrl}`;
    
    // Check if target already has locale prefix
    const targetWithLocale = target.startsWith(`/${locale}/`) ? target : `/${locale}${target}`;
    
    toast.success(t('login.button') + ' ' + t('login.success')); 
    
    // Add a small delay to ensure cookie is set properly
    setTimeout(() => {
      router.push(targetWithLocale);
    }, 500);
  };
  
  // Handle cancel
  const handleCancel = () => {
    router.push(`/${locale}/login`);
  };
  
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <Loader2 className="h-8 w-8 animate-spin mb-4" />
        <p className="text-lg font-medium">{t('login.loading')}</p>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-6">
          {t('login.twoFactorAuth')}
        </h1>
        
        <TwoFactorVerification
          userId={userId}
          types={twoFactorTypes}
          onVerified={handleVerified}
          onCancel={handleCancel}
          locale={locale}
        />
        
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center mt-4">
          {t('login.havingTrouble')} {t('login.contactSupport')}
        </p>
      </div>
    </div>
  );
} 