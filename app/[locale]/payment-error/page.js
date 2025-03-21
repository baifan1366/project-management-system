'use client'

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { clearPaymentData } from '@/lib/redux/features/paymentSlice';

export default function PaymentError() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useDispatch();
  const { error } = useSelector(state => state.payment);

  useEffect(() => {
    // 保留错误信息，但清除其他支付数据
    dispatch(clearPaymentData());
  }, [dispatch]);

  const errorMessage = searchParams.get('message') || error || 'An error occurred during payment';

  return (
    <div className="max-w-2xl mx-auto py-16 px-4 sm:py-24 sm:px-6 lg:px-8">
      <div className="text-center">
        <h1 className="text-3xl font-extrabold text-red-600">
          Payment Failed
        </h1>
        <p className="mt-4 text-lg text-gray-500">
          {errorMessage}
        </p>
        <div className="mt-6 space-y-4">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Try Again
          </button>
          <button
            onClick={() => router.push('/pricing')}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Return to Pricing
          </button>
        </div>
      </div>
    </div>
  );
} 