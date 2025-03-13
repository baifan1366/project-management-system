import { NextResponse } from 'next/server';
import Stripe from 'stripe';

// Initialize Stripe with your secret key
const stripe = new Stripe(process.env.NEXT_PUBLIC_STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16' // Specify the Stripe API version
});

export async function GET() {
  try {
    console.log('Creating Alipay payment intent...');
    
    // Convert USD amount to CNY (approximate exchange rate: 1 USD = 7.2 CNY)
    const amountInCNY = Math.round(120000 * 7.2); // Converting $1,200 USD to CNY (in cents)
    
    // Create a PaymentIntent for Alipay
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCNY, // Amount in CNY cents
      currency: 'cny', // Changed to CNY as required by Alipay
      payment_method_types: ['alipay'],
      shipping: {
        name: 'Test User',
        address: {
          line1: '123 Test St',
          city: 'Test City',
          postal_code: '12345',
          country: 'CN', // Changed to China for consistency with CNY
        },
      },
      metadata: {
        order_id: 'TEST-' + Math.random().toString(36).substring(7),
        integration_check: 'alipay_accept_test',
        original_amount_usd: '1200.00', // Store original USD amount for reference
      },
    });

    console.log('Payment intent created:', paymentIntent.id);

    // Return the client secret and amount information
    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: {
        cny: amountInCNY / 100, // Convert cents to yuan
        usd: 1200.00, // Original USD amount
      }
    });

  } catch (error) {
    console.error('Stripe error:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Failed to create payment session',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
} 