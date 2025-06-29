'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { FaUsers, FaMoneyBillWave, FaTicketAlt, FaCog, FaSignOutAlt, FaChartLine, FaBell, FaPlus, FaEdit, FaTrash, FaCheck, FaToggleOn, FaToggleOff, FaTimes } from 'react-icons/fa';
import { supabase } from '@/lib/supabase';
import { clsx } from 'clsx';
import { useSelector, useDispatch } from 'react-redux';
import AccessRestrictedModal from '@/components/admin/accessRestrictedModal';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

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
  const [planPrice, setPlanPrice] = useState('0');
  const [planBilling, setPlanBilling] = useState('');
  const [description, setDescription] = useState('');
  const [planActiveUsers, setPlanActiveUsers] = useState('');
  const [planMaxMembers, setPlanMaxMembers] = useState('0');
  const [planMaxProjects, setPlanMaxProjects] = useState('0');
  const [planMaxStorage, setPlanMaxStorage] = useState('0');
  const [planMaxAiChat, setPlanMaxAiChat] = useState('0');
  const [planMaxAiTask, setPlanMaxAiTask] = useState('0');
  const [planMaxAiWorkflow, setPlanMaxAiWorkflow] = useState('0');
  const [planIsActive, setPlanIsActive] = useState('true');
  const [currentModalPage, setCurrentModalPage] = useState(1);
  const [features, setFeatures] = useState([]);
  const [newFeature, setNewFeature] = useState('');
  const [activeTab, setActiveTab] = useState("subscriptionPlans");
  const [promoCodes, setPromoCodes] = useState([]);
  const [isCodeSelected, setIsCodeSelected] = useState(null);
  const [isUserSubscriptionPlanSelected, setIsUserSubscriptionPlanSelected] = useState(null);
  const [codeName, setCodeName] = useState('');
  const [codeNameError, setCodeNameError] = useState('');
  const [codeType, setCodeType] = useState('');
  const [codeTypeError, setCodeTypeError] = useState('');
  const [codeValue, setCodeValue] = useState('');
  const [codeValueError, setCodeValueError] = useState('');
  const [codeDescription, setCodeDescription] = useState('');
  const [codeDescriptionError, setCodeDescriptionError] = useState('');
  const [codeIsActive, setCodeIsActive] = useState('true');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [startDateError, setStartDateError] = useState('');
  const [endDate, setEndDate] = useState(new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0]);
  const [endDateError, setEndDateError] = useState('');
  const [maxUses, setMaxUses] = useState('100');
  const [maxUsesError, setMaxUsesError] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('all');
  const [paymentSearchQuery, setPaymentSearchQuery] = useState('');
  const [isPaymentLoading, setIsPaymentLoading] = useState(true);
  const [paymentError, setPaymentError] = useState(null);
  const [payments, setPayments] = useState([]);
  const [currentPaymentPage, setCurrentPaymentPage] = useState(1);
  const [totalPayments, setTotalPayments] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const dispatch = useDispatch();
  const permissions = useSelector((state) => state.admin.permissions);
  const [userSubscriptions, setUserSubscriptions] = useState([]);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [subscriptionStatusFilter, setSubscriptionStatusFilter] = useState('ACTIVE');
  const [planTypeFilter, setPlanTypeFilter] = useState('all');
  const [planNameFilter, setPlanNameFilter] = useState('all');
  const [isUserSubscriptionDetailsModalOpen, setIsUserSubscriptionDetailsModalOpen] = useState(false);
  const [selectedSubscriptionDetails, setSelectedSubscriptionDetails] = useState(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [processing, setProcessing] = useState(false);
  const [isCodeToDelete, setIsCodeToDelete] = useState(null);
  const [planMaxTeams, setPlanMaxTeams] = useState('0');
  const [isPlanToDelete, setIsPlanToDelete] = useState(null);
  const [distributionViewMode, setDistributionViewMode] = useState('type'); // 'type' or 'name'
  const [subscriptionStats, setSubscriptionStats] = useState({
    distribution: {
      FREE: { count: 0, percentage: 0 },
      PRO: { count: 0, percentage: 0 },
      ENTERPRISE: { count: 0, percentage: 0 }
    },
    distributionByName: {},
    stats: {
      totalActive: 0,
      totalRevenue: 0,
      monthly: 0,
      yearly: 0
    },
    recentActivity: []
  });
  
  // Add these new state variables after the existing state variables (around line 70)
  const [allPayments, setAllPayments] = useState([]);
  const [filteredPayments, setFilteredPayments] = useState([]);
  
  // initialize the page
  useEffect(() => {
    const initAdminSubscriptions = async () => {
      try {
        setLoading(true);

        await fetchSubscriptionPlans();
        await fetchPromoCodes();  
        await fetchUserSubscriptions();

      } catch (error) {
        console.error('Errror in fetching subscription plans:', error);
        // Redirect to admin login
        router.replace(`/admin/adminLogin`);
      } finally {
        setLoading(false);
      }
    };
    
    initAdminSubscriptions();
  }, [dispatch, router]);

  // Add function to verify permission access TODO: 模块化这个代码
  const hasPermission = (permissionName) => {
    return permissions.includes(permissionName);
  };

  const fetchSubscriptionPlans = async () => {
    try {
      // First, get all subscription plans
      const { data: plans, error } = await supabase
        .from('subscription_plan')
        .select('*')
        .order('id', { ascending: true });

      if(error){
        console.error('Error fetching subscription plans:', error);
        return;
      }
      
      // Then get all active user subscriptions
      const { data: activeSubscriptions, error: subError } = await supabase
        .from('user_subscription_plan')
        .select('plan_id')
        .eq('status', 'ACTIVE');
      
      if(subError){
        console.error('Error fetching active subscriptions:', subError);
      }
      
      // Count subscriptions per plan
      const userCountMap = {};
      if(activeSubscriptions) {
        activeSubscriptions.forEach(sub => {
          if (sub.plan_id) {
            userCountMap[sub.plan_id] = (userCountMap[sub.plan_id] || 0) + 1;
          }
        });
      }
      
      // Add active_users count to each plan
      const plansWithUserCounts = plans.map(plan => ({
        ...plan,
        active_users: userCountMap[plan.id] || 0
      }));
      
      setSubscriptionPlans(plansWithUserCounts);
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
        
        setPromoCodes(data);
      }
    } catch (error) {
      console.error('Error in fetchPromoCode:', error);
    }
  };

  const fetchUserSubscriptions = async () => {
    try {
      // Build the query with joins to get both user and plan details
      let query = supabase
        .from('user_subscription_plan')
        .select(`
          *,
          user:user_id (id, email, name),
          plan:plan_id (id, name, type, max_members, max_projects, max_teams, max_ai_chat, max_ai_task, max_ai_workflow)
        `)
        .order('created_at', { ascending: false });
      
      // Apply filters if they are set
      if (subscriptionStatusFilter !== 'ALL') {
        query = query.eq('status', subscriptionStatusFilter);
      }
      
      if (userSearchQuery) {
        query = query.or(`user.email.ilike.%${userSearchQuery}%,user.name.ilike.%${userSearchQuery}%`);
      }
      
      if (planTypeFilter !== 'all') {
        query = query.eq('plan_id.type', planTypeFilter);
      }
        
      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching user subscriptions:', error);
        return;
      }
      
      
      setUserSubscriptions(data || []);
    } catch (error) {
      console.error('Error in fetchUserSubscriptions:', error);
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
  
  // Open modal
  const openModal = ({type, plan = null, code = null}) => {
    setModalType(type);
    setIsPlanSelected(plan);
    setIsCodeSelected(code);
    setCurrentModalPage(1);
    
    // Reset all error states when opening any modal
    setCodeNameError('');
    setCodeTypeError('');
    setCodeValueError('');
    setCodeDescriptionError('');
    setStartDateError('');
    setEndDateError('');
    setMaxUsesError('');
    
    if (type === 'edit' && plan) {
      setPlanName(plan.name || '');
      setPlanType(plan.type || '');
      setPlanPrice(plan.price || '0');
      setPlanBilling(plan.billing_interval || '');
      setDescription(plan.description || '');

      // Use the parseFeatures function
      const featuresArray = parseFeatures(plan.features);
      setFeatures(featuresArray);

      setPlanActiveUsers(plan.active_users || '');
      setPlanMaxMembers(plan.max_members || '0');
      setPlanMaxProjects(plan.max_projects || '0');
      setPlanMaxTeams(plan.max_teams || '0');
      setPlanMaxAiChat(plan.max_ai_chat || '0');
      setPlanMaxAiTask(plan.max_ai_task || '0');
      setPlanMaxAiWorkflow(plan.max_ai_workflow || '0');
      setPlanMaxStorage(plan.max_storage || '0');
      setPlanMaxAiChat(plan.max_ai_chat || '0');
      setPlanMaxAiTask(plan.max_ai_task || '0');
      setPlanMaxAiWorkflow(plan.max_ai_workflow || '0');
      setPlanIsActive(plan.is_active ? 'true' : 'false');
      
    } else if(type === 'edit' && code){
      
      // Reset form values for promo codes
      setCodeName(code.code || '');
      setCodeType(code.discount_type || '');
      setCodeValue(code.discount_value || '');
      setCodeDescription(code.description || '');
      setCodeIsActive(code.is_active ? 'true' : 'false');
      setMaxUses(code.max_uses?.toString() || '100');
      
      // Set the dates (format them for the date input)
      if (code.start_date) {
        const codeStartDate = new Date(code.start_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // If editing an existing code, allow past dates if they were already set
        setStartDate(new Date(code.start_date).toISOString().split('T')[0]);
      }
      if (code.end_date) {
        setEndDate(new Date(code.end_date).toISOString().split('T')[0]);
      }
    } else if (type === 'add' && activeTab === "promoCodes") {
      // Reset promo code form values
      setCodeName('');
      setCodeType('');
      setCodeValue('');
      setCodeDescription('');
      setCodeIsActive('true');
      setStartDate(new Date().toISOString().split('T')[0]);
      setEndDate(new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0]);
      setMaxUses('100');
    }
    
    setIsModalOpen(true);
  };

  // Reset form fields
  const resetFormFields = () => {
    setPlanName('');
    setPlanType('');
    setPlanPrice('0');
    setPlanBilling('');
    setDescription('');
    setFeatures([]);
    setPlanActiveUsers('');
    setPlanMaxMembers('0');
    setPlanMaxProjects('0');
    setPlanMaxTeams('0');
    setPlanMaxAiChat('0');
    setPlanMaxAiTask('0');
    setPlanMaxAiWorkflow('0');
    setPlanMaxStorage('0');
    setPlanIsActive('true');
    setCurrentModalPage(1);
  };

  // Close modal
  const closeModal = () => {
    resetFormFields();
    setModalType(null);
    setIsPlanSelected(null);
    setIsCodeSelected(null);
  };

  // deactivate or activate subscription plan and promo code
  const toggleActive = async (id, isActive, type) => {
    try {
      setLoading(true);
      
      if(type === 'subscription_plan'){
        // First get the plan name
        const { data: planData, error: planError } = await supabase
          .from('subscription_plan')
          .select('name')
          .eq('id', id)
          .single();
          
        if (planError) {
          console.error('Error getting plan details:', planError);
        }
        
        const planName = planData?.name || 'Plan';
        
        const { data, error } = await supabase
          .from('subscription_plan')
          .update({ is_active: isActive })
          .eq('id', id);

        if (error) {
          console.error('Error in toggleActive:', error);
          toast.error(`Failed to update ${planName} status`, {
            description: error.message
          });
          return;
        }
        
        toast.success(`${planName} plan ${isActive ? 'activated' : 'deactivated'} successfully`);

      } else if(type === 'promo_code'){
        // First get the code name
        const { data: codeData, error: codeError } = await supabase
          .from('promo_code')
          .select('code')
          .eq('id', id)
          .single();
          
        if (codeError) {
          console.error('Error getting promo code details:', codeError);
        }
        
        const codeName = codeData?.code || 'Promo code';
        
        const { data, error } = await supabase
          .from('promo_code')
          .update({ is_active: isActive })
          .eq('id', id);
          
        if (error) {
          console.error('Error in toggleActive:', error);
          toast.error(`Failed to update ${codeName} status`, {
            description: error.message
          });
          return;
        }
        
        toast.success(`Promo code "${codeName}" ${isActive ? 'activated' : 'deactivated'} successfully`);
      }

      await fetchSubscriptionPlans();
      await fetchPromoCodes();
    } catch (error) {
      console.error('Error in toggleActive:', error);
      toast.error('An error occurred while updating status');
    } finally {
      setLoading(false);
    }
  };
  
  // Format currency for display
  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined) {
      return 'N/A';
    }
    return new Intl.NumberFormat('ms-MY', {
      style: 'currency',
      currency: 'MYR',
    }).format(amount);
  };
  
  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    
    // Check if the date is valid (not 1970-01-01 from null conversion)
    const date = new Date(dateString);
    if (date.getFullYear() === 1970 && date.getMonth() === 0 && date.getDate() === 1) {
      return 'N/A';
    }
    
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  };
  
  // Format date range for display
  const formatDateRange = (startDate, endDate) => {
    const formattedStartDate = formatDate(startDate);
    const formattedEndDate = formatDate(endDate);
    
    if (formattedStartDate === 'N/A' && formattedEndDate === 'N/A') {
      return 'No date range set';
    } else if (formattedStartDate === 'N/A') {
      return `Until ${formattedEndDate}`;
    } else if (formattedEndDate === 'N/A') {
      return `From ${formattedStartDate}`;
    }
    
    return `${formattedStartDate} - ${formattedEndDate}`;
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

  const deletePromoCode = async () => {
    try {
      setProcessing(true);
      
      const { error } = await supabase
        .from('promo_code')
        .delete()
        .eq('id', isCodeToDelete.id);
        
      if (error) {
        console.error('Error deleting promo code:', error);
        toast.error(`Failed to delete ${isCodeToDelete.code}`, {
          description: error.message
        });
        return;
      }
      
      
      toast.success(`Promo code "${isCodeToDelete.code}" deleted successfully`);
      
      // Refresh the promo codes list
      await fetchPromoCodes();
      closeModal();
      
    } catch (error) {
      console.error('Error in deletePromoCode:', error);
      toast.error('An unexpected error occurred while deleting the promo code');
    } finally {
      setProcessing(false);
    }
  };

  // Replace the fetchPaymentHistory function
  const fetchPaymentHistory = async () => {
    try {
      setIsPaymentLoading(true);
      setPaymentError(null);

      // Fetch all payment records at once
      const { data, error } = await supabase
        .from('payment')
        .select(`
          *,
          user:user_id (email, name)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching payment history:', error);
        setPaymentError('An error occurred while fetching payment history.');
        return;
      }

      const formattedPayments = data.map(payment => ({
        ...payment,
        userName: payment.user?.name || 'Unknown',
        userEmail: payment.user?.email || 'No email'
      }));
      
      setAllPayments(formattedPayments);
      
      // Apply initial filtering
      filterPayments(formattedPayments, paymentStatusFilter, paymentSearchQuery);
      
      // Calculate total for pagination
      setTotalPayments(formattedPayments.length);
      setTotalPages(Math.ceil(formattedPayments.length / itemsPerPage));
      
    } catch (error) {
      console.error('Error in fetchPaymentHistory:', error);
      setPaymentError('An error occurred while fetching payment history.');
    } finally {
      setIsPaymentLoading(false);
    }
  };

  // Add a new function to filter payments on the frontend
  const filterPayments = (payments = allPayments, statusFilter = paymentStatusFilter, searchQuery = paymentSearchQuery) => {
    let filtered = [...payments];
    
    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(payment => payment.status === statusFilter);
    }
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(payment => 
        payment.userName?.toLowerCase().includes(query) ||
        payment.userEmail?.toLowerCase().includes(query) ||
        payment.transaction_id?.toLowerCase().includes(query)
      );
    }
    
    // Update filtered payments
    setFilteredPayments(filtered);
    
    // Update pagination
    setTotalPayments(filtered.length);
    setTotalPages(Math.ceil(filtered.length / itemsPerPage));
    
    // Reset to first page if current page is out of bounds
    if (currentPaymentPage > Math.ceil(filtered.length / itemsPerPage)) {
      setCurrentPaymentPage(1);
    }
  };

  // Modify the useEffect for payment history filtering
  useEffect(() => {
    if (activeTab === 'paymentHistory') {
      if (allPayments.length === 0) {
        fetchPaymentHistory();
      } else {
        filterPayments(allPayments, paymentStatusFilter, paymentSearchQuery);
      }
    }
  }, [activeTab, paymentStatusFilter, paymentSearchQuery]);

  // Add a useEffect for pagination
  useEffect(() => {
    // This will update the visible payments when the page changes
    if (activeTab === 'paymentHistory') {
      // No need to fetch again, just update the pagination
    }
  }, [currentPaymentPage, activeTab]);

  // Replace the exportPaymentsToCSV function
  const exportPaymentsToCSV = async () => {
    try {
      // Show loading toast
      const loadingToast = toast.loading('Preparing payment history export...');
      setIsPaymentLoading(true);
      
      // Use the filtered payments instead of fetching from the database
      const paymentsToExport = filteredPayments;
      
      // Format data
      const formattedData = paymentsToExport.map(payment => ({
        'User Name': payment.userName || 'Unknown',
        'User Email': payment.userEmail || 'No email',
        'Amount': parseFloat(payment.amount).toFixed(2),
        'Currency': payment.currency,
        'Discount Amount': parseFloat(payment.discount_amount || 0).toFixed(2),
        'Status': payment.status,
        'Payment Method': payment.payment_method,
        'Transaction ID': payment.transaction_id,
        'Created At': new Date(payment.created_at).toLocaleString(),
        'Promo Code': payment.applied_promo_code || 'None'
      }));
      
      // Create CSV content
      const headers = Object.keys(formattedData[0]).join(',');
      const csvRows = formattedData.map(row => 
        Object.values(row).map(value => 
          typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value
        ).join(',')
      );
      
      const csvContent = [headers, ...csvRows].join('\n');
      const fileName = `payment_history_${new Date().toISOString().split('T')[0]}.csv`;
      
      // Create Blob and download link
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', fileName);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Dismiss loading toast and show success toast
      toast.dismiss(loadingToast);
      toast.success(`Payment history exported to ${fileName}`, {
        description: `${paymentsToExport.length} records exported successfully`
      });
      
    } catch (error) {
      console.error('Error exporting payments:', error);
      toast.error('Error exporting payment data', {
        description: error.message
      });
      setPaymentError('An error occurred while exporting payment history.');
    } finally {
      setIsPaymentLoading(false);
    }
  };

  // Calculate remaining usage based on plan limits and current usage
  const calculateRemainingUsage = (current, max) => {
    // If max is -1, it means unlimited
    if (max === -1) return "∞";
    return max - current;
  };

  // Apply filters when they change
  useEffect(() => {
    if (activeTab === 'userSubscriptions') {
      fetchUserSubscriptions();
    }
  }, [activeTab, userSearchQuery, subscriptionStatusFilter, planTypeFilter]);

  // Open subscription details modal function (add after parseFeatures function)
  const openSubscriptionDetailsModal = (subscription) => {
    setSelectedSubscriptionDetails(subscription);
    setIsUserSubscriptionDetailsModalOpen(true);
  };

  // Close subscription details modal
  const closeSubscriptionDetailsModal = () => {
    setIsUserSubscriptionDetailsModalOpen(false);
    setSelectedSubscriptionDetails(null);
  };

  // Update subscription plan
  const updateSubscriptionPlan = async (planId, planData) => {
    try {
      setProcessing(true);
      const { data, error } = await supabase
        .from('subscription_plan')
        .update(planData)
        .eq('id', planId)
        .select()
        .single();

      if (error) {
        console.error('Error updating subscription plan:', error);
        toast.error(error.message || 'Failed to update subscription plan');
        return;
      }

      await fetchSubscriptionPlans();
      resetFormFields();
      closeModal();
      toast.success('Subscription plan updated successfully');
    } catch (error) {
      console.error('Error updating subscription plan:', error);
      toast.error(error.message || 'Failed to update subscription plan');
    } finally {
      setProcessing(false);
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
          toast.error(`Failed to update promo code "${codeData.code}"`, {
            description: error.message
          });
          return;
        }
        
        
        toast.success(`Promo code "${codeData.code}" updated successfully`);
        
        // Now fetchPromoCodes is accessible here
        await fetchPromoCodes();
        
      } catch (error) {
        console.error('Error in updatePromoCode:', error);
        toast.error('An error occurred while updating the promo code');
      } finally {
        setLoading(false);
      } 
  }

  // Validate promo code format
  const validatePromoCode = (code) => {
    // Check if code is at least 5 characters long
    if (!code || code.length < 5) {
      return "Promo code must be at least 5 characters long";
    }
    
    // Check if code contains special characters or spaces
    if (!/^[a-zA-Z0-9]+$/.test(code)) {
      return "Promo code cannot contain spaces or special characters";
    }
    
    return "";
  };
  
  // Validate discount value
  const validateDiscountValue = (value, type) => {
    const numValue = parseFloat(value);
    
    if (isNaN(numValue) || numValue < 1) {
      return "Discount value must be at least 1";
    }
    
    if (type === 'PERCENTAGE' && numValue > 100) {
      return "Percentage discount cannot exceed 100%";
    }
    
    return "";
  };
  
  // Validate description
  const validateDescription = (desc) => {
    if (!desc || desc.trim().length < 8) {
      return "Description must be at least 8 characters long";
    }
    
    return "";
  };
  
  // Validate max uses
  const validateMaxUses = (uses) => {
    const numUses = parseInt(uses);
    
    if (isNaN(numUses) || numUses < 0) {
      return "Max uses must be a non-negative number";
    }
    
    return "";
  };

  // Validate start date
  const validateStartDate = (start) => {
    if (!start) {
      return "Start date is required";
    }
    
    const startDate = new Date(start);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to beginning of today
    
    if (startDate < today) {
      return "Start date cannot be in the past";
    }
    
    return "";
  };

  // Validate end date
  const validateEndDate = (end, start) => {
    if (!end) {
      return "End date is required";
    }
    
    const endDate = new Date(end);
    const startDate = new Date(start);
    
    if (endDate < startDate) {
      return "End date cannot be earlier than start date";
    }
    
    return "";
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
        toast.error(`Failed to add promo code "${codeData.code}"`, {
          description: error.message
        });
        return false;
      }

      
      toast.success(`Promo code "${codeData.code}" added successfully`);
      
      await fetchPromoCodes();
      return true;

    } catch (error) {
      console.error('Error in addPromoCode:', error);
      toast.error('An unexpected error occurred while adding the promo code');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Add subscription plan
  const addSubscriptionPlan = async (planData) => {
    try {
      setProcessing(true);
      const { data, error } = await supabase
        .from('subscription_plan')
        .insert([planData])
        .select()
        .single();

      if (error) {
        console.error('Error adding subscription plan:', error);
        toast.error(error.message || 'Failed to add subscription plan');
        return;
      }

      await fetchSubscriptionPlans();
      resetFormFields();
      closeModal();
      toast.success('Subscription plan added successfully');
    } catch (error) {
      console.error('Error adding subscription plan:', error);
      toast.error(error.message || 'Failed to add subscription plan');
    } finally {
      setProcessing(false);
    }
  };

  // Handle price change
  const handlePriceChange = (value) => {
    // Allow empty string and any valid number including 0
    if (value === '' || (!isNaN(parseFloat(value)) && parseFloat(value) >= 0 && /^\d*\.?\d{0,2}$/.test(value))) {
      setPlanPrice(value);
    }
  };

  const deleteSubscriptionPlan = async () => {
    if (deleteConfirmation !== isPlanToDelete.name) {
      toast.error('Please type the plan name correctly to confirm deletion');
      return;
    }

    try {
      setProcessing(true);
      const { error } = await supabase
        .from('subscription_plan')
        .delete()
        .eq('id', isPlanToDelete.id);

      if (error) {
        console.error('Error deleting subscription plan:', error);
        toast.error(error.message || 'Failed to delete subscription plan');
        return;
      }

      await fetchSubscriptionPlans();
      setIsPlanToDelete(null);
      setDeleteConfirmation('');
      closeModal();
      toast.success('Subscription plan deleted successfully');
    } catch (error) {
      console.error('Error deleting subscription plan:', error);
      toast.error(error.message || 'Failed to delete subscription plan');
    } finally {
      setProcessing(false);
    }
  };

  const fetchSubscriptionDistribution = async () => {
    try {
      // Get all subscription plans first
      const { data: plans, error: plansError } = await supabase
        .from('subscription_plan')
        .select('id, name, type')
        .order('id', { ascending: true });
      
      if (plansError) throw plansError;
      
      // Get active subscriptions
      const { data: subscriptions, error } = await supabase
        .from('user_subscription_plan')
        .select(`
          id,
          plan_id,
          plan:subscription_plan (
            id, name, type
          )
        `)
        .eq('status', 'ACTIVE');

      if (error) throw error;

      // Initialize distribution by type
      const distribution = {
        FREE: { count: 0, percentage: 0 },
        PRO: { count: 0, percentage: 0 },
        ENTERPRISE: { count: 0, percentage: 0 }
      };

      // Initialize distribution by name
      const distributionByName = {};
      plans.forEach(plan => {
        distributionByName[plan.name] = { 
          count: 0, 
          percentage: 0, 
          type: plan.type,
          id: plan.id
        };
      });

      // Count active subscriptions
      subscriptions.forEach(sub => {
        const planType = sub.plan?.type || 'FREE';
        const planName = sub.plan?.name || 'Unknown';
        
        // Update type distribution
        if (distribution[planType]) {
        distribution[planType].count++;
        }
        
        // Update name distribution
        if (distributionByName[planName]) {
          distributionByName[planName].count++;
        }
      });

      // Calculate percentages
      const total = subscriptions.length || 1; // Avoid division by zero
      
      // For type distribution
      Object.keys(distribution).forEach(type => {
        distribution[type].percentage = (distribution[type].count / total * 100).toFixed(1);
      });

      // For name distribution
      Object.keys(distributionByName).forEach(name => {
        distributionByName[name].percentage = (distributionByName[name].count / total * 100).toFixed(1);
      });

      return { distribution, distributionByName };
    } catch (error) {
      console.error('Error fetching subscription distribution:', error);
      return null;
    }
  };

  const fetchSubscriptionStats = async () => {
    try {
      const { data: activeSubscriptions, error: activeError } = await supabase
        .from('user_subscription_plan')
        .select('id, plan:subscription_plan(billing_interval)')
        .eq('status', 'ACTIVE');

      if (activeError) throw activeError;

      const { data: payments, error: paymentsError } = await supabase
        .from('payment')
        .select('amount')
        .eq('status', 'COMPLETED');

      if (paymentsError) throw paymentsError;

      const stats = {
        totalActive: activeSubscriptions.length,
        totalRevenue: payments.reduce((sum, payment) => sum + payment.amount, 0),
        monthly: activeSubscriptions.filter(sub => sub.plan?.billing_interval === 'MONTHLY').length,
        yearly: activeSubscriptions.filter(sub => sub.plan?.billing_interval === 'YEARLY').length
      };

      return stats;
    } catch (error) {
      console.error('Error fetching subscription stats:', error);
      return null;
    }
  };

  const fetchRecentActivity = async () => {
    try {
      const { data, error } = await supabase
        .from('payment')
        .select(`
          id,
          created_at,
          amount,
          status,
          user:user_id(name,email),
          metadata->planId
        `)
        .order('created_at', { ascending: false })
        .limit(3);

      if (error) throw error;

      return data.map(activity => ({
        id: activity.id,
        type: activity.status === 'COMPLETED' ? 'payment' : 'cancellation',
        userName: activity.user?.name || activity.user?.email || 'Unknown User',
        planName: activity.metadata?.planId || 'Unknown Plan',
        amount: activity.amount,
        timestamp: activity.created_at
      }));
    } catch (error) {
      console.error('Error fetching recent activity:', error);
      return [];
    }
  };

  const updateSubscriptionAnalytics = async () => {
    const [distributionData, stats, activity] = await Promise.all([
      fetchSubscriptionDistribution(),
      fetchSubscriptionStats(),
      fetchRecentActivity()
    ]);

    setSubscriptionStats({
      distribution: distributionData?.distribution || subscriptionStats.distribution,
      distributionByName: distributionData?.distributionByName || subscriptionStats.distributionByName,
      stats: stats || subscriptionStats.stats,
      recentActivity: activity || subscriptionStats.recentActivity
    });
  };

  useEffect(() => {
    updateSubscriptionAnalytics();
  }, [userSubscriptions]);

  const filteredUserSubscriptions = userSubscriptions.filter(sub => {
    const typeMatch = (planTypeFilter === 'all') || (sub.plan && sub.plan.type === planTypeFilter);
    const nameMatch = (planNameFilter === 'all') || (sub.plan && sub.plan.name === planNameFilter);
    return typeMatch && nameMatch;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
        {/* Main Content */}
        <div className="flex-1 overflow-auto p-6">
          {/* Skeleton Tabs */}
          <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
            <ul className="flex flex-wrap -mb-px">
              <li className="mr-2">
                <div className="inline-block py-2 px-4 text-gray-400 font-medium animate-pulse">
                  Subscription Plans
                </div>
              </li>
              <li className="mr-2">
                <div className="inline-block py-2 px-4 text-gray-400 font-medium animate-pulse">
                  Promo Codes
                </div>
              </li>
              <li className="mr-2">
                <div className="inline-block py-2 px-4 text-gray-400 font-medium animate-pulse">
                  User Subscriptions
                </div>
              </li>
              <li className="mr-2">
                <div className="inline-block py-2 px-4 text-gray-400 font-medium animate-pulse">
                  Payment History
                </div>
              </li>
            </ul>
          </div>

          {/* Subscription Plans Skeleton */}
          <div>
            <div className="mb-6 flex justify-between items-center">
              <div className="h-7 w-56 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden mb-8">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((item) => (
                        <th key={item} scope="col" className="px-6 py-3 text-left">
                          <div className="h-4 w-20 bg-gray-200 dark:bg-gray-600 rounded animate-pulse"></div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {[1, 2, 3, 4, 5].map((row) => (
                      <tr key={row}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="h-5 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2"></div>
                          <div className="h-4 w-40 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="h-5 w-16 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="h-5 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="h-5 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="space-y-2">
                            {[1, 2, 3].map((feat) => (
                              <div key={feat} className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="space-y-2">
                            {[1, 2, 3].map((limit) => (
                              <div key={limit} className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="h-5 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="h-5 w-16 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex justify-end space-x-3">
                            {[1, 2].map((action) => (
                              <div key={action} className="h-5 w-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
      
      
      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        
        {/* Subscription Managment Content */}
        {(hasPermission('view_subscription_plans') || 
          hasPermission('view_promo_codes') || 
          hasPermission('view_user_subscriptions') || 
          hasPermission('view_payment_history')) ? (
        <main className="p-6">
          {/* Tabs */}
          <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
            <ul className="flex flex-wrap -mb-px">
            {hasPermission('view_subscription_plans') && (
              <li className="mr-2">
                <button 
                  className={`inline-block py-2 px-4 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 font-medium ${activeTab === "subscriptionPlans" ? "text-indigo-600 border-b-2 border-indigo-600 dark:border-indigo-400" : ""}`}
                  onClick={() => setActiveTab("subscriptionPlans")}
                >
                  Subscription Plans
                </button>
              </li>
            )}
            {hasPermission('view_promo_codes') && (
              <li className="mr-2">
                <button 
                  className={`inline-block py-2 px-4 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 font-medium ${activeTab === "promoCodes" ? "text-indigo-600 border-b-2 border-indigo-600 dark:border-indigo-400" : ""}`}
                  onClick={() => setActiveTab("promoCodes")}
                >
                  Promo Codes
                </button>
              </li>
            )}
            {hasPermission('view_user_subscriptions') && (
              <li className="mr-2">
                <button 
                  className={`inline-block py-2 px-4 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 font-medium ${activeTab === "userSubscriptions" ? "text-indigo-600 border-b-2 border-indigo-600 dark:border-indigo-400" : ""}`}
                  onClick={() => setActiveTab("userSubscriptions")}
                >
                  User Subscriptions
                </button>
              </li>
            )}
            {hasPermission('view_payment_history') && (
              <li className="mr-2">
                <button 
                  className={`inline-block py-2 px-4 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 font-medium ${activeTab === "paymentHistory" ? "text-indigo-600 border-b-2 border-indigo-600 dark:border-indigo-400" : ""}`}
                  onClick={() => setActiveTab("paymentHistory")}
                >
                  Payment History
                </button>
              </li>
            )}
            </ul>
          </div>
          
          {/* Subscription Plans Section */}
          {hasPermission('view_subscription_plans') && activeTab === "subscriptionPlans" && (
            <div>
              <div className="mb-6 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Subscription Plans</h3>
                {hasPermission('add_sub_plans') && (
                  <button
                    onClick={() => openModal({ type: 'add' })}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm flex items-center space-x-2"
                  >
                    <FaPlus className="h-4 w-4" />
                    <span>Add New Plan</span>
                  </button>
                )}
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
                            {plan.billing_interval === 'MONTHLY' ? 'Monthly' : 
                             plan.billing_interval === 'YEARLY' ? 'Yearly' : '-'}
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
                              <div>Projects: {plan.max_projects === 0 ? 'Unlimited' : plan.max_projects}</div>
                              <div>Members: {plan.max_members === 0 ? 'Unlimited' : plan.max_members}</div>
                              <div>AI Chat: {plan.max_ai_chat === 0 ? 'Unlimited' : plan.max_ai_chat}</div>
                              <div>AI Task: {plan.max_ai_task === 0 ? 'Unlimited' : plan.max_ai_task}</div>
                              <div>AI Workflow: {plan.max_ai_workflow === 0 ? 'Unlimited' : plan.max_ai_workflow}</div>
                              <div>Storage: {plan.max_storage === 0 ? 'Unlimited' : plan.max_storage} GB</div>
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
                              {hasPermission('edit_sub_plans') && (
                              <button className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300" 
                                onClick={() => openModal({type: 'edit', plan})}
                              >
                                <FaEdit />
                              </button>
                              )}
                              {/* toggle active button */}
                              {hasPermission('toggle_sub_status') && (
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
                              )}
                              {/* delete button */}
                              {hasPermission('delete_sub_plans') && (
                              <button
                                onClick={() => {
                                  setIsPlanToDelete(plan);
                                  setModalType('delete');
                                  setIsModalOpen(true);
                                }}
                                className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                              >
                                <FaTrash />
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
          )}

          {/* Promo Codes Section */}
          {activeTab === "promoCodes" && (
            <div>
              <div className="mb-6 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Promo Codes</h3>
                
                <div className="flex space-x-2">
                  {hasPermission('add_promo_codes') && (
                  <button 
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm flex items-center space-x-2"
                    onClick={() => openModal({type: 'add'})}
                  >
                    <FaPlus className="mr-2" />
                    Add New Code
                  </button>
                  )}
                </div>
              </div>
              
              {/* Promo Codes Table */}
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
                            {formatDateRange(code.start_date, code.end_date)}
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
                              {hasPermission('edit_promo_codes') && (
                              <button className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                                onClick={() => openModal({type:'edit', code})}
                              >
                                <FaEdit />
                              </button>
                              )}
                              {/* toggle active button */}
                              {hasPermission('toggle_code_status') && (
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
                              )}
                              {/* delete button */}
                              {hasPermission('delete_promo_codes') && (
                              <button
                                onClick={() => {
                                  setIsCodeToDelete(code);
                                  setModalType('delete');
                                  setIsModalOpen(true);
                                }}
                                className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                              >
                                <FaTrash />
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
          )}

          {/* User Subscriptions Section */}
          {activeTab === "userSubscriptions" && (
            <div>
              <div className="mb-6 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white">User Subscriptions</h3>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    placeholder="Search by user email or name"
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                  />
                  <select 
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                    value={planTypeFilter}
                    onChange={(e) => setPlanTypeFilter(e.target.value)}
                  >
                    <option value="all">All Types</option>
                    <option value="FREE">Free</option>
                    <option value="PRO">Pro</option>
                    <option value="ENTERPRISE">Enterprise</option>
                  </select>
                  <select 
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                    value={planNameFilter}
                    onChange={(e) => setPlanNameFilter(e.target.value)}
                  >
                    <option value="all">All Plans</option>
                    {subscriptionPlans.map(plan => (
                      <option key={plan.id} value={plan.name}>{plan.name}</option>
                    ))}
                  </select>
                  <select 
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                    value={subscriptionStatusFilter}
                    onChange={(e) => setSubscriptionStatusFilter(e.target.value)}
                  >
                    <option value="all">All Status</option>
                    <option value="ACTIVE">Active</option>
                    <option value="CANCELED">Canceled</option>
                    <option value="EXPIRED">Expired</option>
                  </select>
                </div>
              </div>
              
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
                {filteredUserSubscriptions.length === 0 ? (
                  <div className="p-6 text-center">
                    <p className="text-gray-500 dark:text-gray-400">
                      {userSearchQuery || subscriptionStatusFilter !== 'all' || planTypeFilter !== 'all' 
                        ? 'No subscriptions found matching your filters.'
                        : 'No subscriptions found in the system.'}
                    </p>
                  </div>
                ) : (
                  <div className="overflow-hidden">
                  <div className="overflow-x-auto">
                      <div 
                        style={{ 
                          height: '480px',
                          scrollbarWidth: 'thin',
                          scrollbarColor: 'rgba(156, 163, 175, 0.5) transparent'
                        }} 
                        className="overflow-y-auto custom-scrollbar"
                      >
                        <style jsx>{`
                          .custom-scrollbar::-webkit-scrollbar {
                            width: 6px;
                          }
                          .custom-scrollbar::-webkit-scrollbar-track {
                            background: transparent;
                          }
                          .custom-scrollbar::-webkit-scrollbar-thumb {
                            background-color: rgba(156, 163, 175, 0.5);
                            border-radius: 20px;
                          }
                          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                            background-color: rgba(156, 163, 175, 0.7);
                          }
                          .dark .custom-scrollbar::-webkit-scrollbar-thumb {
                            background-color: rgba(75, 85, 99, 0.5);
                          }
                          .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                            background-color: rgba(75, 85, 99, 0.7);
                          }
                        `}</style>
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                          <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0 z-10">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            User
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Plan Name
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Plan Type
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Date Range
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Projects Usage
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Members Usage
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            AI Chat Usage
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            AI Task Usage
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            AI Workflow Usage
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
                        {filteredUserSubscriptions.map((subscription) => {
                          return (
                            <tr 
                              key={subscription.id} 
                              className={`${subscription.status.toUpperCase() !== 'ACTIVE' ? 'bg-gray-50 dark:bg-gray-900/50' : ''} cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700`}
                              onClick={() => openSubscriptionDetailsModal(subscription)}
                            >
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  {/* //TODO: CHANGE TO AVATAR */}
                                  <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white font-semibold">
                                    {(subscription.user?.name?.charAt(0) || subscription.user?.email?.charAt(0) || '?').toUpperCase()}
                                  </div>
                                  <div>
                                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                                      {subscription.user?.name || 'Unknown'}
                                    </div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400">
                                      {subscription.user?.email || 'No email'}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900 dark:text-white">
                                  {subscription.plan?.name || 'Unknown'}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                  ${subscription.plan?.type === 'FREE' ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' : 
                                    subscription.plan?.type === 'PRO' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' : 
                                    'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'}`}
                                >
                                  {subscription.plan?.type || 'Unknown'}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                {formatDateRange(subscription.start_date, subscription.end_date)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900 dark:text-white flex flex-col">
                                  <span className="mb-1">
                                    {subscription.current_projects} / {subscription.plan?.max_projects === 0 || subscription.plan?.max_projects === -1 ? '∞' : subscription.plan?.max_projects}
                                  </span>
                                  <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                    <div 
                                      className={`h-2 rounded-full ${
                                        subscription.current_projects / subscription.plan?.max_projects > 0.8 
                                          ? 'bg-red-500' 
                                          : subscription.current_projects / subscription.plan?.max_projects > 0.5 
                                          ? 'bg-yellow-500' 
                                          : 'bg-green-500'
                                      }`} 
                                      style={{ width: subscription.plan?.max_projects === 0 || subscription.plan?.max_projects === -1 ? '0%' : `${Math.min(100, (subscription.current_projects / subscription.plan?.max_projects * 100))}%` }}
                                    />
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900 dark:text-white flex flex-col">
                                  <span className="mb-1">
                                    {subscription.current_members} / {subscription.plan?.max_members === 0 || subscription.plan?.max_members === -1 ? '∞' : subscription.plan?.max_members}
                                  </span>
                                  <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                    <div 
                                      className={`h-2 rounded-full ${
                                        subscription.current_members / subscription.plan?.max_members > 0.8 
                                          ? 'bg-red-500' 
                                          : subscription.current_members / subscription.plan?.max_members > 0.5 
                                          ? 'bg-yellow-500' 
                                          : 'bg-green-500'
                                      }`} 
                                      style={{ width: subscription.plan?.max_members === 0 || subscription.plan?.max_members === -1 ? '0%' : `${Math.min(100, (subscription.current_members / subscription.plan?.max_members * 100))}%` }}
                                    />
                                  </div>
                                </div>
                              </td>
                              {/* AI Chat Usage */}
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900 dark:text-white flex flex-col">
                                  <span className="mb-1">
                                    {subscription.current_ai_chat || 0} / {subscription.plan?.max_ai_chat === 0 || subscription.plan?.max_ai_chat === -1 ? '∞' : subscription.plan?.max_ai_chat}
                                  </span>
                                  <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                    <div 
                                      className={`h-2 rounded-full ${
                                        (subscription.current_ai_chat || 0) / subscription.plan?.max_ai_chat > 0.8 
                                          ? 'bg-red-500' 
                                          : (subscription.current_ai_chat || 0) / subscription.plan?.max_ai_chat > 0.5 
                                          ? 'bg-yellow-500' 
                                          : 'bg-green-500'
                                      }`} 
                                      style={{ width: subscription.plan?.max_ai_chat === 0 || subscription.plan?.max_ai_chat === -1 ? '0%' : `${Math.min(100, ((subscription.current_ai_chat || 0) / subscription.plan?.max_ai_chat * 100))}%` }}
                                    />
                                  </div>
                                </div>
                              </td>
                              {/* AI Task Usage */}
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900 dark:text-white flex flex-col">
                                  <span className="mb-1">
                                    {subscription.current_ai_task || 0} / {subscription.plan?.max_ai_task === 0 || subscription.plan?.max_ai_task === -1 ? '∞' : subscription.plan?.max_ai_task}
                                  </span>
                                  <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                    <div 
                                      className={`h-2 rounded-full ${
                                        (subscription.current_ai_task || 0) / subscription.plan?.max_ai_task > 0.8 
                                          ? 'bg-red-500' 
                                          : (subscription.current_ai_task || 0) / subscription.plan?.max_ai_task > 0.5 
                                          ? 'bg-yellow-500' 
                                          : 'bg-green-500'
                                      }`} 
                                      style={{ width: subscription.plan?.max_ai_task === 0 || subscription.plan?.max_ai_task === -1 ? '0%' : `${Math.min(100, ((subscription.current_ai_task || 0) / subscription.plan?.max_ai_task * 100))}%` }}
                                    />
                                  </div>
                                </div>
                              </td>
                              {/* AI Workflow Usage */}
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900 dark:text-white flex flex-col">
                                  <span className="mb-1">
                                    {subscription.current_ai_workflow || 0} / {subscription.plan?.max_ai_workflow === 0 || subscription.plan?.max_ai_workflow === -1 ? '∞' : subscription.plan?.max_ai_workflow}
                                  </span>
                                  <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                    <div 
                                      className={`h-2 rounded-full ${
                                        (subscription.current_ai_workflow || 0) / subscription.plan?.max_ai_workflow > 0.8 
                                          ? 'bg-red-500' 
                                          : (subscription.current_ai_workflow || 0) / subscription.plan?.max_ai_workflow > 0.5 
                                          ? 'bg-yellow-500' 
                                          : 'bg-green-500'
                                      }`} 
                                      style={{ width: subscription.plan?.max_ai_workflow === 0 || subscription.plan?.max_ai_workflow === -1 ? '0%' : `${Math.min(100, ((subscription.current_ai_workflow || 0) / subscription.plan?.max_ai_workflow * 100))}%` }}
                                    />
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div>
                                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                    ${subscription.status.toUpperCase() === 'ACTIVE' 
                                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' 
                                      : subscription.status.toUpperCase() === 'CANCELED'
                                      ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                                      : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                                    }`}
                                  >
                                    {subscription.status.toUpperCase()}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <div className="flex justify-end space-x-3">
                                  <button 
                                    className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                                    title="Edit subscription"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                      setIsUserSubscriptionPlanSelected(subscription);
                                      setIsModalOpen(true);
                                      setModalType('edit');
                                    }}
                                  >
                                    <FaEdit />
                                  </button>
                                  {subscription.status.toUpperCase() === 'ACTIVE' ? (
                                    <button 
                                          onClick={(e) => {
                                              e.stopPropagation();
                                          // Update subscription status to CANCELED
                                          supabase
                                            .from('user_subscription_plan')
                                            .update({ 
                                              status: 'CANCELED',
                                              updated_at: new Date().toISOString()
                                            })
                                            .eq('id', subscription.id)
                                            .then(({error}) => {
                                              if(error) {
                                                console.error('Error canceling subscription:', error);
                                                toast.error(`Failed to cancel subscription for "${subscription.user?.name || 'user'}"`, {
                                                  description: error.message
                                                });
                                              } else {
                                                toast.success(`Subscription for "${subscription.user?.name || 'user'}" canceled successfully`);
                                                fetchUserSubscriptions();
                                              }
                                            });
                                      }}
                                      className={clsx(
                                        'text-2xl transition-colors duration-200',
                                        'text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300'
                                      )}
                                      title="Cancel subscription"
                                    >
                                      <FaToggleOn />
                                    </button>
                                  ) : (
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                          // Update subscription status to ACTIVE
                                          supabase
                                            .from('user_subscription_plan')
                                            .update({ 
                                              status: 'ACTIVE',
                                              updated_at: new Date().toISOString() 
                                            })
                                            .eq('id', subscription.id)
                                            .then(({error}) => {
                                              if(error) {
                                                console.error('Error reactivating subscription:', error);
                                                toast.error(`Failed to reactivate subscription for "${subscription.user?.name || 'user'}"`, {
                                                  description: error.message
                                                });
                                              } else {
                                                toast.success(`Subscription for "${subscription.user?.name || 'user'}" reactivated successfully`);
                                                fetchUserSubscriptions();
                                              }
                                            });
                                      }}
                                      className={clsx(
                                        'text-2xl transition-colors duration-200',
                                        'text-gray-400 hover:text-gray-500 dark:text-gray-600 dark:hover:text-gray-500'
                                      )}
                                      title="Reactivate subscription"
                                    >
                                      <FaToggleOff />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Pagination will be added when needed */}
              </div>
              
              {/* Subscription Analytics */}
              <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Distribution Card */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-base font-medium text-gray-800 dark:text-white">
                    Subscription Distribution
                  </h4>
                    <div className="flex items-center">
                      <select 
                        className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                        value={distributionViewMode}
                        onChange={(e) => setDistributionViewMode(e.target.value)}
                      >
                        <option value="type">By Type</option>
                        <option value="name">By Plan Name</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex flex-col space-y-4">
                    {distributionViewMode === 'type' ? (
                      // Display by type
                      Object.entries(subscriptionStats.distribution).map(([type, data]) => (
                      <div key={type}>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm text-gray-600 dark:text-gray-400">{type}</span>
                            <span className="text-sm text-gray-600 dark:text-gray-400">{data.count} ({data.percentage}%)</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              type === 'FREE' ? 'bg-gray-500' :
                              type === 'PRO' ? 'bg-blue-500' : 'bg-purple-500'
                            }`} 
                            style={{ width: `${data.percentage}%` }}
                          />
                        </div>
                      </div>
                      ))
                    ) : (
                      // Display by name
                      Object.entries(subscriptionStats.distributionByName || {}).map(([name, data]) => (
                        <div key={name}>
                          <div className="flex justify-between mb-1">
                            <div className="flex items-center">
                              <span className="text-sm text-gray-600 dark:text-gray-400">{name}</span>
                              <span className={`ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                ${data.type === 'FREE' ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' : 
                                  data.type === 'PRO' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' : 
                                  'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'}`}
                              >
                                {data.type}
                              </span>
                            </div>
                            <span className="text-sm text-gray-600 dark:text-gray-400">{data.count} ({data.percentage}%)</span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${
                                data.type === 'FREE' ? 'bg-gray-500' :
                                data.type === 'PRO' ? 'bg-blue-500' : 'bg-purple-500'
                              }`} 
                              style={{ width: `${data.percentage}%` }}
                            />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Stats Card */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
                  <h4 className="text-base font-medium text-gray-800 dark:text-white mb-4">
                    Subscription Stats
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Total Active</p>
                      <p className="text-2xl font-semibold text-gray-800 dark:text-white">
                        {subscriptionStats.stats.totalActive}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Total Revenue</p>
                      <p className="text-2xl font-semibold text-gray-800 dark:text-white">
                        RM {subscriptionStats.stats.totalRevenue.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Monthly Billing</p>
                      <p className="text-2xl font-semibold text-gray-800 dark:text-white">
                        {subscriptionStats.stats.monthly}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Yearly Billing</p>
                      <p className="text-2xl font-semibold text-gray-800 dark:text-white">
                        {subscriptionStats.stats.yearly}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Payment History Section */}
          {activeTab === "paymentHistory" && (
            <div>
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
                ) : filteredPayments.length === 0 ? (
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
                          {filteredPayments
                            .slice((currentPaymentPage - 1) * itemsPerPage, currentPaymentPage * itemsPerPage)
                            .map((payment) => (
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
                                    {parseFloat(payment.amount).toFixed(2)} {payment.currency}
                                  </div>
                                  {payment.discount_amount > 0 && (
                                    <div className="text-xs text-green-600 dark:text-green-400 flex flex-col">
                                      <span>Discount: ${parseFloat(payment.discount_amount).toFixed(2)}</span> 
                                      <span>Promo Code: {payment.applied_promo_code}</span> 
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
                          disabled={filteredPayments.length < itemsPerPage}
                          className={`ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                            filteredPayments.length < itemsPerPage
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
                            Showing <span className="font-medium">{filteredPayments.length > 0 ? (currentPaymentPage - 1) * itemsPerPage + 1 : 0}</span> to{' '}
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
            </div>
          )}
        </main>
        ) : (
        <div className="min-h-screen flex items-center justify-center w-full">
          <AccessRestrictedModal />
        </div>
        )}
      </div>

      {/* SUBSCRIPTION MODALS */}
      {/*TODO: add subscription plan modal*/}
      {isModalOpen && modalType === 'add' && activeTab === "subscriptionPlans" && (
        <div className='fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50'>
          <div className='bg-white dark:bg-gray-800 rounded-lg shadow-lg w-full max-w-md p-6 max-h-[90vh] overflow-y-auto'>
            <div className='flex justify-between items-center mb-4'>
              <h2 className='text-xl font-semibold text-gray-800 dark:text-white'>
                Add New Subscription Plan
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
              
              // Validate required fields
              if (!planName || !planType) {
                toast.error('Please fill in all required fields');
                return;
              }

              const price = parseFloat(planPrice);
              if (isNaN(price)) {
                toast.error('Please enter a valid price');
                return;
              }
              
              const planData = {
                name: planName,
                type: planType,
                price: price,
                billing_interval: planBilling === '' ? null : planBilling,
                description: description || '',
                features: { features: features },
                max_members: parseInt(planMaxMembers) || 0,
                max_projects: parseInt(planMaxProjects) || 0,
                max_teams: parseInt(planMaxTeams) || 0,
                max_ai_chat: parseInt(planMaxAiChat) || 0,
                max_ai_task: parseInt(planMaxAiTask) || 0,
                max_ai_workflow: parseInt(planMaxAiWorkflow) || 0,
                max_storage: parseInt(planMaxStorage) || 0,
                is_active: planIsActive === 'true',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              };
              
              // Add subscription plan logic
              addSubscriptionPlan(planData);
            }}>
              {currentModalPage === 1 ? (
                // Page 1: Basic Information
                <div className='space-y-4'>
                  <div>
                    <label htmlFor='add-name' className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                      Plan Name
                    </label>
                    <input
                      type='text'
                      id='add-name'
                      name='name'
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
                      placeholder='Enter price (e.g. 9.99)'
                      onChange={(e) => handlePriceChange(e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <label htmlFor='add-billing' className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                      Billing Interval
                    </label>
                    <select
                      id='add-billing'
                      name='billing_interval'
                      value={planBilling}
                      className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm shadow-sm
                        placeholder-gray-400 dark:placeholder-gray-500 dark:bg-gray-700 dark:text-white
                        focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                      onChange={(e) => setPlanBilling(e.target.value)}
                    >
                      <option value=''>None</option>
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
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddFeature();
                          }
                        }}
                        className='flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm'
                        placeholder='Type a feature and press Enter or click Add'
                      />
                      <button
                        type='button'
                        onClick={handleAddFeature}
                        disabled={!newFeature.trim()}
                        className={`px-4 py-2 text-white rounded-md text-sm flex items-center ${
                          !newFeature.trim() 
                            ? 'bg-gray-400 cursor-not-allowed' 
                            : 'bg-indigo-600 hover:bg-indigo-700'
                        }`}
                      >
                        <FaPlus className='h-4 w-4' />
                      </button>
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor='add-max-teams' className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                      Max Teams
                    </label>
                    <input
                      type='number'
                      id='add-max-teams'
                      name='max_teams'
                      required
                      min='0'
                      value={planMaxTeams}
                      className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm shadow-sm
                        placeholder-gray-400 dark:placeholder-gray-500 dark:bg-gray-700 dark:text-white
                        focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                      placeholder='Enter max teams (0 for unlimited)'
                      onChange={(e) => setPlanMaxTeams(e.target.value)}
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
                      min='0'
                      value={planMaxMembers}
                      className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm shadow-sm
                        placeholder-gray-400 dark:placeholder-gray-500 dark:bg-gray-700 dark:text-white
                        focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                      placeholder='Enter max members (0 for unlimited)'
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
                    <label htmlFor='add-max-storage' className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                      Max Storage (GB)
                    </label>
                    <input
                      type='number'
                      id='add-max-storage'
                      name='max_storage'
                      required
                      min='0'
                      value={planMaxStorage}
                      className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm shadow-sm
                        placeholder-gray-400 dark:placeholder-gray-500 dark:bg-gray-700 dark:text-white
                        focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                      placeholder='Enter storage limit in GB'
                      onChange={(e) => setPlanMaxStorage(e.target.value)}
                    />
                  </div>

                  <div>
                    <label htmlFor='add-max-ai-chat' className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                      Max AI Chat Messages
                    </label>
                    <input
                      type='number'
                      id='add-max-ai-chat'
                      name='max_ai_chat'
                      required
                      min='-1'
                      value={planMaxAiChat}
                      className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm shadow-sm
                        placeholder-gray-400 dark:placeholder-gray-500 dark:bg-gray-700 dark:text-white
                        focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                      placeholder='Enter max AI chat messages (-1 for unlimited)'
                      onChange={(e) => setPlanMaxAiChat(e.target.value)}
                    />
                  </div>

                  <div>
                    <label htmlFor='add-max-ai-task' className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                      Max AI Tasks
                    </label>
                    <input
                      type='number'
                      id='add-max-ai-task'
                      name='max_ai_task'
                      required
                      min='-1'
                      value={planMaxAiTask}
                      className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm shadow-sm
                        placeholder-gray-400 dark:placeholder-gray-500 dark:bg-gray-700 dark:text-white
                        focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                      placeholder='Enter max AI tasks (-1 for unlimited)'
                      onChange={(e) => setPlanMaxAiTask(e.target.value)}
                    />
                  </div>

                  <div>
                    <label htmlFor='add-max-ai-workflow' className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                      Max AI Workflows
                    </label>
                    <input
                      type='number'
                      id='add-max-ai-workflow'
                      name='max_ai_workflow'
                      required
                      min='-1'
                      value={planMaxAiWorkflow}
                      className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm shadow-sm
                        placeholder-gray-400 dark:placeholder-gray-500 dark:bg-gray-700 dark:text-white
                        focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                      placeholder='Enter max AI workflows (-1 for unlimited)'
                      onChange={(e) => setPlanMaxAiWorkflow(e.target.value)}
                    />
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
                        onClick={(e) => {
                          if (newFeature.trim()) {
                            e.preventDefault(); // 阻止表单提交
                            toast.error('You have an unsaved feature. Please click the Add button or clear the feature input before saving.', {
                              duration: 4000, // 显示4秒
                              description: `Unsaved feature: "${newFeature.trim()}"`,
                            });
                            return;
                          }
                        }}
                        className='px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium
                          text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2
                          focus:ring-offset-2 focus:ring-indigo-500'
                      >
                        Create Plan
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
              
              // Validate required fields
              if (!planName || !planType) {
                toast.error('Please fill in all required fields');
                return;
              }

              const price = parseFloat(planPrice);
              if (isNaN(price)) {
                toast.error('Please enter a valid price');
                return;
              }
              
              const planData = {
                name: planName,
                type: planType,
                price: price,
                billing_interval: planBilling === '' ? null : planBilling,
                description: description,
                features: { features: features },
                max_members: parseInt(planMaxMembers),
                max_projects: parseInt(planMaxProjects),
                max_teams: parseInt(planMaxTeams),
                max_ai_chat: parseInt(planMaxAiChat),
                max_ai_task: parseInt(planMaxAiTask),
                max_ai_workflow: parseInt(planMaxAiWorkflow),
                max_storage: parseInt(planMaxStorage),
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
                      placeholder='Enter price (e.g. 9.99)'
                      onChange={(e) => handlePriceChange(e.target.value)}
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
                      <option value=''>None</option>
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
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddFeature();
                          }
                        }}
                        className='flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm'
                        placeholder='Type a feature and press Enter or click Add'
                      />
                      <button
                        type='button'
                        onClick={handleAddFeature}
                        disabled={!newFeature.trim()}
                        className={`px-4 py-2 text-white rounded-md text-sm flex items-center ${
                          !newFeature.trim() 
                            ? 'bg-gray-400 cursor-not-allowed' 
                            : 'bg-indigo-600 hover:bg-indigo-700'
                        }`}
                      >
                        <FaPlus className='h-4 w-4' />
                      </button>
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor='edit-max-teams' className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                      Max Teams
                    </label>
                    <input
                      type='number'
                      id='edit-max-teams'
                      name='max_teams'
                      required
                      min='0'
                      value={planMaxTeams}
                      className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm shadow-sm
                        placeholder-gray-400 dark:placeholder-gray-500 dark:bg-gray-700 dark:text-white
                        focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                      placeholder='Enter max teams (0 for unlimited)'
                      onChange={(e) => setPlanMaxTeams(e.target.value)}
                    />
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
                      min='0'
                      value={planMaxMembers}
                      className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm shadow-sm
                        placeholder-gray-400 dark:placeholder-gray-500 dark:bg-gray-700 dark:text-white
                        focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                      placeholder='Enter max members (0 for unlimited)'
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
                    <label htmlFor='edit-max-storage' className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                      Max Storage (GB)
                    </label>
                    <input
                      type='number'
                      id='edit-max-storage'
                      name='max_storage'
                      required
                      min='0'
                      value={planMaxStorage}
                      className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm shadow-sm
                        placeholder-gray-400 dark:placeholder-gray-500 dark:bg-gray-700 dark:text-white
                        focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                      placeholder='Enter storage limit in GB'
                      onChange={(e) => setPlanMaxStorage(e.target.value)}
                    />
                  </div>

                  <div>
                    <label htmlFor='edit-max-ai-chat' className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                      Max AI Chat Messages
                    </label>
                    <input
                      type='number'
                      id='edit-max-ai-chat'
                      name='max_ai_chat'
                      required
                      min='-1'
                      value={planMaxAiChat}
                      className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm shadow-sm
                        placeholder-gray-400 dark:placeholder-gray-500 dark:bg-gray-700 dark:text-white
                        focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                      placeholder='Enter max AI chat messages (-1 for unlimited)'
                      onChange={(e) => setPlanMaxAiChat(e.target.value)}
                    />
                  </div>

                  <div>
                    <label htmlFor='edit-max-ai-task' className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                      Max AI Tasks
                    </label>
                    <input
                      type='number'
                      id='edit-max-ai-task'
                      name='max_ai_task'
                      required
                      min='-1'
                      value={planMaxAiTask}
                      className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm shadow-sm
                        placeholder-gray-400 dark:placeholder-gray-500 dark:bg-gray-700 dark:text-white
                        focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                      placeholder='Enter max AI tasks (-1 for unlimited)'
                      onChange={(e) => setPlanMaxAiTask(e.target.value)}
                    />
                  </div>

                  <div>
                    <label htmlFor='edit-max-ai-workflow' className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                      Max AI Workflows
                    </label>
                    <input
                      type='number'
                      id='edit-max-ai-workflow'
                      name='max_ai_workflow'
                      required
                      min='-1'
                      value={planMaxAiWorkflow}
                      className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm shadow-sm
                        placeholder-gray-400 dark:placeholder-gray-500 dark:bg-gray-700 dark:text-white
                        focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                      placeholder='Enter max AI workflows (-1 for unlimited)'
                      onChange={(e) => setPlanMaxAiWorkflow(e.target.value)}
                    />
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
                        onClick={(e) => {
                          if (newFeature.trim()) {
                            e.preventDefault(); // 阻止表单提交
                            toast.error('You have an unsaved feature. Please click the Add button or clear the feature input before saving.', {
                              duration: 4000, // 显示4秒
                              description: `Unsaved feature: "${newFeature.trim()}"`,
                            });
                            return;
                          }
                        }}
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

      {/* Add Promo Code Modal */}
      {isModalOpen && modalType === 'add' && activeTab === "promoCodes" && (
        <div className='fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50'>
          <div className='bg-white dark:bg-gray-800 rounded-lg shadow-lg w-full max-w-md p-6 max-h-[90vh] overflow-y-auto'>
            <div className='flex justify-between items-center mb-4'>
              <h2 className='text-xl font-semibold text-gray-800 dark:text-white'>
                Add New Promo Code
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
              
              // Validate form fields
              const codeError = validatePromoCode(codeName);
              const typeError = !codeType ? "Please select a discount type" : "";
              const valueError = validateDiscountValue(codeValue, codeType);
              const descError = validateDescription(codeDescription);
              const startError = validateStartDate(startDate);
              const endError = validateEndDate(endDate, startDate);
              const usesError = validateMaxUses(maxUses);
              
              // Update error states
              setCodeNameError(codeError);
              setCodeTypeError(typeError);
              setCodeValueError(valueError);
              setCodeDescriptionError(descError);
              setStartDateError(startError);
              setEndDateError(endError);
              setMaxUsesError(usesError);
              
              // Check if there are any errors
              if (codeError || typeError || valueError || descError || startError || endError || usesError) {
                return;
              }
              
              const codeData = {
                code: codeName,
                discount_type: codeType,
                discount_value: parseFloat(codeValue),
                start_date: new Date(startDate).toISOString(),
                end_date: new Date(endDate).toISOString(),
                description: codeDescription,
                is_active: codeIsActive === 'true',
                max_uses: parseInt(maxUses) || 0
              };
              
              // Add promo code logic
              addPromoCode(codeData).then(success => {
                if (success) {
                  closeModal();
                }
              });
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
                    value={codeName}
                    className={`w-full px-3 py-2 border rounded-md text-sm shadow-sm
                      placeholder-gray-400 dark:placeholder-gray-500 dark:bg-gray-700 dark:text-white
                      focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500
                      ${codeNameError ? 'border-red-300 dark:border-red-700 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                    placeholder='Enter promo code'
                    onChange={(e) => {
                      setCodeName(e.target.value);
                      if (codeNameError) {
                        setCodeNameError(validatePromoCode(e.target.value));
                      }
                    }}
                    onBlur={(e) => setCodeNameError(validatePromoCode(e.target.value))}
                  />
                  {codeNameError && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{codeNameError}</p>
                  )}
                </div>
                
                <div>
                  <label htmlFor='add-code-type' className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                    Discount Type
                  </label>
                  <select
                    id='add-code-type'
                    name='discount_type'
                    value={codeType}
                    className={`w-full px-3 py-2 border rounded-md text-sm shadow-sm
                      placeholder-gray-400 dark:placeholder-gray-500 dark:bg-gray-700 dark:text-white
                      focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500
                      ${codeTypeError ? 'border-red-300 dark:border-red-700 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                    onChange={(e) => {
                      setCodeType(e.target.value);
                      setCodeTypeError(e.target.value ? "" : "Please select a discount type");
                      // Re-validate discount value when type changes
                      if (codeValue) {
                        setCodeValueError(validateDiscountValue(codeValue, e.target.value));
                      }
                    }}
                    onBlur={() => setCodeTypeError(codeType ? "" : "Please select a discount type")}
                  >
                    <option value=''>Select discount type</option>
                    <option value='PERCENTAGE'>Percentage</option>
                    <option value='FIXED'>Fixed Amount</option>
                  </select>
                  {codeTypeError && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{codeTypeError}</p>
                  )}
                </div>
                
                <div>
                  <label htmlFor='add-code-value' className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                    Discount Value
                  </label>
                  <input
                    type='text'
                    id='add-code-value'
                    name='discount_value'
                    value={codeValue}
                    className={`w-full px-3 py-2 border rounded-md text-sm shadow-sm
                      placeholder-gray-400 dark:placeholder-gray-500 dark:bg-gray-700 dark:text-white
                      focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500
                      ${codeValueError ? 'border-red-300 dark:border-red-700 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                    placeholder={codeType === 'PERCENTAGE' ? 'Enter discount percentage' : 'Enter discount amount'}
                    onChange={(e) => {
                      setCodeValue(e.target.value);
                      if (codeValueError) {
                        setCodeValueError(validateDiscountValue(e.target.value, codeType));
                      }
                    }}
                    onBlur={(e) => setCodeValueError(validateDiscountValue(e.target.value, codeType))}
                  />
                  {codeValueError && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{codeValueError}</p>
                  )}
                </div>
                
                <div>
                  <label htmlFor='add-code-description' className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                    Description
                  </label>
                  <textarea
                    id='add-code-description'
                    name='description'
                    rows='3'
                    value={codeDescription}
                    className={`w-full px-3 py-2 border rounded-md text-sm shadow-sm
                      placeholder-gray-400 dark:placeholder-gray-500 dark:bg-gray-700 dark:text-white
                      focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500
                      ${codeDescriptionError ? 'border-red-300 dark:border-red-700 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                    placeholder='Enter promo code description'
                    onChange={(e) => {
                      setCodeDescription(e.target.value);
                      if (codeDescriptionError) {
                        setCodeDescriptionError(validateDescription(e.target.value));
                      }
                    }}
                    onBlur={(e) => setCodeDescriptionError(validateDescription(e.target.value))}
                  />
                  {codeDescriptionError && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{codeDescriptionError}</p>
                  )}
                </div>
                
                <div>
                  <label htmlFor='add-max-uses' className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                    Max Usage Count
                  </label>
                  <input
                    type='text'
                    id='add-max-uses'
                    name='max_uses'
                    value={maxUses}
                    className={`w-full px-3 py-2 border rounded-md text-sm shadow-sm
                      placeholder-gray-400 dark:placeholder-gray-500 dark:bg-gray-700 dark:text-white
                      focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500
                      ${maxUsesError ? 'border-red-300 dark:border-red-700 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                    placeholder='Enter maximum number of uses'
                    onChange={(e) => {
                      setMaxUses(e.target.value);
                      if (maxUsesError) {
                        setMaxUsesError(validateMaxUses(e.target.value));
                      }
                    }}
                    onBlur={(e) => setMaxUsesError(validateMaxUses(e.target.value))}
                  />
                  {maxUsesError ? (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{maxUsesError}</p>
                  ) : (
                    <p className="text-xs text-gray-500 mt-1">Enter 0 for unlimited uses</p>
                  )}
                </div>
                
                <div>
                  <label htmlFor='add-start-date' className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                    Start Date
                  </label>
                  <input
                    type='date'
                    id='add-start-date'
                    name='start_date'
                    value={startDate}
                    min={new Date().toISOString().split('T')[0]}
                    lang="en"
                    className={`w-full px-3 py-2 border rounded-md text-sm shadow-sm
                      placeholder-gray-400 dark:placeholder-gray-500 dark:bg-gray-700 dark:text-white
                      focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500
                      ${startDateError ? 'border-red-300 dark:border-red-700 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      if (startDateError) {
                        setStartDateError(validateStartDate(e.target.value));
                      }
                      // Re-validate end date when start date changes
                      if (endDate) {
                        setEndDateError(validateEndDate(endDate, e.target.value));
                      }
                    }}
                    onBlur={(e) => setStartDateError(validateStartDate(e.target.value))}
                  />
                  {startDateError && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{startDateError}</p>
                  )}
                </div>
                
                <div>
                  <label htmlFor='add-end-date' className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                    End Date
                  </label>
                  <input
                    type='date'
                    id='add-end-date'
                    name='end_date'
                    value={endDate}
                    min={startDate} 
                    lang="en"
                    className={`w-full px-3 py-2 border rounded-md text-sm shadow-sm
                      placeholder-gray-400 dark:placeholder-gray-500 dark:bg-gray-700 dark:text-white
                      focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500
                      ${endDateError ? 'border-red-300 dark:border-red-700 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      if (endDateError) {
                        setEndDateError(validateEndDate(e.target.value, startDate));
                      }
                    }}
                    onBlur={(e) => setEndDateError(validateEndDate(e.target.value, startDate))}
                  />
                  {endDateError && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{endDateError}</p>
                  )}
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
                  Add Promo Code
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Promo Code Modal */}
      {isModalOpen && modalType === 'delete' && isCodeToDelete && (
        <div className='fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50'>
          <div className='bg-white dark:bg-gray-800 rounded-lg shadow-lg w-full max-w-md p-6'>
            <div className='flex justify-between items-center mb-4'>
              <h2 className='text-xl font-semibold text-gray-800 dark:text-white'>Delete Promo Code</h2>
              <button
                onClick={closeModal}
                className='text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              >
                &times;
              </button>
            </div>
            <p className='text-gray-600 dark:text-gray-300 mb-4'>
              Are you sure you want to delete the promo code "{isCodeToDelete.code}"? This action cannot be undone.
            </p>
            <div className='flex justify-end space-x-3'>
              <button
                onClick={closeModal}
                className='px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium
                  text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600'
              >
                Cancel
              </button>
              <button
                onClick={deletePromoCode}
                className='px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium
                  text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2
                  focus:ring-offset-2 focus:ring-red-500'
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* promo code edit modal*/}
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
              
              // Validate form fields
              const codeError = validatePromoCode(codeName);
              const typeError = !codeType ? "Please select a discount type" : "";
              const valueError = validateDiscountValue(codeValue, codeType);
              const descError = validateDescription(codeDescription);
              // For edit mode, we allow the start date to be in the past if it was already set
              const startError = ""; // No validation for start date in edit mode
              const endError = validateEndDate(endDate, startDate);
              const usesError = validateMaxUses(maxUses);
              
              // Update error states
              setCodeNameError(codeError);
              setCodeTypeError(typeError);
              setCodeValueError(valueError);
              setCodeDescriptionError(descError);
              setEndDateError(endError);
              setMaxUsesError(usesError);
              
              // Check if there are any errors
              if (codeError || typeError || valueError || descError || endError || usesError) {
                return;
              }
              
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
                    value={codeName}
                    className={`w-full px-3 py-2 border rounded-md text-sm shadow-sm
                      placeholder-gray-400 dark:placeholder-gray-500 dark:bg-gray-700 dark:text-white
                      focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500
                      ${codeNameError ? 'border-red-300 dark:border-red-700 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                    placeholder='Enter promo code'
                    onChange={(e) => {
                      setCodeName(e.target.value);
                      if (codeNameError) {
                        setCodeNameError(validatePromoCode(e.target.value));
                      }
                    }}
                    onBlur={(e) => setCodeNameError(validatePromoCode(e.target.value))}
                  />
                  {codeNameError && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{codeNameError}</p>
                  )}
                </div>
                
                <div>
                  <label htmlFor='edit-code-type' className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                    Discount Type
                  </label>
                  <select
                    id='edit-code-type'
                    name='discount_type'
                    value={codeType}
                    className={`w-full px-3 py-2 border rounded-md text-sm shadow-sm
                      placeholder-gray-400 dark:placeholder-gray-500 dark:bg-gray-700 dark:text-white
                      focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500
                      ${codeTypeError ? 'border-red-300 dark:border-red-700 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                    onChange={(e) => {
                      setCodeType(e.target.value);
                      setCodeTypeError(e.target.value ? "" : "Please select a discount type");
                      // Re-validate discount value when type changes
                      if (codeValue) {
                        setCodeValueError(validateDiscountValue(codeValue, e.target.value));
                      }
                    }}
                    onBlur={() => setCodeTypeError(codeType ? "" : "Please select a discount type")}
                  >
                    <option value=''>Select discount type</option>
                    <option value='PERCENTAGE'>Percentage</option>
                    <option value='FIXED'>Fixed Amount</option>
                  </select>
                  {codeTypeError && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{codeTypeError}</p>
                  )}
                </div>
                
                <div>
                  <label htmlFor='edit-code-value' className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                    Discount Value
                  </label>
                  <input
                    type='text'
                    id='edit-code-value'
                    name='discount_value'
                    value={codeValue}
                    className={`w-full px-3 py-2 border rounded-md text-sm shadow-sm
                      placeholder-gray-400 dark:placeholder-gray-500 dark:bg-gray-700 dark:text-white
                      focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500
                      ${codeValueError ? 'border-red-300 dark:border-red-700 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                    placeholder={codeType === 'PERCENTAGE' ? 'Enter discount percentage' : 'Enter discount amount'}
                    onChange={(e) => {
                      setCodeValue(e.target.value);
                      if (codeValueError) {
                        setCodeValueError(validateDiscountValue(e.target.value, codeType));
                      }
                    }}
                    onBlur={(e) => setCodeValueError(validateDiscountValue(e.target.value, codeType))}
                  />
                  {codeValueError && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{codeValueError}</p>
                  )}
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
                    className={`w-full px-3 py-2 border rounded-md text-sm shadow-sm
                      placeholder-gray-400 dark:placeholder-gray-500 dark:bg-gray-700 dark:text-white
                      focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500
                      ${codeDescriptionError ? 'border-red-300 dark:border-red-700 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                    placeholder='Enter promo code description'
                    onChange={(e) => {
                      setCodeDescription(e.target.value);
                      if (codeDescriptionError) {
                        setCodeDescriptionError(validateDescription(e.target.value));
                      }
                    }}
                    onBlur={(e) => setCodeDescriptionError(validateDescription(e.target.value))}
                  />
                  {codeDescriptionError && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{codeDescriptionError}</p>
                  )}
                </div>
                
                <div>
                  <label htmlFor='edit-max-uses' className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                    Max Usage Count
                  </label>
                  <input
                    type='text'
                    id='edit-max-uses'
                    name='max_uses'
                    value={maxUses}
                    className={`w-full px-3 py-2 border rounded-md text-sm shadow-sm
                      placeholder-gray-400 dark:placeholder-gray-500 dark:bg-gray-700 dark:text-white
                      focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500
                      ${maxUsesError ? 'border-red-300 dark:border-red-700 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                    placeholder='Enter maximum number of uses'
                    onChange={(e) => {
                      setMaxUses(e.target.value);
                      if (maxUsesError) {
                        setMaxUsesError(validateMaxUses(e.target.value));
                      }
                    }}
                    onBlur={(e) => setMaxUsesError(validateMaxUses(e.target.value))}
                  />
                  {maxUsesError ? (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{maxUsesError}</p>
                  ) : (
                    <p className="text-xs text-gray-500 mt-1">Enter 0 for unlimited uses</p>
                  )}
                </div>
                
                <div>
                  <label htmlFor='edit-start-date' className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                    Start Date
                  </label>
                  <input
                    type='date'
                    id='edit-start-date'
                    name='start_date'
                    value={startDate}
                    lang="en"
                    className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm shadow-sm
                      placeholder-gray-400 dark:placeholder-gray-500 dark:bg-gray-700 dark:text-white
                      focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                    onChange={(e) => {
                      const newStartDate = e.target.value;
                      setStartDate(newStartDate);
                      
                      // Re-validate end date when start date changes
                      if (endDate) {
                        const endDateError = validateEndDate(endDate, newStartDate);
                        setEndDateError(endDateError);
                      }
                    }}
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
                    value={endDate}
                    min={startDate}
                    lang="en"
                    className={`w-full px-3 py-2 border rounded-md text-sm shadow-sm
                      placeholder-gray-400 dark:placeholder-gray-500 dark:bg-gray-700 dark:text-white
                      focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500
                      ${endDateError ? 'border-red-300 dark:border-red-700 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                    onChange={(e) => {
                      const newEndDate = e.target.value;
                      setEndDate(newEndDate);
                      
                      // Clear error if it exists and the new value is valid
                      if (endDateError) {
                        setEndDateError(validateEndDate(newEndDate, startDate));
                      }
                    }}
                    onBlur={(e) => {
                      const endDateError = validateEndDate(e.target.value, startDate);
                      setEndDateError(endDateError);
                    }}
                  />
                  {endDateError && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{endDateError}</p>
                  )}
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

      {/*User SubscriptionPlan edit modal*/}
      {isModalOpen && modalType === 'edit' && isUserSubscriptionPlanSelected && (
        <div className='fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50'>
          <div className='bg-white dark:bg-gray-800 rounded-lg shadow-lg w-full max-w-md p-6 max-h-[90vh] overflow-y-auto'>
            <div className='flex justify-between items-center mb-4'>
              <h2 className='text-xl font-semibold text-gray-800 dark:text-white'>
                Edit User Subscription
              </h2>
              <button
                onClick={closeModal}
                className='text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              >
                &times;
              </button>
            </div>
            
            <form onSubmit={async (e) => {
              e.preventDefault();
              
              try {
                setLoading(true);
                
                // Get form values
                const formData = new FormData(e.target);
                const updatedData = {
                  plan_id: parseInt(formData.get('plan_id')),
                  status: 'ACTIVE',
                  start_date: formData.get('start_date'),
                  end_date: formData.get('end_date'),
                  updated_at: new Date().toISOString()
                };
                
                // Get the plan name for the toast
                const planName = subscriptionPlans.find(p => p.id === updatedData.plan_id)?.name || 'plan';
                const userName = isUserSubscriptionPlanSelected.user?.name || 'user';
                
                // Update the subscription in the database
                const { data, error } = await supabase
                  .from('user_subscription_plan')
                  .update(updatedData)
                  .eq('id', isUserSubscriptionPlanSelected.id);
                
                if (error) {
                  console.error('Error updating user subscription:', error);
                  toast.error(`Failed to update subscription for "${userName}"`, {
                    description: error.message
                  });
                  return;
                }
                
                
                toast.success(`Subscription for "${userName}" updated to ${planName} successfully`);
                
                // Refresh the user subscriptions list
                await fetchUserSubscriptions();
                
                // Close the modal
                closeModal();
                
              } catch (error) {
                console.error('Error in form submission:', error);
                toast.error('An unexpected error occurred while updating the subscription');
              } finally {
                setLoading(false);
              }
            }}>
              <div className='space-y-4'>
                {/* User Info (Read-only) */}
                <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-md mb-2">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">User Information</h3>
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white font-semibold">
                      {(isUserSubscriptionPlanSelected.user?.name?.charAt(0) || isUserSubscriptionPlanSelected.user?.email?.charAt(0) || '?').toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {isUserSubscriptionPlanSelected.user?.name || 'Unknown'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {isUserSubscriptionPlanSelected.user?.email || 'No email'}
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Subscription Plan Selection */}
                <div>
                  <label htmlFor='subscription-plan' className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                    Subscription Plan
                  </label>
                  <select
                    id='subscription-plan'
                    name='plan_id'
                    required
                    defaultValue={isUserSubscriptionPlanSelected.plan_id}
                    className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm shadow-sm
                      placeholder-gray-400 dark:placeholder-gray-500 dark:bg-gray-700 dark:text-white
                      focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                  >
                    {subscriptionPlans.map(plan => (
                      <option key={plan.id} value={plan.id}>
                        {plan.name} ({plan.type}) : {formatCurrency(plan.price)}
                        {plan.billing_interval ? `/${plan.billing_interval.toLowerCase()}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
         
                {/* Start Date */}
                <div>
                  <label htmlFor='start-date' className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                    Start Date
                  </label>
                  <input
                    type='date'
                    id='start-date'
                    name='start_date'
                    required
                    lang="en"
                    defaultValue={new Date(isUserSubscriptionPlanSelected.start_date).toISOString().split('T')[0]}
                    className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm shadow-sm
                      placeholder-gray-400 dark:placeholder-gray-500 dark:bg-gray-700 dark:text-white
                      focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                  />
                </div>
                
                {/* End Date */}
                <div>
                  <label htmlFor='end-date' className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                    End Date
                  </label>
                  <input
                    type='date'
                    id='end-date'
                    name='end_date'
                    required
                    defaultValue={new Date(isUserSubscriptionPlanSelected.end_date).toISOString().split('T')[0]}
                    className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm shadow-sm
                      placeholder-gray-400 dark:placeholder-gray-500 dark:bg-gray-700 dark:text-white
                      focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                  />
                </div>
                
                {/* Subscription Info */}
                <div className="text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700 pt-3 mt-3">
                  <p>Subscription ID: {isUserSubscriptionPlanSelected.id}</p>
                  <p>Created: {formatDate(isUserSubscriptionPlanSelected.created_at)}</p>
                  <p>Last Updated: {formatDate(isUserSubscriptionPlanSelected.updated_at)}</p>
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

      {/* User Subscription Details Modal */}
      {isUserSubscriptionDetailsModalOpen && selectedSubscriptionDetails && (
        <div className='fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50'>
          <div className='bg-white dark:bg-gray-800 rounded-lg shadow-lg w-full max-w-3xl max-h-[90vh] flex flex-col p-6 overflow-hidden'>
            <div className='flex justify-between items-center mb-4'>
              <h2 className='text-xl font-semibold text-gray-800 dark:text-white'>
                Subscription Details
              </h2>
              <button
                onClick={closeSubscriptionDetailsModal}
                className='text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              >
                &times;
              </button>
            </div>
            
            <div className="space-y-6 overflow-y-auto pr-2">
              {/* User Information */}
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-3">User Information</h3>
                <div className="flex items-center space-x-4 mb-3">
                  <div className="w-12 h-12 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold text-xl">
                    {(selectedSubscriptionDetails.user?.name?.charAt(0) || selectedSubscriptionDetails.user?.email?.charAt(0) || '?').toUpperCase()}
                  </div>
                  <div>
                    <h4 className="text-lg font-medium text-gray-800 dark:text-white">
                      {selectedSubscriptionDetails.user?.name || 'Unknown User'}
                    </h4>
                    <p className="text-gray-600 dark:text-gray-400">
                      {selectedSubscriptionDetails.user?.email || 'No email available'}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">User ID</p>
                    <p className="text-gray-700 dark:text-gray-300">{selectedSubscriptionDetails.user_id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Joined</p>
                    <p className="text-gray-700 dark:text-gray-300">{formatDate(selectedSubscriptionDetails.user?.created_at || new Date())}</p>
                  </div>
                </div>
              </div>
              
              {/* Subscription Information */}
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-3">Subscription Information</h3>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Plan Name</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-gray-700 dark:text-gray-300">
                        {selectedSubscriptionDetails.plan?.name || 'Unknown'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Plan Type</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${selectedSubscriptionDetails.plan?.type === 'FREE' ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' : 
                          selectedSubscriptionDetails.plan?.type === 'PRO' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' : 
                          'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'}`}
                      >
                        {selectedSubscriptionDetails.plan?.type || 'Unknown'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Status</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${selectedSubscriptionDetails.status.toUpperCase() === 'ACTIVE' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' 
                          : selectedSubscriptionDetails.status.toUpperCase() === 'CANCELED'
                          ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                          : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                        }`}
                      >
                        {selectedSubscriptionDetails.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Start Date</p>
                    <p className="text-gray-700 dark:text-gray-300">{formatDate(selectedSubscriptionDetails.start_date)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">End Date</p>
                    <p className="text-gray-700 dark:text-gray-300">{formatDate(selectedSubscriptionDetails.end_date)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Price</p>
                    <p className="text-gray-700 dark:text-gray-300">
                      {formatCurrency(selectedSubscriptionDetails.plan?.price || 0)}
                      {selectedSubscriptionDetails.plan?.billing_interval && (
                        <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                          /{selectedSubscriptionDetails.plan?.billing_interval?.toLowerCase()}
                        </span>
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Subscription ID</p>
                    <p className="text-gray-700 dark:text-gray-300 text-xs truncate">{selectedSubscriptionDetails.id}</p>
                  </div>
                </div>
                <div className="border-t border-gray-200 dark:border-gray-600 pt-3">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Timeline</p>
                  <div className="space-y-2">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 h-4 w-4 rounded-full bg-green-400 mt-1"></div>
                      <div>
                        <p className="text-sm text-gray-700 dark:text-gray-300">Subscription created</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{formatDate(selectedSubscriptionDetails.created_at)}</p>
                      </div>
                    </div>
                    {selectedSubscriptionDetails.updated_at !== selectedSubscriptionDetails.created_at && (
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 h-4 w-4 rounded-full bg-blue-400 mt-1"></div>
                        <div>
                          <p className="text-sm text-gray-700 dark:text-gray-300">Last updated</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{formatDate(selectedSubscriptionDetails.updated_at)}</p>
                        </div>
                      </div>
                    )}
                    {selectedSubscriptionDetails.status.toUpperCase() === 'CANCELED' && (
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 h-4 w-4 rounded-full bg-red-400 mt-1"></div>
                        <div>
                          <p className="text-sm text-gray-700 dark:text-gray-300">Subscription canceled</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{formatDate(selectedSubscriptionDetails.updated_at)}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Usage Information */}
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-3">Usage & Limits</h3>
                <div className="space-y-4">
                  {/* Projects Usage */}
                  <div>
                    <div className="flex justify-between mb-1">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Projects</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {selectedSubscriptionDetails.current_projects} / {selectedSubscriptionDetails.plan?.max_projects === 0 || selectedSubscriptionDetails.plan?.max_projects === -1 ? '∞' : selectedSubscriptionDetails.plan?.max_projects}
                      </p>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2.5">
                      <div 
                        className={`h-2.5 rounded-full ${
                          selectedSubscriptionDetails.current_projects / selectedSubscriptionDetails.plan?.max_projects > 0.8 
                            ? 'bg-red-500' 
                            : selectedSubscriptionDetails.current_projects / selectedSubscriptionDetails.plan?.max_projects > 0.5 
                            ? 'bg-yellow-500' 
                            : 'bg-green-500'
                        }`} 
                        style={{ width: selectedSubscriptionDetails.plan?.max_projects === 0 || selectedSubscriptionDetails.plan?.max_projects === -1 ? '0%' : `${Math.min(100, (selectedSubscriptionDetails.current_projects / selectedSubscriptionDetails.plan?.max_projects * 100))}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  {/* Members Usage */}
                  <div>
                    <div className="flex justify-between mb-1">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Team Members</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {selectedSubscriptionDetails.current_members} / {selectedSubscriptionDetails.plan?.max_members === 0 || selectedSubscriptionDetails.plan?.max_members === -1 ? '∞' : selectedSubscriptionDetails.plan?.max_members}
                      </p>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2.5">
                      <div 
                        className={`h-2.5 rounded-full ${
                          selectedSubscriptionDetails.current_members / selectedSubscriptionDetails.plan?.max_members > 0.8 
                            ? 'bg-red-500' 
                            : selectedSubscriptionDetails.current_members / selectedSubscriptionDetails.plan?.max_members > 0.5 
                            ? 'bg-yellow-500' 
                            : 'bg-green-500'
                        }`} 
                        style={{ width: selectedSubscriptionDetails.plan?.max_members === 0 || selectedSubscriptionDetails.plan?.max_members === -1 ? '0%' : `${Math.min(100, (selectedSubscriptionDetails.current_members / selectedSubscriptionDetails.plan?.max_members * 100))}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  {/* AI Chat Usage */}
                  <div>
                    <div className="flex justify-between mb-1">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">AI Chat</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {selectedSubscriptionDetails.current_ai_chat || 0} / {selectedSubscriptionDetails.plan?.max_ai_chat === 0 || selectedSubscriptionDetails.plan?.max_ai_chat === -1 ? '∞' : selectedSubscriptionDetails.plan?.max_ai_chat}
                      </p>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2.5">
                      <div 
                        className={`h-2.5 rounded-full ${
                          (selectedSubscriptionDetails.current_ai_chat || 0) / selectedSubscriptionDetails.plan?.max_ai_chat > 0.8 
                            ? 'bg-red-500' 
                            : (selectedSubscriptionDetails.current_ai_chat || 0) / selectedSubscriptionDetails.plan?.max_ai_chat > 0.5 
                            ? 'bg-yellow-500' 
                            : 'bg-green-500'
                        }`} 
                        style={{ width: selectedSubscriptionDetails.plan?.max_ai_chat === 0 || selectedSubscriptionDetails.plan?.max_ai_chat === -1 ? '0%' : `${Math.min(100, ((selectedSubscriptionDetails.current_ai_chat || 0) / selectedSubscriptionDetails.plan?.max_ai_chat * 100))}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* AI Task Usage */}
                  <div>
                    <div className="flex justify-between mb-1">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">AI Task</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {selectedSubscriptionDetails.current_ai_task || 0} / {selectedSubscriptionDetails.plan?.max_ai_task === 0 || selectedSubscriptionDetails.plan?.max_ai_task === -1 ? '∞' : selectedSubscriptionDetails.plan?.max_ai_task}
                      </p>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2.5">
                      <div 
                        className={`h-2.5 rounded-full ${
                          (selectedSubscriptionDetails.current_ai_task || 0) / selectedSubscriptionDetails.plan?.max_ai_task > 0.8 
                            ? 'bg-red-500' 
                            : (selectedSubscriptionDetails.current_ai_task || 0) / selectedSubscriptionDetails.plan?.max_ai_task > 0.5 
                            ? 'bg-yellow-500' 
                            : 'bg-green-500'
                        }`} 
                        style={{ width: selectedSubscriptionDetails.plan?.max_ai_task === 0 || selectedSubscriptionDetails.plan?.max_ai_task === -1 ? '0%' : `${Math.min(100, ((selectedSubscriptionDetails.current_ai_task || 0) / selectedSubscriptionDetails.plan?.max_ai_task * 100))}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* AI Workflow Usage */}
                  <div>
                    <div className="flex justify-between mb-1">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">AI Workflow</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {selectedSubscriptionDetails.current_ai_workflow || 0} / {selectedSubscriptionDetails.plan?.max_ai_workflow === 0 || selectedSubscriptionDetails.plan?.max_ai_workflow === -1 ? '∞' : selectedSubscriptionDetails.plan?.max_ai_workflow}
                      </p>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2.5">
                      <div 
                        className={`h-2.5 rounded-full ${
                          (selectedSubscriptionDetails.current_ai_workflow || 0) / selectedSubscriptionDetails.plan?.max_ai_workflow > 0.8 
                            ? 'bg-red-500' 
                            : (selectedSubscriptionDetails.current_ai_workflow || 0) / selectedSubscriptionDetails.plan?.max_ai_workflow > 0.5 
                            ? 'bg-yellow-500' 
                            : 'bg-green-500'
                        }`} 
                        style={{ width: selectedSubscriptionDetails.plan?.max_ai_workflow === 0 || selectedSubscriptionDetails.plan?.max_ai_workflow === -1 ? '0%' : `${Math.min(100, ((selectedSubscriptionDetails.current_ai_workflow || 0) / selectedSubscriptionDetails.plan?.max_ai_workflow * 100))}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-6 flex justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
              <div>
                {selectedSubscriptionDetails.status.toUpperCase() === 'ACTIVE' ? (
                  <button 
                    onClick={() => {
                        // Update subscription status to CANCELED
                        supabase
                          .from('user_subscription_plan')
                          .update({ 
                            status: 'CANCELED',
                            updated_at: new Date().toISOString()
                          })
                          .eq('id', selectedSubscriptionDetails.id)
                          .then(({error}) => {
                            if(error) {
                              console.error('Error canceling subscription:', error);
                              toast.error(`Failed to cancel subscription for "${selectedSubscriptionDetails.user?.name || 'user'}"`, {
                                description: error.message
                              });
                            } else {
                              toast.success(`Subscription for "${selectedSubscriptionDetails.user?.name || 'user'}" canceled successfully`);
                              fetchUserSubscriptions();
                              closeSubscriptionDetailsModal();
                            }
                          });
                    }}
                    className="px-4 py-2 border border-red-500 text-red-500 rounded-md text-sm hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    Cancel Subscription
                  </button>
                ) : (
                  <button 
                    onClick={() => {
                        // Update subscription status to ACTIVE
                        supabase
                          .from('user_subscription_plan')
                          .update({ 
                            status: 'ACTIVE',
                            updated_at: new Date().toISOString() 
                          })
                          .eq('id', selectedSubscriptionDetails.id)
                          .then(({error}) => {
                            if(error) {
                              console.error('Error reactivating subscription:', error);
                              toast.error(`Failed to reactivate subscription for "${selectedSubscriptionDetails.user?.name || 'user'}"`, {
                                description: error.message
                              });
                            } else {
                              toast.success(`Subscription for "${selectedSubscriptionDetails.user?.name || 'user'}" reactivated successfully`);
                              fetchUserSubscriptions();
                              closeSubscriptionDetailsModal();
                            }
                          });
                    }}
                    className="px-4 py-2 border border-green-500 text-green-500 rounded-md text-sm hover:bg-green-50 dark:hover:bg-green-900/20"
                  >
                    Reactivate Subscription
                  </button>
                )}
              </div>
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={closeSubscriptionDetailsModal}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsUserSubscriptionPlanSelected(selectedSubscriptionDetails);
                    setIsModalOpen(true);
                    setModalType('edit');
                    closeSubscriptionDetailsModal();
                  }}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium
                    text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2
                    focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Edit Subscription
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Subscription Plan Modal */}
      {isModalOpen && modalType === 'delete' && activeTab === "subscriptionPlans" && (
        <div className='fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50'>
          <div className='bg-white dark:bg-gray-800 rounded-lg shadow-lg w-full max-w-md p-6'>
            <div className='flex justify-between items-center mb-4'>
              <h2 className='text-xl font-semibold text-gray-800 dark:text-white'>Delete Subscription Plan</h2>
              <button
                onClick={closeModal}
                className='text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              >
                &times;
              </button>
            </div>
            
            <div className='space-y-4'>
              <div className='flex items-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-100 dark:border-red-800'>
                <div className='flex-shrink-0 mr-3 text-red-500 dark:text-red-400'>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h3 className='text-sm font-medium text-red-800 dark:text-red-200'>Warning: This action cannot be undone</h3>
                  <p className='mt-1 text-sm text-red-700 dark:text-red-300'>
                    You are about to permanently delete this subscription plan and all associated data.
                  </p>
                </div>
              </div>

              <div className='p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-100 dark:border-yellow-800'>
                <p className='text-sm text-yellow-700 dark:text-yellow-300'>
                  To confirm deletion, please type <strong>{isPlanToDelete?.name}</strong> below:
                </p>
                <input
                  type='text'
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value)}
                  className='mt-2 w-full px-3 py-2 border border-yellow-300 dark:border-yellow-700 rounded-md text-sm
                    placeholder-yellow-500 dark:placeholder-yellow-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                    focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500'
                  placeholder={`Type ${isPlanToDelete?.name} to confirm`}
                />
              </div>
            </div>
            
            <div className='mt-6 flex justify-end space-x-3'>
              <button
                type='button'
                onClick={closeModal}
                disabled={processing}
                className='px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium
                  text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600'
              >
                Cancel
              </button>
              
              <button
                type='button'
                onClick={deleteSubscriptionPlan}
                disabled={processing}
                className='px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium
                  text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2
                  focus:ring-offset-2 focus:ring-red-500'
              >
                {processing ? (
                  <>
                    <span className="inline-block animate-spin h-4 w-4 border-t-2 border-b-2 border-white rounded-full mr-2"></span>
                    Deleting...
                  </>
                ) : 'Delete Subscription Plan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
