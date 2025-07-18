// 只导出存在的组件
// 如果没有任何组件，可以导出一个空对象或占位组件
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import SubscriptionStatus from './SubscriptionStatus';
import PaymentMethodManager from './PaymentMethodManager';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { supabase } from '@/lib/supabase';
import { useUserStatus } from '@/contexts/UserStatusContext';
import { RefreshCw, Download, Receipt, ArrowUpCircle, CheckCircle, ExternalLink } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { fetchPlans, selectAllPlans } from '@/lib/redux/features/planSlice';
import useGetUser from '@/lib/hooks/useGetUser';
import { Skeleton } from '@/components/ui/skeleton';

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

// Reusable skeleton component for usage stats
const UsageStatsSkeleton = () => (
  <div className="p-6 border rounded-md space-y-6 border-border dark:border-border/40 bg-card dark:bg-card/90">
    <div className="flex justify-between items-center">
      <div>
        <Skeleton className="h-6 w-48 mb-2" />
        <Skeleton className="h-4 w-64" />
      </div>
      <Skeleton className="h-9 w-24 rounded-md" />
    </div>
    
    <div className="space-y-6 pt-4">
      {/* Project Usage Skeleton */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-2.5 w-full rounded-full" />
      </div>
      
      {/* Team Usage Skeleton */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-28" />
        </div>
        <Skeleton className="h-2.5 w-full rounded-full" />
      </div>
      
      {/* Members Usage Skeleton */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-36" />
        </div>
        <Skeleton className="h-2.5 w-full rounded-full" />
      </div>
      
      {/* AI Chat Credits Skeleton */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-2.5 w-full rounded-full" />
      </div>
      
      {/* AI Task Credits Skeleton */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-2.5 w-full rounded-full" />
      </div>
      
      {/* AI Workflow Credits Skeleton */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-2.5 w-full rounded-full" />
      </div>
      
    </div>
  </div>
);

// Reusable skeleton component for plan cards
const PlanCardsSkeleton = () => (
  <div className="p-6 border rounded-md space-y-6 border-border dark:border-border/40 bg-card dark:bg-card/90">
    <div>
      <Skeleton className="h-6 w-48 mb-2" />
      <Skeleton className="h-4 w-64" />
    </div>
    
    {/* Billing interval toggle skeleton */}
    <div className="flex justify-center mb-8">
      <Skeleton className="h-10 w-48 rounded-md" />
    </div>
    
    {/* Plan cards skeleton */}
    <div className="grid md:grid-cols-2 gap-6">
      {[1, 2].map((i) => (
        <div key={i} className="border rounded-lg p-6 space-y-4 border-border dark:border-border/40 bg-background dark:bg-background/60">
          <Skeleton className="h-7 w-32 mb-2" />
          <div>
            <Skeleton className="h-8 w-24 inline-block" />
            <Skeleton className="h-4 w-24 inline-block ml-2" />
          </div>
          
          <div className="space-y-3 py-4">
            <div className="flex items-start gap-2">
              <Skeleton className="h-5 w-5 rounded-full flex-shrink-0" />
              <Skeleton className="h-5 w-full" />
            </div>
            <div className="flex items-start gap-2">
              <Skeleton className="h-5 w-5 rounded-full flex-shrink-0" />
              <Skeleton className="h-5 w-3/4" />
            </div>
            <div className="flex items-start gap-2">
              <Skeleton className="h-5 w-5 rounded-full flex-shrink-0" />
              <Skeleton className="h-5 w-5/6" />
            </div>
          </div>
          
          <Skeleton className="h-10 w-full rounded-md mt-4" />
        </div>
      ))}
    </div>
    
    <div className="text-center pt-6 border-t mt-8 border-border dark:border-border/40">
      <Skeleton className="h-4 w-64 mx-auto mb-3" />
      <Skeleton className="h-9 w-40 mx-auto rounded-md" />
    </div>
  </div>
);

// Reusable skeleton for payment history
const PaymentHistorySkeleton = () => (
  <div className="space-y-4">
    <div className="flex justify-between items-center mb-4">
      <div>
        <Skeleton className="h-6 w-40 mb-2" />
        <Skeleton className="h-4 w-60" />
      </div>
      <Skeleton className="h-9 w-24 rounded-md" />
    </div>
    
    <div className="border rounded-md border-border dark:border-border/40 overflow-hidden">
      <div className="p-4 border-b border-border dark:border-border/40 bg-muted/40 dark:bg-muted/20">
        <div className="flex gap-4">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      
      <div className="divide-y divide-border dark:divide-border/40">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex items-center justify-between p-4">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-5 w-20" />
            <div className="flex items-center space-x-1">
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-8 w-32 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  </div>
);

// Export the SubscriptionCard component that uses our actual components
export const SubscriptionCard = () => {
  const t = useTranslations('profile');
  
  return (
    <div className="space-y-8">
      {/* Current Subscription Status */}
      <SubscriptionStatus />
      
      {/* Payment Methods */}
      <div className="payment-methods-section">
        <Elements stripe={stripePromise}>
          <PaymentMethodManager />
        </Elements>
      </div>
    </div>
  );
};

export const UsageStats = () => {
  const t = useTranslations('profile');
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [usageData, setUsageData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useGetUser();
  
  const fetchUsageStats = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      if (!user?.id) {
        throw new Error('User not authenticated');
      }
      
      // Get the user's active subscription plan
      const { data: subscriptionData, error: subscriptionError } = await supabase
        .from('user_subscription_plan')
        .select(`
          id,
          plan_id,
          current_projects,
          current_teams,
          current_members,
          current_ai_chat,
          current_ai_task,
          current_ai_workflow,
          subscription_plan (
            max_projects,
            max_teams,
            max_members,
            max_ai_chat,
            max_ai_task,
            max_ai_workflow
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'ACTIVE')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (subscriptionError) {
        throw subscriptionError;
      }
      
      if (!subscriptionData) {
        throw new Error('No active subscription found');
      }
      
      // Calculate percentages and format the data
      const stats = {
        projects: {
          current: subscriptionData.current_projects || 0,
          limit: subscriptionData.subscription_plan.max_projects,
          percentage: calculatePercentage(
            subscriptionData.current_projects || 0,
            subscriptionData.subscription_plan.max_projects
          )
        },
        teams: {
          current: subscriptionData.current_teams || 0,
          limit: subscriptionData.subscription_plan.max_teams,
          percentage: calculatePercentage(
            subscriptionData.current_teams || 0,
            subscriptionData.subscription_plan.max_teams
          )
        },
        members: {
          current: subscriptionData.current_members || 0,
          limit: subscriptionData.subscription_plan.max_members,
          percentage: calculatePercentage(
            subscriptionData.current_members || 0,
            subscriptionData.subscription_plan.max_members
          )
        },
        aiChat: {
          current: subscriptionData.current_ai_chat || 0,
          limit: subscriptionData.subscription_plan.max_ai_chat,
          percentage: calculatePercentage(
            subscriptionData.current_ai_chat || 0,
            subscriptionData.subscription_plan.max_ai_chat
          )
        },
        aiTask: {
          current: subscriptionData.current_ai_task || 0,
          limit: subscriptionData.subscription_plan.max_ai_task,
          percentage: calculatePercentage(
            subscriptionData.current_ai_task || 0,
            subscriptionData.subscription_plan.max_ai_task
          )
        },
        aiWorkflow: {
          current: subscriptionData.current_ai_workflow || 0,
          limit: subscriptionData.subscription_plan.max_ai_workflow,
          percentage: calculatePercentage(
            subscriptionData.current_ai_workflow || 0,
            subscriptionData.subscription_plan.max_ai_workflow
          )
        }
      };
      
      setUsageData(stats);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching usage stats:', err);
      setError(err.message);
      toast.error(t('subscription.usageStats.fetchError'), {
        description: err.message
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Calculate percentage helper function
  const calculatePercentage = (current, limit) => {
    if (!limit || limit === 0) return 0;
    return Math.round((current / limit) * 100);
  };
  
  // Helper function to format the limit display
  const formatLimit = (current, limit, unit = '') => {
    if (!limit || limit === 0) {
      return `${current}${unit} / Unlimited`;
    }
    return `${current}${unit} / ${limit}${unit} (${calculatePercentage(current, limit)}%)`;
  };
  
  // Fetch stats when component mounts or user changes
  useEffect(() => {
    if (user?.id) {
      fetchUsageStats();
    }
  }, [user?.id]);
  
  const refreshStats = () => {
    const toastId = toast.loading(t('refreshingStats'));
    fetchUsageStats().then(() => {
      toast.dismiss(toastId);
      toast.success(t('statsRefreshed'));
    }).catch((error) => {
      toast.dismiss(toastId);
      toast.error(t('subscription.usageStats.fetchError'), {
        description: error.message
      });
    });
  };
  
  const formatLastUpdated = (date) => {
    return date.toLocaleString();
  };
  
  if (isLoading) {
    return <UsageStatsSkeleton />;
  }
  
  if (error) {
    return (
      <div className="p-6 border rounded-md space-y-6 border-border dark:border-border/40 bg-card dark:bg-card/90">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-medium">{t('subscription.usageStats.title')}</h3>
            <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
          </div>
          <Button variant="outline" onClick={fetchUsageStats} size="sm">
            {t('subscription.usageStats.retry')}
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="p-6 border rounded-md space-y-6 border-border dark:border-border/40 bg-card dark:bg-card/90">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">{t('subscription.usageStats.title')}</h3>
          <p className="text-sm text-muted-foreground">{t('subscription.usageStats.lastUpdated')}: {formatLastUpdated(lastUpdated)}</p>
        </div>
        <Button variant="outline" onClick={refreshStats} size="sm">
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          {t('subscription.usageStats.refresh')}
        </Button>
      </div>
      
      {usageData && (
        <div className="space-y-4">
          {Object.entries(usageData).map(([key, data]) => (
            <div key={key} className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium">{t(`subscription.usageStats.${key}`)}</span>
                <span>
                  {formatLimit(data.current, data.limit, data.unit || '')}
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                {data.limit === 0 ? (
                  <div className="h-2.5 rounded-full bg-blue-500 dark:bg-blue-600" style={{ width: '100%' }}></div>
                ) : (
                  <div 
                    className={`h-2.5 rounded-full ${
                      data.percentage > 80 
                        ? 'bg-red-500 dark:bg-red-600' 
                        : data.percentage > 60 
                          ? 'bg-yellow-500 dark:bg-yellow-600' 
                          : 'bg-green-500 dark:bg-emerald-600'
                    }`} 
                    style={{ width: `${data.percentage}%` }}
                  ></div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const PaymentHistory = () => {
  const t = useTranslations('profile');
  const [payments, setPayments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useGetUser();
  
  useEffect(() => {
    if (user?.id) {
      fetchPaymentHistory(user.id);
    }
  }, [user?.id]);
  
  const fetchPaymentHistory = async (userId) => {
    if (!userId) return;
    
    const toastId = toast.loading(t('subscription.paymentHistory.loading'));
    try {
      setIsLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('payment')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) {
        throw new Error(error.message);
      }
      
      setPayments(data || []);
      toast.dismiss(toastId);
      toast.success(t('subscription.paymentHistory.loaded'));
    } catch (err) {
      console.error('Error fetching payment history:', err);
      setError(err.message);
      toast.dismiss(toastId);
      toast.error(t('subscription.paymentHistory.error'), {
        description: err.message
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const downloadInvoice = async (id) => {
    const toastId = toast.loading(t('preparingInvoice'));
    
    try {
      // First verify the invoice can be generated
      const checkResponse = await fetch(`/api/payment/invoice?id=${id}`, {
        method: 'HEAD'
      });
      
      if (!checkResponse.ok) {
        throw new Error('Failed to access invoice data');
      }
      
      // Create URL for invoice download and open in new tab
      const invoiceUrl = `/api/payment/invoice?id=${id}`;
      const newWindow = window.open(invoiceUrl, '_blank');
      
      // Check if window was blocked by popup blocker
      if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
        throw new Error(t('subscription.paymentHistory.popupBlocked') || 'Popup blocked. Please allow popups for this site');
      }
      
      toast.dismiss(toastId);
      toast.success(t('invoiceReady'));
    } catch (error) {
      console.error('Error downloading invoice:', error);
      toast.dismiss(toastId);
      toast.error(t('subscription.paymentHistory.invoiceError') || 'Failed to download invoice', {
        description: error.message || 'Please try again later'
      });
    }
  };
  
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };
  
  const formatCurrency = (amount, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };
  
  const getStatusBadge = (status) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
      case 'PENDING':
        return 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800';
      case 'FAILED':
        return 'bg-rose-100 dark:bg-rose-900/30 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800';
      default:
        return 'bg-slate-100 dark:bg-slate-800/60 text-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    }
  };
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-medium">{t('subscription.paymentHistory.title')}</h3>
          <p className="text-sm text-muted-foreground">{t('subscription.description')}</p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => user?.id && fetchPaymentHistory(user.id)}
          disabled={isLoading || !user?.id}
          className="ml-auto"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          {t('refresh')}
        </Button>
      </div>
      
      {error && (
        <div className="p-4 bg-destructive/10 dark:bg-destructive/20 text-destructive dark:text-destructive/90 rounded-md">
          <p>{t('error')}: {error}</p>
          <Button 
            variant="link" 
            size="sm" 
            onClick={fetchPaymentHistory}
            className="mt-2 text-destructive dark:text-destructive/90"
          >
            {t('retry')}
          </Button>
        </div>
      )}
      
      {isLoading ? (
        <PaymentHistorySkeleton />
      ) : payments.length > 0 ? (
        <div className="border rounded-md border-border dark:border-border/40">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 dark:bg-muted/20">
                  <th className="px-4 py-3 text-left font-medium">{t('subscription.paymentHistory.date')}</th>
                  <th className="px-4 py-3 text-left font-medium">{t('subscription.paymentHistory.amount')}</th>
                  <th className="px-4 py-3 text-left font-medium">{t('subscription.paymentHistory.status')}</th>
                  <th className="px-4 py-3 text-left font-medium">{t('subscription.paymentHistory.paymentMethod')}</th>
                  <th className="px-4 py-3 text-left font-medium">{t('subscription.paymentHistory.invoice')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border dark:divide-border/40">
                {payments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-muted/50 dark:hover:bg-muted/10">
                    <td className="px-4 py-3 whitespace-nowrap">{formatDate(payment.created_at)}</td>
                    <td className="px-4 py-3">
                      <div>{formatCurrency(payment.amount, payment.currency)}</div>
                      {payment.discount_amount > 0 && (
                        <div className="text-xs text-emerald-600 dark:text-emerald-400">
                          -{formatCurrency(payment.discount_amount, payment.currency)} {payment.applied_promo_code && `(${payment.applied_promo_code})`}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusBadge(payment.status)}`}>
                        {payment.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 capitalize">
                      {payment.payment_method?.toLowerCase() || 'card'}
                    </td>
                    <td className="px-4 py-3">
                      {payment.status === 'COMPLETED' && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => downloadInvoice(payment.id)}
                          className="text-primary hover:text-primary dark:text-primary/80 dark:hover:text-primary"
                        >
                          <Download className="h-4 w-4 mr-1" />
                          {t('subscription.paymentHistory.downloadInvoice')}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="py-12 text-center text-muted-foreground border rounded-md border-border dark:border-border/40 bg-card/50 dark:bg-card/20">
          <Receipt className="h-12 w-12 mx-auto mb-3 text-muted-foreground/60" />
          <p>{t('subscription.paymentHistory.noHistory')}</p>
        </div>
      )}
    </div>
  );
};

export const UpgradeOptions = () => {
  const t = useTranslations('profile');
  const router = useRouter();
  const dispatch = useDispatch();
  const { user, isAuthenticated } = useGetUser();
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);
  const [currentPlan, setCurrentPlan] = useState(null);
  const [selectedInterval, setSelectedInterval] = useState('monthly');
  const plans = useSelector(selectAllPlans);
  const [availablePlans, setAvailablePlans] = useState([]);
  
  // Fetch all plans when component mounts
  useEffect(() => {
    async function loadPlans() {
      setLoading(true);
      let toastId;
      
      try {
        // 只在非生产环境中显示加载toast，或者可以根据需要完全移除
        if (process.env.NODE_ENV !== 'production') {
          toastId = toast.loading(t('subscription.upgradeOptions.loading'));
        }
        
        // 并行加载计划和当前用户的计划以提高性能
        const [plansResult] = await Promise.all([
          dispatch(fetchPlans()).unwrap(),
          fetchCurrentPlan()
        ]);
        
        // 确保关闭toast
        if (toastId) {
          toast.dismiss(toastId);
        }
      } catch (error) {
        console.error('Error loading plans:', error);
        
        // 确保关闭加载toast
        if (toastId) {
          toast.dismiss(toastId);
        }
        
        // 仅在实际错误时显示错误toast
        toast.error(t('subscription.upgradeOptions.loadError') || 'Failed to load plans', {
          description: error.message || 'Please try again later'
        });
      } finally {
        setLoading(false);
      }
    }
    
    loadPlans();
  }, [dispatch]);
  
  // Fetch current user's plan
  const fetchCurrentPlan = async () => {
    try {
      if (!user?.id) return;
      
      // Query for active subscription plan only
      const { data, error } = await supabase
        .from('user_subscription_plan')
        .select(`
          id, 
          plan_id,
          subscription_plan (
            id,
            name,
            type,
            price,
            billing_interval,
            features
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'ACTIVE')
        .order('created_at', { ascending: false })
        .limit(1);
        
      if (error) throw error;
      
      // Get the first item if available
      const activePlan = data && data.length > 0 ? data[0] : null;
      setCurrentPlan(activePlan);
      
      // Set initial interval based on current plan
      if (activePlan?.subscription_plan?.billing_interval) {
        setSelectedInterval(activePlan.subscription_plan.billing_interval.toLowerCase());
      }
    } catch (error) {
      console.error('Error fetching current plan:', error);
    }
  };
  
  // Update available plans whenever the plans state or selected interval changes
  useEffect(() => {
    if (plans && plans[selectedInterval]) {
      // Filter plans to only show upgrades from current plan
      const currentPlanType = currentPlan?.subscription_plan?.type || 'FREE';
      const planTypes = ['FREE', 'PRO', 'ENTERPRISE']; // Order matters for comparison
      
      // Get the index of the current plan in the hierarchy
      const currentIndex = planTypes.indexOf(currentPlanType);
      
      // Filter plans to only show those that are higher than the current plan
      const upgradePlans = plans[selectedInterval].filter(plan => {
        const planIndex = planTypes.indexOf(plan.type);
        return planIndex > currentIndex;
      });
      
      setAvailablePlans(upgradePlans);
    }
  }, [plans, selectedInterval, currentPlan]);
  
  const contactSales = () => {
    router.push('/contactUs?type=ENTERPRISE');
  };
  
  const handleUpgrade = async (planId) => {
    if (!user?.id) {
      toast.error(t('subscription.auth.required') || 'Authentication required', {
        description: t('subscription.auth.loginRequired') || 'Please login to upgrade your plan'
      });
      return;
    }
    
    setUpgrading(true);
    const toastId = toast.loading(t('subscription.upgradeOptions.processing') || 'Processing upgrade request');
    try {
      // First get default payment method if available
      let paymentMethodId = null;
      
      const { data: userDetails, error: detailsError } = await supabase
        .from('user')
        .select('default_payment_method_id')
        .eq('id', user.id)
        .single();
          
      if (!detailsError && userDetails?.default_payment_method_id) {
        paymentMethodId = userDetails.default_payment_method_id;
      }
      
      // Attempt to use the subscription upgrade API first
      const response = await fetch('/api/subscription/upgrade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          newPlanId: planId,
          paymentMethodId: paymentMethodId
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to start upgrade process');
      }
      
      toast.dismiss(toastId);
      
      // If we have a checkout URL, redirect to it
      if (data.url) {
        toast.success(t('subscription.upgradeOptions.redirecting') || 'Redirecting to checkout', {
          description: t('subscription.upgradeOptions.redirectDesc') || 'You will be redirected to complete your upgrade.'
        });
        
        // Short delay before redirect
        setTimeout(() => {
          window.location.href = data.url;
        }, 500);
        
        return;
      }
      
      // Fallback to standard payment page
      router.push(`/payment?plan_id=${planId}`);
    } catch (error) {
      console.error('Upgrade error:', error);
      toast.dismiss(toastId);
      toast.error(t('subscription.upgradeOptions.error') || 'Failed to start upgrade process', {
        description: error.message || t('subscription.common.tryAgain') || 'Please try again later'
      });
    } finally {
      setUpgrading(false);
    }
  };
  
  // Format price with billing interval
  const formatPrice = (price, billingInterval) => {
    const options = {
      style: 'currency',
      currency: 'MYR',
      minimumFractionDigits: 2,
    };

    if (billingInterval === 'YEARLY') {
      return new Intl.NumberFormat('ms-MY', options).format(price) + '/mo';
    } else {
      return new Intl.NumberFormat('ms-MY', options).format(price) + '/mo';
    }
  };
  
  // Format the billing cycle for display
  const formatBillingCycle = (billingInterval) => {
    if (billingInterval === 'YEARLY') {
      return 'billed annually';
    } else {
      return 'billed monthly';
    }
  };
  
  if (loading) {
    return <PlanCardsSkeleton />;
  }
  
  return (
    <div className="p-6 border rounded-md space-y-6 border-border dark:border-border/40 bg-card dark:bg-card/90">
      <div>
        <h3 className="text-lg font-medium">{t('subscription.upgradeOptions.title')}</h3>
        <p className="text-sm text-muted-foreground">{t('subscription.upgradeOptions.description')}</p>
      </div>
      
      {/* Billing interval toggle */}
      <div className="flex justify-center mb-8">
        <div className="inline-flex rounded-md shadow-sm bg-muted/80 dark:bg-muted/20 p-1 border border-border/50 dark:border-border/20">
          <button
            className={`px-4 py-2 text-sm rounded-md transition-all ${
              selectedInterval === 'monthly' 
                ? 'bg-background dark:bg-gray-800 shadow-sm text-primary dark:text-primary/90' 
                : 'hover:bg-muted/80 dark:hover:bg-muted/50'
            }`}
            onClick={() => setSelectedInterval('monthly')}
          >
            Monthly
          </button>
          <button
            className={`px-4 py-2 text-sm rounded-md transition-all ${
              selectedInterval === 'yearly' 
                ? 'bg-background dark:bg-gray-800 shadow-sm text-primary dark:text-primary/90' 
                : 'hover:bg-muted/80 dark:hover:bg-muted/50'
            }`}
            onClick={() => setSelectedInterval('yearly')}
          >
            Annual <span className="ml-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">Save 20%</span>
          </button>
        </div>
      </div>
      
      {availablePlans.length > 0 ? (
        <div className="grid md:grid-cols-2 gap-6">
          {availablePlans.map((plan) => (
            <div 
              key={plan.id} 
              className={`border rounded-lg p-6 relative ${
                plan.type === 'ENTERPRISE' 
                  ? 'border-indigo-500 dark:border-indigo-500/70 ring-1 ring-indigo-500 dark:ring-indigo-500/70 bg-background dark:bg-background/60' 
                  : 'border-border dark:border-border/40 bg-background dark:bg-background/60'
              }`}
            >
              {plan.type === 'ENTERPRISE' && (
                <div className="absolute top-2 right-2 bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-300 text-xs font-semibold py-1 px-2 rounded-full">
                  Best Value
                </div>
              )}
              
              <h4 className="text-xl font-bold">{plan.name}</h4>
              <div className="mt-2">
                <span className="text-3xl font-semibold">{formatPrice(plan.price, plan.billing_interval)}</span>
                <span className="text-sm text-muted-foreground ml-1">
                  {formatBillingCycle(plan.billing_interval)}
                </span>
              </div>
              
              <ul className="mt-6 space-y-3">
                {(plan.features ? Object.values(plan.features) : []).map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500 dark:text-green-400 flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              
              <div className="mt-8">
                <Button 
                  variant="default" 
                  className="w-full" 
                  onClick={() => handleUpgrade(plan.id)}
                  disabled={upgrading}
                >
                  {upgrading ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <ArrowUpCircle className="mr-2 h-4 w-4" />
                      {t('subscription.upgradeOptions.upgradeNow')}
                    </>
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 border rounded-md bg-muted/20 dark:bg-muted/10 border-border dark:border-border/40">
          <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-500 dark:text-green-400" />
          <h4 className="text-xl font-medium">You're on the highest plan</h4>
          <p className="text-muted-foreground mt-2">You're already enjoying all available features.</p>
        </div>
      )}
      
      <div className="text-center pt-6 border-t mt-8 border-border dark:border-border/40">
        <p className="text-sm text-muted-foreground mb-3">
          Need a custom solution for your large team?
        </p>
        <Button variant="outline" onClick={contactSales}>
          <ExternalLink className="mr-2 h-4 w-4" />
          {t('subscription.upgradeOptions.contactSales')}
        </Button>
      </div>
    </div>
  );
};