'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Image } from 'lucide-react';
import LandingPageSettings from '@/components/admin/settings/LandingPageSettings';
import { useSelector, useDispatch } from 'react-redux';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AccessRestrictedModal from '@/components/admin/accessRestrictedModal';

export default function AdminSettings() {
  const router = useRouter();
  const permissions = useSelector((state) => state.admin.permissions);

  const [loading, setLoading] = useState(true);
  const [adminData, setAdminData] = useState(null);
  const dispatch = useDispatch();

    // Verify admin session using redux
    useEffect(() => {
      const initAdminSettings = async () => {
        try {
          setLoading(true);
          
        } catch (error) {
          console.error('Admin session check failed:', error);
          // Redirect to admin login
          router.replace(`/admin/adminLogin`);
        } finally {
          setLoading(false);
        }
      };
      
      initAdminSettings();
    }, [dispatch, router]);

    // Add function to verify permission access TODO: 模块化这个代码
    const hasPermission = (permissionName) => {
      return permissions.includes(permissionName);
    };

    if (loading) {
      return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
          {/* Main Content */}
          <div className="flex-1 overflow-auto p-6">
            {/* Skeleton Tabs */}
            <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
              <ul className="flex flex-wrap -mb-px">
                {['Landing Page Assets'].map((tab, index) => (
                  <li key={index} className="mr-2">
                    <div className="inline-block py-2 px-4 text-gray-400 font-medium animate-pulse">
                      <div className="flex items-center">
                        <div className="h-4 w-4 mr-2 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                        {tab}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Card Skeleton */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
              {/* Card Header Skeleton */}
              <div className="p-4 md:p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2"></div>
                <div className="h-4 w-96 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              </div>
              
              {/* Card Content Skeleton */}
              <div className="p-4 md:p-6">
                <div className="space-y-6">
                  {/* Form Field Skeletons */}
                  {[1, 2, 3, 4].map((field) => (
                    <div key={field} className="space-y-2">
                      <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                      <div className="h-10 w-full bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                    </div>
                  ))}
                  
                  {/* Button Skeleton */}
                  <div className="flex justify-end mt-6">
                    <div className="h-10 w-32 bg-indigo-500 rounded animate-pulse"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">

      {/* Main Content */}
      <div className="flex-1 overflow-auto">

        {/* Content Area */}
        {hasPermission('manage_system_settings') ? (
          <main className="p-6">
            {/* Tabs */}
            <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
              <ul className="flex flex-wrap -mb-px">
                <li className="mr-2">
                  <div className="flex items-center inline-block py-2 px-4 font-medium text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400">
                    <Image className="h-4 w-4 mr-2" />
                    Landing Page Assets
                  </div>
                </li>
              </ul>
            </div>

            {/* Tab Content */}
              <CardContent>
                <div className="mt-4">
                  <LandingPageSettings />
                </div>
              </CardContent>
          </main>
        ) : (
          <div className="min-h-screen flex items-center justify-center">
            <AccessRestrictedModal />
          </div>
        )}
      </div>
    </div>
  );
}
