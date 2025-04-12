'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { FaUsers, FaMoneyBillWave, FaTicketAlt, FaCog, FaSignOutAlt, FaChartLine, FaBell, FaPlus, FaEdit, FaTrash, FaCheck, FaToggleOn, FaToggleOff, FaTimes } from 'react-icons/fa';
import { supabase } from '@/lib/supabase';
import { clsx } from 'clsx';

export default function AdminSubscriptions() {
  const router = useRouter();
  const params = useParams();
  
  const [subscriptionPlans, setSubscriptionPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adminData, setAdminData] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [planName, setPlanName] = useState('');
  const [planType, setPlanType] = useState('');
  const [planPrice, setPrice] = useState('');
  const [planBilling, setPlanBilling] = useState('');
  const [description, setDescription] = useState('');
  const [planFeatures, setPlanFeatures] = useState('');
  const [planActiveUsers, setPlanActiveUsers] = useState('');
  const [planMaxMembers, setPlanMaxMembers] = useState('');
  const [planMaxProjects, setPlanMaxProjects] = useState('');
  const [planMaxStorage, setPlanMaxStorage] = useState('');
  const [planIsActive, setPlanIsActive] = useState('');
  const [currentModalPage, setCurrentModalPage] = useState(1);
  const [features, setFeatures] = useState([]);
  const [newFeature, setNewFeature] = useState('');

  // Move fetchSubscriptionPlans outside useEffect and make it a const function
  const fetchSubscriptionPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('subscription_plan')
        .select('*')
        .order('id', { ascending: true });

      if(error){
        console.error('Error fetching subscription plans:', error);
      } else {
        console.log('Subscription plans fetched successfully:', data);
        setSubscriptionPlans(data);
      }    
    } catch (error) {
      console.error('Error in fetchSubscriptionPlans:', error);
    }
  };

  // Function to parse features from different formats
  const parseFeatures = (featuresData) => {
    try {
      let featuresArray = [];
      
      if (!featuresData) {
        return [];
      }
      
      if (Array.isArray(featuresData)) {
        return featuresData;
      }
      
      if (typeof featuresData === 'object' && featuresData !== null) {
        featuresArray = featuresData.features || [];
      }
      
      return featuresArray;
    } catch (error) {
      console.error('Error parsing features:', error);
      return [];
    }
  };

  // Use it in useEffect
  useEffect(() => {
    fetchSubscriptionPlans();
  }, []);

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
        router.replace(`/admin/adminLogin`);
      } finally {
        setLoading(false);
      }
    };
    
    checkAdminSession();
  }, []);

  // Open modal
  const openModal = (type, plan = null) => {
    setModalType(type);
    setSelectedPlan(plan);
    setCurrentModalPage(1);
    
    if (type === 'edit' && plan) {
      setPlanName(plan.name || '');
      setPlanType(plan.type || '');
      setPrice(plan.price || 0);
      setPlanBilling(plan.billing_interval || '');
      setDescription(plan.description || '');
      
      // Use the parseFeatures function
      const featuresArray = parseFeatures(plan.features);
      setFeatures(featuresArray);

      setPlanActiveUsers(plan.active_users || '');
      setPlanMaxMembers(plan.max_members || '');
      setPlanMaxProjects(plan.max_projects || '');
      setPlanMaxStorage(plan.storage_limit || '');
      setPlanIsActive(plan.is_active ? 'true' : 'false');
    } else{
      // Reset form values for other modal types
      setPlanName('');
      setPlanType('');
      setPrice(0);
      setPlanBilling('');
      setDescription('');
      setPlanFeatures('');
      setPlanActiveUsers('');
      setPlanMaxMembers('');
      setPlanMaxProjects('');
      setPlanMaxStorage('');
      setPlanIsActive('');
    }
    
    setIsModalOpen(true);
  };

  // Close modal
  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedPlan(null);
  };

  // Add new subscription plan
  // const addSubscriptionPlan = async (planData) => {
  //   try {
  //     setLoading(true);
      
  //     const { data, error } = await supabase
  //       .from('subscription_plan')
  //       .insert([planData]);
        
  //     if (error) {
  //       console.error('Error adding subscription plan:', error);
  //       // You might want to show an error message to the user here
  //       return;
  //     }
      
  //     console.log('Subscription plan added successfully:', data);
      
  //     // Refresh the subscription plans list
  //     await fetchSubscriptionPlans();
      
  //   } catch (error) {
  //     console.error('Error in addSubscriptionPlan:', error);
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  // Update subscription plan
  const updateSubscriptionPlan = async (planId, planData) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('subscription_plan')
        .update(planData)
        .eq('id', planId);
        
      if (error) {
        console.error('Error updating subscription plan:', error);
        return;
      }
      
      console.log('Subscription plan updated successfully:', data);
      
      // Now fetchSubscriptionPlans is accessible here
      await fetchSubscriptionPlans();
      
    } catch (error) {
      console.error('Error in updateSubscriptionPlan:', error);
    } finally {
      setLoading(false);
    }
  };

  // deactivate or activate subscription plan
  const toggleActive = async (planId, isActive) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('subscription_plan')
        .update({ is_active: isActive })
        .eq('id', planId);

      if (error) {
        console.error('Error in toggleActive:', error);
      }
      
      await fetchSubscriptionPlans();
    } catch (error) {
      console.error('Error in toggleActive:', error);
    } finally {
      setLoading(false);
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
  
  // Add these helper functions for feature management
  const handleAddFeature = () => {
    if (newFeature.trim()) {
      setFeatures([...features, newFeature.trim()]);
      setNewFeature(''); // Reset input
    }
  };

  const handleRemoveFeature = (index) => {
    setFeatures(features.filter((_, i) => i !== index));
  };

  const handleFeatureChange = (index, field, value) => {
    const updatedFeatures = [...features];
    updatedFeatures[index] = {
      ...updatedFeatures[index],
      [field]: value
    };
    setFeatures(updatedFeatures);
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
            
            {/* <div className="flex space-x-2">
              <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white rounded-lg flex items-center">
                <FaPlus className="mr-2" />
                Add New Plan
              </button>
            </div> */}
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
                      Features
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

                      {/* features */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {parseFeatures(plan.features).map((feature) => (
                            <div key={feature}>{feature}</div>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          <div>Projects: {plan.max_projects === -1 ? 'Unlimited' : plan.max_projects}</div>
                          <div>Members: {plan.max_members === -1 ? 'Unlimited' : plan.max_members}</div>
                          <div>Storage: {formatStorage(plan.storage_limit)}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {plan.active_users ? plan.active_users.toLocaleString() : '0'}
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
                        <div className="flex justify-end space-x-3">
                          <button className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300" 
                            onClick={() => openModal('edit', plan)}
                          >
                            <FaEdit />
                          </button>
                          {/* toggle active button */}
                          <button
                            onClick={() => toggleActive(plan.id, !plan.is_active)}
                            className={clsx(
                              'text-2xl transition-colors duration-200',
                              plan.is_active 
                                ? 'text-indigo-600 hover:text-indigo-700'
                                : 'text-gray-400 hover:text-gray-500'
                            )}
                          >
                            {plan.is_active ? <FaToggleOn /> : <FaToggleOff />}
                          </button>
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

      {/*subscription add modal*/}
      {isModalOpen && modalType === 'add' && (
        <div className='fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50'>
          <div className='bg-white dark:bg-gray-800 rounded-lg shadow-lg w-full max-w-md p-6'>
            <div className='flex justify-between items-center mb-4'>
              <h2 className='text-xl font-semibold text-gray-800 dark:text-white'>Add New Subscription Plan</h2>
              <button
                onClick={closeModal}
                className='text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              >
                &times;
              </button>
            </div>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              const planData = {
                name: planName,
                type: planType,
                price: parseFloat(planPrice),
                billing_interval: planBilling,
                description: description,
                features: { features: features },
                max_members: parseInt(planMaxMembers),
                max_projects: parseInt(planMaxProjects),
                storage_limit: parseInt(planMaxStorage),
                is_active: planIsActive === 'true',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              };
              
              addSubscriptionPlan(planData);
              closeModal();
            }}>
              <div className='space-y-4'>
                <div>
                  <label htmlFor='add-name' className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                    Plan Name
                  </label>
                  <input
                    type='text'
                    id='add-name'
                    name='name'
                    required
                    value={planName}
                    className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm shadow-sm
                      placeholder-gray-400 dark:placeholder-gray-500 dark:bg-gray-700 dark:text-white
                      focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                    placeholder='Enter plan name'
                    onChange={(e) => setPlanName(e.target.value)}
                  />
                </div>
                
                <div>
                  <label htmlFor='add-type' className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                    Plan Type
                  </label>
                  <select
                    id='add-type'
                    name='type'
                    required
                    value={planType}
                    className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm shadow-sm
                      placeholder-gray-400 dark:placeholder-gray-500 dark:bg-gray-700 dark:text-white
                      focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                    onChange={(e) => setPlanType(e.target.value)}
                  >
                    <option value=''>Select plan type</option>
                    <option value='FREE'>Free</option>
                    <option value='PRO'>Pro</option>
                    <option value='ENTERPRISE'>Enterprise</option>
                  </select>
                </div>
                
                <div>
                  <label htmlFor='add-price' className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                    Price
                  </label>
                  <input
                    type='number'
                    id='add-price'
                    name='price'
                    required
                    min='0'
                    step='0.01'
                    value={planPrice}
                    className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm shadow-sm
                      placeholder-gray-400 dark:placeholder-gray-500 dark:bg-gray-700 dark:text-white
                      focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                    placeholder='Enter price'
                    onChange={(e) => setPrice(e.target.value)}
                  />
                </div>
                
                <div>
                  <label htmlFor='add-billing' className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                    Billing Interval
                  </label>
                  <select
                    id='add-billing'
                    name='billing_interval'
                    required
                    value={planBilling}
                    className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm shadow-sm
                      placeholder-gray-400 dark:placeholder-gray-500 dark:bg-gray-700 dark:text-white
                      focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                    onChange={(e) => setPlanBilling(e.target.value)}
                  >
                    <option value=''>Select billing interval</option>
                    <option value='MONTHLY'>Monthly</option>
                    <option value='YEARLY'>Yearly</option>
                  </select>
                </div>
                
                <div>
                  <label htmlFor='add-description' className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                    Description
                  </label>
                  <textarea
                    id='add-description'
                    name='description'
                    rows='3'
                    value={description}
                    className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm shadow-sm
                      placeholder-gray-400 dark:placeholder-gray-500 dark:bg-gray-700 dark:text-white
                      focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                    placeholder='Enter plan description'
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
                
                <div>
                  <label htmlFor='add-features' className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                    Features for Display
                  </label>
                  <textarea
                    id='add-features'
                    name='features'
                    rows='3'
                    value={planFeatures}
                    className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm shadow-sm
                      placeholder-gray-400 dark:placeholder-gray-500 dark:bg-gray-700 dark:text-white
                      focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                    placeholder='Enter features as JSON'
                    onChange={(e) => setPlanFeatures(e.target.value)}
                  />
                </div>
                
                <div>
                  <label htmlFor='add-max-members' className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                    Max Members
                  </label>
                  <input
                    type='number'
                    id='add-max-members'
                    name='max_members'
                    required
                    min='-1'
                    value={planMaxMembers}
                    className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm shadow-sm
                      placeholder-gray-400 dark:placeholder-gray-500 dark:bg-gray-700 dark:text-white
                      focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                    placeholder='Enter max members (-1 for unlimited)'
                    onChange={(e) => setPlanMaxMembers(e.target.value)}
                  />
                </div>
                
                <div>
                  <label htmlFor='add-max-projects' className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                    Max Projects
                  </label>
                  <input
                    type='number'
                    id='add-max-projects'
                    name='max_projects'
                    required
                    min='-1'
                    value={planMaxProjects}
                    className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm shadow-sm
                      placeholder-gray-400 dark:placeholder-gray-500 dark:bg-gray-700 dark:text-white
                      focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                    placeholder='Enter max projects (-1 for unlimited)'
                    onChange={(e) => setPlanMaxProjects(e.target.value)}
                  />
                </div>
                
                <div>
                  <label htmlFor='add-storage-limit' className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                    Storage Limit (bytes)
                  </label>
                  <input
                    type='number'
                    id='add-storage-limit'
                    name='storage_limit'
                    required
                    min='0'
                    value={planMaxStorage}
                    className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm shadow-sm
                      placeholder-gray-400 dark:placeholder-gray-500 dark:bg-gray-700 dark:text-white
                      focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                    placeholder='Enter storage limit in bytes'
                    onChange={(e) => setPlanMaxStorage(e.target.value)}
                  />
                </div>
                
                <div>
                  <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                    Status
                  </label>
                  <div className='flex items-center space-x-4'>
                    <label className='inline-flex items-center'>
                      <input
                        type='radio'
                        name='is_active'
                        value='true'
                        checked={planIsActive === 'true'}
                        className='h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500'
                        onChange={() => setPlanIsActive('true')}
                      />
                      <span className='ml-2 text-sm text-gray-700 dark:text-gray-300'>Active</span>
                    </label>
                    
                    <label className='inline-flex items-center'>
                      <input
                        type='radio'
                        name='is_active'
                        value='false'
                        checked={planIsActive === 'false'}
                        className='h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500'
                        onChange={() => setPlanIsActive('false')}
                      />
                      <span className='ml-2 text-sm text-gray-700 dark:text-gray-300'>Inactive</span>
                    </label>
                  </div>
                </div>
              </div>
              
              <div className='mt-6 flex justify-end space-x-3'>
                <button
                  type='button'
                  onClick={closeModal}
                  className='px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium
                    text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600'
                >
                  Cancel
                </button>
                
                <button
                  type='submit'
                  className='px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium
                    text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2
                    focus:ring-offset-2 focus:ring-indigo-500'
                >
                  Add Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/*subscription edit modal*/}
      {isModalOpen && modalType === 'edit' && selectedPlan && (
        <div className='fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50'>
          <div className='bg-white dark:bg-gray-800 rounded-lg shadow-lg w-full max-w-md p-6 max-h-[90vh] overflow-y-auto'>
            <div className='flex justify-between items-center mb-4'>
              <h2 className='text-xl font-semibold text-gray-800 dark:text-white'>
                Edit Subscription Plan {currentModalPage === 1 ? '- Basic Info' : '- Technical Details'}
              </h2>
              <button
                onClick={closeModal}
                className='text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              >
                &times;
              </button>
            </div>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              const planData = {
                name: planName,
                type: planType,
                price: parseFloat(planPrice),
                billing_interval: planBilling,
                description: description,
                features: { features: features },
                max_members: parseInt(planMaxMembers),
                max_projects: parseInt(planMaxProjects),
                storage_limit: parseInt(planMaxStorage),
                is_active: planIsActive === 'true',
                updated_at: new Date().toISOString()
              };
              
              updateSubscriptionPlan(selectedPlan.id, planData);
              closeModal();
            }}>
              {currentModalPage === 1 ? (
                // Page 1: Basic Information
                <div className='space-y-4'>
                  <div>
                    <label htmlFor='edit-name' className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                      Plan Name
                    </label>
                    <input
                      type='text'
                      id='edit-name'
                      name='name'
                      required
                      value={planName}
                      className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm shadow-sm
                        placeholder-gray-400 dark:placeholder-gray-500 dark:bg-gray-700 dark:text-white
                        focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                      placeholder='Enter plan name'
                      onChange={(e) => setPlanName(e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <label htmlFor='edit-type' className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                      Plan Type
                    </label>
                    <select
                      id='edit-type'
                      name='type'
                      required
                      value={planType}
                      className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm shadow-sm
                        placeholder-gray-400 dark:placeholder-gray-500 dark:bg-gray-700 dark:text-white
                        focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                      onChange={(e) => setPlanType(e.target.value)}
                    >
                      <option value=''>Select plan type</option>
                      <option value='FREE'>Free</option>
                      <option value='PRO'>Pro</option>
                      <option value='ENTERPRISE'>Enterprise</option>
                    </select>
                  </div>
                  
                  <div>
                    <label htmlFor='edit-price' className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                      Price
                    </label>
                    <input
                      type='number'
                      id='edit-price'
                      name='price'
                      required
                      min='0'
                      step='0.01'
                      value={planPrice}
                      className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm shadow-sm
                        placeholder-gray-400 dark:placeholder-gray-500 dark:bg-gray-700 dark:text-white
                        focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                      placeholder='Enter price'
                      onChange={(e) => setPrice(e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <label htmlFor='edit-billing' className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                      Billing Interval
                    </label>
                    <select
                      id='edit-billing'
                      name='billing_interval'
                      required
                      value={planBilling}
                      className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm shadow-sm
                        placeholder-gray-400 dark:placeholder-gray-500 dark:bg-gray-700 dark:text-white
                        focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                      onChange={(e) => setPlanBilling(e.target.value)}
                    >
                      <option value=''>Select billing interval</option>
                      <option value='MONTHLY'>Monthly</option>
                      <option value='YEARLY'>Yearly</option>
                    </select>
                  </div>
                  
                  <div>
                    <label htmlFor='edit-description' className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                      Description
                    </label>
                    <textarea
                      id='edit-description'
                      name='description'
                      rows='3'
                      value={description}
                      className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm shadow-sm
                        placeholder-gray-400 dark:placeholder-gray-500 dark:bg-gray-700 dark:text-white
                        focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                      placeholder='Enter plan description'
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </div>
                </div>
              ) : (
                // Page 2: Technical Details
                <div className='space-y-4'>
                  <div>
                    <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                      Features for Display
                    </label>
                    
                    {/* Features List */}
                    <div className='space-y-2 mb-2 border border-gray-300 dark:border-gray-500 rounded-md p-4'>
                      {features.map((feature, index) => (
                        <div key={index} className='flex items-center justify-between space-x-2 p-2 border border-gray-200 dark:border-gray-700 rounded'>
                          <div className='flex-1'>
                            <p className='text-sm text-gray-800 dark:text-gray-200'>{feature}</p>
                          </div>
                          <div className='flex items-center space-x-2'>
                            <button
                              type='button'
                              onClick={() => handleRemoveFeature(index)}
                              className='text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300'
                            >
                              <FaTrash className='h-4 w-4' />
                            </button>
                          </div>
                        </div>
                      ))}
                      {features.length === 0 && (
                        <p className='text-sm text-gray-500 dark:text-gray-400 text-center py-2'>
                          No features added yet
                        </p>
                      )}
                    </div>

                    {/* Add New Feature Form */}
                    <div className='flex items-center space-x-2 mb-2'>
                      <input
                        type='text'
                        value={newFeature}
                        onChange={(e) => setNewFeature(e.target.value)}
                        className='flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm'
                        placeholder='Add a new feature'
                      />
                      <button
                        type='button'
                        onClick={handleAddFeature}
                        className='px-4 py-2 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700'
                      >
                        <FaPlus className='h-4 w-4' />
                      </button>
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor='edit-max-members' className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                      Max Members
                    </label>
                    <input
                      type='number'
                      id='edit-max-members'
                      name='max_members'
                      required
                      min='-1'
                      value={planMaxMembers}
                      className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm shadow-sm
                        placeholder-gray-400 dark:placeholder-gray-500 dark:bg-gray-700 dark:text-white
                        focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                      placeholder='Enter max members (-1 for unlimited)'
                      onChange={(e) => setPlanMaxMembers(e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <label htmlFor='edit-max-projects' className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                      Max Projects
                    </label>
                    <input
                      type='number'
                      id='edit-max-projects'
                      name='max_projects'
                      required
                      min='-1'
                      value={planMaxProjects}
                      className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm shadow-sm
                        placeholder-gray-400 dark:placeholder-gray-500 dark:bg-gray-700 dark:text-white
                        focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                      placeholder='Enter max projects (-1 for unlimited)'
                      onChange={(e) => setPlanMaxProjects(e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <label htmlFor='edit-storage-limit' className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                      Storage Limit (bytes)
                    </label>
                    <input
                      type='number'
                      id='edit-storage-limit'
                      name='storage_limit'
                      required
                      min='0'
                      value={planMaxStorage}
                      className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm shadow-sm
                        placeholder-gray-400 dark:placeholder-gray-500 dark:bg-gray-700 dark:text-white
                        focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                      placeholder='Enter storage limit in bytes'
                      onChange={(e) => setPlanMaxStorage(e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                      Status
                    </label>
                    <div className='flex items-center space-x-4'>
                      <label className='inline-flex items-center'>
                        <input
                          type='radio'
                          name='is_active'
                          value='true'
                          checked={planIsActive === 'true'}
                          className='h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500'
                          onChange={() => setPlanIsActive('true')}
                        />
                        <span className='ml-2 text-sm text-gray-700 dark:text-gray-300'>Active</span>
                      </label>
                      
                      <label className='inline-flex items-center'>
                        <input
                          type='radio'
                          name='is_active'
                          value='false'
                          checked={planIsActive === 'false'}
                          className='h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500'
                          onChange={() => setPlanIsActive('false')}
                        />
                        <span className='ml-2 text-sm text-gray-700 dark:text-gray-300'>Inactive</span>
                      </label>
                    </div>
                  </div>

                  <div className='pt-3 border-t border-gray-200 dark:border-gray-700'>
                    <p className='text-xs text-gray-500 dark:text-gray-400'>
                      Plan ID: {selectedPlan.id}<br />
                      Created: {formatDate(selectedPlan.created_at)}<br />
                      Last Updated: {formatDate(selectedPlan.updated_at)}
                    </p>
                  </div>
                </div>
              )}
              
              <div className='mt-6 flex justify-between space-x-3'>
                {currentModalPage === 2 ? (
                  <>
                    <button
                      type='button'
                      onClick={() => setCurrentModalPage(1)}
                      className='px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium
                        text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600'
                    >
                      Back
                    </button>
                    <div className='flex space-x-3'>
                      <button
                        type='button'
                        onClick={closeModal}
                        className='px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium
                          text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600'
                      >
                        Cancel
                      </button>
                      <button
                        type='submit'
                        className='px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium
                          text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2
                          focus:ring-offset-2 focus:ring-indigo-500'
                      >
                        Save Changes
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <button
                      type='button'
                      onClick={closeModal}
                      className='px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium
                        text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600'
                    >
                      Cancel
                    </button>
                    <button
                      type='button'
                      onClick={() => setCurrentModalPage(2)}
                      className='px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium
                        text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2
                        focus:ring-offset-2 focus:ring-indigo-500'
                    >
                      Continue
                    </button>
                  </>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
