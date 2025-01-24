import { useTranslations } from 'next-intl';

export default function PricingPage() {
  const t = useTranslations('Pricing');
  
  return (
          <div className="container mx-auto px-4 py-16">
            <h1 className="text-4xl font-bold text-center mb-8">
              {t('title')}
            </h1>
            <div className="grid md:grid-cols-3 gap-8">
              {/* Starter Plan */}
              <div className="border rounded-lg p-6 shadow-lg">
                <h2 className="text-2xl font-bold mb-4">{t('starterPlan')}</h2>
                <p className="text-3xl font-bold mb-4">$9<span className="text-lg">/月</span></p>
                <ul className="space-y-3">
                  <li>✓ {t('features.basic')}</li>
                  <li>✓ {t('features.projects', { count: 5 })}</li>
                  <li>✓ {t('features.teamMembers', { count: 10 })}</li>
                </ul>
              </div>

              {/* Pro Plan */}
              <div className="border rounded-lg p-6 shadow-lg bg-primary/5">
                <h2 className="text-2xl font-bold mb-4">{t('proPlan')}</h2>
                <p className="text-3xl font-bold mb-4">$29<span className="text-lg">/月</span></p>
                <ul className="space-y-3">
                  <li>✓ {t('features.everything')}</li>
                  <li>✓ {t('features.projects', { count: 20 })}</li>
                  <li>✓ {t('features.teamMembers', { count: 50 })}</li>
                </ul>
              </div>

              {/* Enterprise Plan */}
              <div className="border rounded-lg p-6 shadow-lg">
                <h2 className="text-2xl font-bold mb-4">{t('enterprisePlan')}</h2>
                <p className="text-3xl font-bold mb-4">{t('contactUs')}</p>
                <ul className="space-y-3">
                  <li>✓ {t('features.everything')}</li>
                  <li>✓ {t('features.unlimited')}</li>
                  <li>✓ {t('features.support')}</li>
                </ul>
              </div>
            </div>
          </div>
  );
} 