'use client';

import { useSelector, useDispatch } from 'react-redux';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useTranslations } from 'next-intl';
import { clearLimitExceeded } from '@/lib/redux/features/subscriptionSlice';

/**
 * 订阅限制对话框组件
 * 当用户尝试执行超出其订阅限制的操作时显示
 */
export default function SubscriptionLimitModal() {
  const dispatch = useDispatch();
  const router = useRouter();
  const t = useTranslations('profile.subscription.limits');
  const { show, limitInfo, actionType } = useSelector(state => state.subscription.limitExceeded);
  
  if (!show) return null;
  
  // 根据不同的 actionType 确定标题
  const getTitleByAction = () => {
    switch (actionType) {
      case 'create_project':
        return t('createProjectLimited');
      case 'invite_member':
        return t('inviteMemberLimited');
      case 'create_team':
        return t('createTeamLimited');
      default:
        return t('operationLimited');
    }
  };
  
  // 处理关闭对话框
  const handleClose = () => {
    dispatch(clearLimitExceeded());
  };
  
  // 处理升级订阅操作
  const handleUpgrade = () => {
    handleClose();
    router.push('/settings/subscription');
  };
  
  // 计算使用百分比
  const usagePercent = limitInfo?.currentValue !== undefined && 
                      limitInfo?.limit !== undefined ?
                      Math.min(100, (limitInfo.currentValue / limitInfo.limit) * 100) : 0;
  
  return (
    <Dialog open={show} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogTitle className="text-2xl font-bold mb-6">
          {getTitleByAction()}
        </DialogTitle>
        <div className="px-4 py-2">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-red-700 dark:text-red-400 mb-2">
              {t('subscriptionLimit')}
            </h2>
            <p className="text-red-600 dark:text-red-300 mb-4">{limitInfo?.reason}</p>
            
            {limitInfo?.currentValue !== undefined && limitInfo?.limit !== undefined && (
              <div className="mb-4">
                <p className="text-gray-700 dark:text-gray-300">
                  {t('currentUsage', {
                    current: limitInfo.currentValue,
                    limit: limitInfo.limit
                  })}
                </p>
                
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mt-2">
                  <div 
                    className="bg-red-600 dark:bg-red-500 h-2.5 rounded-full" 
                    style={{ width: `${usagePercent}%` }}
                    role="progressbar"
                    aria-valuenow={limitInfo.currentValue}
                    aria-valuemin="0"
                    aria-valuemax={limitInfo.limit}
                  ></div>
                </div>
              </div>
            )}
            
            <Button
              onClick={handleUpgrade}
              variant="destructive"
              className="mt-2"
            >
              {t('upgradeSubscription')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
