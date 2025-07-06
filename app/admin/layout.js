'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { geistSans, geistMono } from "@/lib/fonts";
import "@/app/globals.css";
import { supabase } from '@/lib/supabase';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';
import { Provider } from 'react-redux';
import { store } from '@/lib/redux/store';
import { ThemeProvider } from 'next-themes';
import { useDispatch } from 'react-redux';
import { checkAdminSession, logoutAdmin, checkAdminPermissions, updateAdminProfile } from '@/lib/redux/features/adminSlice';
import { Toaster } from 'sonner';

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
    if (path === 'adminDashboard') return 'dashboard';
    if (path === 'userManagement') return 'users';
    if (path === 'adminManagement') return 'admins';
    if (path === 'subscriptionManagement') return 'subscriptions';
    if (path === 'supportManagement') return 'support';
    if (path === 'adminSettings') return 'settings';
    if (path === 'analytics') return 'analytics';
    return '';
  };
  
  // Get current page title
  const getPageTitle = () => {
    const path = pathname.split('/').pop();
    if (path.includes('dashboard')) return 'Dashboard Overview';
    if (path.includes('userManagement')) return 'User Management';
    if (path.includes('adminManagement')) return 'Admin Management';
    if (path.includes('subscriptionManagement')) return 'Subscription Management';
    if (path.includes('supportManagement')) return 'Support Tickets';
    if (path.includes('adminSettings')) return 'System Settings';
    if (path.includes('analytics')) return 'Analytics Dashboard';
    return 'Admin Panel';
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
        
        const adminData = await dispatch(checkAdminSession()).unwrap();
        
        if (!adminData) {
          
          throw new Error('No active session found or unauthorized access');
        }

        // 检查管理员权限 - 传递角色信息给 checkAdminPermissions
        try {
          const permissions = await dispatch(checkAdminPermissions(adminData.role)).unwrap();
          if (!permissions) {
            
            // 不要抛出错误，允许继续
          }
          
          // Store permissions names in Redux state
          if (Array.isArray(permissions) && permissions.length > 0) {
            // This is handled in the Redux slice now
            
          }
        } catch (permError) {
          console.error('Error checking permissions:', permError);
          // 不要阻止登录，继续执行
        }
        
        
        setAdminData(adminData);
      } catch (error) {
        console.error('Admin session check failed:', error);
        
        // 尝试检查是否是URL中包含 adminLogin
        if (!pathname.includes('/adminLogin')) {
          
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
  
  // Handle profile updates
  const handleProfileUpdate = async (updatedData) => {
    try {
      // Update the admin data in the component state
      setAdminData(updatedData);
      
      // Dispatch the updateAdminProfile action to update Redux state
      await dispatch(updateAdminProfile(updatedData));
      
    } catch (error) {
      console.error('Error updating admin profile in Redux:', error);
    }
  };
  
  // Don't show sidebar on login page
  if (isLoginPage) {
    return (
      <div className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
      </div>
    );
  }
  
  return (
    <div className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
      <AdminSidebar 
        activePage={getActivePage()} 
        adminData={adminData} 
        onLogout={handleLogout} 
      />
      <div className="ml-64 flex flex-col min-h-screen admin-content">
        <AdminHeader 
          title={getPageTitle()}
          adminData={adminData}
          onAdminDataUpdate={handleProfileUpdate}
        />
        <main className="flex-1 overflow-y-auto p-4">{children}</main>
      </div>
      <Toaster position="top-right" richColors />
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