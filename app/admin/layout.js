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
import { useDispatch } from 'react-redux';
import { checkAdminSession, logoutAdmin, checkAdminPermissions } from '@/lib/redux/features/adminSlice';

// Redux wrapper for accessing dispatch
function AdminLayoutInner({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [adminData, setAdminData] = useState(null);
  const [loading, setLoading] = useState(true);
  const dispatch = useDispatch();
  
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
    
    const verifySessionPermission = async () => {
      try {
        setLoading(true);
        
        // 使用 Redux 的 checkAdminSession 替代直接调用 supabase
        console.log('Verifying admin session...');
        const adminData = await dispatch(checkAdminSession()).unwrap();
        
        if (!adminData) {
          console.log('No admin data returned from checkAdminSession');
          throw new Error('No active session found or unauthorized access');
        }

        // 检查管理员权限 - 传递角色信息给 checkAdminPermissions
        try {
          const permissions = await dispatch(checkAdminPermissions(adminData.role)).unwrap();
          if (!permissions) {
            console.log('No permissions returned from checkAdminPermissions');
            // 不要抛出错误，允许继续
          }
          
          // Store permissions names in Redux state
          if (Array.isArray(permissions) && permissions.length > 0) {
            // This is handled in the Redux slice now
            console.log(`Loaded ${permissions.length} permissions for role: ${adminData.role}`);
          }
        } catch (permError) {
          console.error('Error checking permissions:', permError);
          // 不要阻止登录，继续执行
        }
        
        console.log('Admin session verified successfully:', adminData.email);
        setAdminData(adminData);
      } catch (error) {
        console.error('Admin session check failed:', error);
        
        // 尝试检查是否是URL中包含 adminLogin
        if (!pathname.includes('/adminLogin')) {
          console.log('Redirecting to login page...');
          // Redirect to admin login
          router.replace('/admin/adminLogin');
        }
      } finally {
        setLoading(false);
      }
    };
    
    verifySessionPermission();
  }, [isLoginPage, router, pathname, dispatch]);
  
  // Handle logout
  const handleLogout = async () => {
    try {
      // Log the logout action
      if (adminData) {
        try {
          await supabase.from('admin_activity_log').insert({
            admin_id: adminData.id,
            action: 'logout',
            // 暂时省略 entity_id 字段，避免 UUID 错误
            ip_address: '127.0.0.1',
            user_agent: navigator.userAgent
          });
        } catch (logError) {
          console.error('Error logging logout activity:', logError);
          // 即使日志失败也继续登出流程
        }
      }
      
      // 使用 Redux 的 logoutAdmin
      await dispatch(logoutAdmin()).unwrap();
      
      // Redirect to admin login
      router.replace('/admin/adminLogin');
      
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };
  
  // Show loading state
  if (loading && !isLoginPage) {
    return (
      <div className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-slate-500 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading admin panel...</p>
        </div>
      </div>
    );
  }
  
  // Don't show sidebar on login page
  if (isLoginPage) {
    return (
      <div className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
      </div>
    );
  }
  
  return (
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
  );
}

// Common providers wrapper for all admin pages
export default function AdminLayout({ children }) {
  return (
    <Provider store={store}>
      <ThemeProvider attribute="class">
        <AdminLayoutInner>{children}</AdminLayoutInner>
      </ThemeProvider>
    </Provider>
  );
}