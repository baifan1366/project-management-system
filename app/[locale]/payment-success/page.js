'use client'

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';


export default function PaymentSuccess() {
  const [status, setStatus] = useState('loading');
  const [paymentDetails, setPaymentDetails] = useState(null);
  const searchParams = useSearchParams();

  useEffect(() => {
    const paymentIntent = searchParams.get('payment_intent');
    if (paymentIntent) {
      // Fetch payment intent status from your API
      fetch(`/api/payment-status?payment_intent=${paymentIntent}`)
        .then((res) => res.json())
        .then((data) => {
          setPaymentDetails(data);
          setStatus('success');
        })
        .catch((err) => {
          console.error('Error:', err);
          setStatus('error');
        });
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center">
          {status === 'loading' && (
            <>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
              <h2 className="mt-4 text-xl font-semibold text-gray-900">Processing your payment...</h2>
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
                Thank you for your purchase. You will receive a confirmation email shortly.
              </p>
              <div className="mt-6 border-t border-gray-200 pt-6">
                <div className="text-left">
                  <h3 className="font-medium text-gray-900">Order Summary</h3>
                  <dl className="mt-4 space-y-4">
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Plan</dt>
                      <dd className="text-gray-900">Team Sync Pro</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Amount</dt>
                      <dd className="text-gray-900">$1,200.00</dd>
                    </div>
                    <div className="flex justify-between border-t border-gray-200 pt-4">
                      <dt className="text-gray-900 font-medium">Total</dt>
                      <dd className="text-indigo-600 font-medium">$1,200.00</dd>
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