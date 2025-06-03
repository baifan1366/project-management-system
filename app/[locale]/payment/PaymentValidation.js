import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { TimerProvider } from './TimerContext';
import PaymentTimer from './PaymentTimer';

export default function PaymentValidation({ children }) {
  const t = useTranslations('Payment');
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isPaymentValid, selectedPlanId, validationTimestamp } = useSelector((state) => state.payment);

  // Initial validation check
  useEffect(() => {
    const planId = searchParams.get('plan_id');
    // Payment validation window set to 1 minute
    const isValid = isPaymentValid && 
                   selectedPlanId === Number(planId) && 
                   validationTimestamp && 
                   (Date.now() - validationTimestamp < 60000); // 1 minutes validity

    if (!isValid) {
      // If validation fails, redirect to payment-error page with error message
      const errorMessage = encodeURIComponent(t('validationError'));
      router.replace(`/payment-error?message=${errorMessage}`);
    }
  }, [isPaymentValid, selectedPlanId, validationTimestamp, router, searchParams, t]);

  // Wrap children with TimerProvider but don't include PaymentTimer component here
  return (
    <TimerProvider>
      {children}
    </TimerProvider>
  );
} 