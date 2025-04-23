'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { geistSans, geistMono } from "@/lib/fonts";
import "@/app/globals.css";
import { supabase } from '@/lib/supabase';
import AdminSidebar from '@/components/admin/AdminSidebar';
import { Provider } from 'react-redux';
import { store } from '@/lib/redux/store';
import { ThemeProvider } from 'next-themes';

export default function AdminLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [adminData, setAdminData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Determine active page from pathname
  const getActivePage = () => {
    const path = pathname.split('/').pop();
    if (path.includes('dashboard')) return 'dashboard';
    if (path.includes('userManagement')) return 'users';
    if (path.includes('adminManagement')) return 'admins';
    if (path.includes('subscriptionManagement')) return 'subscriptions';
    if (path.includes('supportManagement')) return 'support';
    if (path.includes('adminSettings')) return 'settings';
    return '';
  };
  
  // Skip auth check for login page
  const isLoginPage = pathname.includes('/adminLogin');
  
  // Verify admin session and fetch admin data
  useEffect(() => {
    if (isLoginPage) {
      setLoading(false);
      return;
    }
    
    const checkAdminSession = async () => {
      try {
        setLoading(true);
        
        // Get current session
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !sessionData.session) {
          throw new Error('No active session found');
        }
        
        // Check if user is an admin
        const { data: admin, error: adminError } = await supabase
          .from('admin_user')
          .select('*')
          .eq('email', sessionData.session.user.email)
          .eq('is_active', true)
          .single();
          
        if (adminError || !admin) {
          throw new Error('Unauthorized access');
        }
        
        setAdminData(admin);
      } catch (error) {
        console.error('Admin session check failed:', error);
        // Redirect to admin login
        router.replace('/admin/adminLogin');
      } finally {
        setLoading(false);
      }
    };
    
    checkAdminSession();
  }, [isLoginPage, router, pathname]);
  
  // Handle logout
  const handleLogout = async () => {
    try {
      // Log the logout action
      if (adminData) {
        await supabase.from('admin_activity_log').insert({
          admin_id: adminData.id,
          action: 'logout',
          ip_address: '127.0.0.1',
          user_agent: navigator.userAgent
        });
      }
      
      // Sign out
      await supabase.auth.signOut();
      
      // Redirect to admin login
      router.replace('/admin/adminLogin');
      
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };
  
  // Common providers wrapper for all admin pages
  const AdminProviders = ({ children }) => (
    <Provider store={store}>
      <ThemeProvider attribute="class">
        {children}
      </ThemeProvider>
    </Provider>
  );
  
  // Show loading state
  if (loading && !isLoginPage) {
    return (
      <AdminProviders>
        <div className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center`}>
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-slate-500 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading admin panel...</p>
          </div>
        </div>
      </AdminProviders>
    );
  }
  
  // Don't show sidebar on login page
  if (isLoginPage) {
    return (
      <AdminProviders>
        <div className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
          {children}
        </div>
      </AdminProviders>
    );
  }
  
  return (
    <AdminProviders>
      <div className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-gray-50 dark:bg-gray-900 flex`}>
        <AdminSidebar 
          activePage={getActivePage()} 
          adminData={adminData} 
          onLogout={handleLogout} 
        />
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </div>
    </AdminProviders>
  );
}