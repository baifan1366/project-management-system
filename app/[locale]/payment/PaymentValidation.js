import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';

export default function PaymentValidation({ children }) {
  const t = useTranslations('Payment');
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isPaymentValid, selectedPlanId, validationTimestamp } = useSelector((state) => state.payment);

  useEffect(() => {
    const planId = searchParams.get('plan_id');
    const isValid = isPaymentValid && 
                   selectedPlanId === Number(planId) && 
                   validationTimestamp && 
                   (Date.now() - validationTimestamp < 300000); // 5 minutes validity

    if (!isValid) {
      // 如果验证失败，重定向到定价页面
      router.replace('/pricing');
    }
  }, [isPaymentValid, selectedPlanId, validationTimestamp, router, searchParams]);

  // 如果验证通过，渲染子组件
  return children;
} 