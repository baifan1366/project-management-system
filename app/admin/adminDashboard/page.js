'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { FaUsers, FaMoneyBillWave, FaTicketAlt, FaCog, FaSignOutAlt, FaChartLine, FaBell } from 'react-icons/fa';


export default function AdminDashboard() {
  // Verify admin session and fetch admin data
  useEffect(() => {
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
        
        // Fetch dashboard statistics
        await fetchDashboardStats();
        
        // Fetch recent activity
        await fetchRecentActivity();
        
      } catch (error) {
        console.error('Admin session check failed:', error);
        // Redirect to admin login
        router.replace(`/admin/adminLogin`);
      } finally {
        setLoading(false);
      }
    };
    
    checkAdminSession();
  }, []);

  const router = useRouter();
  const params = useParams();
  const locale = params.locale || 'en';
  
  const [adminData, setAdminData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeSubscriptions: 0,
    pendingSupport: 0,
    revenueThisMonth: 0
  });
  const [recentActivity, setRecentActivity] = useState([]);
  
  // Fetch dashboard statistics
  const fetchDashboardStats = async () => {
    try {
      // Get total users count
      const { count: userCount, error: userError } = await supabase
        .from('user')
        .select('id', { count: 'exact', head: true });
      
      // Get active subscriptions count
      const { count: subscriptionCount, error: subscriptionError } = await supabase
        .from('user_subscription_plan')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'ACTIVE');
      
      // Get pending support tickets count
      const { count: supportCount, error: supportError } = await supabase
        .from('contact')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'NEW');
      
      // Calculate revenue this month (simplified example)
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      
      const { data: payments, error: paymentsError } = await supabase
        .from('subscription_payment')
        .select('amount')
        .eq('status', 'COMPLETED')
        .gte('created_at', startOfMonth.toISOString());
      
      const revenue = payments?.reduce((sum, payment) => sum + parseFloat(payment.amount), 0) || 0;
      
      setStats({
        totalUsers: userCount || 0,
        activeSubscriptions: subscriptionCount || 0,
        pendingSupport: supportCount || 0,
        revenueThisMonth: revenue
      });
      
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    }
  };
  
  // Fetch recent admin activity
  const fetchRecentActivity = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_activity_log')
        .select(`
          id,
          action,
          entity_type,
          entity_id,
          created_at,
          admin_user:admin_id (username, full_name)
        `)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (error) throw error;
      
      setRecentActivity(data || []);
      
    } catch (error) {
      console.error('Error fetching recent activity:', error);
    }
  };
  
  // Handle admin logout
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
      router.replace(`/admin/adminLogin`);
      
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };
  
  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };
  
  // Format currency for display
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 shadow-sm">
          <div className="px-6 py-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Dashboard Overview</h2>
            
            <div className="flex items-center">
              <button className="p-2 mr-4 text-gray-500 dark:text-gray-400 hover:text-indigo-500 dark:hover:text-indigo-400">
                <FaBell />
              </button>
              
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white font-semibold mr-2">
                  {adminData?.username?.charAt(0).toUpperCase() || 'A'}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{adminData?.full_name || adminData?.username}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{adminData?.role}</p>
                </div>
              </div>
            </div>
          </div>
        </header>
        
        {/* Dashboard Content */}
        <main className="p-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Users</p>
                  <p className="text-2xl font-bold text-gray-800 dark:text-white mt-1">{stats.totalUsers}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-500 dark:text-blue-300">
                  <FaUsers />
                </div>
              </div>
              <div className="mt-4">
                <Link href={`/admin/userManagement`} className="text-sm text-blue-500 dark:text-blue-400 hover:underline">
                  View all users →
                </Link>
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Active Subscriptions</p>
                  <p className="text-2xl font-bold text-gray-800 dark:text-white mt-1">{stats.activeSubscriptions}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center text-green-500 dark:text-green-300">
                  <FaMoneyBillWave />
                </div>
              </div>
              <div className="mt-4">
                <Link href={`/admin/subscriptionManagement`} className="text-sm text-green-500 dark:text-green-400 hover:underline">
                  Manage subscriptions →
                </Link>
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Pending Support</p>
                  <p className="text-2xl font-bold text-gray-800 dark:text-white mt-1">{stats.pendingSupport}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-yellow-100 dark:bg-yellow-900 flex items-center justify-center text-yellow-500 dark:text-yellow-300">
                  <FaTicketAlt />
                </div>
              </div>
              <div className="mt-4">
                <Link href={`/admin/supportManagement`} className="text-sm text-yellow-500 dark:text-yellow-400 hover:underline">
                  View support tickets →
                </Link>
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Revenue (This Month)</p>
                  <p className="text-2xl font-bold text-gray-800 dark:text-white mt-1">{formatCurrency(stats.revenueThisMonth)}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center text-purple-500 dark:text-purple-300">
                  <FaChartLine />
                </div>
              </div>
              <div className="mt-4">
                <Link href={`/admin/adminAnalytics`} className="text-sm text-purple-500 dark:text-purple-400 hover:underline">
                  View analytics →
                </Link>
              </div>
            </div>
          </div>
          
          {/* Recent Activity */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Recent Activity</h3>
            
            {recentActivity.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead>
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Admin</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Action</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Entity</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {recentActivity.map((activity) => (
                      <tr key={activity.id}>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                          {activity.admin_user?.full_name || activity.admin_user?.username || 'Unknown'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300 capitalize">
                          {activity.action.replace(/_/g, ' ')}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                          {activity.entity_type ? (
                            <span className="capitalize">
                              {activity.entity_type} {activity.entity_id ? `#${activity.entity_id}` : ''}
                            </span>
                          ) : (
                            <span className="text-gray-500 dark:text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                          {formatDate(activity.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-center py-4">No recent activity found</p>
            )}
            
            <div className="mt-4 text-right">
              <Link href={`/admin/adminActivity`} className="text-sm text-indigo-500 dark:text-indigo-400 hover:underline">
                View all activity →
              </Link>
            </div>
          </div>
          
          {/* Quick Actions */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Quick Actions</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link 
                href={`/${locale}/admin/users/create`}
                className="flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
              >
                <span className="text-gray-700 dark:text-gray-300">Create New User</span>
              </Link>
              
              <Link 
                href={`/${locale}/admin/plans/create`}
                className="flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
              >
                <span className="text-gray-700 dark:text-gray-300">Add Subscription Plan</span>
              </Link>
              
              <Link 
                href={`/${locale}/admin/promo-codes/create`}
                className="flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
              >
                <span className="text-gray-700 dark:text-gray-300">Create Promo Code</span>
              </Link>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}