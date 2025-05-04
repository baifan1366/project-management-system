'use client';

import Link from 'next/link';

export default function AccessRestrictedModal() {
  return (
    <div>
    <div className="flex-1 flex flex-col items-center justify-center">
      <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg p-8 max-w-md text-center">
        <div className="text-red-500 mb-4 text-5xl">
            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">Access Restricted</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">You don't have permission to access the admin management. Please contact your administrator for assistance.</p>
          <Link href="/admin/adminDashboard">
            <button className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors">
              Return to Dashboard
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}   
