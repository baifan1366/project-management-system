'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { FaUsers, FaMoneyBillWave, FaTicketAlt, FaCog, FaSignOutAlt, FaChartLine, FaBell } from 'react-icons/fa';
import { useDispatch, useSelector } from 'react-redux';
import { Skeleton } from '@/components/ui/skeleton';
import RecentActivityModal from '@/components/admin/RecentActivityModal';
import { toast } from 'sonner';

export default function AdminDashboard() {
  const router = useRouter();
  const dispatch = useDispatch();
  const [ShowRecentActivityModal, setShowRecentActivityModal] = useState(false);  
  const [adminData, setAdminData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeSubscriptions: 0,
    pendingSupport: 0,
    revenueThisMonth: 0
  });
  const [recentActivity, setRecentActivity] = useState([]);

  const permissions = useSelector((state) => state.admin.permissions);

  // Helper function to safely render any value, including objects
  const safeRender = (value) => {
    if (value === null || value === undefined) {
      return '—';
    }
    
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    
    return String(value);
  };

  // initialize the page
  useEffect(() => {
    const initDashboard = async () => {
      try {
        setLoading(true);

        
        // Fetch dashboard statistics
        await fetchDashboardStats();
        
        // Fetch recent activity
        await fetchRecentActivity();
        
      } catch (error) {
        console.error('Errror in fetching dashboard data:', error);
        // Redirect to admin login
        router.replace(`/admin/adminLogin`);
      } finally {
        setLoading(false);
      }
    };
    
    initDashboard();
  }, [dispatch, router, permissions]);

  // Add function to verify permission access TODO: 模块化这个代码
  const hasPermission = (permissionName) => {
    return permissions.includes(permissionName);
  };

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
        .from('payment')
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

  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Skeleton cards for stats */}
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-16" />
                </div>
                <Skeleton className="h-12 w-12 rounded-full" />
              </div>
              <div className="mt-4">
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
          ))}
        </div>
        
        {/* Skeleton for recent activity */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-8">
          <Skeleton className="h-6 w-48 mb-6" />
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-32 ml-auto" />
              </div>
            ))}
          </div>
        </div>
        
        {/* Skeleton for quick actions */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <Skeleton className="h-6 w-32 mb-6" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {/* Dashboard Content */}
        <main className="p-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {hasPermission('view_users') && (
            <Link href={`/admin/userManagement`}>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6  hover:shadow-lg hover:translate-y-[-4px] hover:bg-gray-50 dark:hover:bg-gray-750 cursor-pointer border border-transparent hover:border-gray-200 dark:hover:border-gray-700">
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
                  <span className="text-sm text-blue-500 dark:text-blue-400">
                    View all users →
                  </span>
                </div>
              </div>
            </Link>
            )}
            
            {hasPermission('view_subscription_plans') && (
            <Link href={`/admin/subscriptionManagement`}>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 transition-all duration-200 hover:shadow-lg hover:translate-y-[-4px] hover:bg-gray-50 dark:hover:bg-gray-750 cursor-pointer border border-transparent hover:border-gray-200 dark:hover:border-gray-700">
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
                  <span className="text-sm text-green-500 dark:text-green-400">
                    Manage subscriptions →
                  </span>
                </div>
              </div>
            </Link>
            )}

            {hasPermission('view_support_tickets') && (
            <Link href={`/admin/supportManagement`}>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 transition-all duration-200 hover:shadow-lg hover:translate-y-[-4px] hover:bg-gray-50 dark:hover:bg-gray-750 cursor-pointer border border-transparent hover:border-gray-200 dark:hover:border-gray-700">
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
                  <span className="text-sm text-yellow-500 dark:text-yellow-400">
                    View support tickets →
                  </span>
                </div>
              </div>
            </Link>
            )}

            {hasPermission('view_analytics') && (
            <Link href={`/admin/analytics`}>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 transition-all duration-200 hover:shadow-lg hover:translate-y-[-4px] hover:bg-gray-50 dark:hover:bg-gray-750 cursor-pointer border border-transparent hover:border-gray-200 dark:hover:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Revenue (This Month)</p>
                    <p className="text-2xl font-bold text-gray-800 dark:text-white mt-1">RM {stats.revenueThisMonth}</p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center text-purple-500 dark:text-purple-300">
                    <FaChartLine />
                  </div>
                </div>
                <div className="mt-4">
                  <span className="text-sm text-purple-500 dark:text-purple-400">
                    View analytics →
                  </span>
                </div>
              </div>
            </Link>
            )}
            
            {!hasPermission('view_users') && 
             !hasPermission('view_subscriptions') && 
             !hasPermission('view_support_tickets') && 
             !hasPermission('view_analytics') && (
              <div className="col-span-full bg-yellow-50 dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-yellow-200 dark:border-yellow-800">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-yellow-100 dark:bg-yellow-900 rounded-full p-3 mr-4">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-600 dark:text-yellow-400">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="8" x2="12" y2="12"></line>
                      <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-yellow-800 dark:text-yellow-300">Limited Dashboard Access</h3>
                    <p className="mt-1 text-yellow-700 dark:text-yellow-400">
                      Your admin role doesn't have permissions to view dashboard statistics. Please contact a super admin for assistance.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/*Admins Recent Activity Preview Modal*/}
          {hasPermission('view_admins') && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-8 transition-all duration-200 hover:shadow-lg hover:translate-y-[-4px] hover:bg-gray-50 dark:hover:bg-gray-750 cursor-pointer border border-transparent hover:border-gray-200 dark:hover:border-gray-700"
            onClick = {() => setShowRecentActivityModal(true)}
          >
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Admin Recent Activity</h3>
            
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
                          {typeof activity.action === 'string' ? activity.action.replace(/_/g, ' ') : '—'}
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
                          {activity.created_at ? formatDate(activity.created_at) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-center py-4">No recent activity found</p>
            )}
          </div>
          )}
          
          {/* Quick Actions */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Quick Actions</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button 
                onClick={() => {
                  if (hasPermission('add_users')) {
                    router.push('/admin/userManagement?action=create');
                  } else {
                    toast.error("You don't have permission to create users");
                  }
                }}
                className="flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
              >
                <span className="text-gray-700 dark:text-gray-300">Create New User</span>
              </button>
              
              <button 
                onClick={() => {
                  if (hasPermission('add_sub_plans')) {
                    router.push('/admin/subscriptionManagement?action=create_plan');
                  } else {
                    toast.error("You don't have permission to create subscription plans");
                  }
                }}
                className="flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
              >
                <span className="text-gray-700 dark:text-gray-300">Add Subscription Plan</span>
              </button>
              
              <button 
                onClick={() => {
                  if (hasPermission('add_promo_codes')) {
                    router.push('/admin/subscriptionManagement?tab=promoCodes&action=create_code');
                  } else {
                    toast.error("You don't have permission to create promo codes");
                  }
                }}
                className="flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
              >
                <span className="text-gray-700 dark:text-gray-300">Create Promo Code</span>
              </button>
            </div>
          </div>


          {/*Recent Activity Modal*/}
          {ShowRecentActivityModal && (
            <RecentActivityModal onClose={() => setShowRecentActivityModal(false)} />
          )}
        </main>
      </div>
    </div>
  );
}