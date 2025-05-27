'use client'

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { fetchPaymentStatus, setPaymentMetadata } from '@/lib/redux/features/paymentSlice';
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
  
  const { paymentDetails, metadata, status, error } = useSelector(state => state.payment);

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

  // 获取用户邮箱
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

  // 发送确认邮件
  const sendEmail = async (email, orderDetails) => {
    try {
      console.log('Sending confirmation email to:', email);
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

      console.log('Email sent successfully');
    } catch (err) {
      console.error('Error sending confirmation email:', err);
    }
  };

  // 更新用户订阅计划
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
      if (planData.type !== 'FREE') {  // 只有非免费计划才设置结束日期
        endDate = new Date();
        if (planData.billing_interval === 'MONTHLY') {
          endDate.setMonth(endDate.getMonth() + 1);
        } else if (planData.billing_interval === 'YEARLY') {
          endDate.setFullYear(endDate.getFullYear() + 1);
        }
        endDate = endDate.toISOString();
      }
      
      // Update subscription
      const updateData = {
        user_id: userId,
        plan_id: planId,
        status: 'ACTIVE',
        start_date: startDate,
        end_date: endDate,  // 可以为 null
        current_projects: 0,
        current_teams: 0,
        current_members: 0,
        current_ai_chat: 0,
        current_ai_task: 0,
        current_ai_workflow: 0,
        current_storage: 0,
        updated_at: new Date().toISOString()
      };
      
      // First, check if a record already exists
      const { data: existingData, error: checkError } = await supabase
        .from('user_subscription_plan')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (checkError) throw checkError;
      
      let result;
      const now = new Date().toISOString();
      
      if (existingData) {
        // Update existing record
        result = await supabase
          .from('user_subscription_plan')
          .update(updateData)
          .eq('user_id', userId);
      } else {
        // Insert new record
        result = await supabase
          .from('user_subscription_plan')
          .insert(updateData);
      }
      
      if (result.error) throw result.error;
      
      console.log('User subscription updated successfully');
      return true;
    } catch (error) {
      console.error('Error updating subscription:', error);
      throw error;
    }
  };

  // 添加新的检查函数
  const checkPaymentProcessed = async (paymentIntentId) => {
    try {
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

  // 添加更新支付状态的函数
  const updatePaymentProcessed = async (paymentIntentId) => {
    try {
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

  // 修改现有的 createPaymentRecord 函数
  const createPaymentRecord = async (paymentData) => {
    try {
      console.log('Creating payment record:', paymentData);
      
      // Get orderId from the metadata
      const orderId = paymentData.metadata?.orderId || metadata?.orderId;
      console.log('Order ID from metadata:', orderId);
      console.log('Full payment data:', paymentData);
      console.log('Full metadata:', metadata);
      
      if (!orderId) {
        throw new Error('No order ID found in payment metadata');
      }
      
      // 构建支付记录数据
      const paymentRecord = {
        user_id: paymentData.metadata?.userId || paymentData.userId,
        order_id: orderId,
        amount: paymentData.amount / 100, // Stripe金额是以分为单位，转换为元
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
        is_processed: false, // 初始设置为 false
      };
      
      // 插入支付记录并返回创建的记录
      const { data, error } = await supabase
        .from('payment')
        .insert(paymentRecord)
        .select('*')  // Add this to get the inserted record
        .single();    // Add this to get a single record
        
      if (error) throw error;
      
      console.log('Payment record created successfully:', data);
      
      return data;
    } catch (err) {
      console.error('Error creating payment record:', err);
      return null;
    }
  };

  useEffect(() => {
    const initializePaymentSuccess = async () => {
      try {
        const paymentIntent = searchParams.get('payment_intent');
        
        if (!paymentIntent) {
          router.push('/');
          return;
        }

        // 检查支付是否已处理
        const isProcessed = await checkPaymentProcessed(paymentIntent);
        
        if (isProcessed) {
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
          
          return;
        }

        // 如果支付未处理，继续正常的支付处理流程
        const result = await dispatch(fetchPaymentStatus(paymentIntent)).unwrap();
        console.log('Payment status result:', result);
        
        if (result.metadata) {
          dispatch(setPaymentMetadata({
            ...result.metadata,
            orderId: result.metadata.orderId,
            amount: result.amount
          }));
        }

        // 处理支付成功的逻辑
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
            // 更新支付处理状态
            await updatePaymentProcessed(paymentIntent);
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
      } catch (err) {
        console.error('Error initializing payment success:', err);
        router.push('/payment-error');
      } finally {
        setLoading(false);
      }
    };

    initializePaymentSuccess();
  }, [dispatch, searchParams]);

  console.log('Current payment state:', {
    status,
    paymentDetails,
    metadata,
    error
  });

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