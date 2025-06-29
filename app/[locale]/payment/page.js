'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Image from 'next/image'
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import CheckoutForm from '@/components/CheckoutForm'
import { useRouter, useSearchParams, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
//react redux
import { useSelector, useDispatch } from 'react-redux'
import { createPaymentIntent, setPaymentMetadata, setFinalTotal, setSessionId } from '@/lib/redux/features/paymentSlice'
import useGetUser from '@/lib/hooks/useGetUser';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';
import PaymentValidation from './PaymentValidation'
import { useTimer } from './TimerContext'
import PaymentTimer from './PaymentTimer'

// Initialize Stripe outside the component
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

export default function PaymentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();
  const locale = params.locale || 'en';
  const [loading, setLoading] = useState(true);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('card');
  
  // 使用 useGetUser hook 获取用户信息
  const { user, isAuthenticated } = useGetUser();

  // 只保留 planId 参数
  const planId = searchParams.get('plan_id');

  const [planDetails, setPlanDetails] = useState(null)
  const [showPromoInput, setShowPromoInput] = useState(false)
  const [promoCode, setPromoCode] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [paymentStatus, setPaymentStatus] = useState('')
  const [handleCardPayment, setHandleCardPayment] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [email, setEmail] = useState('');

  const dispatch = useDispatch()
  const { status, error: reduxError, metadata } = useSelector(state => state.payment)
  const validationTimestamp = useSelector(state => state.payment.validationTimestamp);

  const [isPromoLoading, setIsPromoLoading] = useState(false);
  const [discount, setDiscount] = useState(0);
  const [validPromo, setValidPromo] = useState(false);
  const [appliedPromoCode, setAppliedPromoCode] = useState('');
  const [promoMessage, setPromoMessage] = useState('');
  const [messageType, setMessageType] = useState(''); // 'success' or 'error'

  useEffect(() => {
    // 简单验证必要参数
    if (!planId) {
      console.error('Missing plan ID parameter');
      router.push('/pricing');
      return;
    }

    setLoading(false);
  }, [planId, router]);

  useEffect(() => {
    const fetchUserEmail = async () => {
      if (!user?.id) return;
      
      const { data, error } = await supabase
        .from('user')
        .select('email')
        .eq('id', user.id)
        .single();
        
      if (error) {
        console.error('Error fetching email:', error);
        return;
      }
      
      if (data?.email) {
        setEmail(data.email);
      }
    };

    fetchUserEmail();
  }, [user]);

  useEffect(() => {
    const fetchPlanDetails = async () => {
      if (!planId) {
        console.error('No plan ID provided');
        setLoading(false);
        return;
      }

      try {
        // 等待用户认证状态确定
        if (!isAuthenticated) {
          return;
        }

        // 如果用户未认证，重定向到登录页面
        if (isAuthenticated === false) {
          router.push(`/${locale}/login?redirect=payment&plan_id=${planId}`);
          return;
        }

        // 获取计划详情
        const {data, error} = await supabase
          .from('subscription_plan')
          .select('*')
          .eq('id', planId)
          .single();

        if (error) {
          throw new Error('Failed to fetch plan details');
        }
        setPlanDetails(data);
      } catch (err) {
        console.error('Error fetching plan details:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPlanDetails();
  }, [planId, router, user, isAuthenticated, locale]);

  useEffect(() => {
    const initializePayment = async () => {
      try {
        // 验证所需参数
        if (!planId || !user?.id) {
          console.error('Missing required parameters');
          return;
        }
        
        // Verify all required parameters are present
        if (!planId) {
          console.error('Missing planId');
          return;
        }
        
        if (!user?.id) {
          console.error('Missing userId');
          return;
        }
        
        if (!planDetails?.price) {
          console.error('Missing plan price');
          return;
        }

        // Generate order ID
        const orderId = uuidv4();

        // Calculate the final total (with discount applied)
        const finalAmountValue = calculateFinalTotal();
        
        // Store the final total in Redux
        dispatch(setFinalTotal(finalAmountValue));

        // 设置支付元数据
        const paymentMetadata = {
          planId,
          userId: user.id,
          orderId,
          planName: planDetails?.name,
          amount: finalAmountValue, // Use finalAmount here
          promoCode: appliedPromoCode,
          discount: discount,
          quantity: 1,
          payment_method: 'card'
        };

        dispatch(setPaymentMetadata(paymentMetadata));

        // 创建支付意向 - Make sure to use finalAmount
        const result = await dispatch(createPaymentIntent({
          amount: finalAmountValue, // Use finalAmount here
          userId: user.id,
          planId: planId,
          metadata: {
            orderId,
            userId: user.id,
            planId: planId,
            planName: planDetails?.name,
            promoCode: appliedPromoCode,
            discount: discount,
            payment_method: 'card',
            quantity: 1,
            finalAmount: finalAmountValue // Add finalAmount to metadata
          }
        })).unwrap();

        
        if (result.clientSecret) {
          setClientSecret(result.clientSecret);
          setPaymentStatus('ready');
        }
      } catch (err) {
        console.error('Error creating payment intent:', err);
      }
    };

    if (planDetails && planId && user?.id) {
      initializePayment();
    }
  }, [dispatch, planId, user, planDetails, discount, appliedPromoCode]);

  // Stripe appearance configuration
  const appearance = {
    theme: 'stripe',
    variables: {
      colorPrimary: '#6366f1',
      colorBackground: '#ffffff',
      colorText: '#1f2937',
      colorDanger: '#ef4444',
      fontFamily: 'ui-sans-serif, system-ui, sans-serif',
      borderRadius: '6px',
      spacingUnit: '4px',
    },
  };

  const options = {
    clientSecret,
    appearance,
    locale: locale, // Use the actual locale from the URL parameters
  };
  
  // Callback function to receive the payment handler from CheckoutForm
  const onPaymentSubmit = useCallback((handler) => {
    setHandleCardPayment(handler);
  }, []);

  // Update the handlePayment function
  const handlePayment = async () => {
    // First verify that we have the userId and planId
    if (!user?.id || !planId) {
      console.error('Missing required parameters:', { userId: user?.id, planId });
      return;
    }

    // Calculate the final total with any applied discounts
    const finalAmount = calculateFinalTotal();
    
    // Store the final total in Redux
    dispatch(setFinalTotal(finalAmount));

    // Generate a new order ID
    const orderId = uuidv4();

    // Ensure we have all required metadata
    const paymentData = {
      amount: finalAmount, // Use the calculated final amount
      userId: user.id,
      planId: planId,
      metadata: {
        orderId: orderId,
        userId: user.id,
        planId: planId,
        planName: planDetails?.name,
        promoCode: appliedPromoCode,
        discount: discount,
        payment_method: 'card',
        quantity: 1,
        finalAmount: finalAmount // Include final amount in metadata
      }
    };

    // Update metadata in Redux
    dispatch(setPaymentMetadata({
      ...paymentData.metadata,
      orderId: orderId,
      amount: finalAmount // Ensure the amount in metadata matches
    }));

    try {
      const result = await dispatch(createPaymentIntent(paymentData)).unwrap();
      // 处理支付结果
      if (result.clientSecret) {
        setClientSecret(result.clientSecret);
        setPaymentStatus('ready');
      }
    } catch (err) {
      console.error('Payment failed:', err);
    }
  };

  const calculateSubTotal = () => {
    if(!planDetails) return 0;

    return planDetails.price * 1;
  }

  // Add this where your payment button is
  const getPaymentButtonText = () => {
    if (paymentStatus === 'processing') return 'Processing...';
    
    switch(selectedPaymentMethod) {
      case 'card':
      case 'alipay':
        return 'Pay Now';
      default:
        return 'Select Payment Method';
    }
  };

  const handlePaymentMethodSelect = (method) => {
    setSelectedPaymentMethod(method);
  };

  const handleAlipayPayment = async () => {
    if (!planDetails || !planDetails.price || !planDetails.name || !user?.id) {
      toast.error('Missing payment details', {
        description: 'Please ensure all payment details are complete.'
      });
      return;
    }
    
    // Calculate the final total with any applied discounts
    const finalAmount = calculateFinalTotal();
    
    // Store the final total in Redux
    dispatch(setFinalTotal(finalAmount));
    
    setIsProcessing(true);
    
    // Show processing toast
    const processingToastId = toast.loading('Processing payment...', {
      description: 'Preparing your Alipay payment. Please wait.'
    });
    
    try {
      const orderId = uuidv4(); // Generate a unique order ID for Alipay
      
      const response = await fetch('/api/create-alipay-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId, // Pass the order ID to the backend
          planName: planDetails.name,
          price: planDetails.price,
          quantity: 1,
          email: email,
          userId: user.id,
          planId: planId,
          promoCode: appliedPromoCode,
          discount: discount,
          finalAmount: finalAmount // Include final amount in request
        }),
      });
      
      // Dismiss the processing toast
      toast.dismiss(processingToastId);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Alipay error response:', errorText);
        console.error('Response status:', response.status);
        
        let errorMessage = `Payment error (${response.status})`;
        try {
          // Try to parse as JSON to get error details
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error || `Server error: ${response.status}`;
          console.error('Parsed error:', errorJson);
          
          toast.error('Payment failed', {
            description: errorMessage
          });
          
          throw new Error(errorMessage);
        } catch (e) {
          // If parsing fails, use the raw error text
          console.error('Error parsing error response:', e);
          
          toast.error('Payment failed', {
            description: `Server error: ${response.status}`
          });
          
          throw new Error(`Server error: ${response.status}`);
        }
      }
      
      const data = await response.json();
      
      if (data && data.url) {
        // Store the session ID in Redux if available
        if (data.sessionId) {
          dispatch(setSessionId(data.sessionId));
        } else {
          // Extract session ID from URL if not directly provided
          const sessionId = new URL(data.url).searchParams.get('session_id');
          if (sessionId) {
            dispatch(setSessionId(sessionId));
          }
        }
        
        toast.success('Redirecting to Alipay', {
          description: 'You will be redirected to complete your payment.'
        });
        
        // Short delay before redirect to ensure toast is visible
        setTimeout(() => {
          // Redirect to Alipay payment page
          window.location.href = data.url;
        }, 1000);
      } else {
        console.error('Invalid response from server:', data);
        toast.error('Payment setup failed', {
          description: 'Unable to initialize Alipay payment. Please try again.'
        });
        throw new Error('Invalid response from server');
      }
    } catch (error) {
      console.error('Alipay payment error:', error);
      
      // Only show toast if not already shown above
      if (!toast.isActive(processingToastId)) {
        toast.error('Payment failed', {
          description: error.message || 'An unexpected error occurred. Please try again.'
        });
      } else {
        toast.dismiss(processingToastId);
      }
      
      setIsProcessing(false);
    }
  };

  // 格式化价格
  const formatPrice = (price) => {
    return new Intl.NumberFormat('ms-MY', {
      style: 'currency',
      currency: 'MYR',
      minimumFractionDigits: 2
    }).format(price);
  };
  
  const getBillingText = () => {
    if (!planDetails) return '';
    
    const interval = planDetails.billing_interval?.toLowerCase();
    if (interval === 'monthly') {
      return '/mo';
    } else if (interval === 'yearly') {
      return '/yr';
    }
    return '';
  };

  const fetchPromoCodes = async () => {
    const {data, error} = await supabase
      .from('promo_code')
      .select('*')
      .eq('code', promoCode)
      .single();

    if(error){
      console.error('Error fetching promo code:', error);
      return null;
    }

    return data;
  }


  const increasePromoCodeUsage = async (code) => {
    // First fetch the current promo code data
    const { data: promoData, error: fetchError } = await supabase
      .from('promo_code')
      .select('current_uses')
      .eq('code', code)
      .single();

    if(fetchError) {
      console.error('Error fetching promo code data for update:', fetchError);
      return;
    }

    // Now update with the incremented value
    const { error } = await supabase
      .from('promo_code')
      .update({ current_uses: promoData.current_uses + 1 })
      .eq('code', code);

    if(error) {
      console.error('Error updating promo code usage:', error);
    }
  }

  const decreasePromoCodeUsage = async (code) => {
    if (!code) return;
    
    // First fetch the current promo code data
    const { data: promoData, error: fetchError } = await supabase
      .from('promo_code')
      .select('current_uses')
      .eq('code', code)
      .single();

    if (fetchError) {
      console.error('Error fetching promo code data for decreasing:', fetchError);
      return;
    }

    // Only decrease if the current_uses is greater than 0
    if (promoData.current_uses > 0) {
      const { error } = await supabase
        .from('promo_code')
        .update({ current_uses: promoData.current_uses - 1 })
        .eq('code', code);

      if (error) {
        console.error('Error decreasing promo code usage:', error);
      }
    }
  }

  const handleApplyPromoCode = async () => {
    if(promoCode.trim() === ''){
      setPromoMessage('Please enter a promo code');
      setMessageType('error');
      return;
    }

    setIsPromoLoading(true);
    setPromoMessage('');

    try {
      const promoCodeData = await fetchPromoCodes();
      
      if(!promoCodeData || !promoCodeData.is_active) {
        setPromoMessage('Invalid or expired promo code');
        setMessageType('error');
        setValidPromo(false);
        return;
      }
      
      // Check if promo code is valid (active and within date range)
      const now = new Date();
      const startDate = new Date(promoCodeData.start_date);
      const endDate = new Date(promoCodeData.end_date);
      
      if(now < startDate || now > endDate) {
        setPromoMessage('Promo code is not valid at this time');
        setMessageType('error');
        setValidPromo(false);
        return;
      }

      //check if the promo code usage limit is reached
      if(promoCodeData.current_uses >= promoCodeData.max_uses){
        setPromoMessage('Promo code usage limit reached');
        setMessageType('error');
        setValidPromo(false);
        return;
      }
      
      // Apply discount
      if(promoCodeData.discount_type === 'PERCENTAGE') {
        setDiscount(calculateSubTotal() * (promoCodeData.discount_value / 100));
      } else {
        setDiscount(promoCodeData.discount_value);
      }
      
      // Set the applied promo code
      setAppliedPromoCode(promoCode);
      setValidPromo(true);
      setMessageType('success');
      setShowPromoInput(false);
      
      // Show success toast
      toast.success('Promo code applied', {
        description: `Discount of ${formatPrice(promoCodeData.discount_type === 'PERCENTAGE' ? 
          calculateSubTotal() * (promoCodeData.discount_value / 100) : 
          promoCodeData.discount_value)} applied to your order.`
      });

      //increment the promo code usage count
      await increasePromoCodeUsage(promoCode);
      
      // If card payment is selected, we need to reinitialize the payment intent with the original amount
      if (selectedPaymentMethod === 'card') {
        // Clear the client secret to force a new payment intent to be created
        setClientSecret('');
      }
    } catch (err) {
      console.error('Error applying promo code:', err);
      setPromoMessage('Failed to apply promo code');
      setMessageType('error');
      setValidPromo(false);
      
      // Show error toast
      toast.error('Failed to apply promo code', {
        description: 'Please check the code and try again.'
      });
    } finally {
      setIsPromoLoading(false);
    }
  };

  // Update calculateSubTotal to include discount
  const calculateFinalTotal = () => {
    const subtotal = calculateSubTotal();
    return Math.max(0, subtotal - discount);
  };

  // Update the button click handler to use the appropriate payment function
  const handlePaymentButtonClick = async () => {
    // Reset any previous messages
    setPromoMessage('');

    if (selectedPaymentMethod === 'card') {
      // Ensure clientSecret is available for card payments
      if (!clientSecret) {
        toast.error('Payment session not ready. Please wait or refresh the page.');
        return;
      }

      setIsProcessing(true);
      await handleCardPayment();
      setIsProcessing(false);
    } else if (selectedPaymentMethod === 'alipay') {
      await handleAlipayPayment();
    } else {
      toast.error('Please select a payment method.');
    }
  };

  // 添加一个格式化价格和计费周期的函数
  const formatPlanPriceAndInterval = (plan) => {
    if (!plan) return 'RM0.00';

    const formattedPrice = new Intl.NumberFormat('ms-MY', {
      style: 'currency',
      currency: 'MYR',
      minimumFractionDigits: 2,
    }).format(plan.price);

    // 如果没有计费周期（比如免费计划）
    if (!plan.billing_interval) {
      return plan.type === 'FREE' ? 'Free' : formattedPrice;
    }

    // 根据计费周期显示不同文案
    switch (plan.billing_interval) {
      case 'MONTHLY':
        return `${formattedPrice} per month`;
      case 'YEARLY':
        return `${formattedPrice} per month, billed annually`;
      default:
        return formattedPrice;
    }
  };

  // 确保在组件加载时，默认选择"Card"
  useEffect(() => {
    setSelectedPaymentMethod('card');
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <PaymentValidation>
      <div className="min-h-screen relative">
        {/* 加载状态 */}
        {status === 'loading' && (
          <div className="fixed inset-0 bg-white bg-opacity-75 flex items-center justify-center z-40">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="mt-4 text-gray-700">Processing payment...</p>
            </div>
          </div>
        )}
        
        <div className="flex h-screen">
          {/* Left Side - Dark Background */}
          <div className="w-1/2 bg-black text-white p-12 overflow-y-auto">
            <div className="max-w-xl mx-auto">
              <div className="flex items-center gap-3 mb-8">
                <Image 
                  src="/logo.png" 
                  alt="Team Sync" 
                  width={32} 
                  height={32} 
                />
                <span className="text-lg">Team Sync</span>
              </div>

              {/* 在订阅信息前添加倒计时组件 */}
              <PaymentTimer validationTimestamp={validationTimestamp} />

              <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2">
                  {planDetails ? `Subscribe to ${planDetails.name}` : 'Subscribe to Team Sync'}
                </h1>
                <div className="text-4xl font-bold mb-2">
                  {planDetails ? formatPlanPriceAndInterval(planDetails) : 'RM0.00'}
                  <span className="text-sm">
                    {getBillingText()}
                  </span>
                </div>
                <div className="text-gray-400">
                  {planDetails ? formatPlanPriceAndInterval(planDetails) : 'RM10.00 per month, billed annually'}
                </div>
              </div>

              {/* 计划详情 */}
              <div className="space-y-6">
                <div className="flex justify-between">
                  <span>{planDetails ? planDetails.name : 'Team Sync'}</span>
                  <span>{planDetails ? formatPlanPriceAndInterval(planDetails) : 'RM0.00'}</span>
                </div>

                <div className="text-sm text-gray-400">
                  {planDetails ? planDetails.description : 'Team Sync is a team collaboration tool that helps you manage your team and projects.'}
                </div>

                <div className="flex justify-end">
                  <span>{planDetails ? planDetails.billing_interval : 'Annually'}</span>
                </div>

                <div className="border-t border-gray-800 pt-4">
                  <div className="flex w-full">
                    {!showPromoInput ? (
                      <div className="w-full">
                        {validPromo && appliedPromoCode ? (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <span className="text-green-400 mr-2">✓</span>
                              <span className="text-green-400">Applied Code: {appliedPromoCode}</span>
                            </div>
                            <button 
                              onClick={async () => {
                                // Keep track of the code being removed
                                const codeToRemove = appliedPromoCode;
                                
                                // Reset the UI state first
                                setValidPromo(false);
                                setDiscount(0);
                                setAppliedPromoCode('');
                                setPromoCode('');
                                setShowPromoInput(true);
                                
                                // Show toast for removing promo code
                                toast.info('Promo code removed', {
                                  description: 'The discount has been removed from your order.'
                                });
                                
                                // Then decrease the usage count
                                if (codeToRemove) {
                                  await decreasePromoCodeUsage(codeToRemove);
                                }
                                
                                // If card payment is selected, we need to reinitialize the payment intent with the original amount
                                if (selectedPaymentMethod === 'card') {
                                  // Clear the client secret to force a new payment intent to be created
                                  setClientSecret('');
                                }
                              }}
                              className="text-gray-400 text-sm hover:text-white"
                            >
                              Change
                            </button>
                          </div>
                        ) : (
                          <button 
                            onClick={() => setShowPromoInput(true)}
                            className="transition-all duration-300 ease-in-out bg-gray-800 w-1/4 text-gray-400 py-2 hover:bg-gray-700 rounded"
                          >
                            Add Promo Code
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="flex w-full flex-col">
                        <div className="flex w-full">
                          <input
                            type="text"
                            value={promoCode}
                            onChange={(e) => setPromoCode(e.target.value)}
                            placeholder="Add Promo Code"
                            className="flex-1 bg-white text-gray-900 px-3 py-2 focus:outline-none rounded-l transition-all duration-300 ease-in-out"
                            autoFocus
                            disabled={isPromoLoading}
                            onBlur={(e) => {
                              if (!promoCode.trim()) {
                                setShowPromoInput(false);
                              }
                            }}
                          />
                          <button 
                            onClick={handleApplyPromoCode}
                            disabled={isPromoLoading}
                            className={`px-4 py-2 rounded-r transition-colors duration-300 flex items-center justify-center ${
                              isPromoLoading 
                                ? 'bg-gray-400 cursor-not-allowed' 
                                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                            }`}
                          >
                            {isPromoLoading ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            ) : 'Apply'}
                          </button>
                        </div>
                        
                        {promoMessage && (
                          <div className={`mt-2 p-2 text-sm rounded ${
                            messageType === 'success' 
                              ? 'bg-green-900 text-green-300' 
                              : 'bg-red-900 text-red-300'
                          }`}>
                            {promoMessage}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-between border-t border-gray-800 pt-4">
                  <span>Today's Subtotal</span>
                  <span>{formatPlanPriceAndInterval(planDetails)}</span>
                </div>

                {validPromo && discount > 0 && (
                  <div className="flex justify-between text-green-400 pt-2">
                    <span>Discount ({appliedPromoCode})</span>
                    <span>-{formatPrice(discount)}</span>
                  </div>
                )}

                {validPromo && (
                  <div className="flex justify-between border-t border-gray-800 pt-4 font-bold">
                    <span>Total</span>
                    <span>{formatPrice(calculateFinalTotal())}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Side - Light Background */}
          <div className="w-1/2 bg-white p-12 overflow-y-auto">
            <div className="max-w-xl mx-auto">
              <h2 className="text-xl mb-6">Contact Information</h2>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <div className="relative">
                    <input 
                      type="email" 
                      value={email}
                      disabled
                      className="w-full p-3 rounded-md bg-gray-50 text-gray-700"
                    />
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    Email from your account
                  </p>
                </div>

                <div className="mt-6">
                  <h3 className="text-xl font-medium text-gray-900 mb-4">Payment Method</h3>
                  
                  {/* Payment Methods */}
                  <div className="space-y-3">
                    {/* Credit Card Option */}
                    <div className="border rounded-lg overflow-hidden">
                      <label className="flex items-center justify-between w-full p-4 cursor-pointer hover:bg-gray-50">
                        <div className="flex items-center">
                          <input
                            type="radio"
                            name="payment-method"
                            value="card"
                            checked={selectedPaymentMethod === 'card'}
                            onChange={(e) => handlePaymentMethodSelect(e.target.value)}
                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                          />
                          <div className="ml-3 flex items-center">
                            <span className="font-medium text-gray-900 mr-2">Credit Card</span>
                            <div className="flex space-x-2">
                              <Image src="/visa.png" alt="Visa" width={32} height={20} className="object-contain" />
                              <Image src="/mastercard.png" alt="Mastercard" width={32} height={20} className="object-contain" />
                            </div>
                          </div>
                        </div>
                      </label>

                      {/* Card Form - Shows when selected */}
                      {selectedPaymentMethod === 'card' && (
                        <div className="p-4 border-t">
                          {clientSecret ? (
                            <Elements 
                              stripe={stripePromise} 
                              options={options}
                            >
                              <CheckoutForm onPaymentSubmit={onPaymentSubmit} />
                            </Elements>
                          ) : (
                            <div className="text-center py-4">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                              <p className="mt-2 text-gray-600">Loading payment form...</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Alipay Option */}
                    <div className="border rounded-lg overflow-hidden">
                      <label className="flex items-center justify-between w-full p-4 cursor-pointer hover:bg-gray-50">
                        <div className="flex items-center">
                          <input
                            type="radio"
                            name="payment-method"
                            value="alipay"
                            checked={selectedPaymentMethod === 'alipay'}
                            onChange={(e) => handlePaymentMethodSelect(e.target.value)}
                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                          />
                          <div className="ml-3 flex items-center">
                            <span className="font-medium text-gray-900 mr-2">Alipay</span>
                            <Image src="/alipay.png" alt="Alipay" width={32} height={32} className="object-contain" />
                          </div>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Payment Button */}
                  <button
                    onClick={handlePaymentButtonClick}
                    disabled={!selectedPaymentMethod || paymentStatus === 'processing' || isProcessing}
                    className={`w-full py-3 rounded-md mt-6 ${
                      !selectedPaymentMethod 
                        ? 'bg-gray-400 cursor-not-allowed' 
                        : paymentStatus === 'processing' || isProcessing
                        ? 'bg-indigo-400 cursor-wait'
                        : 'bg-indigo-600 hover:bg-indigo-700'
                    } text-white`}
                  >
                    {paymentStatus === 'processing' || isProcessing ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        Processing...
                      </div>
                    ) : getPaymentButtonText()}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PaymentValidation>
  );
}
