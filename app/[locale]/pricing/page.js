'use client'
import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useDispatch, useSelector } from 'react-redux'
import { fetchPlans, setSelectedInterval, fetchCurrentUserPlan } from '@/lib/redux/features/planSlice'
import { setPaymentValidation, clearPaymentValidation } from '@/lib/redux/features/paymentSlice'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import clsx from 'clsx'
import useGetUser from '@/lib/hooks/useGetUser'
import { toast } from 'sonner'

export default function PricingPage() {
  const t = useTranslations('Pricing')
  const dispatch = useDispatch()
  const router = useRouter()
  const params = useParams()  
  const { plans, status, error, selectedInterval } = useSelector((state) => state.plans)
  
  // Move the hook call to component level
  const { user, error: userError } = useGetUser()

  const [currentUserPlan, setCurrentUserPlan] = useState(null)
  const [ctaText, setCtaText] = useState("Subscribe")

  const locale = params.locale || 'en'

  useEffect(() => {
    if (status === 'idle') {
      dispatch(fetchPlans())
    }
  }, [status, dispatch])

  const handlePlanSelection = async (plan) => {
    try {
      // Enterprise plans now handled like other plans - no special redirection
      if (plan.type === 'ENTERPRISE') {
        // If user is on Enterprise plan, redirect to /projects
        if (currentUserPlan && Number(currentUserPlan.plan_id) === Number(plan.id)) {
          router.push(`/${locale}/projects`);
          return;
        }
        // Continue with normal flow - no redirection to contact form
      }

      // 检查是否是当前计划，如果是则重定向到仪表板
      if (currentUserPlan) {
        const currentPlanId = currentUserPlan.plan_id;
        if (Number(currentPlanId) === Number(plan.id)) {
          // 如果是当前计划，直接去仪表板
          router.push(`/${locale}/dashboard`);
          return;
        }
        
        // 检查是否是降级操作
        if (Number(currentPlanId) > Number(plan.id)) {
          // 降级操作
          if (plan.price === 0) {
            // 如果是降级到免费计划，使用标准流程
            // 此处不需要特殊处理
          } else {
            // 降级到其他付费计划，重定向到联系我们页面
            router.push(`/${locale}/contactUs?form=downgrade&from=${currentPlanId.toString()}&to=${plan.id.toString()}`);
            return;
          }
        }
      }
      
      if (!user) {
        
        const loginParams = new URLSearchParams({
          plan_id: plan.id.toString(),
          redirect: 'payment'
        }).toString();
        router.push(`/${locale}/login?${loginParams}`);
        return;
      }

      // 如果是免费计划，保持原有逻辑
      if (plan.price === 0) {
        try {
          let query = supabase.from('user_subscription_plan');
          
          // 检查用户是否已有订阅记录
          const { data: existingSubscription } = await supabase
            .from('user_subscription_plan')
            .select(`
              plan_id,
              status,
              subscription_plan (
                id,
                name,
                type,
                price,
                billing_interval
              )
            `)
            .eq('user_id', user.id)
            .eq('status', 'ACTIVE')
            .order('start_date', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (existingSubscription) {
            // 如果存在订阅记录，则更新
            const { data, error } = await supabase
              .from('user_subscription_plan')
              .update({
                plan_id: plan.id,
                status: 'ACTIVE',
                start_date: new Date().toISOString(),
                end_date: null, // 免费计划通常没有结束日期
              })
              .eq('user_id', user.id)
              .select();

            if (error) throw error;
          } else {
            // 如果不存在订阅记录，则创建新记录
            const { data, error } = await supabase
              .from('user_subscription_plan')
              .insert({
                user_id: user.id,
                plan_id: plan.id,
                status: 'ACTIVE',
                start_date: new Date().toISOString(),
                end_date: null, // 免费计划通常没有结束日期
              })
              .select();

            if (error) throw error;
          }
          
          // 显示成功消息
          toast.success('Successfully switched to new plan');
          // 重定向到仪表板
          router.push(`/${locale}/dashboard`);
          return;
        } catch (err) {
          console.error('Error updating subscription:', err);
          toast.error('Failed to switch plan. Please try again.');
          return;
        }
      }

      // 设置支付验证状态
      dispatch(setPaymentValidation(plan.id));
      
      // 付费计划跳转到支付页面
      router.push(`/${locale}/payment?plan_id=${plan.id}`);
    } catch (err) {
      console.error('Error handling plan selection:', err);
      toast.error('An error occurred. Please try again.');
    }
  }

  // 渲染登录后的ui变调：按钮CTA 变化
  useEffect(() => {
    const updateCtaText = async () => {
      try {
        const result = await dispatch(fetchCurrentUserPlan({ user }));
        const userData = result.payload;
        

        if (!userData) {
          setCurrentUserPlan(null);
          setCtaText('Subscribe');
          return;
        }

        const { isLoggedIn, plan } = userData;

        if (isLoggedIn && plan) {
          setCurrentUserPlan(plan);
          setCtaText('Current Plan');
        } else {
          setCurrentUserPlan(null);
          setCtaText('Subscribe');
        }
      } catch (err) {
        setCurrentUserPlan(null);
        setCtaText('Subscribe');
      }
    };

    updateCtaText();
  }, [dispatch, user]);

  // 获取每个计划的CTA文本
  const getPlanCtaConfig = (plan, currentUserPlan) => {
    if (!plan) return { text: '', disabled: true };

    // Not logged in
    if (!currentUserPlan) {
      if (plan.type === 'ENTERPRISE') return { text: `Buy ${plan.name}`, disabled: false };
      if (plan.id === 1) return { text: 'Get Started for Free', disabled: false };
      if (plan.id === 2 || plan.id === 3) return { text: `Buy ${plan.name}`, disabled: false };
      return { text: 'Subscribe', disabled: false };
    }

    const currentPlanId = Number(currentUserPlan.plan_id);
    const thisPlanId = Number(plan.id);

    // Enterprise plan
    if (plan.type === 'ENTERPRISE') {
      if (currentPlanId === thisPlanId) return { text: 'Current Plan', disabled: false };
      return { text: 'Upgrade', disabled: false };
    }

    // Free plan (downgrade)
    if (plan.id === 1 && currentPlanId !== 1) {
      return { text: 'Contact Us to Downgrade', disabled: true };
    }

    // Current plan
    if (currentPlanId === thisPlanId) {
      return { text: 'Current Plan', disabled: false };
    }

    // Lower tier (downgrade)
    if (thisPlanId < currentPlanId) {
      return { text: 'Unavailable', disabled: true };
    }

    // Upgrade
    if (thisPlanId > currentPlanId) {
      return { text: 'Upgrade', disabled: false };
    }

    // Fallback
    return { text: 'Unavailable', disabled: true };
  };

  const formatCurrency = (price, interval) => {
    const formattedPrice = new Intl.NumberFormat('ms-MY', {
      style: 'currency',
      currency: 'MYR',
    }).format(price);

    if (interval === 'yearly') {
      return `${formattedPrice}/month`;
    }
    return `${formattedPrice}/month`;
  };

  // 渲染骨架屏加载状态
  const renderSkeletonLoader = () => {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="animate-pulse">
          {/* 标题骨架 */}
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-lg w-3/4 mx-auto mb-4"></div>
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-lg w-2/4 mx-auto mb-8"></div>
          
          {/* 计费周期切换骨架 */}
          <div className="flex justify-center mb-8">
            <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-full w-64"></div>
          </div>
          
          {/* 计划卡片骨架 */}
          <div className="grid md:grid-cols-3 gap-8">
            {(selectedInterval === 'monthly' ? plans.monthly : plans.yearly).map((plan) => {
              const ctaConfig = getPlanCtaConfig(plan, currentUserPlan);
              return (
                <div 
                  key={plan.id} 
                  className={clsx(
                    "border rounded-lg p-6 shadow-lg relative transition-all duration-300",
                    "hover:shadow-xl hover:scale-105",
                    {
                      'border-indigo-500 ring-2 ring-indigo-500': plan.type === 'ENTERPRISE',
                      'bg-gray-50 dark:bg-gray-800': ctaConfig.disabled,
                    }
                  )}
                >
                  {/* Plan Type 标签 */}
                  <div className={clsx(
                    "absolute -top-3 right-6 text-xs font-semibold py-1 px-3 rounded-full uppercase",
                    {
                      'bg-indigo-100 text-indigo-800': plan.type === 'ENTERPRISE',
                      'bg-gray-100 text-gray-800': plan.type !== 'ENTERPRISE',
                    }
                  )}>
                    {plan.type}
                  </div>
                  
                  <h2 className="text-2xl font-bold mb-4">{plan.name}</h2>
                  <div className="text-4xl font-extrabold mb-4">
                    {plan.price === 0 ? 'Free' : formatCurrency(plan.price, selectedInterval)}
                  </div>
                  
                  <p className="text-sm text-gray-500 mb-6 h-10">
                    {plan.description}
                  </p>

                  <ul className="space-y-3 mb-8">
                    {plan.features && plan.features.features && 
                      plan.features.features.map((feature, index) => (
                        <li key={index} className="flex items-center">
                          <span className="text-green-500 mr-2">✓</span>
                          {feature}
                        </li>
                      ))
                    }
                  </ul>
                  
                  <button
                    onClick={() => handlePlanSelection(plan)}
                    className={clsx(
                      'w-full py-2 px-4 rounded-lg font-medium mt-auto',
                      'transform transition-all duration-200',
                      plan.type === 'PRO'
                        ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                        : 'bg-gray-100 text-gray-900 hover:bg-gray-200',
                      ctaConfig.disabled && 'opacity-50 cursor-not-allowed'
                    )}
                    disabled={ctaConfig.disabled}
                  >
                    {ctaConfig.text}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // 显示加载状态
  if (status === 'loading') {
    return renderSkeletonLoader();
  }

  // 显示错误状态
  if (status === 'failed') {
    return <div className="flex justify-center items-center min-h-screen">
      <div>Error: {error}</div>
    </div>
  }

  // 修改获取当前计划的逻辑
  const currentPlans = plans[selectedInterval] || [];

  // 创建一个新数组进行排序，而不是直接修改 currentPlans
  const sortedPlans = [...currentPlans].sort((a, b) => {
    // 确保 FREE 计划始终在最前面
    if (a.type === 'FREE') return -1;
    if (b.type === 'FREE') return 1;
    // 其他计划按价格排序
    return a.price - b.price;
  });

  return (
    <div className="container mx-auto px-4 py-16">
      <h1 className="text-4xl font-bold text-center mb-8">
        {t('title')}
        <span className="block mt-3 text-xl text-gray-500">
          {t('subtitle')}
        </span>
      </h1>

      {/* 计费周期切换 */}
      <div className="flex justify-center mb-8">
        <div className="relative inline-flex rounded-full p-1 bg-gray-100">
          <div
            className={clsx(
              'absolute inset-0 w-1/2 rounded-full bg-indigo-600 transition-transform duration-200 ease-in-out',
              selectedInterval === 'yearly' ? 'translate-x-full' : 'translate-x-0'
            )}
          />
          
          <button
            onClick={() => dispatch(setSelectedInterval('monthly'))}
            className={clsx(
              'relative z-10 px-8 py-2 rounded-full transition-colors duration-200 min-w-[121px]',
              selectedInterval === 'monthly' 
                ? 'text-white' 
                : 'text-gray-500 hover:text-gray-700'
            )}
          >
            {t('billingInterval.monthly')}
          </button>
          <button
            onClick={() => dispatch(setSelectedInterval('yearly'))}
            className={clsx(
              'relative z-10 px-8 py-2 rounded-full transition-colors duration-200 min-w-[121px]',
              selectedInterval === 'yearly' 
                ? 'text-white' 
                : 'text-gray-500 hover:text-gray-700'
            )}
          >
            {t('billingInterval.yearly')}
          </button>
        </div>
      </div>

      {/* 计划网格 */}
      <div className="grid md:grid-cols-3 gap-8">
        {sortedPlans.map((plan) => {
          const { text: ctaText, disabled: ctaDisabled } = getPlanCtaConfig(plan, currentUserPlan);
          return (
            <div 
              key={plan.id}
              className="transform transition-all duration-300 hover:scale-105 cursor-pointer"
            >
              <div className={clsx(
                'border rounded-lg p-6 shadow-lg',
                'flex flex-col h-full',
                'animate-heightIn',
                'relative'
              )}>
                {/* Plan Type 标签 */}
                <div className={clsx(
                  'absolute -top-3 right-6 px-3 py-1 rounded-full text-xs font-semibold',
                  plan.type === 'FREE' ? 'bg-green-100 text-green-800' :
                  plan.type === 'PRO' ? 'bg-indigo-100 text-indigo-800' :
                  plan.type === 'ENTERPRISE' ? 'bg-purple-100 text-purple-800' :
                  'bg-gray-100 text-gray-800'
                )}>
                  {plan.type}
                </div>
                
                <div className="flex-grow">
                  <h2 className="text-2xl font-bold mb-4">{plan.name}</h2>
                  <p className="text-gray-600 mb-4">{plan.description}</p>
                  <div className="text-4xl font-bold mb-6">
                    RM{plan.price}
                    <span className="text-lg text-gray-500">
                      {plan.billing_interval ? `/${selectedInterval === 'monthly' ? 'mo' : 'yr'}` : ''}
                    </span>
                  </div>
                  
                  {/* 功能列表 */}
                  <ul className="space-y-3 mb-8">
                    {plan.features && plan.features.features && 
                      plan.features.features.map((feature, index) => (
                        <li key={index} className="flex items-center">
                          <span className="text-green-500 mr-2">✓</span>
                          {feature}
                        </li>
                      ))
                    }
                  </ul>
                </div>

                <button
                  onClick={() => handlePlanSelection(plan)}
                  className={clsx(
                    'w-full py-2 px-4 rounded-lg font-medium mt-auto',
                    'transform transition-all duration-200',
                    plan.type === 'PRO'
                      ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                      : 'bg-gray-100 text-gray-900 hover:bg-gray-200',
                    ctaDisabled && 'opacity-50 cursor-not-allowed'
                  )}
                  disabled={ctaDisabled}
                >
                  {ctaText}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  )
} 