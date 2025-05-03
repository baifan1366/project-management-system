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
import AccessRestrictedModal from '@/components/admin/accessRestrictedModal';

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

    // Add function to verify permission access TODO: 模块化这个代码
    const hasPermission = (permissionName) => {
      return permissions.includes(permissionName);
    };

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
        ) : (
          <div className="min-h-screen flex items-center justify-center">
            <AccessRestrictedModal />
          </div>
        )}
      </div>
    </div>
  );
}
