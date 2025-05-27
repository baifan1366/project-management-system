'use client'

import { useRouter } from 'next/navigation';

export default function ProcessedPaymentModal({ countdown }) {
  const router = useRouter();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
        <div className="text-center">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          
          <h2 className="mt-4 text-xl font-semibold text-gray-900">
            Payment Already Processed
          </h2>
          
          <p className="mt-2 text-gray-600">
            This payment has already been processed successfully.
          </p>
          
          <p className="mt-2 text-gray-600">
            Redirecting to dashboard in <span className="font-bold text-indigo-600">{countdown}</span> seconds...
          </p>
          
          <button
            onClick={() => router.push('/dashboard')}
            className="mt-6 w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition-colors"
          >
            Go to Dashboard Now
          </button>
        </div>
      </div>
    </div>
  );
}