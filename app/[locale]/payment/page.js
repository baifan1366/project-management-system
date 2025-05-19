'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Image from 'next/image'
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import CheckoutForm from '@/components/CheckoutForm'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
//react redux
import { useSelector, useDispatch } from 'react-redux'
import { createPaymentIntent, setPaymentMetadata, setFinalTotal } from '@/lib/redux/features/paymentSlice'
import useGetUser from '@/lib/hooks/useGetUser';

// Initialize Stripe outside the component
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

export default function PaymentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');

  // Call useGetUser at component level
  const { user, isAuthenticated } = useGetUser();

  // 获取 URL 参数
  const planId = searchParams.get('plan_id');
  const userId = searchParams.get('user_id');

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

  const [isPromoLoading, setIsPromoLoading] = useState(false);
  const [discount, setDiscount] = useState(0);
  const [validPromo, setValidPromo] = useState(false);
  const [appliedPromoCode, setAppliedPromoCode] = useState('');
  const [promoMessage, setPromoMessage] = useState('');
  const [messageType, setMessageType] = useState(''); // 'success' or 'error'

  useEffect(() => {
    // 简单验证必要参数
    if (!planId || !userId) {
      console.error('Missing required parameters:', { planId, userId });
      router.push('/pricing');
      return;
    }

    console.log('Received parameters:', { planId, userId });
    setLoading(false);
  }, [planId, userId, router]);

  useEffect(() => {
    const fetchUserEmail = async () => {
      if (!userId) return;
      
      const { data, error } = await supabase
        .from('user')
        .select('email')
        .eq('id', userId)
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
  }, []);

  useEffect(() => {
    const fetchPlanDetails = async () => {
      if (!planId){
        console.error('No plan ID provided');
        setLoading(false);
        return;
      }

      try {
        // Use the user from component-level hook
        if (!user) {
          router.push('/login?redirect=payment&plan_id=' + planId);
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
        console.log('Plan details:', data);
        setPlanDetails(data);
      } catch (err) {
        console.error('Error fetching plan details:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPlanDetails();
  }, [planId, router, user]);

  useEffect(() => {
    const initializePayment = async () => {
      try {
        // Log the current values of all required parameters
        console.log('Payment initialization parameters:', { 
          planId, 
          userId, 
          planPrice: planDetails?.price 
        });
        
        // Verify all required parameters are present
        if (!planId) {
          console.error('Missing planId');
          return;
        }
        
        if (!userId) {
          console.error('Missing userId');
          return;
        }
        
        if (!planDetails?.price) {
          console.error('Missing plan price');
          return;
        }

        // Calculate the final total (with discount applied)
        const finalAmount = calculateFinalTotal();
        
        // Store the final total in Redux
        dispatch(setFinalTotal(finalAmount));

        // 设置支付元数据
        const paymentMetadata = {
          planId,
          userId,
          planName: planDetails?.name,
          amount: finalAmount, // Use the final amount with discount
          promoCode: appliedPromoCode,
          discount: discount,
          quantity: 1
        };

        console.log('Setting payment metadata:', paymentMetadata);
        dispatch(setPaymentMetadata(paymentMetadata));

        // 创建支付意向
        const result = await dispatch(createPaymentIntent({
          ...paymentMetadata,
          amount: finalAmount // Use the final amount with discount
        })).unwrap();

        console.log('Payment intent created:', result);
        
        if (result.clientSecret) {
          setClientSecret(result.clientSecret);
          setPaymentStatus('ready');
        }
      } catch (err) {
        console.error('Error creating payment intent:', err);
      }
    };

    // 只有当所有必需的数据都可用时才初始化支付
    if (planDetails && planId && userId) {
      initializePayment();
    }
  }, [dispatch, planId, userId, planDetails, discount]);

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
  };
  
  // Callback function to receive the payment handler from CheckoutForm
  const onPaymentSubmit = useCallback((handler) => {
    setHandleCardPayment(handler);
  }, []);

  // Update the handlePayment function
  const handlePayment = async () => {
    // First verify that we have the userId
    if (!userId) {
      console.error('Missing required userId for payment');
      return;
    }

    // Always use the most recent calculated final total
    const finalAmount = calculateFinalTotal();
    dispatch(setFinalTotal(finalAmount));

    // Ensure we have all required metadata, using userId from props if not in metadata
    const paymentData = {
      userId: userId,
      planId: planId,
      planName: planDetails?.name,
      amount: finalAmount,
      quantity: 1,
      ...metadata // Include any other metadata fields, but our explicit values take precedence
    };

    // Update metadata in Redux
    dispatch(setPaymentMetadata(paymentData));

    try {
      const result = await dispatch(createPaymentIntent(paymentData)).unwrap();
      // 处理支付结果
      if (result.clientSecret) {
        // 处理成功
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
      case 'card' || 'alipay':
        return 'Pay Now';
      default:
        return 'Select Payment Method';
    }
  };

  const handlePaymentMethodSelect = (method) => {
    setSelectedPaymentMethod(method);
  };

  const handleAlipayPayment = async () => {
    if (!planDetails || !planDetails.price || !planDetails.name || !userId) {
      console.log('Missing required details for payment');
      return;
    }
    
    // Store the final total in Redux before proceeding with payment
    const finalAmount = calculateFinalTotal();
    dispatch(setFinalTotal(finalAmount));
    
    setIsProcessing(true);
    try {
      const response = await fetch('/api/create-alipay-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planName: planDetails.name,
          price: finalAmount, // Use the discounted amount
          quantity: 1,
          email: email,
          userId: userId, // Include userId
          planId: planId  // Include planId
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Alipay error:', errorText);
        try {
          const errorJson = JSON.parse(errorText);
          throw new Error(errorJson.error || `Server error: ${response.status}`);
        } catch (e) {
          throw new Error(`Server error: ${response.status}`);
        }
      }
      
      const data = await response.json();
      
      if (data && data.url) {
        // 重定向到 Alipay 支付页面
        window.location.href = data.url;
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error) {
      console.error('Alipay error:', error);
      setIsProcessing(false);
    }
  };

  // 格式化价格
  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
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

      //increment the promo code usage count
      await increasePromoCodeUsage(promoCode);
    } catch (err) {
      console.error('Error applying promo code:', err);
      setPromoMessage('Failed to apply promo code');
      setMessageType('error');
      setValidPromo(false);
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
    // First, log the current state
    console.log('Payment button clicked with method:', selectedPaymentMethod);
    console.log('Current userId:', userId);
    console.log('Current planId:', planId);
    console.log('Current metadata:', metadata);
    
    if (selectedPaymentMethod === 'card' && handleCardPayment) {
      // Use the Stripe card payment handler provided by CheckoutForm
      console.log('Using card payment handler');
      await handleCardPayment();
    } else if (selectedPaymentMethod === 'alipay') {
      // Use the Alipay payment handler
      console.log('Using Alipay payment handler');
      await handleAlipayPayment();
    } else {
      console.error('No valid payment method selected or handler available');
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen flex">

      {/* 加载状态 */}
      {status === 'loading' && (
        <div className="fixed inset-0 bg-white bg-opacity-75 flex items-center justify-center z-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-700">Processing payment...</p>
          </div>
        </div>
      )}

      {/* Left Side - Dark Background */}
      <div className="w-1/2 bg-black text-white p-8">
        <div className="flex items-center gap-3 mb-8">
          <Image 
            src="/logo.png" 
            alt="Team Sync" 
            width={32} 
            height={32} 
          />
          <span className="text-lg">Team Sync</span>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            {planDetails ? `Subscribe to ${planDetails.name}` : 'Subscribe to Team Sync'}
          </h1>
          <div className="text-4xl font-bold mb-2">
            {planDetails ? formatPrice(planDetails.price) : '$0.00'}
            <span className="text-sm">
              {getBillingText()}
            </span>
          </div>
          <div className="text-gray-400">
            {planDetails ? `US$${planDetails.price.toFixed(2)} per month, billed annually` : 'US$10.00 per month, billed annually'}
          </div>
        </div>

        {/* 计划详情 */}
        <div className="space-y-6">
          <div className="flex justify-between">
            <span>{planDetails ? planDetails.name : 'Team Sync'}</span>
            <span>{planDetails ? formatPrice(planDetails.price) : '$0.00'}</span>
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
                          
                          // Then decrease the usage count
                          if (codeToRemove) {
                            await decreasePromoCodeUsage(codeToRemove);
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
            <span>{formatPrice(calculateSubTotal())}</span>
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

      {/* Right Side - Light Background */}
      <div className="w-1/2 bg-white p-8">
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
                        options={{
                          clientSecret,
                          appearance,
                        }}
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
                      <span className="font-medium text-gray-900 mr-2">Alipay 支付宝</span>
                      <Image src="/alipay.png" alt="Alipay" width={64} height={20} className="object-contain" />
                    </div>
                  </div>
                </label>

                {selectedPaymentMethod === 'alipay' && (
                  <div className="p-4 border-t">
                    <button
                      onClick={handleAlipayPayment}
                      disabled={isProcessing}
                      className={`w-full py-2 px-4 rounded-lg ${
                        isProcessing 
                          ? 'bg-gray-400 cursor-not-allowed' 
                          : 'bg-[#1677FF] hover:bg-[#0E66E7]'
                      } text-white`}
                    >
                      {isProcessing ? 'Processing...' : 'Pay with Alipay'}
                    </button>
                  </div>
                )}
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
  )
}
