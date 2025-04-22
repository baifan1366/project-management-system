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
  const [isPlanSelected, setIsPlanSelected] = useState(null);
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
  const [activeTab, setActiveTab] = useState("subscriptionPlans");
  const [promoCodes, setPromoCodes] = useState([]);
  const [isCodeSelected, setIsCodeSelected] = useState(null);
  const [codeName, setCodeName] = useState('');
  const [codeType, setCodeType] = useState('');
  const [codeValue, setCodeValue] = useState('');
  const [codeDescription, setCodeDescription] = useState('');
  const [codeIsActive, setCodeIsActive] = useState('true');
  const [modalFor, setModalFor] = useState(null);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0]);
  const [maxUses, setMaxUses] = useState('100');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('all');
  const [paymentSearchQuery, setPaymentSearchQuery] = useState('');
  const [isPaymentLoading, setIsPaymentLoading] = useState(true);
  const [paymentError, setPaymentError] = useState(null);
  const [payments, setPayments] = useState([]);
  const [currentPaymentPage, setCurrentPaymentPage] = useState(1);
  const [totalPayments, setTotalPayments] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(10);

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

  const fetchPromoCodes = async () =>{
    try{
      const { data, error } = await supabase
        .from('promo_code')
        .select('*')
        .order('updated_at', { ascending: false });
      
      if(error){
        console.error('Error fetching promo codes:', error);
      } else {
        console.log('Promo codes fetched successfully:', data);
        setPromoCodes(data);
      }
    } catch (error) {
      console.error('Error in fetchPromoCode:', error);
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

  // use useEffect to fetch subscription plans and promo codes
  useEffect(() => {
    fetchSubscriptionPlans();
    fetchPromoCodes();  
  }, []);
  
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
  const openModal = ({type, plan = null, code = null}) => {
    setModalType(type);
    setIsPlanSelected(plan);
    setIsCodeSelected(code);
    setCurrentModalPage(1);
    
    // Set modalFor based on current activeTab or object type
    if (type === 'add') {
      setModalFor(activeTab === "promoCodes" ? "promoCode" : "subscriptionPlan");
    } else if (type === 'edit') {
      setModalFor(plan ? "subscriptionPlan" : "promoCode");
    }
    
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
      
    } else if(type === 'edit' && code){
      console.log('code', code);
      // Reset form values for promo codes
      setCodeName(code.code || '');
      setCodeType(code.discount_type || '');
      setCodeValue(code.discount_value || '');
      setCodeDescription(code.description || '');
      setCodeIsActive(code.is_active ? 'true' : 'false');
      setMaxUses(code.max_uses?.toString() || '100');
      
      // Set the dates (format them for the date input)
      if (code.start_date) {
        setStartDate(new Date(code.start_date).toISOString().split('T')[0]);
      }
      if (code.end_date) {
        setEndDate(new Date(code.end_date).toISOString().split('T')[0]);
      }
    }
    
    setIsModalOpen(true);
  };

  // Close modal
  const closeModal = () => {
    setIsModalOpen(false);
    setIsPlanSelected(null);
    setIsCodeSelected(null);
  };

  // Fix the addPromoCode function
  const addPromoCode = async (codeData) =>{
    try{
      setLoading(true);

      const { data, error } = await supabase
        .from('promo_code')
        .insert({
          code: codeData.code,
          discount_type: codeData.discount_type,
          discount_value: codeData.discount_value,
          description: codeData.description,
          is_active: codeData.is_active,
          start_date: codeData.start_date,
          end_date: codeData.end_date,
          current_uses: 0,
          max_uses: codeData.max_uses || 0
        });
        
      if(error){
        console.error('Error in addPromoCode:', error);
        alert(`Failed to add promo code: ${error.message}`);
        return false;
      }

      console.log('Promo code added successfully:', data);
      
      await fetchPromoCodes();
      return true;

    } catch (error) {
      console.error('Error in addPromoCode:', error);
      alert('An unexpected error occurred while adding the promo code');
      return false;
    } finally {
      setLoading(false);
    }
  };

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

  const updatePromoCode = async (codeId, codeData) => {
    try {
        setLoading(true);
        
        const { data, error } = await supabase
          .from('promo_code')
          .update(codeData)
          .eq('id', codeId);
          
        if (error) {
          console.error('Error updating promo code:', error);
          return;
        }
        
        console.log('Promo code updated successfully:', data);
        
        // Now fetchPromoCodes is accessible here
        await fetchPromoCodes();
        
      } catch (error) {
        console.error('Error in updatePromoCode:', error);
      } finally {
        setLoading(false);
      } 
  }
  // deactivate or activate subscription plan and promo code
  const toggleActive = async (id, isActive, type) => {
    try {
      setLoading(true);
      
      if(type === 'subscription_plan'){
        const { data, error } = await supabase
          .from('subscription_plan')
          .update({ is_active: isActive })
          .eq('id', id);

      if (error) {
        console.error('Error in toggleActive:', error);
      }

      } else if(type === 'promo_code'){
        const { data, error } = await supabase
          .from('promo_code')
          .update({ is_active: isActive })
          .eq('id', id);
      }

      await fetchSubscriptionPlans();
      await fetchPromoCodes();
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

  const deletePromoCode = async (codeId) => {
    try {
      // Confirm deletion
      if (!confirm('Are you sure you want to delete this promo code?')) {
        return;
      }
      
      setLoading(true);
      
      const { data, error } = await supabase
        .from('promo_code')
        .delete()
        .eq('id', codeId);
        
      if (error) {
        console.error('Error deleting promo code:', error);
        alert(`Failed to delete promo code: ${error.message}`);
        return;
      }
      
      console.log('Promo code deleted successfully');
      
      // Refresh the promo codes list
      await fetchPromoCodes();
      
    } catch (error) {
      console.error('Error in deletePromoCode:', error);
      alert('An unexpected error occurred while deleting the promo code');
    } finally {
      setLoading(false);
    }
  };

  const fetchPaymentHistory = async () => {
    try {
      setIsPaymentLoading(true);
      setPaymentError(null);

      // 构建查询，第一步从payment表查询并连接user表获取用户信息
      let query = supabase
        .from('payment')
        .select(`
          *,
          user:user_id (email, name)
        `)
        .order('created_at', { ascending: false });
      
      // 添加状态过滤条件
      if (paymentStatusFilter !== 'all') {
        query = query.eq('status', paymentStatusFilter);
      }
      
      // 添加搜索过滤条件
      if (paymentSearchQuery) {
        query = query.or(`user.email.ilike.%${paymentSearchQuery}%,transaction_id.ilike.%${paymentSearchQuery}%`);
      }
      
      // 添加分页
      const from = (currentPaymentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;
      
      // 获取总数进行分页处理
      const { count } = await supabase
        .from('payment')
        .select('*', { count: 'exact', head: true });
      
      // 设置总数和总页数
      setTotalPayments(count || 0);
      setTotalPages(Math.ceil((count || 0) / itemsPerPage));
      
      // 执行分页查询  
      query = query.range(from, to);
      
      const { data, error } = await query;

      if (error) {
        console.error('Error fetching payment history:', error);
        setPaymentError('An error occurred while fetching payment history.');
      } else {
        // 处理并格式化数据，添加用户名和邮箱
        const formattedPayments = data.map(payment => ({
          ...payment,
          userName: payment.user?.name || 'Unknown',
          userEmail: payment.user?.email || 'No email'
        }));
        
        console.log('Payment history fetched successfully:', formattedPayments);
        setPayments(formattedPayments);
      }
    } catch (error) {
      console.error('Error in fetchPaymentHistory:', error);
      setPaymentError('An error occurred while fetching payment history.');
    } finally {
      setIsPaymentLoading(false);
    }
  };

  // 添加useEffect来在组件加载时和过滤/分页参数变化时获取数据
  useEffect(() => {
    if (activeTab === 'paymentHistory') {
      fetchPaymentHistory();
    }
  }, [activeTab, paymentStatusFilter, paymentSearchQuery, currentPaymentPage]);

  // 添加一个导出CSV功能
  const exportPaymentsToCSV = async () => {
    try {
      // 显示加载状态
      setIsPaymentLoading(true);
      
      // 获取所有支付记录，不分页
      const { data, error } = await supabase
        .from('payment')
        .select(`
          *,
          user:user_id (email, name)
        `)
        .order('created_at', { ascending: false });
        
      if (error) {
        throw error;
      }
      
      // 格式化数据
      const formattedData = data.map(payment => ({
        'User Name': payment.user?.name || 'Unknown',
        'User Email': payment.user?.email || 'No email',
        'Amount': parseFloat(payment.amount).toFixed(2),
        'Currency': payment.currency,
        'Discount Amount': parseFloat(payment.discount_amount || 0).toFixed(2),
        'Status': payment.status,
        'Payment Method': payment.payment_method,
        'Transaction ID': payment.transaction_id,
        'Created At': new Date(payment.created_at).toLocaleString(),
        'Promo Code': payment.applied_promo_code || 'None'
      }));
      
      // 创建CSV内容
      const headers = Object.keys(formattedData[0]).join(',');
      const csvRows = formattedData.map(row => 
        Object.values(row).map(value => 
          typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value
        ).join(',')
      );
      
      const csvContent = [headers, ...csvRows].join('\n');
      
      // 创建Blob和下载链接
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `payment_history_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
    } catch (error) {
      console.error('Error exporting payments:', error);
      setPaymentError('An error occurred while exporting payment history.');
    } finally {
      setIsPaymentLoading(false);
    }
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
                <button 
                  className={`inline-block py-2 px-4 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 font-medium ${activeTab === "subscriptionPlans" ? "text-indigo-600 border-b-2 border-indigo-600 dark:border-indigo-400" : ""}`}
                  onClick={() => setActiveTab("subscriptionPlans")}
                >
                  Subscription Plans
                </button>
              </li>
              <li className="mr-2">
                <button 
                  className={`inline-block py-2 px-4 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 font-medium ${activeTab === "promoCodes" ? "text-indigo-600 border-b-2 border-indigo-600 dark:border-indigo-400" : ""}`}
                  onClick={() => setActiveTab("promoCodes")}
                >
                  Promo Codes
                </button>
              </li>
              <li className="mr-2">
                <button 
                  className={`inline-block py-2 px-4 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 font-medium ${activeTab === "userSubscriptions" ? "text-indigo-600 border-b-2 border-indigo-600 dark:border-indigo-400" : ""}`}
                  onClick={() => setActiveTab("userSubscriptions")}
                >
                  User Subscriptions
                </button>
              </li>
              <li className="mr-2">
                <button 
                  className={`inline-block py-2 px-4 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 font-medium ${activeTab === "paymentHistory" ? "text-indigo-600 border-b-2 border-indigo-600 dark:border-indigo-400" : ""}`}
                  onClick={() => setActiveTab("paymentHistory")}
                >
                  Payment History
                </button>
              </li>
            </ul>
          </div>
          
          {/* Subscription Plans Section */}
          {activeTab === "subscriptionPlans" && (
            <>
              <div className="mb-6 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Subscription Plans</h3>
                
                {/* <div className="flex space-x-2">
                  <button 
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white rounded-lg flex items-center"
                    onClick={() => openModal({type: 'add'})}
                  >
                    <FaPlus className="mr-2" />
                    Add New Plan
                  </button>
                </div> */}
              </div>
              
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
                                onClick={() => openModal({type: 'edit', plan})}
                              >
                                <FaEdit />
                              </button>
                              {/* toggle active button */}
                              <button
                                onClick={() => toggleActive(plan.id, !plan.is_active, 'subscription_plan')}
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
            </>
          )}

          {/* Promo Codes Section */}
          {activeTab === "promoCodes" && (
            <>
              <div className="mb-6 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Promo Codes</h3>
                
                <div className="flex space-x-2">
                  <button 
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white rounded-lg flex items-center"
                    onClick={() => openModal({type: 'add'})}
                  >
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
                              <button className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                                onClick={() => openModal({type:'edit', code})}
                              >
                                <FaEdit />
                              </button>
                              {/* toggle active button */}
                              <button
                                onClick={() => toggleActive(code.id, !code.is_active, 'promo_code')}
                                className={clsx(
                                  'text-2xl transition-colors duration-200',
                                  code.is_active 
                                    ? 'text-indigo-600 hover:text-indigo-700'
                                    : 'text-gray-400 hover:text-gray-500'
                                )}
                              >
                                {code.is_active ? <FaToggleOn /> : <FaToggleOff />}
                              </button>
                              {/* delete button */}
                              <button
                                onClick={() => deletePromoCode(code.id)}
                                className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                              >
                                <FaTrash />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* User Subscriptions Section */}
          {activeTab === "userSubscriptions" && (
            <>
              <div className="mb-6 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white">User Subscriptions</h3>
              </div>
              
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 text-center">
                <p className="text-gray-500 dark:text-gray-400">User subscription management coming soon.</p>
              </div>
            </>
          )}

          {/* Payment History Section */}
          {activeTab === "paymentHistory" && (
            <>
              <div className="mb-6 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Payment History</h3>
                <div className="flex space-x-2">
                  <button
                    onClick={exportPaymentsToCSV}
                    className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm flex items-center"
                    disabled={isPaymentLoading}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Export CSV
                  </button>
                  <select 
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    onChange={(e) => setPaymentStatusFilter(e.target.value)}
                    value={paymentStatusFilter}
                  >
                    <option value="all">All Status</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="PENDING">Pending</option>
                    <option value="FAILED">Failed</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Search user or transaction"
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={paymentSearchQuery}
                    onChange={(e) => setPaymentSearchQuery(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
                {isPaymentLoading ? (
                  <div className="p-10 text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                    <p className="mt-4 text-gray-500">Loading payment records...</p>
                  </div>
                ) : paymentError ? (
                  <div className="p-10 text-center">
                    <p className="text-red-500">{paymentError}</p>
                    <button 
                      onClick={fetchPaymentHistory}
                      className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                    >
                      Try Again
                    </button>
                  </div>
                ) : payments.length === 0 ? (
                  <div className="p-10 text-center">
                    <p className="text-gray-500 dark:text-gray-400">No payment records found.</p>
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-900">
                          <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              User
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Amount
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Status
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Date
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Payment Method
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Transaction ID
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                          {payments.map((payment) => (
                            <tr key={payment.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div>
                                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                                      {payment.userName || 'Unknown'}
                                    </div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400">
                                      {payment.userEmail || 'No email'}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900 dark:text-white">
                                  ${parseFloat(payment.amount).toFixed(2)} {payment.currency}
                                </div>
                                {payment.discount_amount > 0 && (
                                  <div className="text-xs text-green-600 dark:text-green-400">
                                    Discount: ${parseFloat(payment.discount_amount).toFixed(2)}
                                  </div>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                  ${payment.status === 'COMPLETED' 
                                    ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100' 
                                    : payment.status === 'PENDING'
                                    ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100'
                                    : 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100'
                                  }`}
                                >
                                  {payment.status}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                {new Date(payment.created_at).toLocaleString()}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                <span className="capitalize">{payment.payment_method}</span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                <div className="truncate max-w-xs" title={payment.transaction_id}>
                                  {payment.transaction_id}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="px-6 py-4 flex items-center justify-between border-t border-gray-200 dark:border-gray-700">
                      <div className="flex-1 flex justify-between sm:hidden">
                        <button
                          onClick={() => setCurrentPaymentPage(currentPaymentPage > 1 ? currentPaymentPage - 1 : 1)}
                          disabled={currentPaymentPage === 1}
                          className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                            currentPaymentPage === 1 
                              ? 'text-gray-400 bg-gray-100' 
                              : 'text-gray-700 bg-white hover:bg-gray-50'
                          }`}
                        >
                          Previous
                        </button>
                        <button
                          onClick={() => setCurrentPaymentPage(currentPaymentPage + 1)}
                          disabled={payments.length < itemsPerPage}
                          className={`ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                            payments.length < itemsPerPage
                              ? 'text-gray-400 bg-gray-100'
                              : 'text-gray-700 bg-white hover:bg-gray-50'
                          }`}
                        >
                          Next
                        </button>
                      </div>
                      <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm text-gray-700 dark:text-gray-400">
                            Showing <span className="font-medium">{payments.length > 0 ? (currentPaymentPage - 1) * itemsPerPage + 1 : 0}</span> to{' '}
                            <span className="font-medium">{Math.min(currentPaymentPage * itemsPerPage, totalPayments)}</span> of{' '}
                            <span className="font-medium">{totalPayments}</span> results
                          </p>
                        </div>
                        <div>
                          <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                            <button
                              onClick={() => setCurrentPaymentPage(currentPaymentPage > 1 ? currentPaymentPage - 1 : 1)}
                              disabled={currentPaymentPage === 1}
                              className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white dark:bg-gray-800 text-sm font-medium ${
                                currentPaymentPage === 1
                                  ? 'text-gray-400 dark:text-gray-600'
                                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                              }`}
                            >
                              <span className="sr-only">Previous</span>
                              <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </button>
                            {Array.from({ length: totalPages }).map((_, index) => (
                              <button
                                key={index}
                                onClick={() => setCurrentPaymentPage(index + 1)}
                                className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium ${
                                  currentPaymentPage === index + 1
                                    ? 'z-10 bg-indigo-50 dark:bg-indigo-900 border-indigo-500 text-indigo-600 dark:text-indigo-200'
                                    : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                                }`}
                              >
                                {index + 1}
                              </button>
                            ))}
                            <button
                              onClick={() => setCurrentPaymentPage(currentPaymentPage + 1)}
                              disabled={currentPaymentPage >= totalPages}
                              className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white dark:bg-gray-800 text-sm font-medium ${
                                currentPaymentPage >= totalPages
                                  ? 'text-gray-400 dark:text-gray-600'
                                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                              }`}
                            >
                              <span className="sr-only">Next</span>
                              <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                              </svg>
                            </button>
                          </nav>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </main>
      </div>

      {/* SUBSCRIPTION MODALS */}
      {/*subscription add modal*/}
      {isModalOpen && modalType === 'add' && (
        <div className='fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50'>
          <div className='bg-white dark:bg-gray-800 rounded-lg shadow-lg w-full max-w-md p-6 max-h-[90vh] overflow-y-auto'>
            <div className='flex justify-between items-center mb-4'>
              <h2 className='text-xl font-semibold text-gray-800 dark:text-white'>
                {modalFor === "promoCode" ? "Add New Promo Code" : "Add New Subscription Plan"}
              </h2>
              <button
                onClick={closeModal}
                className='text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              >
                &times;
              </button>
            </div>
            
            {modalFor === "promoCode" ? (
              // Promo code form
              <form onSubmit={async (e) => {
                e.preventDefault();
                const codeData = {
                  code: codeName,
                  discount_type: codeType,
                  discount_value: parseFloat(codeValue),
                  description: codeDescription,
                  is_active: codeIsActive === 'true',
                  start_date: new Date(startDate).toISOString(),
                  end_date: new Date(endDate).toISOString(),
                  current_uses: 0,
                  max_uses: parseInt(maxUses) || 0
                };
                
                // Add promo code and only close if successful
                const success = await addPromoCode(codeData);
                if (success) {
                  closeModal();
                }
              }}>
                <div className='space-y-4'>
                  <div>
                    <label htmlFor='add-code-name' className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                      Promo Code
                    </label>
                    <input
                      type='text'
                      id='add-code-name'
                      name='code'
                      required
                      className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm shadow-sm
                        placeholder-gray-400 dark:placeholder-gray-500 dark:bg-gray-700 dark:text-white
                        focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                      placeholder='Enter promo code'
                      onChange={(e) => setCodeName(e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <label htmlFor='add-code-type' className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                      Discount Type
                    </label>
                    <select
                      id='add-code-type'
                      name='discount_type'
                      required
                      className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm shadow-sm
                        placeholder-gray-400 dark:placeholder-gray-500 dark:bg-gray-700 dark:text-white
                        focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                      onChange={(e) => setCodeType(e.target.value)}
                    >
                      <option value=''>Select discount type</option>
                      <option value='PERCENTAGE'>Percentage</option>
                      <option value='FIXED'>Fixed Amount</option>
                    </select>
                  </div>
                  
                  <div>
                    <label htmlFor='add-code-value' className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                      Discount Value
                    </label>
                    <input
                      type='number'
                      id='add-code-value'
                      name='discount_value'
                      required
                      min='0'
                      step='0.01'
                      className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm shadow-sm
                        placeholder-gray-400 dark:placeholder-gray-500 dark:bg-gray-700 dark:text-white
                        focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                      placeholder={codeType === 'PERCENTAGE' ? 'Enter discount percentage' : 'Enter discount amount'}
                      onChange={(e) => setCodeValue(e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <label htmlFor='add-code-description' className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                      Description
                    </label>
                    <textarea
                      id='add-code-description'
                      name='description'
                      rows='3'
                      className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm shadow-sm
                        placeholder-gray-400 dark:placeholder-gray-500 dark:bg-gray-700 dark:text-white
                        focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                      placeholder='Enter promo code description'
                      onChange={(e) => setCodeDescription(e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <label htmlFor='add-max-uses' className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                      Max Usage Count
                    </label>
                    <input
                      type='number'
                      id='add-max-uses'
                      name='max_uses'
                      required
                      min='0'
                      value={maxUses}
                      className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm shadow-sm
                        placeholder-gray-400 dark:placeholder-gray-500 dark:bg-gray-700 dark:text-white
                        focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                      placeholder='Enter maximum number of uses'
                      onChange={(e) => setMaxUses(e.target.value)}
                    />
                    <p className="text-xs text-gray-500 mt-1">Enter 0 for unlimited uses</p>
                  </div>
                  
                  <div>
                    <label htmlFor='add-start-date' className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                      Start Date
                    </label>
                    <input
                      type='date'
                      id='add-start-date'
                      name='start_date'
                      required
                      value={startDate}
                      className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm shadow-sm
                        placeholder-gray-400 dark:placeholder-gray-500 dark:bg-gray-700 dark:text-white
                        focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <label htmlFor='add-end-date' className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                      End Date
                    </label>
                    <input
                      type='date'
                      id='add-end-date'
                      name='end_date'
                      required
                      value={endDate}
                      className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm shadow-sm
                        placeholder-gray-400 dark:placeholder-gray-500 dark:bg-gray-700 dark:text-white
                        focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                      onChange={(e) => setEndDate(e.target.value)}
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
                          checked={codeIsActive === 'true'}
                          className='h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500'
                          onChange={() => setCodeIsActive('true')}
                        />
                        <span className='ml-2 text-sm text-gray-700 dark:text-gray-300'>Active</span>
                      </label>
                      
                      <label className='inline-flex items-center'>
                        <input
                          type='radio'
                          name='is_active'
                          value='false'
                          checked={codeIsActive === 'false'}
                          className='h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500'
                          onChange={() => setCodeIsActive('false')}
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
                    Add Code
                  </button>
                </div>
              </form>
            ) : (
              // Subscription plan form
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
                
                // Add subscription plan logic here
                // addSubscriptionPlan(planData);
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
            )}
          </div>
        </div>
      )}

      {/*subscription edit modal*/}
      {isModalOpen && modalType === 'edit' && isPlanSelected && (
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
              
              updateSubscriptionPlan(isPlanSelected.id, planData);
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
                      Plan ID: {isPlanSelected.id}<br />
                      Created: {formatDate(isPlanSelected.created_at)}<br />
                      Last Updated: {formatDate(isPlanSelected.updated_at)}
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

      {/*edit*/}
      {isModalOpen && modalType === 'edit' && isCodeSelected && (
        <div className='fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50'>
          <div className='bg-white dark:bg-gray-800 rounded-lg shadow-lg w-full max-w-md p-6 max-h-[90vh] overflow-y-auto'>
            <div className='flex justify-between items-center mb-4'>
              <h2 className='text-xl font-semibold text-gray-800 dark:text-white'>
                Edit Promo Code
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
              const codeData = {
                code: codeName,
                discount_type: codeType,
                discount_value: parseFloat(codeValue),
                start_date: new Date(startDate).toISOString(),
                end_date: new Date(endDate).toISOString(),
                description: codeDescription,
                is_active: codeIsActive === 'true',
                max_uses: parseInt(maxUses) || 0,
                updated_at: new Date().toISOString()
              };
              
              // Update promo code logic
              updatePromoCode(isCodeSelected.id, codeData);
              closeModal();
            }}>
              <div className='space-y-4'>
                <div>
                  <label htmlFor='edit-code-name' className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                    Promo Code
                  </label>
                  <input
                    type='text'
                    id='edit-code-name'
                    name='code'
                    required
                    value={codeName}
                    className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm shadow-sm
                      placeholder-gray-400 dark:placeholder-gray-500 dark:bg-gray-700 dark:text-white
                      focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                    placeholder='Enter promo code'
                    onChange={(e) => setCodeName(e.target.value)}
                  />
                </div>
                
                <div>
                  <label htmlFor='edit-code-type' className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                    Discount Type
                  </label>
                  <select
                    id='edit-code-type'
                    name='discount_type'
                    required
                    value={codeType}
                    className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm shadow-sm
                      placeholder-gray-400 dark:placeholder-gray-500 dark:bg-gray-700 dark:text-white
                      focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                    onChange={(e) => setCodeType(e.target.value)}
                  >
                    <option value=''>Select discount type</option>
                    <option value='PERCENTAGE'>Percentage</option>
                    <option value='FIXED'>Fixed Amount</option>
                  </select>
                </div>
                
                <div>
                  <label htmlFor='edit-code-value' className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                    Discount Value
                  </label>
                  <input
                    type='number'
                    id='edit-code-value'
                    name='discount_value'
                    required
                    min='0'
                    step='0.01'
                    value={codeValue}
                    className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm shadow-sm
                      placeholder-gray-400 dark:placeholder-gray-500 dark:bg-gray-700 dark:text-white
                      focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                    placeholder={codeType === 'PERCENTAGE' ? 'Enter discount percentage' : 'Enter discount amount'}
                    onChange={(e) => setCodeValue(e.target.value)}
                  />
                </div>
                
                <div>
                  <label htmlFor='edit-code-description' className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                    Description
                  </label>
                  <textarea
                    id='edit-code-description'
                    name='description'
                    rows='3'
                    value={codeDescription}
                    className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm shadow-sm
                      placeholder-gray-400 dark:placeholder-gray-500 dark:bg-gray-700 dark:text-white
                      focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                    placeholder='Enter promo code description'
                    onChange={(e) => setCodeDescription(e.target.value)}
                  />
                </div>
                
                <div>
                  <label htmlFor='edit-max-uses' className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                    Max Usage Count
                  </label>
                  <input
                    type='number'
                    id='edit-max-uses'
                    name='max_uses'
                    required
                    min='0'
                    value={maxUses}
                    className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm shadow-sm
                      placeholder-gray-400 dark:placeholder-gray-500 dark:bg-gray-700 dark:text-white
                      focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                    placeholder='Enter maximum number of uses'
                    onChange={(e) => setMaxUses(e.target.value)}
                  />
                  <p className="text-xs text-gray-500 mt-1">Enter 0 for unlimited uses</p>
                </div>
                
                <div>
                  <label htmlFor='edit-start-date' className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                    Start Date
                  </label>
                  <input
                    type='date'
                    id='edit-start-date'
                    name='start_date'
                    required
                    value={startDate}
                    className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm shadow-sm
                      placeholder-gray-400 dark:placeholder-gray-500 dark:bg-gray-700 dark:text-white
                      focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                
                <div>
                  <label htmlFor='edit-end-date' className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                    End Date
                  </label>
                  <input
                    type='date'
                    id='edit-end-date'
                    name='end_date'
                    required
                    value={endDate}
                    className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm shadow-sm
                      placeholder-gray-400 dark:placeholder-gray-500 dark:bg-gray-700 dark:text-white
                      focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                    onChange={(e) => setEndDate(e.target.value)}
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
                        checked={codeIsActive === 'true'}
                        className='h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500'
                        onChange={() => setCodeIsActive('true')}
                      />
                      <span className='ml-2 text-sm text-gray-700 dark:text-gray-300'>Active</span>
                    </label>
                    
                    <label className='inline-flex items-center'>
                      <input
                        type='radio'
                        name='is_active'
                        value='false'
                        checked={codeIsActive === 'false'}
                        className='h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500'
                        onChange={() => setCodeIsActive('false')}
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
                  className='px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600'
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
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
