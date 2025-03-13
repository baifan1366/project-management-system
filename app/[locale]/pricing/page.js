'use client'
import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useDispatch, useSelector } from 'react-redux'
import { fetchPlans, setSelectedInterval } from '@/lib/redux/features/planSlice'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import clsx from 'clsx'

export default function PricingPage() {
  const t = useTranslations('Pricing')
  const dispatch = useDispatch()
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState(null)
  const { plans, status, error, selectedInterval } = useSelector((state) => state.plans)

  // Check if user is logged in when component mounts
  useEffect(() => {
    async function checkUser() {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUser(user)
    }
    checkUser()
  }, [])

  // Fetch plans when component mounts
  useEffect(() => {
    if (status === 'idle') {
      dispatch(fetchPlans())
    }
  }, [status, dispatch])

  // Show loading state
  if (status === 'loading') {
    return <div className="flex justify-center items-center min-h-screen">
      <div>Loading...</div>
    </div>
  }

  // Show error state
  if (status === 'failed') {
    return <div className="flex justify-center items-center min-h-screen">
      <div>Error: {error}</div>
    </div>
  }

  // Get current plans based on selected interval
  const currentPlans = plans[selectedInterval] || []

  // Handle plan selection and redirect
  const handlePlanSelection = (plan) => {
    // Construct query parameters
    const queryParams = new URLSearchParams({
      plan_type: plan.type,          // FREE, PRO, ENTERPRISE
      billing_interval: selectedInterval.toUpperCase(), // MONTHLY, YEARLY
      plan_id: plan.id.toString(),   // Store the exact plan ID
      price: plan.price.toString()   // Store the plan price
    }).toString()

    // Log the selection for debugging
    console.log('Selected plan:', {
      type: plan.type,
      billing: selectedInterval,
      id: plan.id,
      price: plan.price
    })

    // Check if user is logged in
    if(currentUser){
      // If logged in, redirect to payment page and add query params
      router.push(`/payment?${queryParams}`)
    }else{
      // If not logged in, redirect to signup page and add query params
      router.push(`/signup?${queryParams}`)
    }
  }

  return (
    <div className="container mx-auto px-4 py-16">
      <h1 className="text-4xl font-bold text-center mb-8">
        {t('title')}
        <span className="block mt-3 text-xl text-gray-500">
          {t('subtitle')}
        </span>
      </h1>

      {/* Billing Toggle with sliding effect */}
      <div className="flex justify-center mb-8">
        <div className="relative inline-flex rounded-full p-1 bg-gray-100">
          {/* Sliding background - adjusted to fill entire width */}
          <div
            className={clsx(
              'absolute inset-0 w-1/2 rounded-full bg-indigo-600 transition-transform duration-200 ease-in-out',
              selectedInterval === 'yearly' ? 'translate-x-full' : 'translate-x-0'
            )}
          />
          
          {/* Toggle buttons - adjusted padding and width */}
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

      {/* Plans Grid */}
      <div className="grid md:grid-cols-3 gap-8">
        {currentPlans.map((plan) => (
          // Outer div with hover effect
          <div 
            key={plan.id}
            className="transform transition-all duration-300 hover:scale-105 cursor-pointer"
          >
            {/* Inner div with animations and content */}
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
                
                {/* Features List */}
                <ul className="space-y-3 mb-8">
                  {plan.features.features.map((feature, index) => (
                    <li key={index} className="flex items-center">
                      <span className="text-green-500 mr-2">✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>

              <button
                onClick={() => handlePlanSelection(plan)}
                className={clsx(
                  // Button styles
                  'w-full py-2 px-4 rounded-lg font-medium mt-auto',
                  // Hover effect
                  'transform transition-all duration-200',
                  // Active state
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