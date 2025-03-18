'use client'

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function PaymentSuccess() {
  const [status, setStatus] = useState('loading');
  const [paymentDetails, setPaymentDetails] = useState(null);
  const searchParams = useSearchParams();

  useEffect(() => {
    // 检查是否有支付意向 ID 或会话 ID
    const paymentIntent = searchParams.get('payment_intent');
    const sessionId = searchParams.get('session_id');
    
    if (!paymentIntent && !sessionId) {
      console.error('No payment identifier found in URL');
      setStatus('error');
      return;
    }
    
    // 构建 API 请求 URL
    let apiUrl = '/api/payment-status?';
    if (paymentIntent) {
      apiUrl += `payment_intent=${paymentIntent}`;
    } else if (sessionId) {
      apiUrl += `session_id=${sessionId}`;
    }
    
    // 获取支付状态
    fetch(apiUrl)
      .then(async (res) => {
        if (!res.ok) {
          const errorText = await res.text();
          console.error('Payment status error:', errorText);
          throw new Error('Failed to fetch payment status');
        }
        return res.json();
      })
      .then((data) => {
        console.log('Payment details:', data);
        setPaymentDetails(data);
        setStatus(data.status === 'succeeded' ? 'success' : 'processing');
      })
      .catch((err) => {
        console.error('Error fetching payment status:', err);
        setStatus('error');
      });
  }, [searchParams]);

  const sendEmail = async (paymentDetails) => {
    try {
      const email = localStorage.getItem('userEmail');
      if (!email) {
        console.error('No email found in localStorage');
        return;
      }
      
      console.log('Sending email to:', email);
      
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: email,
          orderDetails: {
            id: paymentDetails?.id || 'N/A',
            amount: paymentDetails?.amount || 0,
            planName: paymentDetails?.planName || 'Subscription Plan'
          }
        }),
      });
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to send email');
      }
      
      console.log('Email sent successfully');
    } catch (err) {
      console.error('Failed to send email:', err);
    }
  };

  // 在获取到支付详情后调用
  useEffect(() => {
    if (paymentDetails && paymentDetails.status === 'succeeded') {
      sendEmail(paymentDetails);
    }
  }, [paymentDetails]);

  // 格式化金额显示
  const formatAmount = (amount) => {
    if (!amount && amount !== 0) return 'N/A';
    // 将分转换为元并格式化为货币
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount / 100);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center">
          {status === 'loading' && (
            <>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
              <h2 className="mt-4 text-xl font-semibold text-gray-900">Processing your payment...</h2>
              <p className="mt-2 text-gray-600">
                Please wait while we confirm your payment details.
              </p>
            </>
          )}

          {status === 'processing' && (
            <>
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-8 h-8 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="mt-4 text-2xl font-bold text-gray-900">Payment Processing</h2>
              <p className="mt-2 text-gray-600">
                Your payment is being processed. This may take a moment.
              </p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="mt-4 text-2xl font-bold text-gray-900">Payment Successful!</h2>
              <p className="mt-2 text-gray-600">
                Thank you for subscribing to {paymentDetails?.planName}
              </p>
              <div className="mt-6 border-t border-gray-200 pt-6">
                <div className="text-left">
                  <h3 className="font-medium text-gray-900">Order Summary</h3>
                  <dl className="mt-4 space-y-4">
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Plan</dt>
                      <dd className="text-gray-900">{paymentDetails?.planName || 'Subscription Plan'}</dd>
                    </div>
                    {paymentDetails?.quantity && (
                      <div className="flex justify-between">
                        <dt className="text-gray-600">Quantity</dt>
                        <dd className="text-gray-900">{paymentDetails.quantity}</dd>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Amount</dt>
                      <dd className="text-gray-900">{formatAmount(paymentDetails?.amount)}</dd>
                    </div>
                    {paymentDetails?.discount > 0 && (
                      <div className="flex justify-between text-green-600">
                        <dt>Discount</dt>
                        <dd>-{formatAmount(paymentDetails.discount)}</dd>
                      </div>
                    )}
                    <div className="flex justify-between border-t border-gray-200 pt-4">
                      <dt className="text-gray-900 font-medium">Total</dt>
                      <dd className="text-indigo-600 font-medium">{formatAmount(paymentDetails?.amount)}</dd>
                    </div>
                  </dl>
                </div>
              </div>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="mt-4 text-2xl font-bold text-gray-900">Payment Failed</h2>
              <p className="mt-2 text-gray-600">
                There was an issue processing your payment. Please try again.
              </p>
              {paymentDetails?.error && (
                <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">
                  {paymentDetails.error}
                </div>
              )}
            </>
          )}

          <div className="mt-8 space-y-3">
            <Link 
              href="/dashboard"
              className="block w-full bg-indigo-600 text-white py-3 px-4 rounded-md hover:bg-indigo-700 transition-colors"
            >
              Go to Dashboard
            </Link>
            <Link 
              href="/"
              className="block w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-md hover:bg-gray-200 transition-colors"
            >
              Return to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}