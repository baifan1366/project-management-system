'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { FaUsers, FaMoneyBillWave, FaTicketAlt, FaCog, FaSignOutAlt, FaChartLine, FaBell, FaPlus, FaEdit, FaTrash, FaCheck, FaTimes } from 'react-icons/fa';
import { supabase } from '@/lib/supabase';
import LogoImage from '../../../public/logo.png';
import AdminSidebar from '@/components/admin/AdminSidebar'

export default function AdminSubscriptions() {
  const router = useRouter();
  const params = useParams();
  const locale = params.locale || 'en';
  
  const [loading, setLoading] = useState(true);
  const [adminData, setAdminData] = useState(null);
  
  // Sample subscription plans data (static for now)
  const subscriptionPlans = [
    {
      id: 1,
      name: 'Free',
      type: 'FREE',
      price: 0,
      billing_interval: 'MONTHLY',
      description: 'Basic features for individuals',
      features: {
        projects: 3,
        members: 1,
        storage: '500MB',
        features: ['Basic task management', 'Personal dashboard', 'Email support']
      },
      max_members: 1,
      max_projects: 3,
      storage_limit: 524288000, // 500MB in bytes
      is_active: true,
      active_users: 1250
    },
    {
      id: 2,
      name: 'Pro',
      type: 'PRO',
      price: 9.99,
      billing_interval: 'MONTHLY',
      description: 'Advanced features for professionals',
      features: {
        projects: 10,
        members: 5,
        storage: '5GB',
        features: ['Advanced task management', 'Team collaboration', 'Priority support', 'Custom fields', 'Advanced reporting']
      },
      max_members: 5,
      max_projects: 10,
      storage_limit: 5368709120, // 5GB in bytes
      is_active: true,
      active_users: 850
    },
    {
      id: 3,
      name: 'Pro',
      type: 'PRO',
      price: 99.99,
      billing_interval: 'YEARLY',
      description: 'Advanced features for professionals (annual billing)',
      features: {
        projects: 10,
        members: 5,
        storage: '5GB',
        features: ['Advanced task management', 'Team collaboration', 'Priority support', 'Custom fields', 'Advanced reporting']
      },
      max_members: 5,
      max_projects: 10,
      storage_limit: 5368709120, // 5GB in bytes
      is_active: true,
      active_users: 450
    },
    {
      id: 4,
      name: 'Enterprise',
      type: 'ENTERPRISE',
      price: 29.99,
      billing_interval: 'MONTHLY',
      description: 'Complete solution for teams and organizations',
      features: {
        projects: 'Unlimited',
        members: 'Unlimited',
        storage: '50GB',
        features: ['All Pro features', 'Unlimited projects', 'Unlimited team members', 'Dedicated support', 'Advanced security', 'Custom integrations']
      },
      max_members: -1, // Unlimited
      max_projects: -1, // Unlimited
      storage_limit: 53687091200, // 50GB in bytes
      is_active: true,
      active_users: 320
    },
    {
      id: 5,
      name: 'Enterprise',
      type: 'ENTERPRISE',
      price: 299.99,
      billing_interval: 'YEARLY',
      description: 'Complete solution for teams and organizations (annual billing)',
      features: {
        projects: 'Unlimited',
        members: 'Unlimited',
        storage: '50GB',
        features: ['All Pro features', 'Unlimited projects', 'Unlimited team members', 'Dedicated support', 'Advanced security', 'Custom integrations']
      },
      max_members: -1, // Unlimited
      max_projects: -1, // Unlimited
      storage_limit: 53687091200, // 50GB in bytes
      is_active: true,
      active_users: 180
    },
    {
      id: 6,
      name: 'Legacy Pro',
      type: 'PRO',
      price: 7.99,
      billing_interval: 'MONTHLY',
      description: 'Previous Pro plan (deprecated)',
      features: {
        projects: 8,
        members: 3,
        storage: '3GB',
        features: ['Advanced task management', 'Team collaboration', 'Email support']
      },
      max_members: 3,
      max_projects: 8,
      storage_limit: 3221225472, // 3GB in bytes
      is_active: false,
      active_users: 75
    }
  ];
  
  // Sample promo codes data (static for now)
  const promoCodes = [
    {
      id: 1,
      code: 'WELCOME25',
      description: 'Welcome discount for new users',
      discount_type: 'PERCENTAGE',
      discount_value: 25,
      max_uses: 1000,
      current_uses: 342,
      start_date: '2023-01-01T00:00:00Z',
      end_date: '2023-12-31T23:59:59Z',
      is_active: true
    },
    {
      id: 2,
      code: 'SUMMER2023',
      description: 'Summer promotion',
      discount_type: 'PERCENTAGE',
      discount_value: 15,
      max_uses: 500,
      current_uses: 213,
      start_date: '2023-06-01T00:00:00Z',
      end_date: '2023-08-31T23:59:59Z',
      is_active: true
    },
    {
      id: 3,
      code: 'FLAT10',
      description: 'Flat $10 off any plan',
      discount_type: 'FIXED_AMOUNT',
      discount_value: 10,
      max_uses: 200,
      current_uses: 87,
      start_date: '2023-03-15T00:00:00Z',
      end_date: '2023-12-15T23:59:59Z',
      is_active: true
    },
    {
      id: 4,
      code: 'EXPIRED20',
      description: 'Expired promotion',
      discount_type: 'PERCENTAGE',
      discount_value: 20,
      max_uses: 300,
      current_uses: 245,
      start_date: '2023-01-01T00:00:00Z',
      end_date: '2023-02-28T23:59:59Z',
      is_active: false
    }
  ];
  
  // Verify admin session
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
        
      } catch (error) {
        console.error('Admin session check failed:', error);
        // Redirect to admin login
        router.replace(`/${locale}/admin/login`);
      } finally {
        setLoading(false);
      }
    };
    
    checkAdminSession();
  }, []);
  
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
      router.replace(`/${locale}/admin/login`);
      
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };
  
  // Format currency for display
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };
  
  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  };
  
  // Format storage size for display
  const formatStorage = (bytes) => {
    if (bytes === -1) return 'Unlimited';
    
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Byte';
    const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
    return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading subscription management...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
      {/* Sidebar */}
     <AdminSidebar activePage="subscriptions" adminData={adminData} onLogout={handleLogout} />
      
      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 shadow-sm">
          <div className="px-6 py-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Subscription Management</h2>
            
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
        
        {/* Subscription Management Content */}
        <main className="p-6">
          {/* Tabs */}
          <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
            <ul className="flex flex-wrap -mb-px">
              <li className="mr-2">
                <button className="inline-block py-2 px-4 text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400 font-medium">
                  Subscription Plans
                </button>
              </li>
              <li className="mr-2">
                <button className="inline-block py-2 px-4 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 font-medium">
                  Promo Codes
                </button>
              </li>
              <li className="mr-2">
                <button className="inline-block py-2 px-4 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 font-medium">
                  User Subscriptions
                </button>
              </li>
              <li className="mr-2">
                <button className="inline-block py-2 px-4 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 font-medium">
                  Payment History
                </button>
              </li>
            </ul>
          </div>
          
          {/* Action Buttons */}
          <div className="mb-6 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Subscription Plans</h3>
            
            <div className="flex space-x-2">
              <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white rounded-lg flex items-center">
                <FaPlus className="mr-2" />
                Add New Plan
              </button>
            </div>
          </div>
          
          {/* Subscription Plans Table */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden mb-8">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Plan Name
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Type
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Price
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Billing
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Limits
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Active Users
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {subscriptionPlans.map((plan) => (
                    <tr key={plan.id} className={!plan.is_active ? 'bg-gray-50 dark:bg-gray-900/50' : ''}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{plan.name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{plan.description}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                          ${plan.type === 'FREE' ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' : 
                            plan.type === 'PRO' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' : 
                            'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'}`}>
                          {plan.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {formatCurrency(plan.price)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {plan.billing_interval === 'MONTHLY' ? 'Monthly' : 'Yearly'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          <div>Projects: {plan.max_projects === -1 ? 'Unlimited' : plan.max_projects}</div>
                          <div>Members: {plan.max_members === -1 ? 'Unlimited' : plan.max_members}</div>
                          <div>Storage: {formatStorage(plan.storage_limit)}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {plan.active_users.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {plan.is_active ? (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                            Active
                          </span>
                        ) : (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <button className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300">
                            <FaEdit />
                          </button>
                          {plan.is_active ? (
                            <button className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300">
                              <FaTimes />
                            </button>
                          ) : (
                            <button className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300">
                              <FaCheck />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* Promo Codes Section (Hidden by default) */}
          <div className="hidden">
            <div className="mb-6 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Promo Codes</h3>
              
              <div className="flex space-x-2">
                <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white rounded-lg flex items-center">
                  <FaPlus className="mr-2" />
                  Add New Code
                </button>
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Code
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Description
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Discount
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Usage
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Valid Period
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Status
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {promoCodes.map((code) => (
                      <tr key={code.id} className={!code.is_active ? 'bg-gray-50 dark:bg-gray-900/50' : ''}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-mono font-medium text-gray-900 dark:text-white">{code.code}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {code.description}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {code.discount_type === 'PERCENTAGE' ? 
                            `${code.discount_value}%` : 
                            formatCurrency(code.discount_value)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {code.current_uses} / {code.max_uses || '∞'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {formatDate(code.start_date)} - {formatDate(code.end_date)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {code.is_active ? (
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                              Active
                            </span>
                          ) : (
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">
                              Inactive
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end space-x-2">
                            <button className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300">
                              <FaEdit />
                            </button>
                            {code.is_active ? (
                              <button className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300">
                                <FaTimes />
                              </button>
                            ) : (
                              <button className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300">
                                <FaCheck />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
