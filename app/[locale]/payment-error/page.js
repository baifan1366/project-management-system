'use client'

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { clearPaymentData } from '@/lib/redux/features/paymentSlice';
import Link from 'next/link';
import { toast } from 'sonner';

export default function PaymentError() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useDispatch();
  const { error, metadata } = useSelector(state => state.payment);
  const [loading, setLoading] = useState(true);
  const [errorDetails, setErrorDetails] = useState({
    title: 'Payment Failed',
    message: '',
  });
  const [isOrderIdExpanded, setIsOrderIdExpanded] = useState(false);

  useEffect(() => {
    // 解析错误信息
    const errorMessage = searchParams.get('message') || error || 'Invalid or expired payment session. Please try again.';
    
    setErrorDetails({
      title: 'Payment Error',
      message: errorMessage,
    });

    // 保留错误信息，但清除其他支付数据
    dispatch(clearPaymentData());
    setLoading(false);
  }, [dispatch, searchParams, error]);

  // 格式化订单ID显示
  const formatOrderId = (orderId) => {
    if (!orderId) return 'N/A';
    return isOrderIdExpanded ? orderId : `${orderId.substring(0, 8)}...`;
  };

  // 格式化金额显示
  const formatAmount = (amount) => {
    if (!amount) return '$0.00';
    return `$${(amount / 100).toFixed(2)}`;
  };

  // 复制到剪贴板
  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard');
    } catch (err) {
      console.error('Failed to copy text:', err);
      toast.error('Failed to copy');
    }
  };

  const handleTryAgain = () => {
    // 如果有 planId，直接跳转回支付页面
    const planId = metadata?.planId;
    if (planId) {
      router.push(`/pricing?plan_id=${planId}`);
    } else {
      router.push('/pricing');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <h2 className="mt-4 text-xl font-semibold text-gray-900">Loading payment details...</h2>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center">
          {/* Error Icon */}
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>

          {/* Title and Subtitle */}
          <h2 className="mt-4 text-2xl font-bold text-gray-900">{errorDetails.title}</h2>
          <p className="mt-2 text-gray-600">
            {errorDetails.message}
          </p>

          {/* Order Summary */}
          <div className="mt-6 border-t border-gray-200 pt-6">
            <div className="text-left">
              <h3 className="font-medium text-gray-900">Order Details</h3>
              <dl className="mt-4 space-y-4">
                {metadata?.orderId && (
                  <div className="flex justify-between items-center">
                    <dt className="text-gray-600">Order ID</dt>
                    <dd className="text-gray-900 font-mono flex items-center gap-2">
                      <span>{formatOrderId(metadata.orderId)}</span>
                      <button
                        onClick={() => setIsOrderIdExpanded(!isOrderIdExpanded)}
                        className="text-indigo-600 hover:text-indigo-700 text-sm"
                      >
                        {isOrderIdExpanded ? 'Show Less' : 'Show More'}
                      </button>
                      <button
                        onClick={() => copyToClipboard(metadata.orderId)}
                        className="text-indigo-600 hover:text-indigo-700"
                        title="Copy to clipboard"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                    </dd>
                  </div>
                )}
                {metadata?.planName && (
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Plan</dt>
                    <dd className="text-gray-900">{metadata.planName}</dd>
                  </div>
                )}
                {metadata?.amount && (
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Amount</dt>
                    <dd className="text-gray-900">{formatAmount(metadata.amount)}</dd>
                  </div>
                )}
                <div className="flex justify-between border-t border-gray-200 pt-4">
                  <dt className="text-gray-900 font-medium">Status</dt>
                  <dd className="text-red-600 font-medium">Failed</dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-8 space-y-3">
            <button
              onClick={handleTryAgain}
              className="block w-full bg-indigo-600 text-white py-3 px-4 rounded-md hover:bg-indigo-700 transition-colors"
            >
              Return to Pricing
            </button>
            <Link 
              href="/dashboard"
              className="block w-full border border-gray-300 text-gray-700 py-3 px-4 rounded-md hover:bg-gray-50 transition-colors text-center"
            >
              Go to Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
} 