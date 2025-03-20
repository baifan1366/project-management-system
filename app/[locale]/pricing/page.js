'use client'
import { useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useDispatch, useSelector } from 'react-redux'
import { fetchPlans, setSelectedInterval } from '@/lib/redux/features/planSlice'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'  // 确保正确导入
import clsx from 'clsx'

export default function PricingPage() {
  const t = useTranslations('Pricing')
  const dispatch = useDispatch()
  const router = useRouter()
  const params = useParams()  
  const { plans, status, error, selectedInterval } = useSelector((state) => state.plans)

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
    console.log('选择了计划:', plan);

    try {
      // 获取会话
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('获取会话错误:', error);
        // 创建登录重定向参数
        const loginParams = new URLSearchParams({
          plan_id: plan.id.toString(),
          redirect: 'payment'
        }).toString();
        router.push(`/${locale}/login?${loginParams}`);
        return;
      }
      
      // 检查会话是否存在且有用户
      if (data && data.session && data.session.user) {
        console.log('用户已登录，重定向到支付页面');
        // 只传递必要的参数：plan_id 和 user_id
        const paymentParams = new URLSearchParams({
          plan_id: plan.id.toString(),
          user_id: data.session.user.id
        }).toString();
        router.push(`/${locale}/payment?${paymentParams}`);
      } else {
        console.log('用户未登录，重定向到登录页面');
        const loginParams = new URLSearchParams({
          plan_id: plan.id.toString(),
          redirect: 'payment'
        }).toString();
        router.push(`/${locale}/login?${loginParams}`);
      }
    } catch (err) {
      console.error('检查认证状态时出错:', err);
      // 出错时默认跳转到登录页面
      const loginParams = new URLSearchParams({
        plan_id: plan.id.toString(),
        redirect: 'payment'
      }).toString();
      router.push(`/${locale}/login?${loginParams}`);
    }
  }

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

  // 根据选择的时间间隔获取当前计划
  const currentPlans = plans[selectedInterval] || []

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
        {currentPlans.map((plan) => (
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
                    /{selectedInterval === 'monthly' ? 'mo' : 'yr'}
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
                {plan.price === 0 
                  ? t('cta.free')
                  : plan.type === 'PRO'
                    ? t('cta.pro')
                    : t('cta.enterprise')
                }
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
} 