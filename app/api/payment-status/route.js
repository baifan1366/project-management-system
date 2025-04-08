import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.NEXT_PUBLIC_STRIPE_SECRET_KEY);

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const paymentIntentId = searchParams.get('payment_intent');
    
    if (!paymentIntentId) {
      return NextResponse.json(
        { error: 'Payment intent ID is required' },
        { status: 400 }
      );
    }

    // 获取支付意向详情
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    console.log('Retrieved payment intent:', JSON.stringify(paymentIntent, null, 2)); // 详细日志

    // 确保包含所有必要的字段
    const paymentDetails = {
      id: paymentIntent.id,
      status: paymentIntent.status,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      metadata: {
        ...paymentIntent.metadata,
        userEmail: paymentIntent.metadata.userEmail // 确保邮箱被包含
      },
      created: paymentIntent.created
    };

    console.log('Sending payment details:', JSON.stringify(paymentDetails, null, 2)); // 详细日志

    return NextResponse.json(paymentDetails);
  } catch (error) {
    console.error('Error retrieving payment status:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
} 