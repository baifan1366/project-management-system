'use client';
import { useTranslations } from 'next-intl';
import { PricingHeader } from '@/components/PricingHeader';
import { useEffect, useState } from 'react';

export default function TermsAndConditionsPage() {
  const t = useTranslations('TermsAndConditions');
  const [lastUpdated, setLastUpdated] = useState('');
  
  useEffect(() => {
    // Extract the last updated date from the content
    setLastUpdated('May 30, 2025');
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      
      <main className="flex-grow container mx-auto px-4 py-8 max-w-4xl">
        <div className="prose dark:prose-invert max-w-none">
          <h1 className="text-3xl font-bold mb-2">{t('title')}</h1>
          <p className="text-sm text-muted-foreground mb-6">
            <em>{t('lastUpdated')}: {lastUpdated}</em>
          </p>
          
          <div className="mb-8">
            <p>{t('welcome')}</p>
            <p>{t('introduction')}</p>
            <p>{t('disagreement')}</p>
          </div>
          
          <hr className="my-6" />
          
          <section id="account-registration" className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">1. {t('sections.accountRegistration')}</h2>
            <p>You are required to create an account to access and use certain features. You are responsible for:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Providing accurate and complete information,</li>
              <li>Maintaining the confidentiality of your login credentials,</li>
              <li>All activities that occur under your account.</li>
            </ul>
          </section>
          
          <hr className="my-6" />
          
          <section id="subscription-plans" className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">2. {t('sections.subscriptionPlans')}</h2>
            <p>Team Sync provides several product‑specific subscription plans:</p>
            <p>Each plan is offered in three tiers:</p>
            
            <div className="grid md:grid-cols-3 gap-6 my-6">
              <div className="border p-4 rounded-lg">
                <h3 className="text-xl font-medium mb-3">{t('plans.free')}</h3>
                <ul className="space-y-2">
                  <li>• {t('features.calendar')}</li>
                  <li>• {t('features.posts')}</li>
                  <li>• {t('features.files')}</li>
                </ul>
              </div>
              
              <div className="border p-4 rounded-lg">
                <h3 className="text-xl font-medium mb-3">{t('plans.pro')}</h3>
                <ul className="space-y-2">
                  <li>• {t('features.timeline')}</li>
                  <li>• {t('features.note')}</li>
                  <li>• {t('features.kanban')}</li>
                </ul>
              </div>
              
              <div className="border p-4 rounded-lg">
                <h3 className="text-xl font-medium mb-3">{t('plans.enterprise')}</h3>
                <ul className="space-y-2">
                  <li>• {t('features.workflow')}</li>
                  <li>• {t('features.agile')}</li>
                  <li>• {t('features.gantt')}</li>
                </ul>
              </div>
            </div>
            
            <p className="text-sm italic">*Feature sets can vary slightly between product lines; see in-app pricing pages for exact inclusions.</p>
            
            <h3 className="text-xl font-medium mt-6 mb-3">{t('usageLimits')}</h3>
            <p>Each plan and tier comes with its own set of usage limits, including:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Max Projects</li>
              <li>Max Teams</li>
              <li>Max Members per Team</li>
              <li>Max AI Chats</li>
              <li>Max AI Tasks</li>
              <li>Max AI Workflows</li>
            </ul>
            
            <h3 className="text-xl font-medium mt-6 mb-3">{t('billingCycle')}</h3>
            <p>The Free tier plan has no billing interval and is completely free to use.</p>
            <p>Pro and Enterprise tiers may be offered with:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>No billing interval (e.g., trial or custom license),</li>
              <li>A monthly billing cycle, or</li>
              <li>A yearly billing cycle.</li>
            </ul>
            <p className="mt-3">The billing cycle depends on the specific plan configuration selected or arranged during sign-up or purchase.</p>
            <p className="mt-3">You can view or change your billing cycle (where applicable) under Account Settings → Subscription.</p>
            
            <h3 className="text-xl font-medium mt-6 mb-3">{t('refundPolicy')}</h3>
            <p>Only your most recent payment is refundable, and only when you submit a request via the "Refund" form on the Contact Us page (the form appears if you have an eligible transaction). Earlier charges are non‑refundable.</p>
            
            <h3 className="text-xl font-medium mt-6 mb-3">{t('automaticRenewal')}</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Auto‑renew applies only when a default credit‑card payment method is saved.</li>
              <li>Without a default card on file, the subscription simply expires unless renewed manually.</li>
            </ul>
          </section>
          
          <hr className="my-6" />
          
          <section id="user-generated-content" className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">3. {t('sections.userGeneratedContent')}</h2>
            <p>Users may upload and share content (e.g., tasks, messages, documents). You retain ownership of your content but grant Team Sync a limited license to use, host, and display it as necessary to operate the service.</p>
            <p className="mt-3">You agree not to upload content that is:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Illegal, harmful, or abusive,</li>
              <li>Infringing on intellectual property rights,</li>
              <li>In violation of any applicable laws.</li>
            </ul>
            <p className="mt-3">We reserve the right to remove any content that violates these rules.</p>
          </section>
          
          <hr className="my-6" />
          
          <section id="acceptable-use" className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">4. {t('sections.acceptableUse')}</h2>
            <p>You agree not to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Use the service for unlawful purposes,</li>
              <li>Attempt to gain unauthorized access to our systems,</li>
              <li>Interfere with the proper functioning of the Service.</li>
            </ul>
            <p className="mt-3">We reserve the right to suspend or terminate your access if you violate these rules.</p>
          </section>
          
          <hr className="my-6" />
          
          <section id="privacy" className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">5. {t('sections.privacy')}</h2>
            <p>Your use of the Service is also governed by our <a href="#" className="text-primary hover:underline">Privacy Policy</a>, which explains how we collect, use, and protect your personal data.</p>
          </section>
          
          <hr className="my-6" />
          
          <section id="intellectual-property" className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">6. {t('sections.intellectualProperty')}</h2>
            <p>All rights, title, and interest in the Service (excluding your content) are owned by Team Sync. You may not copy, modify, or distribute any part of the platform without our prior written permission.</p>
          </section>
          
          <hr className="my-6" />
          
          <section id="limitation-of-liability" className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">7. {t('sections.limitationOfLiability')}</h2>
            <p>To the fullest extent permitted by law, Team Sync shall not be liable for:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Any indirect or consequential damages,</li>
              <li>Loss of data, profits, or revenue,</li>
              <li>Any damages arising from your use or inability to use the Service.</li>
            </ul>
          </section>
          
          <hr className="my-6" />
          
          <section id="termination" className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">8. {t('sections.termination')}</h2>
            <p>We may suspend or terminate your account at any time for violations of these Terms. Upon termination, your right to use the Service will immediately cease.</p>
          </section>
          
          <hr className="my-6" />
          
          <section id="governing-law" className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">9. {t('sections.governingLaw')}</h2>
            <p>These Terms shall be governed by and interpreted in accordance with the laws of <strong>Malaysia</strong>, without regard to conflict of law principles.</p>
          </section>
          
          <hr className="my-6" />
          
          <section id="changes-to-terms" className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">10. {t('sections.changesToTerms')}</h2>
            <p>We reserve the right to modify these Terms at any time. If we make significant changes, we will notify you via email or through the app. Continued use of the Service constitutes acceptance of the updated Terms.</p>
          </section>
          
          <hr className="my-6" />
          
          <section id="contact-us" className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">11. {t('sections.contactUs')}</h2>
            <p>If you have any questions about these Terms, please contact us at:</p>
            <p className="mt-3">
              <strong>{t('support')}</strong><br />
              Email: <a href="mailto:teamsync1366@gmail.com" className="text-primary hover:underline">teamsync1366@gmail.com</a>
            </p>
          </section>
        </div>
      </main>
    </div>
  );
} 