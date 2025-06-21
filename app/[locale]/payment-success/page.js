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
  const formatAmount = (amount) => {
    return `$${(amount / 100).toFixed(2)}`;
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
            userId: orderDetails.userId
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
      // Get current date for start_date
      const startDate = new Date().toISOString();
      
      // Get plan details
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
      
      // First, find all active subscription plans for this user (both paid and free)
      const { data: activeSubscriptions, error: activeSubError } = await supabase
        .from('user_subscription_plan')
        .select('id, plan_id, status')
        .eq('user_id', userId)
        .or('status.eq.ACTIVE,status.eq.active')
        .order('created_at', { ascending: false });
      
      if (activeSubError) throw activeSubError;
      
      const now = new Date().toISOString();
      
      // Deactivate ALL active subscription plans
      if (activeSubscriptions && activeSubscriptions.length > 0) {
        
        for (const subscription of activeSubscriptions) {
          // Deactivate each active subscription plan
          await supabase
            .from('user_subscription_plan')
            .update({
              status: 'DEACTIVATED',
              updated_at: now
            })
            .eq('id', subscription.id);
            
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
          start_date: startDate,
          end_date: endDate,  // Can be null
        auto_renew: planData.type !== 'FREE', // Enable auto-renew for paid plans by default
        ...currentUsage, // Spread the current usage values
          created_at: now,
          updated_at: now
        };
        
      const result = await supabase
          .from('user_subscription_plan')
          .insert(newData);
      
      if (result.error) throw result.error;
      
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
        .single();

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
  const createPaymentRecord = async (paymentData) => {
    try {
      
      // Get orderId from the metadata
      const orderId = paymentData.metadata?.orderId || metadata?.orderId;

      if (!orderId) {
        throw new Error('No order ID found in payment metadata');
      }
      
      // Build payment record data
      const paymentRecord = {
        user_id: paymentData.metadata?.userId || paymentData.userId,
        order_id: orderId,
        amount: paymentData.amount / 100, // Stripe amount is in cents, convert to dollars
        currency: paymentData.currency || 'USD',
        payment_method: paymentData.metadata?.payment_method || 'stripe',
        status: paymentData.status === 'succeeded' ? 'COMPLETED' : 
                paymentData.status === 'processing' ? 'PENDING' : 'FAILED',
        transaction_id: paymentData.id,
        stripe_payment_id: paymentData.id,
        discount_amount: paymentData.metadata?.discount ? parseFloat(paymentData.metadata.discount) : 0,
        applied_promo_code: paymentData.metadata?.promoCode || null,
        metadata: {
          planId: paymentData.metadata?.planId,
          planName: paymentData.metadata?.planName,
        },
        is_processed: false, // Initially set to false
      };
      
      // Insert payment record and return created record
      const { data, error } = await supabase
        .from('payment')
        .insert(paymentRecord)
        .select('*')  // Add this to get the inserted record
        .single();    // Add this to get a single record
        
      if (error) throw error;
      
      
      return data;
    } catch (err) {
      console.error('Error creating payment record:', err);
      return null;
    }
  };

  // Create payment record for Alipay
  const createAlipayPaymentRecord = async (paymentData) => {
    try {
      
      // 从元数据中获取订单ID
      const orderId = paymentData.metadata?.orderId || metadata?.orderId;
      
      if (!orderId) {
        throw new Error('No order ID found in payment metadata');
      }
      
      // 确定支付状态 - 支付宝可能返回不同的成功状态
      let paymentStatus = 'FAILED';
      const successStatuses = ['paid', 'complete', 'succeeded', 'completed'];
      const pendingStatuses = ['processing', 'pending'];
      
      if (successStatuses.includes(paymentData.status?.toLowerCase())) {
        paymentStatus = 'COMPLETED';
      } else if (pendingStatuses.includes(paymentData.status?.toLowerCase())) {
        paymentStatus = 'PENDING';
      }
      
      // 构建支付记录数据
      const paymentRecord = {
        user_id: paymentData.metadata?.userId,
        order_id: orderId,
        amount: paymentData.amount / 100, // 转换为美元
        currency: paymentData.currency || 'USD',
        payment_method: 'alipay',
        status: paymentStatus,
        transaction_id: paymentData.id,
        stripe_payment_id: paymentData.id,
        discount_amount: paymentData.metadata?.discount ? parseFloat(paymentData.metadata.discount) : 0,
        applied_promo_code: paymentData.metadata?.promoCode || null,
        metadata: {
          planId: paymentData.metadata?.planId,
          planName: paymentData.metadata?.planName,
          originalCurrency: paymentData.originalCurrency || 'CNY',
          originalAmount: paymentData.originalAmount || paymentData.amount,
          exchangeRate: paymentData.metadata?.exchangeRate || '7.2'
        },
        is_processed: false, // 初始设置为false
      };
      
      // 插入支付记录并返回创建的记录
      const { data, error } = await supabase
        .from('payment')
        .insert(paymentRecord)
        .select('*')
        .single();
        
      if (error) throw error;
            
      return data;
    } catch (err) {
      console.error('Error creating Alipay payment record:', err);
      return null;
    }
  };

  useEffect(() => {
    const initializePaymentSuccess = async () => {
      try {
        // 检查URL参数
        const paymentIntent = searchParams.get('payment_intent');
        const sessionId = searchParams.get('session_id');
        
        // 使用URL中的会话ID或Redux中存储的会话ID
        const activeSessionId = sessionId || storedSessionId;
        
        // 如果有会话ID（支付宝支付通常会返回会话ID）
        if (activeSessionId) {
          await processPaymentWithSession(activeSessionId);
          return;
        }
        
        // 如果直接有支付意图ID（信用卡支付通常会返回支付意图ID）
        if (paymentIntent && typeof paymentIntent === 'string') {
          await processPaymentWithIntent(paymentIntent);
          return;
        } else if (paymentIntent) {
          console.error('Payment intent is not a string:', paymentIntent);
          toast.error('Payment verification failed', {
            description: 'Invalid payment ID format'
          });
          return;
        }
        
        // 如果两者都没有，重定向到首页
        if (!activeSessionId && !paymentIntent) {
          console.error('No payment_intent or session_id found');
          toast.error('Payment verification failed', {
            description: 'Missing payment information. Please try again.'
          });
          router.push('/');
          return;
        }
      } catch (err) {
        console.error('Error initializing payment success:', err);
        toast.error('Payment processing error', {
          description: err.message || 'An unexpected error occurred'
        });
        router.push('/payment-error');
      } finally {
        setLoading(false);
      }
    };

    // Process payment with session ID
    const processPaymentWithSession = async (sessionId) => {
      try {
        // Ensure sessionId is a string
        if (!sessionId || typeof sessionId !== 'string') {
          console.error('Invalid sessionId format:', sessionId);
          toast.error('Payment verification failed', {
            description: 'Invalid session ID format'
          });
          return;
        }
        
        // Fetch session details from Stripe
        const sessionResult = await dispatch(fetchSessionDetails(sessionId)).unwrap();
        
        // 支付宝支付可能没有 payment_intent，但仍然可以是成功的
        // 检查支付状态是否表示成功
        const isSuccessfulPayment = ['paid', 'complete', 'completed'].includes(sessionResult.payment_status?.toLowerCase());
        
        if (!sessionResult.payment_intent && !isSuccessfulPayment) {
          throw new Error('No payment intent found in session and payment is not successful');
        }
        
        // 如果有支付意图ID，检查是否已处理
        if (sessionResult.payment_intent && typeof sessionResult.payment_intent === 'string') {
          // Check if payment is already processed
          const isProcessed = await checkPaymentProcessed(sessionResult.payment_intent);
          if (isProcessed) {
            handleAlreadyProcessedPayment();
            return;
          }
          
          // 如果有支付意图ID，尝试处理支付
          await processPaymentWithIntent(sessionResult.payment_intent);
        } else if (sessionResult.payment_intent) {
          console.error('Payment intent is not a string:', sessionResult.payment_intent);
          toast.error('Payment verification failed', {
            description: 'Invalid payment ID format'
          });
        }
        
        // Update metadata from session if available
        if (sessionResult.metadata) {
          // 处理Alipay特有的元数据
          const orderId = sessionResult.metadata.orderId || uuidv4();
          const planId = sessionResult.metadata.planId;
          const userId = sessionResult.metadata.userId;
          const planName = sessionResult.metadata.planName;
          const promoCode = sessionResult.metadata.promoCode || null;
          const discount = sessionResult.metadata.discount ? parseFloat(sessionResult.metadata.discount) : 0;
          
          // 检查是否是支付宝支付（通过货币判断）
          const isAlipay = sessionResult.currency === 'cny';
          
          // 如果是CNY，需要转换回USD（假设汇率是7.2，与创建会话时一致）
          let amount = sessionResult.amount_total / 100; // 转换为元
          if (isAlipay) {
            // 从CNY转回USD
            const exchangeRate = 7.2;
            amount = amount / exchangeRate;
          }
          
          // 更新Redux中的元数据
          dispatch(setPaymentMetadata({
            ...sessionResult.metadata,
            orderId: orderId,
            amount: amount,
            currency: isAlipay ? 'USD' : sessionResult.currency
          }));
          
          // 如果会话中有用户ID和计划ID，但processPaymentWithIntent没有处理（例如支付宝支付可能没有常规的payment_intent），
          // 或者支付已成功但没有处理，在这里直接处理订阅更新和支付记录
          if ((userId && planId && (!paymentDetails || isSuccessfulPayment))) {
            
            // 获取用户邮箱
            const email = await fetchUserEmail(userId);
            
            // 更新用户订阅
            await updateUserSubscription(userId, planId);
            
            // 创建支付记录
            const paymentRecord = await createAlipayPaymentRecord({
              id: sessionResult.payment_intent || `alipay_session_${sessionId}`,
              status: sessionResult.payment_status || 'paid', // 如果没有状态，默认为paid
              amount: amount * 100, // 转回分
              currency: 'USD', // 存储为USD
              originalCurrency: 'CNY',
              originalAmount: sessionResult.amount_total,
              metadata: {
                userId: userId,
                planId: planId,
                planName: planName,
                orderId: orderId,
                promoCode: promoCode,
                discount: discount,
                payment_method: 'alipay'
              }
            });
            
            // 更新支付处理状态
            if (paymentRecord && sessionResult.payment_intent && typeof sessionResult.payment_intent === 'string') {
              await updatePaymentProcessed(sessionResult.payment_intent);
            }
            
            // 发送确认邮件
            if (email) {
              await sendEmail(email, {
                id: orderId,
                orderId: orderId,
                planName: planName,
                amount: amount,
                userId: userId
              });
            }
          }
        }
      } catch (error) {
        console.error('Error processing payment with session:', error);
        toast.error('Payment verification failed', {
          description: error.message || 'Failed to verify your payment'
        });
      }
    };

    // Process payment with payment intent
    const processPaymentWithIntent = async (paymentIntentId) => {
      // Ensure paymentIntentId is a string
      if (!paymentIntentId || typeof paymentIntentId !== 'string') {
        console.error('Invalid paymentIntentId format:', paymentIntentId);
        toast.error('Payment verification failed', {
          description: 'Invalid payment ID format'
        });
        return;
      }
      
      // Check if payment is already processed
      const isProcessed = await checkPaymentProcessed(paymentIntentId);
      if (isProcessed) {
        handleAlreadyProcessedPayment();
        return;
      }
      
      // Fetch payment status from Stripe
      const result = await dispatch(fetchPaymentStatus(paymentIntentId)).unwrap();
      
      if (result.metadata) {
        dispatch(setPaymentMetadata({
          ...result.metadata,
          orderId: result.metadata.orderId,
          amount: result.amount
        }));
      }

      // Handle successful payment logic
      if (result.metadata?.userId) {
        const email = await fetchUserEmail(result.metadata.userId);
        
        if (result.metadata?.planId) {
          await updateUserSubscription(result.metadata.userId, result.metadata.planId);
        }
        
        const paymentRecord = await createPaymentRecord({
          ...result,
          userId: result.metadata.userId
        });

        if (paymentRecord) {
          // Update payment processed status
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

    initializePaymentSuccess();
  }, [dispatch, searchParams, storedSessionId, router]);

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
    <>
      {showProcessedModal ? (
        <ProcessedPaymentModal countdown={countdown} />
      ) : (
        <PaymentSuccessModal
          metadata={metadata}
          userEmail={userEmail}
          formatAmount={formatAmount}
          formatOrderId={formatOrderId}
          isOrderIdExpanded={isOrderIdExpanded}
          setIsOrderIdExpanded={setIsOrderIdExpanded}
          copyToClipboard={copyToClipboard}
        />
      )}
    </>
  );
}