'use client';

import { useState , useEffect} from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Globe, Palette, Image, Settings } from 'lucide-react';
import WebsiteSettings from '@/components/admin/settings/WebsiteSettings';
import LocalizationSettings from '@/components/admin/settings/LocalizationSettings';
import ThemeSettings from '@/components/admin/settings/ThemeSettings';  
import LandingPageSettings from '@/components/admin/settings/LandingPageSettings';
import { useSelector, useDispatch } from 'react-redux';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AdminSettings() {
  const router = useRouter();
  const permissions = useSelector((state) => state.admin.permissions);

  const [activeTab, setActiveTab] = useState('website');
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

    if (loading) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-slate-500 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading user data...</p>
          </div>
        </div>
      );
    }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {permissions.includes('manage_settings') && (
        <div>
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="px-6 py-4">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white">System Settings</h2>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6">
        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
          <ul className="flex flex-wrap -mb-px">
            <li className="mr-2">
              <button 
                onClick={() => setActiveTab('website')}
                className={`inline-block py-2 px-4 font-medium ${
                  activeTab === 'website'
                    ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <div className="flex items-center">
                  <Settings className="h-4 w-4 mr-2" />
                  Website Settings
                </div>
              </button>
            </li>
            <li className="mr-2">
              <button 
                onClick={() => setActiveTab('localization')}
                className={`inline-block py-2 px-4 font-medium ${
                  activeTab === 'localization'
                    ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <div className="flex items-center">
                  <Globe className="h-4 w-4 mr-2" />
                  Language & Region
                </div>
              </button>
            </li>
            <li className="mr-2">
              <button 
                onClick={() => setActiveTab('theme')}
                className={`inline-block py-2 px-4 font-medium ${
                  activeTab === 'theme'
                    ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <div className="flex items-center">
                  <Palette className="h-4 w-4 mr-2" />
                  Theme & Appearance
                </div>
              </button>
            </li>
            <li className="mr-2">
              <button 
                onClick={() => setActiveTab('landing')}
                className={`inline-block py-2 px-4 font-medium ${
                  activeTab === 'landing'
                    ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <div className="flex items-center">
                  <Image className="h-4 w-4 mr-2" />
                  Landing Page Media
                </div>
              </button>
            </li>
          </ul>
        </div>

        {/* Tab Content */}
        <Card>
          <CardHeader>
            <CardTitle>System Configuration</CardTitle>
            <CardDescription>Manage your system's core settings and appearance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mt-4">
              {activeTab === 'website' && <WebsiteSettings />}
              {activeTab === 'localization' && <LocalizationSettings />}
              {activeTab === 'theme' && <ThemeSettings />}
              {activeTab === 'landing' && <LandingPageSettings />}
            </div>
          </CardContent>
        </Card>
      </main>
      </div>
    )}

    {!permissions.includes('manage_settings') && (
      <div className="flex flex-col items-center justify-center h-[80vh]">
        <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg p-8 max-w-md text-center">
          <div className="text-red-500 mb-4 text-5xl">
            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">Access Restricted</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">You don't have permission to access the system settings. Please contact your administrator for assistance.</p>
          <Link href="/admin/adminDashboard">
            <button className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors">
              Return to Dashboard
            </button>
          </Link>
        </div>
      </div>
    )}
    </div>
  );
}
