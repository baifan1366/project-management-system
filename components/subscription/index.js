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

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

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

// 空组件
export const UsageStats = () => {
  const t = useTranslations('profile');
  const [lastUpdated, setLastUpdated] = useState(new Date());
  
  const refreshStats = () => {
    toast.loading(t('refreshingStats'));
    
    // 模拟API调用
    setTimeout(() => {
      setLastUpdated(new Date());
      toast.success(t('statsRefreshed'));
    }, 1500);
  };
  
  // Mock data for usage statistics
  const usageData = {
    users: { current: 5, limit: 10, percentage: 50 },
    projects: { current: 8, limit: 15, percentage: 53 },
    teams: { current: 3, limit: 5, percentage: 60 },
    storage: { current: 2.5, limit: 10, percentage: 25, unit: 'GB' },
    aiCredits: { current: 500, limit: 1000, percentage: 50 }
  };

  const formatLastUpdated = (date) => {
    return date.toLocaleString();
  };
  
  return (
    <div className="p-6 border rounded-md space-y-6">
      <div className="flex justify-between items-center">
        <div>
      <h3 className="text-lg font-medium">{t('subscription.usageStats.title')}</h3>
          <p className="text-sm text-gray-500">{t('subscription.usageStats.lastUpdated')}: {formatLastUpdated(lastUpdated)}</p>
        </div>
        <Button variant="outline" onClick={refreshStats} size="sm">
          {t('subscription.usageStats.refresh')}
      </Button>
      </div>
      
      <div className="space-y-4">
        {Object.entries(usageData).map(([key, data]) => (
          <div key={key} className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-medium">{t(`subscription.usageStats.${key}`)}</span>
              <span>
                {data.current}{data.unit || ''} / {data.limit}{data.unit || ''} ({data.percentage}%)
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className={`h-2.5 rounded-full ${
                  data.percentage > 80 ? 'bg-red-500' : 
                  data.percentage > 60 ? 'bg-yellow-500' : 'bg-green-500'
                }`} 
                style={{ width: `${data.percentage}%` }}
              ></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const PaymentHistory = () => {
  const t = useTranslations('profile');
  const [payments, setPayments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    fetchPaymentHistory();
  }, []);
  
  const fetchPaymentHistory = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('payment')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        throw new Error(error.message);
      }
      
      setPayments(data || []);
    } catch (err) {
      console.error('Error fetching payment history:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  const downloadInvoice = (id) => {
    toast.loading(t('preparingInvoice'));
    
    // In a real implementation, this would call an API to generate an invoice
    setTimeout(() => {
      toast.success(t('invoiceReady'));
    }, 1500);
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
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'PENDING':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'FAILED':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
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
          onClick={fetchPaymentHistory}
          disabled={isLoading}
          className="ml-auto"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          {t('refresh')}
        </Button>
      </div>
      
      {error && (
        <div className="p-4 bg-destructive/10 text-destructive rounded-md">
          <p>{t('common.error')}: {error}</p>
          <Button 
            variant="link" 
            size="sm" 
            onClick={fetchPaymentHistory}
            className="mt-2 text-destructive"
          >
            {t('common.retry')}
          </Button>
        </div>
      )}
      
      {isLoading ? (
        <div className="py-10 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" role="status">
            <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">Loading...</span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{t('subscription.paymentHistory.loadingPayments')}</p>
        </div>
      ) : payments.length > 0 ? (
        <div className="border rounded-md">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="px-4 py-3 text-left font-medium">{t('subscription.paymentHistory.date')}</th>
                  <th className="px-4 py-3 text-left font-medium">{t('subscription.paymentHistory.amount')}</th>
                  <th className="px-4 py-3 text-left font-medium">{t('subscription.paymentHistory.status')}</th>
                  <th className="px-4 py-3 text-left font-medium">{t('subscription.paymentHistory.paymentMethod')}</th>
                  <th className="px-4 py-3 text-left font-medium">{t('subscription.paymentHistory.invoice')}</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {payments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-muted/50">
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
                          className="text-primary hover:text-primary"
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
        <div className="py-12 text-center text-muted-foreground border rounded-md">
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
      try {
        await dispatch(fetchPlans()).unwrap();
        await fetchCurrentPlan();
      } catch (error) {
        toast.error('Failed to load plans', {
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
      toast.error('Authentication required', {
        description: 'Please login to upgrade your plan'
      });
      return;
    }
    
    setUpgrading(true);
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
      
      // If we have a checkout URL, redirect to it
      if (data.url) {
        toast.success('Redirecting to checkout', {
          description: 'You will be redirected to complete your upgrade.'
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
      toast.error('Failed to start upgrade process', {
        description: error.message || 'Please try again later'
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
    return (
      <div className="p-6 border rounded-md">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="p-6 border rounded-md space-y-6">
      <div>
        <h3 className="text-lg font-medium">{t('subscription.upgradeOptions.title')}</h3>
        <p className="text-sm text-gray-500">{t('subscription.upgradeOptions.description')}</p>
      </div>
      
      {/* Billing interval toggle */}
      <div className="flex justify-center mb-8">
        <div className="inline-flex rounded-md shadow-sm bg-muted p-1">
          <button
            className={`px-4 py-2 text-sm rounded-md transition-all ${
              selectedInterval === 'monthly' 
                ? 'bg-white shadow text-primary' 
                : 'hover:bg-muted/80'
            }`}
            onClick={() => setSelectedInterval('monthly')}
          >
            Monthly
          </button>
          <button
            className={`px-4 py-2 text-sm rounded-md transition-all ${
              selectedInterval === 'yearly' 
                ? 'bg-white shadow text-primary' 
                : 'hover:bg-muted/80'
            }`}
            onClick={() => setSelectedInterval('yearly')}
          >
            Annual <span className="text-xs text-emerald-600">Save 20%</span>
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
                  ? 'border-indigo-500 ring-1 ring-indigo-500' 
                  : 'border-gray-200'
              }`}
            >
              {plan.type === 'ENTERPRISE' && (
                <div className="absolute top-2 right-2 bg-indigo-100 text-indigo-800 text-xs font-semibold py-1 px-2 rounded-full">
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
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
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
        <div className="text-center py-8 border rounded-md bg-muted/20">
          <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-500" />
          <h4 className="text-xl font-medium">You're on the highest plan</h4>
          <p className="text-muted-foreground mt-2">You're already enjoying all available features.</p>
        </div>
      )}
      
      <div className="text-center pt-6 border-t mt-8">
        <p className="text-sm text-gray-500 mb-3">
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