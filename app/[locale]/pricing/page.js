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

  //cta 按钮更新状态
  const [currentUserPlan, setCurrentUserPlan] = useState(null)
  const [ctaText, setCtaText] = useState("Subscribe")

  // 获取当前语言
  const locale = params.locale || 'en'

  // 只获取计划，不检查认证
  useEffect(() => {
    if (status === 'idle') {
      dispatch(fetchPlans())
    }
  }, [status, dispatch])

  // 处理计划选择
  const handlePlanSelection = async (plan) => {
    try {
      if (!user) {
        console.log('用户未登录，重定向到登录页面');
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
            .select('*')
            .eq('user_id', user.id)
            .single();

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
        console.log('User data:', userData);

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
  const getPlanCtaText = (plan) => {
    // 如果用户未登录或没有计划数据
    if (!currentUserPlan) {
      if(plan.id === 1){
        return 'Get Started for Free';
      }else if(plan.id === 2 || plan.id === 3){
        return 'Buy '+ plan.name;
      }
      return 'Subscribe';
    }
    
    // 检查当前计划是否与此计划匹配
    const currentPlanId = currentUserPlan.id || currentUserPlan.plan_id;
    if (Number(currentPlanId) === Number(plan.id)) {
      return 'Current Plan';
    }
    
    // 判断是升级还是降级
    const isDowngrade = Number(currentPlanId) > Number(plan.id);
    const isUpgrade = Number(currentPlanId) < Number(plan.id);
    
    if (isUpgrade) {
      return 'Upgrade';
    } else if (isDowngrade) {
      return 'Downgrade';
    }
    
    // 默认情况
    return 'Change Plan';
  };

  // 显示加载状态
  if (status === 'loading') {
    return <div className="flex justify-center items-center min-h-screen">
      <div>Loading...</div>
    </div>
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
        {sortedPlans.map((plan) => (
          <div 
            key={plan.id}
            className="transform transition-all duration-300 hover:scale-105 cursor-pointer"
          >
            <div className={clsx(
              'border rounded-lg p-6 shadow-lg',
              'flex flex-col h-full',
              'animate-heightIn'
            )}>
              <div className="flex-grow">
                <h2 className="text-2xl font-bold mb-4">{plan.name}</h2>
                <p className="text-gray-600 mb-4">{plan.description}</p>
                <div className="text-4xl font-bold mb-6">
                  ${plan.price}
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
                    : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                )}
              >
                {getPlanCtaText(plan)}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
} 