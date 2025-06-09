import { NextResponse } from 'next/server';
import Stripe from 'stripe';

export async function POST(req) {
  try {
    // Log environment variables (without exposing full key)
    const stripeKeyExists = !!process.env.NEXT_PUBLIC_STRIPE_SECRET_KEY;
    if (stripeKeyExists) {
      const keyPreview = process.env.NEXT_PUBLIC_STRIPE_SECRET_KEY.substring(0, 7) + '...';
    }
    
    // Validate Stripe key
    if (!process.env.NEXT_PUBLIC_STRIPE_SECRET_KEY) {
      console.error('Stripe secret key is missing');
      return NextResponse.json({ error: 'Stripe secret key is missing. Check your environment variables.' }, { status: 500 });
    }
    
    // Initialize Stripe with the secret key
    const stripe = new Stripe(process.env.NEXT_PUBLIC_STRIPE_SECRET_KEY);
    
    // Parse request body
    const body = await req.json();
    
    const { planName, price, quantity, email, userId, planId, promoCode, discount, finalAmount } = body;
    
    // Validate required parameters
    if (!price || price <= 0) {
      console.error('Invalid price provided:', price);
      return NextResponse.json({ error: 'Valid price is required' }, { status: 400 });
    }
    
    if (!quantity || quantity < 1) {
      console.error('Invalid quantity provided:', quantity);
      return NextResponse.json({ error: 'Quantity must be at least 1' }, { status: 400 });
    }
    
    if (!planName) {
      console.error('Plan name is missing');
      return NextResponse.json({ error: 'Plan name is required' }, { status: 400 });
    }
    
    // Calculate the amount to charge (use finalAmount if provided, otherwise use price)
    const amountToCharge = finalAmount || price;
    
    // Convert USD to CNY (approximate exchange rate, in production you'd use a real-time rate)
    // As of 2024, roughly 1 USD = 7.2 CNY
    const exchangeRate = 7.2;
    const amountInCNY = Math.round(amountToCharge * exchangeRate * 100); // Convert to CNY cents
        
    // Create Alipay session with CNY currency
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['alipay'],
      line_items: [
        {
          price_data: {
            currency: 'cny', // Using CNY which is fully supported by Alipay
            product_data: {
              name: planName,
              description: `${planName} Subscription`,
            },
            unit_amount: amountInCNY, // Amount in CNY cents
          },
          quantity: quantity,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/en/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/en/payment`,
      customer_email: email,
      metadata: {
        planName: planName,
        quantity: quantity.toString(),
        userId: userId,
        planId: planId,
        payment_method: 'alipay',
        promoCode: promoCode || '',
        discount: discount ? discount.toString() : '0',
        finalAmount: amountToCharge.toString(),
        originalCurrency: 'usd',
        convertedCurrency: 'cny',
        exchangeRate: exchangeRate.toString()
      },
    });
        
    // Return redirect URL and session ID
    return NextResponse.json({ 
      url: session.url,
      sessionId: session.id
    });
  } catch (error) {
    console.error('Error creating Alipay session:', error);
    console.error('Error details:', error.message);
    if (error.type) {
      console.error('Stripe error type:', error.type);
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 