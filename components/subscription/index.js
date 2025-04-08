// 只导出存在的组件
// 如果没有任何组件，可以导出一个空对象或占位组件
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

// 占位组件
export const SubscriptionCard = () => {
  const t = useTranslations('profile');
  const [loading, setLoading] = useState(false);
  
  const handleUpgrade = () => {
    setLoading(true);
    toast.loading(t('subscription.upgrading'));
    
    // 模拟API调用
    setTimeout(() => {
      setLoading(false);
      toast.success(t('subscription.upgradePending'));
    }, 1500);
  };
  
  return (
    <div className="p-4 border rounded-md">
      <h3 className="text-lg font-medium">{t('subscription.currentPlan.title')}</h3>
      <p className="text-sm text-gray-500 mb-4">{t('subscription.tabs.currentPlan')}</p>
      <Button onClick={handleUpgrade} disabled={loading}>
        {loading ? t('loading') : t('subscription.currentPlan.upgrade')}
      </Button>
    </div>
  );
};

// 空组件
export const UsageStats = () => {
  const t = useTranslations('profile');
  
  const refreshStats = () => {
    toast.loading(t('refreshingStats'));
    
    // 模拟API调用
    setTimeout(() => {
      toast.success(t('statsRefreshed'));
    }, 1500);
  };
  
  return (
    <div className="p-4 border rounded-md">
      <h3 className="text-lg font-medium">{t('subscription.usageStats.title')}</h3>
      <p className="text-sm text-gray-500 mb-4">{t('subscription.tabs.usageStats')}</p>
      <Button variant="outline" onClick={refreshStats}>
        {t('refresh')}
      </Button>
    </div>
  );
};

export const PaymentHistory = () => {
  const t = useTranslations('profile');
  
  const downloadInvoice = () => {
    toast.loading(t('preparingInvoice'));
    
    // 模拟API调用
    setTimeout(() => {
      toast.success(t('invoiceReady'));
    }, 1500);
  };
  
  return (
    <div className="p-4 border rounded-md">
      <h3 className="text-lg font-medium">{t('subscription.paymentHistory.title')}</h3>
      <p className="text-sm text-gray-500 mb-4">{t('subscription.tabs.paymentHistory')}</p>
      <Button variant="outline" onClick={downloadInvoice}>
        {t('download')}
      </Button>
    </div>
  );
};

export const UpgradeOptions = () => {
  const t = useTranslations('profile');
  
  const contactSales = () => {
    toast.loading(t('contactingSupport'));
    
    // 模拟API调用
    setTimeout(() => {
      toast.success(t('supportRequestSent'));
    }, 1500);
  };
  
  return (
    <div className="p-4 border rounded-md">
      <h3 className="text-lg font-medium">{t('subscription.upgradeOptions.title')}</h3>
      <p className="text-sm text-gray-500 mb-4">{t('subscription.tabs.upgradeOptions')}</p>
      <Button variant="outline" onClick={contactSales}>
        {t('subscription.upgradeOptions.contactSales')}
      </Button>
    </div>
  );
};