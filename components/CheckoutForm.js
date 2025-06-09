'use client'

import { useState, useEffect } from 'react';
import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';

export default function CheckoutForm({ onPaymentSubmit }) {
  const stripe = useStripe();
  const elements = useElements();
  const [errorMessage, setErrorMessage] = useState('');
  const [isComplete, setIsComplete] = useState(false);

  const handleCardPayment = async () => {
    if (!stripe || !elements) {
      return false;
    }

    try {
      // Get only the planId from URL parameters
      const urlParams = new URLSearchParams(window.location.search);
      const planId = urlParams.get('plan_id');

      // Build the return URL with only planId
      const returnUrl = `${window.location.origin}/payment-success?plan_id=${planId}`;
      
      
      
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: returnUrl,
        },
      });

      if (error) {
        setErrorMessage(error.message || 'An error occurred during payment.');
        return false;
      }

      if (paymentIntent.status === 'succeeded') {
        window.location.href = returnUrl;
        return true;
      }

      return false;
    } catch (err) {
      setErrorMessage('An unexpected error occurred.');
      console.error('CheckoutForm payment error:', err);
      return false;
    }
  };

  useEffect(() => {
    if (onPaymentSubmit) {
      onPaymentSubmit(handleCardPayment);
    }
  }, [stripe, elements]);

  return (
    <div className="space-y-4">
      {errorMessage && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-md">
          {errorMessage}
        </div>
      )}
      <PaymentElement 
        onChange={(event) => {
          // 只有当所有字段都填写正确时，才设置 isComplete 为 true
          setIsComplete(event.complete);
          if (event.error) {
            setErrorMessage(event.error.message);
          } else {
            setErrorMessage('');
          }
        }}
      />
      <button
        onClick={handleCardPayment}
        disabled={!isComplete || !stripe}
        className={`w-full py-2 px-4 rounded-lg ${
          !isComplete || !stripe
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-indigo-600 hover:bg-indigo-700'
        } text-white`}
      >
        Pay Now
      </button>
    </div>
  );
} 