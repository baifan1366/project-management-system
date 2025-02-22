'use client'
import { useState } from 'react'
import { useTranslations } from 'next-intl';
import clsx from 'clsx'

export default function PricingPage() {
  const t = useTranslations('Pricing');
  const [billingInterval, setBillingInterval] = useState('monthly')

  const plans = {
    monthly: [
      {
        name: t('starterPlan'),
        price: 0,
        features: [
          t('features.basic'),
          t('features.projects', { count: 2 }),
          t('features.teamMembers', { count: 3 }),
          t('features.storage.starter'),
          t('features.additionalFeatures.starter.community'),
          t('features.additionalFeatures.starter.basic')
        ]
      },
      {
        name: t('proPlan'),
        price: 29,
        features: [
          t('features.everything'),
          t('features.projects', { count: 10 }),
          t('features.teamMembers', { count: 10 }),
          t('features.storage.pro.monthly'),
          t('features.additionalFeatures.pro.customFields'),
          t('features.additionalFeatures.pro.timeTracking'),
          t('features.additionalFeatures.pro.prioritySupport')
        ]
      },
      {
        name: t('enterprisePlan'),
        price: 99,
        features: [
          t('features.everything'),
          t('features.unlimited'),
          t('features.storage.enterprise.monthly'),
          t('features.additionalFeatures.enterprise.security'),
          t('features.additionalFeatures.enterprise.dedicated'),
          t('features.additionalFeatures.enterprise.customBranding'),
          t('features.additionalFeatures.enterprise.api')
        ]
      }
    ],
    yearly: [
      {
        name: t('starterPlan'),
        price: 0,
        features: [
          t('features.basic'),
          t('features.projects', { count: 2 }),
          t('features.teamMembers', { count: 3 }),
          t('features.storage.starter'),
          t('features.additionalFeatures.starter.community'),
          t('features.additionalFeatures.starter.basic')
        ]
      },
      {
        name: t('proPlan'),
        price: 290,
        features: [
          t('features.everything'),
          t('features.projects', { count: 20 }),
          t('features.teamMembers', { count: 20 }),
          t('features.storage.pro.yearly'),
          t('features.additionalFeatures.pro.customFields'),
          t('features.additionalFeatures.pro.timeTracking'),
          t('features.additionalFeatures.pro.analytics'),
          t('features.additionalFeatures.pro.prioritySupport')
        ]
      },
      {
        name: t('enterprisePlan'),
        price: 990,
        features: [
          t('features.everything'),
          t('features.unlimited'),
          t('features.storage.enterprise.yearly'),
          t('features.additionalFeatures.enterprise.security'),
          t('features.additionalFeatures.enterprise.dedicated'),
          t('features.additionalFeatures.enterprise.customBranding'),
          t('features.additionalFeatures.enterprise.api'),
          t('features.additionalFeatures.enterprise.sso'),
          t('features.additionalFeatures.enterprise.audit')
        ]
      }
    ]
  }


  return (
          <div className="container mx-auto px-4 py-16">
            <h1 className="text-4xl font-bold text-center mb-8">
              {t('title')}
              <span className="block mt-3 text-xl text-gray-500">
                {t('subtitle')}
              </span>
            </h1>

             {/* Billing Toggle Switch */}
        <div className="mt-8 mb-16 flex justify-center items-center"> {/* Added mb-16 for spacing */}
          <div className="relative rounded-full bg-gray-100 p-0.5"> {/* Changed p-1 to p-0.5 */}
            {/* Sliding Background */}
            <div
              className={clsx(
                'absolute inset-0 w-1/2 bg-indigo-500 rounded-full transition-transform duration-200 ease-in-out', // Changed inset-y-1 to inset-0
                billingInterval === 'yearly' ? 'translate-x-full' : 'translate-x-0'
              )}
              aria-hidden="true"
            />
            
            {/* Buttons */}
            <div className="relative flex">
              <button
                type="button"
                onClick={() => setBillingInterval('monthly')}
                className={clsx(
                  'relative w-32 py-2 text-sm font-medium rounded-full transition-colors duration-200',
                  billingInterval === 'monthly' 
                    ? 'text-white'
                    : 'text-gray-500 hover:text-gray-900'
                )}
              >
                {t('billingInterval.monthly')}
              </button>
              <button
                type="button"
                onClick={() => setBillingInterval('yearly')}
                className={clsx(
                  'relative w-32 py-2 text-sm font-medium rounded-full transition-colors duration-200',
                  billingInterval === 'yearly'
                    ? 'text-white' // Changed from text-indigo-700
                    : 'text-gray-500 hover:text-gray-900'
                )}
              >
                {t('billingInterval.yearly')}
                <span 
                  className={clsx(
                    'absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium whitespace-nowrap transition-opacity duration-200',
                    billingInterval === 'yearly' ? 'opacity-100' : 'opacity-0'
                  )}
                >
                  {t('billingInterval.saveText')}
                </span>
              </button>
            </div>
          </div>
        </div>
            
            {/* Pricing Plans */}
            <div className="grid md:grid-cols-3 gap-8">
        {plans[billingInterval].map((plan, index) => (
          <div 
            key={`${plan.name}-${billingInterval}`}
            className={clsx(
              'border rounded-lg p-6 shadow-lg flex flex-col',
              'transform transition-all duration-300 ease-in-out hover:scale-105',
              'hover:shadow-xl',
              'animate-heightIn',
              index === 1 
                ? 'bg-primary/5 border-indigo-100' 
                : 'hover:border-indigo-100'
            )}
          >
            {/* Plan header */}
            <div className="mb-4 transition-all duration-300">
              <h2 className="text-2xl font-extrabold">
                {plan.name}
              </h2>
              <div className="mt-6 flex items-baseline">
                <p className="text-3xl font-bold mt-4">
                  {plan.price === 0 ? (
                    'Free'
                  ) : (
                    <>
                      ${plan.price}
                      <span className="ml-1 text-lg font-medium text-gray-500">
                        /{billingInterval === 'monthly' ? 'mo' : 'yr'}
                      </span>
                    </>
                  )}
                </p>
              </div>
            </div>

            {/* Features list with transition */}
            <ul className="space-y-3 flex-grow transition-all duration-500">
              {plan.features.map((feature, i) => (
                <li 
                  key={`${feature}-${billingInterval}`}
                  className="flex items-start"
                  style={{
                    animation: 'fadeIn 0.5s ease-out forwards',
                    animationDelay: `${i * 50}ms`
                  }}
                >
                  <span className="text-green-500 mr-2">✓</span>
                  {feature}
                </li>
              ))}
            </ul>

            {/* CTA Button */}
            <div className="mt-8">
              <button
                className={clsx(
                  'w-full py-2 px-4 rounded-lg font-medium',
                  'transform transition-all duration-200 ease-in-out',
                  'hover:shadow-md active:scale-95',
                  index === 1
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                    : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                )}
              >
                {plan.price === 0 
                  ? t('cta.free') 
                  : index === 1 
                    ? t('cta.pro')
                    : t('cta.enterprise')
                }
              </button>
            </div>
          </div>
        ))}
      </div>
          </div>
  );
} 