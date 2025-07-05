'use client'

import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function PaymentSuccessModal({ 
  metadata, 
  userEmail, 
  formatAmount, 
  formatOrderId,
  isOrderIdExpanded,
  setIsOrderIdExpanded,
  copyToClipboard 
}) {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center">
          {/* Success Icon */}
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          {/* Title and Subtitle */}
          <h2 className="mt-4 text-2xl font-bold text-gray-900">Payment Successful!</h2>
          <p className="mt-2 text-gray-600">
            Thank you for subscribing to {metadata?.planName || 'Team Sync Plan'}
          </p>

          {/* Order Summary */}
          <div className="mt-6 border-t border-gray-200 pt-6">
            <div className="text-left">
              <h3 className="font-medium text-gray-900">Order Summary</h3>
              <dl className="mt-4 space-y-4">
                <div className="flex justify-between items-center">
                  <dt className="text-gray-600">Order ID</dt>
                  <dd className="text-gray-900 font-mono flex items-center gap-2">
                    <span>{formatOrderId(metadata?.orderId)}</span>
                    {metadata?.orderId && (
                      <>
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
                      </>
                    )}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-600">Plan</dt>
                  <dd className="text-gray-900">{metadata?.planName || 'Team Sync Plan'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-600">Amount</dt>
                  <dd className="text-gray-900">{formatAmount(metadata.amount)}</dd>
                </div>
                {userEmail && (
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Email</dt>
                    <dd className="text-gray-900">{userEmail}</dd>
                  </div>
                )}
                <div className="flex justify-between border-t border-gray-200 pt-4">
                  <dt className="text-gray-900 font-medium">Total</dt>
                  <dd className="text-indigo-600 font-medium">{formatAmount(metadata.amount)}</dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-8 space-y-3">
            <Link 
              href="/projects"
              className="block w-full bg-indigo-600 text-white py-3 px-4 rounded-md hover:bg-indigo-700 transition-colors text-center"
            >
              Go to Project
            </Link>
            <Link 
              href="/pricing"
              className="block w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-md hover:bg-gray-200 transition-colors text-center"
            >
              Return to Pricing
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
