'use client'

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { fetchPaymentStatus, fetchSessionDetails, setPaymentMetadata } from '@/lib/redux/features/paymentSlice';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';
import ProcessedPaymentModal from '@/components/payment/paymentProcessed';
import PaymentSuccessModal from '@/components/payment/paymentSuccees';
import { fetchSubscription } from '@/lib/redux/features/subscriptionSlice';

export default function PaymentSuccess() {
  const router = useRouter();
  const dispatch = useDispatch();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState(null);
  const [isOrderIdExpanded, setIsOrderIdExpanded] = useState(false);
  const [showProcessedModal, setShowProcessedModal] = useState(false);
  const [countdown, setCountdown] = useState(3);
  
  // Get payment data from Redux
  const { 
    paymentDetails, 
    metadata, 
    status, 
    error, 
    sessionId: storedSessionId, 
    sessionDetails 
  } = useSelector(state => state.payment);

  // Format amount helper
  const formatAmount = (amount, currency = 'MYR') => {
    return new Intl.NumberFormat('ms-MY', {
      style: 'currency',
      currency: currency,
    }).format((amount || 0) / 100);
  };

  // Copy to clipboard helper
  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard');
    } catch (err) {
      console.error('Failed to copy text:', err);
      toast.error('Failed to copy');
    }
  };

  // Format Order ID helper
  const formatOrderId = (orderId) => {
    if (!orderId) return 'N/A';
    return isOrderIdExpanded ? orderId : `${orderId.substring(0, 8)}...`;
  };

  // Get user email
  const fetchUserEmail = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('user')
        .select('email')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setUserEmail(data.email);
      return data.email;
    } catch (err) {
      console.error('Error fetching user email:', err);
      return null;
    }
  };

  // Send confirmation email
  const sendEmail = async (email, orderDetails) => {
    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: email,
          subject: 'Thank You for Your Purchase - Team Sync',
          text: 'Thank you for your purchase. Your payment has been successfully processed.',
          orderDetails: {
            planName: orderDetails.planName,
            amount: orderDetails.amount,
            orderId: orderDetails.orderId,
            userId: orderDetails.userId,
            currency: 'MYR'
          }
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send email');
      }

    } catch (err) {
      console.error('Error sending confirmation email:', err);
    }
  };

  // Update user subscription
  const updateUserSubscription = async (userId, planId) => {
    try {
      // Deactivate any existing active subscriptions for the user (case-insensitive)
      const { data: activeSubscriptions, error: findError } = await supabase
        .from('user_subscription_plan')
        .select('id')
        .eq('user_id', userId)
        .eq('status', 'ACTIVE');

      if (findError) {
        console.error('Error finding active subscriptions to deactivate:', findError);
        throw findError;
      }

      if (activeSubscriptions && activeSubscriptions.length > 0) {
        const idsToDeactivate = activeSubscriptions.map(sub => sub.id);
        const { error: updateError } = await supabase
          .from('user_subscription_plan')
          .update({ 
            status: 'INACTIVE',
            updated_at: new Date().toISOString() 
          })
          .in('id', idsToDeactivate);
        
        if (updateError) {
          console.error('Error deactivating old subscriptions:', updateError);
          throw updateError;
        }
      }
      
      // Get the details of the new plan
      const { data: planData, error: planError } = await supabase
        .from('subscription_plan')
        .select('billing_interval, type')
        .eq('id', planId)
        .single();
      
      if (planError) throw planError;
      
      // Calculate end date based on billing interval
      let endDate = null;
      if (planData.type !== 'FREE') {  // Only set end date for non-free plans
        if (planData.billing_interval === 'MONTHLY') {
          endDate = new Date();
          endDate.setMonth(endDate.getMonth() + 1);
          endDate = endDate.toISOString();
        } else if (planData.billing_interval === 'YEARLY') {
          endDate = new Date();
          endDate.setFullYear(endDate.getFullYear() + 1);
          endDate = endDate.toISOString();
        } else {
          // For NULL or undefined billing_interval, keep end date as null
          endDate = null;
        }
      }
      
      // Find the most recent subscription to migrate usage data from
      const { data: mostRecentSubscription, error: recentError } = await supabase
        .from('user_subscription_plan')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (recentError) throw recentError;
        
        // Create a new subscription plan with migrated usage data
      let currentUsage = {
        current_projects: 0,
        current_teams: 0,
        current_members: 0,
        current_ai_chat: 0,
        current_ai_task: 0,
        current_ai_workflow: 0,
        current_storage: 0
      };
      
      // Migrate usage data if available from any recent subscription
      if (mostRecentSubscription) {
        currentUsage = {
          current_projects: mostRecentSubscription.current_projects || 0,
          current_teams: mostRecentSubscription.current_teams || 0,
          current_members: mostRecentSubscription.current_members || 0,
          current_ai_chat: mostRecentSubscription.current_ai_chat || 0,
          current_ai_task: mostRecentSubscription.current_ai_task || 0,
          current_ai_workflow: mostRecentSubscription.current_ai_workflow || 0,
          current_storage: mostRecentSubscription.current_storage || 0
        };
      }
      
      // Insert new subscription with the new plan
        const newData = {
          user_id: userId,
          plan_id: planId,
          status: 'ACTIVE',
          start_date: new Date().toISOString(),
          end_date: endDate,  // Can be null
        auto_renew: planData.type !== 'FREE', // Enable auto-renew for paid plans by default
        ...currentUsage, // Spread the current usage values
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
      const result = await supabase
          .from('user_subscription_plan')
          .insert(newData);
      
      if (result.error) throw result.error;
      
      // After successfully updating the subscription in the DB, refresh Redux state
      await dispatch(fetchSubscription(userId));
      
      return true;
    } catch (error) {
      console.error('Error updating subscription:', error);
      throw error;
    }
  };

  // Check if payment has been processed
  const checkPaymentProcessed = async (paymentIntentId) => {
    try {
      // Make sure paymentIntentId is a string
      if (!paymentIntentId || typeof paymentIntentId !== 'string') {
        console.error('Invalid paymentIntentId format:', paymentIntentId);
        return false;
      }
      
      const { data, error } = await supabase
        .from('payment')
        .select('is_processed, stripe_payment_id')
        .eq('stripe_payment_id', paymentIntentId)
        .maybeSingle();

      if (error) throw error;
      return data?.is_processed || false;
    } catch (err) {
      console.error('Error checking payment processed status:', err);
      return false;
    }
  };

  // Update payment processed status
  const updatePaymentProcessed = async (paymentIntentId) => {
    try {
      // Make sure paymentIntentId is a string
      if (!paymentIntentId || typeof paymentIntentId !== 'string') {
        console.error('Invalid paymentIntentId format:', paymentIntentId);
        return false;
      }
      
      const { error } = await supabase
        .from('payment')
        .update({ 
          is_processed: true,
          updated_at: new Date().toISOString()
        })
        .eq('stripe_payment_id', paymentIntentId);

      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Error updating payment processed status:', err);
      return false;
    }
  };

  // Create payment record
  const createPaymentRecord = async (paymentData, sessionData = null) => {
    try {
      const isAlipay = sessionData && sessionData.payment_method_types.includes('alipay');
      const metadata = paymentData?.metadata || sessionData?.metadata || {};
      
      // Try to find orderId in different potential locations
      const orderId = metadata?.orderId || 
                      paymentData?.metadata?.orderId || 
                      sessionData?.metadata?.orderId ||
                      metadata?.order_id || 
                      paymentData?.metadata?.order_id || 
                      sessionData?.metadata?.order_id || 
                      // If no order ID found, generate a new UUID
                      uuidv4();

      // Log the found orderId for debugging purposes
      console.log('Using order ID:', orderId, 'Source:', 
        metadata?.orderId ? 'metadata.orderId' : 
        paymentData?.metadata?.orderId ? 'paymentData.metadata.orderId' : 
        sessionData?.metadata?.orderId ? 'sessionData.metadata.orderId' : 
        metadata?.order_id ? 'metadata.order_id' : 
        paymentData?.metadata?.order_id ? 'paymentData.metadata.order_id' : 
        sessionData?.metadata?.order_id ? 'sessionData.metadata.order_id' : 
        'newly generated UUID');

      const status = (paymentData?.status === 'succeeded' || sessionData?.payment_status === 'paid')
        ? 'COMPLETED'
        : (paymentData?.status === 'processing' ? 'PENDING' : 'FAILED');

      const paymentRecord = {
        user_id: metadata?.userId,
        order_id: orderId,
        amount: (paymentData?.amount || sessionData?.amount_total) / 100,
        currency: paymentData?.currency || sessionData?.currency || 'MYR',
        payment_method: metadata?.payment_method || (isAlipay ? 'alipay' : 'card'),
        status: status,
        transaction_id: paymentData?.id || sessionData?.payment_intent?.id || sessionData.id,
        stripe_payment_id: paymentData?.id || sessionData?.payment_intent?.id || sessionData.id,
        discount_amount: metadata?.discount ? parseFloat(metadata.discount) : 0,
        applied_promo_code: metadata?.promoCode || null,
        metadata: {
          planId: metadata?.planId,
          planName: metadata?.planName,
        },
        is_processed: false,
      };

      const { data, error } = await supabase
        .from('payment')
        .insert(paymentRecord)
        .select('*')
        .single();

      if (error) {
        // Log the detailed error from Supabase
        console.error('Supabase error creating payment record:', error);
        throw error;
      }
      
      return data;
    } catch (err) {
      console.error('Error creating payment record:', err.message);
      throw err; // Re-throw the error to be caught by the caller
    }
  };

  // 获取当前语言
  const locale = searchParams.get('locale') || 'en'; // 如果没有语言参数，默认使用英文
  
  // 修改跳转路径，包含语言
  const getLocalizedPath = (path) => {
    return `/${locale}${path}`;
  };

  // Initial setup on component mount
  useEffect(() => {
    const initializePaymentSuccess = async () => {
      setLoading(true);
      const sessionId = searchParams.get('session_id');
      const paymentIntentId = searchParams.get('payment_intent');

      try {
        if (sessionId) {
          await processPaymentWithSession(sessionId);
        } else if (paymentIntentId) {
          await processPaymentWithIntent(paymentIntentId);
        } else {
          toast.error('Payment verification failed', {
            description: 'No payment identifier found.'
          });
        }
        
        // 检查是否为套餐升级付款，如果是则添加5秒后自动跳转
        if (metadata?.upgradeType === 'immediate' || sessionDetails?.metadata?.upgradeType === 'immediate') {
          // 显示倒计时提示
          setShowProcessedModal(true);
          
          // 启动倒计时
          const timer = setInterval(() => {
            setCountdown(prev => {
              if (prev <= 1) {
                clearInterval(timer);
                // 倒计时结束后跳转
                router.push(getLocalizedPath('/settings/subscription'));
                return 0;
              }
              return prev - 1;
            });
          }, 1000);
          
          // 清理定时器
          return () => clearInterval(timer);
        }
      } catch (error) {
        console.error('Initialization error on payment success page:', error);
        // Error toast is handled in the processing functions
      } finally {
        setLoading(false);
      }
    };

    initializePaymentSuccess();
  }, [searchParams]);

  // 添加倒计时提示组件渲染逻辑
  useEffect(() => {
    if (showProcessedModal && countdown === 0) {
      router.push(getLocalizedPath('/settings/subscription'));
    }
  }, [countdown, showProcessedModal, router]);

  // Process payment with session ID
  const processPaymentWithSession = async (sessionId) => {
    try {
      if (!sessionId || typeof sessionId !== 'string') {
        throw new Error('Invalid session ID format');
      }
      
      const sessionResult = await dispatch(fetchSessionDetails(sessionId)).unwrap();
      const paymentIntentId = sessionResult.payment_intent?.id || sessionResult.payment_intent;
      const isSuccessfulPayment = ['paid', 'complete', 'completed'].includes(sessionResult.payment_status?.toLowerCase());

      if (sessionResult.metadata) {
        dispatch(setPaymentMetadata({
            ...sessionResult.metadata,
            orderId: sessionResult.metadata.orderId,
            amount: sessionResult.amount_total
        }));
      }

      if (!paymentIntentId && !isSuccessfulPayment) {
        throw new Error('Payment was not successful and no payment intent was found.');
      }
      
      if (paymentIntentId) {
        const isProcessed = await checkPaymentProcessed(paymentIntentId);
        if (isProcessed) {
          handleAlreadyProcessedPayment();
          return;
        }
      }

      // Create payment record using the session data
      const paymentRecord = await createPaymentRecord(null, sessionResult);
      
      if (paymentRecord) {
        const finalPaymentIntentId = paymentRecord.transaction_id;
        await updatePaymentProcessed(finalPaymentIntentId);
        dispatch(fetchPaymentStatus.fulfilled(paymentRecord, 'payment/fetchPaymentStatus', finalPaymentIntentId));

        if (paymentRecord.user_id) {
          const email = await fetchUserEmail(paymentRecord.user_id);
          if (paymentRecord.metadata?.planId) {
            await updateUserSubscription(paymentRecord.user_id, paymentRecord.metadata.planId);
          }
          if (email) {
            await sendEmail(email, {
              orderId: paymentRecord.order_id,
              planName: paymentRecord.metadata.planName,
              amount: paymentRecord.amount * 100,
              userId: paymentRecord.user_id
            });
          }
        }
      } else {
        throw new Error('Failed to create payment record from session.');
      }
    } catch (error) {
      console.error('Error processing payment with session:', error);
      toast.error('Payment verification failed', {
        description: error.message || 'Failed to verify your payment.'
      });
      throw error; // Re-throw to be caught by the initializer
    }
  };

  // Process payment with payment intent
  const processPaymentWithIntent = async (paymentIntentId) => {
    try {
      if (!paymentIntentId || typeof paymentIntentId !== 'string') {
        throw new Error('Invalid payment ID format');
      }
      
      const isProcessed = await checkPaymentProcessed(paymentIntentId);
      if (isProcessed) {
        handleAlreadyProcessedPayment();
        return;
      }
      
      const result = await dispatch(fetchPaymentStatus(paymentIntentId)).unwrap();
      
      if (result.metadata) {
        dispatch(setPaymentMetadata({
          ...result.metadata,
          orderId: result.metadata.orderId,
          amount: result.amount
        }));
      }

      if (result.metadata?.userId) {
        const email = await fetchUserEmail(result.metadata.userId);
        
        if (result.metadata?.planId) {
          await updateUserSubscription(result.metadata.userId, result.metadata.planId);
        }
        
        // Pass the payment intent data to create the record
        const paymentRecord = await createPaymentRecord(result);

        if (paymentRecord) {
          await updatePaymentProcessed(paymentIntentId);
          dispatch(fetchPaymentStatus.fulfilled(paymentRecord, 'payment/fetchPaymentStatus', paymentRecord.id));
        }
        
        if (email) {
          await sendEmail(email, {
            id: result.metadata.orderId,
            orderId: result.metadata.orderId,
            planName: result.metadata.planName,
            amount: result.amount,
            userId: result.metadata.userId
          });
        }
      }
    } catch (error) {
       console.error('Error processing payment with intent:', error);
       toast.error('Payment processing failed', {
         description: error.message || 'An unexpected error occurred.'
       });
       throw error; // Re-throw to be caught by the initializer
    }
  };

  // Handle already processed payments
  const handleAlreadyProcessedPayment = () => {
    setShowProcessedModal(true);
    
    let count = 3;
    setCountdown(count);
    
    const toastId = toast.warning(
      "Payment Already Processed", 
      {
        description: `This payment has already been processed. Redirecting to dashboard in ${count} seconds...`,
        duration: 3000,
      }
    );
    
    const interval = setInterval(() => {
      count--;
      setCountdown(count);
      
      if (count > 0) {
        toast.warning(
          "Payment Already Processed",
          {
            id: toastId,
            description: `This payment has already been processed. Redirecting to dashboard in ${count} seconds...`,
            duration: 1000,
          }
        );
      } else {
        clearInterval(interval);
        router.push('/dashboard');
      }
    }, 1000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <h2 className="mt-4 text-xl font-semibold text-gray-900">Processing your payment...</h2>
            <p className="mt-2 text-gray-600">
              Please wait while we confirm your payment details.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="mt-4 text-2xl font-bold text-gray-900">Payment Failed</h2>
            <p className="mt-2 text-gray-600">
              There was an issue processing your payment. Please try again.
            </p>
            {paymentDetails?.error && (
              <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">
                {paymentDetails.error}
              </div>
            )}
          </div>
          <div className="mt-8 space-y-3">
            <Link 
              href="/dashboard"
              className="block w-full bg-indigo-600 text-white py-3 px-4 rounded-md hover:bg-indigo-700 transition-colors"
            >
              Go to Dashboard
            </Link>
            <Link 
              href="/"
              className="block w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-md hover:bg-gray-200 transition-colors"
            >
              Return to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-16 p-4">
      {loading ? (
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Verifying your payment...</p>
        </div>
      ) : error ? (
        <div className="text-center space-y-4">
          <div className="bg-red-100 p-4 rounded-md text-red-700">
            <h3 className="font-medium">Payment Error</h3>
            <p className="mt-2 text-sm">{error}</p>
          </div>
          <Link href="/payment" className="mt-6 inline-block text-indigo-600 hover:text-indigo-800">
            Return to Payment Page
          </Link>
        </div>
      ) : showProcessedModal ? (
        // 套餐升级成功倒计时页面
        <div className="text-center space-y-4 bg-white p-6 rounded-lg shadow-md">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Plan Upgraded Successfully!</h2>
          <p className="text-green-600 font-medium">
            Your subscription has been updated to {metadata?.planName || sessionDetails?.metadata?.planName}
          </p>
          <div className="my-4 p-3 bg-blue-50 rounded-md">
            <p>Redirecting to subscription page in <span className="font-bold">{countdown}</span> seconds...</p>
          </div>
          <div className="mt-4">
            <button 
              onClick={() => router.push('/settings/subscription')}
              className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors"
            >
              Go to Subscription Page Now
            </button>
          </div>
        </div>
      ) : (
        <>
          {paymentDetails || metadata ? (
            <PaymentSuccessModal 
              metadata={metadata}
              userEmail={userEmail}
              formatAmount={formatAmount}
              formatOrderId={formatOrderId}
              isOrderIdExpanded={isOrderIdExpanded}
              setIsOrderIdExpanded={setIsOrderIdExpanded}
              copyToClipboard={copyToClipboard}
            />
          ) : (
            <ProcessedPaymentModal />
          )}
        </>
      )}
    </div>
  );
}