import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useTimer } from './TimerContext';

export default function PaymentTimer({ validationTimestamp }) {
  const { timeRemaining, setTimeRemaining } = useTimer();
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations('Payment');

  // 初始化和更新倒计时
  useEffect(() => {
    if (!validationTimestamp) return;

    // 计算初始剩余时间
    const initialTimeRemaining = Math.max(0, Math.floor((validationTimestamp + 60000 - Date.now()) / 1000));
    setTimeRemaining(initialTimeRemaining);
    
    // 创建定时器每秒更新倒计时
    const timer = setInterval(() => {
      const remainingMs = validationTimestamp + 60000 - Date.now();
      const remainingSec = Math.max(0, Math.floor(remainingMs / 1000));
      
      setTimeRemaining(remainingSec);
      
      // 如果时间到期，重定向到错误页面
      if (remainingMs <= 0) {
        const errorMessage = encodeURIComponent(t('validationError'));
        router.replace(`/payment-error?message=${errorMessage}`);
        clearInterval(timer);
      }
    }, 1000);
    
    return () => clearInterval(timer);
  }, [validationTimestamp, setTimeRemaining, router, t, searchParams]);

  // 格式化剩余时间
  const formatTimeRemaining = () => {
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  // 只有在有剩余时间时才显示计时器
  if (!timeRemaining || !validationTimestamp) return null;

  return (
    <div className="text-left mb-4">
      <p className="text-gray-300 text-sm">
        Session expires in: <span className="font-bold text-white">{formatTimeRemaining()}</span>
      </p>
    </div>
  );
} 