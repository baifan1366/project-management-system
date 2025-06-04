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
import { RefreshCw, Download, Receipt } from 'lucide-react';

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
  
  // Mock upgrade plans
  const plans = [
    { 
      id: 'pro', 
      name: 'Pro', 
      price: '$9.99/month',
      features: [
        '15 Projects',
        '10 Team Members',
        '10GB Storage',
        'Priority Support'
      ],
      isCurrent: false,
      recommended: true
    },
    { 
      id: 'pro-ultimate', 
      name: 'Pro Ultimate', 
      price: '$19.99/month',
      features: [
        'Unlimited Projects',
        'Unlimited Team Members',
        '100GB Storage',
        '24/7 Support',
        'API Access'
      ],
      isCurrent: false,
      recommended: false
    }
  ];
  
  const contactSales = () => {
    toast.loading(t('contactingSupport'));
    
    // 模拟API调用
    setTimeout(() => {
      toast.success(t('supportRequestSent'));
    }, 1500);
  };
  
  const handleUpgrade = (planId) => {
    toast.loading(t('subscription.upgrading'));
    
    // 模拟API调用
    setTimeout(() => {
      toast.success(t('subscription.upgradePending'));
    }, 1500);
  };
  
  return (
    <div className="p-6 border rounded-md space-y-6">
      <div>
      <h3 className="text-lg font-medium">{t('subscription.upgradeOptions.title')}</h3>
        <p className="text-sm text-gray-500">{t('subscription.tabs.upgradeOptions')}</p>
      </div>
      
      <div className="grid md:grid-cols-2 gap-4">
        {plans.map((plan) => (
          <div 
            key={plan.id} 
            className={`border rounded-lg p-5 ${
              plan.recommended ? 'border-indigo-500 ring-1 ring-indigo-500' : 'border-gray-200'
            }`}
          >
            {plan.recommended && (
              <div className="inline-block px-2 py-1 text-xs font-semibold bg-indigo-100 text-indigo-800 rounded-full mb-2">
                Recommended
              </div>
            )}
            
            <h4 className="text-xl font-bold">{plan.name}</h4>
            <p className="text-2xl font-semibold mt-1">{plan.price}</p>
            
            <ul className="mt-4 space-y-2">
              {plan.features.map((feature, idx) => (
                <li key={idx} className="flex items-start">
                  <svg className="h-5 w-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            
            <div className="mt-6">
              {plan.isCurrent ? (
                <Button disabled className="w-full">
                  {t('subscription.upgradeOptions.currentPlan')}
                </Button>
              ) : (
                <Button 
                  variant="default" 
                  className="w-full" 
                  onClick={() => handleUpgrade(plan.id)}
                >
                  {t('subscription.upgradeOptions.upgradeNow')}
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
      
      <div className="text-center pt-4 border-t">
        <p className="text-sm text-gray-500 mb-2">
          Need a custom plan for your enterprise?
        </p>
      <Button variant="outline" onClick={contactSales}>
        {t('subscription.upgradeOptions.contactSales')}
      </Button>
      </div>
    </div>
  );
};