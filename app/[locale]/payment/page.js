'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Image from 'next/image'
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import CheckoutForm from '@/components/CheckoutForm'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

// Initialize Stripe outside the component
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

export default function PaymentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // 其他状态
  const [showWarning, setShowWarning] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');

  // 获取 URL 参数
  const planId = searchParams.get('plan_id');
  const userId = searchParams.get('user_id');

  const [planDetails, setPlanDetails] = useState(null)
  const [quantity, setQuantity] = useState(1)
  const [showPromoInput, setShowPromoInput] = useState(false)
  const [promoCode, setPromoCode] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [paymentStatus, setPaymentStatus] = useState('')
  const [handleCardPayment, setHandleCardPayment] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [email, setEmail] = useState('');

  useEffect(() => {
    // 简单验证必要参数
    if (!planId || !userId) {
      console.error('Missing required parameters:', { planId, userId });
      setError('Missing required parameters');
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
    const fetchPlanDetails = async () =>{
      if (!planId){
        setError('No plan ID provided');
        setLoading(false);
        return;
      }

      try{
        // 获取用户信息
        const{data:{session},error:sessionError} = await supabase.auth.getSession();

        // 如果获取用户会话失败，则抛出错误
        if(sessionError){
          throw new Error('Failed to get session');
        }

        // 如果用户未登录，则重定向到登录页面
        if(!session || !session.user){
          router.push('/login?redirect=payment&plan_id=' + planId);
          return;
        }

        // 获取计划详情
        const {data, error} = await supabase
          .from('subscription_plan')
          .select('*')
          //eq 表示等于
          .eq('id',planId)
          //single 表示只返回一个结果
          .single();

        if(error){
          throw new Error('Failed to fetch plan details');
        }
        console.log('Plan details:', data);
        setPlanDetails(data);
      }catch (err) {
        console.error('Error fetching plan details:', err);
        setError('Failed to load plan details: ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPlanDetails();
  },[planId, router])

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
  
  // Temporary promo code
  const promoCodeExp = 'PROMOCODE'
  
  // 首先定义计算小计的函数
  const calculateSubtotal = useCallback(() => {
    if (!planDetails || !planDetails.price) return 0;
    return planDetails.price * quantity;
  }, [planDetails, quantity]);

  // 然后在 useEffect 中使用它
  useEffect(() => {
    if (selectedPaymentMethod === 'card' && planDetails && planDetails.price) {
      console.log('Creating payment intent...');
      setPaymentStatus('loading');
      
      createPaymentIntent()
        .then((clientSecret) => {
          if (!clientSecret) {
            console.error('No client secret received');
            throw new Error('No client secret received');
          }

          console.log('Setting client secret:', clientSecret);
          setClientSecret(clientSecret);
          setPaymentStatus('ready');

          // 保存支付元数据到 localStorage
          localStorage.setItem('paymentMetadata', JSON.stringify({
            planId: planDetails.id,
            quantity: quantity,
            planName: planDetails.name,
            userId: userId
          }));
        })
        .catch((err) => {
          console.error('Error creating payment intent:', err);
          setError(err.message || 'Failed to create payment intent');
          setPaymentStatus('error');
        });
    }
  }, [selectedPaymentMethod, planDetails, quantity, userId]);

  // 创建支付意向的函数
  const createPaymentIntent = async () => {
    try {
      const response = await fetch('/api/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          planId,
          amount: planDetails?.price,
          quantity,
          userId,
          planName: planDetails?.name
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Payment intent creation failed:', errorText);
        throw new Error(`Server error: ${errorText}`);
      }

      const data = await response.json();
      console.log('Payment intent response:', data);

      if (!data.clientSecret) {
        throw new Error('No client secret in response');
      }

      return data.clientSecret;
    } catch (err) {
      console.error('Error in createPaymentIntent:', err);
      throw err;
    }
  };

  // Callback function to receive the payment handler from CheckoutForm
  const onPaymentSubmit = useCallback((handler) => {
    setHandleCardPayment(handler);
  }, []);

  // Update the handlePayment function
  const handlePayment = async () => {
    if (!selectedPaymentMethod) {
      setError('Please select a payment method');
      return;
    }

    setPaymentStatus('processing');
    
    try {
      if (selectedPaymentMethod === 'alipay') {
        // Fetch the payment intent client secret
        const response = await fetch('/api/create-alipay-session');
        const data = await response.json();
        
        if (data.error) {
          throw new Error(data.error);
        }

        // Initialize Stripe
        const stripe = await stripePromise;
        if (!stripe) {
          throw new Error('Failed to load Stripe');
        }

        // Redirect to Alipay payment page
        const { error } = await stripe.confirmAlipayPayment(
          data.clientSecret,
          {
            payment_method: {
              billing_details: {
                name: 'Test User',
              },
            },
            return_url: `${window.location.origin}/payment-success`,
          }
        );

        if (error) {
          throw new Error(error.message);
        }
      } else if (selectedPaymentMethod === 'card') {
        // Handle card payment in CardPaymentForm
      } else if (selectedPaymentMethod === 'bank') {
        // Show bank transfer information
        alert('Please complete the bank transfer using the provided details.');
      }
    } catch (err) {
      console.error('Payment error:', err);
      setError(err.message);
      setPaymentStatus('');
    }
  };

  // Handle increment/decrement
  const handleQuantityChange = (action) => {
    if (action === 'increase') {
      setQuantity(prev => prev + 1)
      setShowWarning(false) // Clear warning when increasing
    } else if (action === 'decrease') {
      if(quantity > 1){
        setQuantity(prev => prev - 1)
      setShowWarning(false) // Clear warning when valid decrease
      }else{
        setShowWarning(true)// Show warning when trying to go below 1
      }
    }
  }

  // Handle quantity input (direct)
  const handleQuantityInput = (e) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value) && value >= 1) {
      setQuantity(value);
      setShowWarning(false);
    } else if (!isNaN(value) && value < 1) {
      setQuantity(1);
      setShowWarning(true);
    }
  };

  // Handle wheel event
  const handleWheel = (e) => {
    e.preventDefault();
    if (e.deltaY < 0) {
       setQuantity(prev => prev + 1);
    } else {
       setQuantity(prev => Math.max(1, prev - 1));
    }
  }

  const calculateSubTotal = () => {
    if(!planDetails) return 0;

    return planDetails.price * quantity;
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
    setError('');
  };

  const handleAlipayPayment = async () => {
    if (!planDetails || !planDetails.price || !planDetails.name) {
      setError('Plan details not available');
      return;
    }
    
    setIsProcessing(true);
    try {
      const response = await fetch('/api/create-alipay-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planName: planDetails.name,
          price: planDetails.price,
          quantity: quantity,
          email: data.email
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
      setError(error.message || 'Failed to process Alipay payment');
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

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div className="min-h-screen flex">

      {/* 加载状态 */}
      {loading && (
        <div className="fixed inset-0 bg-white bg-opacity-75 flex items-center justify-center z-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-700">Loading plan details...</p>
          </div>
        </div>
      )}

    {/*Quantity Modal */}
    {isModalOpen && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-[400px] transition-all duration-300 ease-in-out">
          <div className="flex justify-between items-center mb-4 ">
            <h3 className="text-lg font-medium text-gray-800">Update Quantity</h3>
            <button 
              onClick={() => setIsModalOpen(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
          <div className="border-t border-gray-300 pt-4">
            {/* Quantity Input */}
            <div className="flex items-center justify-center">
              <div className="relative">
                <div className="flex items-center gap-4">
                  <button
                    className={`text-gray-500 text-3xl hover:text-gray-700 ${
                      quantity <= 1 ? 'text-gray-300': 'text-gray-500'
                    }`}
                    onClick={() => handleQuantityChange('decrease')}
                  >
                    −
                  </button>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => {
                      const value = Number(e.target.value)
                      if (value >= 1) {
                        setQuantity(value)
                        setShowWarning(false)
                      } else {
                        setShowWarning(true)
                      }
                    }}
                    onWheel={handleWheel}
                    className="w-20 text-center text-xl border border-gray-200 focus:outline-none bg-white rounded-lg shadow-md [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&:--webkit-inner-spin-button]:appearance-none"
                  />
                  <button 
                    className="text-gray-500 text-3xl hover:text-gray-700"
                    onClick={() => handleQuantityChange('increase')}
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
            
            {/* Warning Message */}
            <div className={`overflow-hidden transition-[height,opacity,margin] duration-300 ease-in-out ${
              showWarning ? 'h-[60px] opacity-100 my-4' : 'h-0 opacity-0 my-0'
            }`}>
              <div className="text-red-500 text-sm bg-red-100 rounded-md p-2">
                The item cannot be removed, it must be at least 1 to make a payment.
              </div>
            </div>
          </div>
          
          {/* Update Button */}
          <button 
            className="w-full bg-pink-500 text-white py-3 rounded-md mt-4 hover:bg-pink-600"
            onClick={() => setIsModalOpen(false)}
          >
            Update
          </button>
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

          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
                <div 
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-4 rounded-md border border-gray-800 px-4 py-2 cursor-pointer hover:bg-gray-700 transition-all duration-200"
                >
                  <span>QTY</span>
                  <span>{quantity}</span>
                    <svg 
                      className="w-4 h-4 text-gray-400 mr-2" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="currentColor"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M19 9l-7 7-7-7" 
                      />
                    </svg>
                </div>
            </div>
            <span>{planDetails ? planDetails.billing_interval : 'Annually'}</span>
          </div>

          <div className="border-t border-gray-800 pt-4">
            <div className={`transition-all duration-300 ease-in-out ${
              showPromoInput ? 'h-[40px]' : 'h-[32px]'
            }`}>
              <div 
                className={`transition-all duration-300 ease-in-out bg-gray-800 rounded
                  ${showPromoInput ? 'w-full' : 'w-1/4'}`}
              >
                <button 
                  onClick={() => {
                    setShowPromoInput(true);
                  }}
                  className="w-full text-gray-400 py-2 hover:bg-gray-700 transition-colors duration-200"
                >
                  Add Promo Code
                </button>
              </div>
              {showPromoInput && (
                <div className="flex w-full bg-gray-800 text-white rounded-l">
                  <input
                    type="text"
                    value={promoCode}
                    onChange={(e) => {
                      setPromoCode(e.target.value)
                    }}
                    placeholder="Add Promo Code"
                    className="flex-1 bg-transparent placeholder-gray-400 px-3 py-2 focus:outline-none focus:bg-white focus:text-gray-900 
                      transition-colors duration-200 rounded"
                    autoFocus
                    onBlur={() => {
                      if (!promoCode.trim()) {
                        setShowPromoInput(false);
                      }
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-between border-t border-gray-800 pt-4">
            <span>Today's Subtotal</span>
            <span>{formatPrice(calculateSubTotal())}</span>
          </div>
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
              onClick={handlePayment}
              disabled={!selectedPaymentMethod || paymentStatus === 'processing'}
              className={`w-full py-3 rounded-md mt-6 ${
                !selectedPaymentMethod 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : paymentStatus === 'processing'
                  ? 'bg-indigo-400 cursor-wait'
                  : 'bg-indigo-600 hover:bg-indigo-700'
              } text-white`}
            >
              {paymentStatus === 'processing' ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Processing...
                </div>
              ) : getPaymentButtonText()}
            </button>

            {error && (
              <div className="mt-2 p-3 bg-red-50 border border-red-200 text-red-600 rounded-md">
                {error}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
