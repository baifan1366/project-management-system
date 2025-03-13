'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faQrcode } from '@fortawesome/free-solid-svg-icons'
import { faCashApp } from '@fortawesome/free-brands-svg-icons'
import CheckoutForm from '@/components/CheckoutForm'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

// Initialize Stripe outside the component
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

export default function PaymentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // 获取 plan_id 参数
  const planId = searchParams.get('plan_id')

  const [planDetails, setPlanDetails] = useState(null)
  const [quantity, setQuantity] = useState(1)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [showWarning, setShowWarning] = useState(false)
  const [showPromoInput, setShowPromoInput] = useState(false)
  const [promoCode, setPromoCode] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [paymentStatus, setPaymentStatus] = useState('')
  const userAccountEmail = "jiaxuanshe@gmail.com"; // Simulated user account email
  const [email, setEmail] = useState(userAccountEmail);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [isLoadingQR, setIsLoadingQR] = useState(false);
  const [handleCardPayment, setHandleCardPayment] = useState(null);
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [loading, setLoading] = useState(true);

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

        if(sessionError){
          throw new Error('Failed to get session');
        }

        if(!session || !session.user){
          router.push('/login?redirect=payment&plan_id=' + planId);
          return;
        }

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
  
    // Add this useEffect to create payment intent when quantity changes
  useEffect(() => {
    if (selectedPaymentMethod === 'card') {
      console.log('Creating payment intent...');
      fetch('/api/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          amount: 1200,
          quantity: quantity 
        }),
      })
      .then(async (res) => {
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || 'Failed to create payment intent');
        }
        return res.json();
      })
      .then((data) => {
        if (data.clientSecret) {
          console.log('Payment intent created');
          setClientSecret(data.clientSecret);
        } else {
          throw new Error('No client secret received');
        }
      })
      .catch((err) => {
        console.error('Error creating payment intent:', err);
        setPaymentStatus('error');
      });
    }
  }, [selectedPaymentMethod, quantity]);

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

  // Handle wheel event
  const handleWheel = (e) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      setQuantity(prev => prev + 1);
    } else {
      setQuantity(prev => Math.max(1, prev - 1));
    }
  }

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

  // Add function to handle Cash App QR code generation
  const handleCashAppQR = async () => {
    setIsLoadingQR(true);
    try {
      const response = await fetch('/api/cash-app-qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          amount: 1200 * quantity,
        }),
      });
      const data = await response.json();
      setQrCodeUrl(data.qrCodeUrl);
    } catch (error) {
      console.error('Error generating QR code:', error);
    }
    setIsLoadingQR(false);
  };

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
    setIsProcessing(true);
    try {
      const response = await fetch('/api/create-alipay-session', {
        method: 'GET',
      });
      
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      // 使用 Stripe.js 重定向到 Alipay
      const stripe = await stripePromise;
      const { error } = await stripe.confirmAlipayPayment(
        data.clientSecret,
        {
          return_url: `${window.location.origin}/payment-success`,
        }
      );

      if (error) {
        throw new Error(error.message);
      }
    } catch (err) {
      setError(err.message);
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
            <span>Billed Annually</span>
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
            <span>${(1200 * quantity).toFixed(2)}</span>
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

      
              {/* Bank Transfer Option */}
              <div className="border rounded-lg overflow-hidden">
                <label className="flex items-center justify-between w-full p-4 cursor-pointer hover:bg-gray-50 transition-colors">
                  <div className="flex items-center">
                    <input
                      type="radio"
                      name="payment-method"
                      value="bank"
                      checked={selectedPaymentMethod === 'bank'}
                      onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                    />
                    <div className="ml-3 flex items-center">
                      <span className="font-medium text-gray-900 mr-2">Bank Transfer</span>
                      <Image src="/bank.png" alt="Bank" width={24} height={24} className="object-contain" />
                    </div>
                  </div>
                  <span className="text-green-500 text-sm">US$5</span>
                </label>

                {selectedPaymentMethod === 'bank' && (
                  <div className="p-4 border-t">
                    <div className="space-y-4">
                      <div className="bg-green-50 p-3 rounded-md">
                        <span className="text-sm text-green-700">
                          💡 Use bank transfer to save US$5 on your purchase.
                        </span>
                      </div>
                      
                      <div>
                        <label className="block text-sm text-gray-700 mb-2">Select your bank</label>
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="Search your bank"
                            className="w-full p-3 border rounded-md focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                          />
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <button className="p-4 border rounded-lg hover:border-indigo-500 transition-colors">
                          <Image src="/bank-logos/bofa.png" alt="Bank of America" width={100} height={40} className="object-contain" />
                        </button>
                        <button className="p-4 border rounded-lg hover:border-indigo-500 transition-colors">
                          <Image src="/bank-logos/pnc.png" alt="PNC" width={100} height={40} className="object-contain" />
                        </button>
                        <button className="p-4 border rounded-lg hover:border-indigo-500 transition-colors">
                          <Image src="/bank-logos/wells-fargo.png" alt="Wells Fargo" width={100} height={40} className="object-contain" />
                        </button>
                        <button className="p-4 border rounded-lg hover:border-indigo-500 transition-colors">
                          <Image src="/bank-logos/chase.png" alt="Chase" width={100} height={40} className="object-contain" />
                        </button>
                        <button className="p-4 border rounded-lg hover:border-indigo-500 transition-colors">
                          <Image src="/bank-logos/usaa.png" alt="USAA" width={100} height={40} className="object-contain" />
                        </button>
                        <button className="p-4 border rounded-lg hover:border-indigo-500 transition-colors">
                          <Image src="/bank-logos/navy-federal.png" alt="Navy Federal" width={100} height={40} className="object-contain" />
                        </button>
                      </div>
                    </div>
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
