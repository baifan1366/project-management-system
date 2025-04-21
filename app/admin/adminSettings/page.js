'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Globe, Palette, Image, Settings } from 'lucide-react';
import WebsiteSettings from '@/components/admin/settings/WebsiteSettings';
import LocalizationSettings from '@/components/admin/settings/LocalizationSettings';
import ThemeSettings from '@/components/admin/settings/ThemeSettings';  
import LandingPageSettings from '@/components/admin/settings/LandingPageSettings';

export default function AdminSettings() {
  const [activeTab, setActiveTab] = useState('website');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
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
  );
}
