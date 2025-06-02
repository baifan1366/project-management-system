import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.NEXT_PUBLIC_STRIPE_SECRET_KEY);

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const paymentIntentId = searchParams.get('payment_intent');
    const sessionId = searchParams.get('session_id');
    
    // 检查是否有会话ID或支付意图ID
    if (!paymentIntentId && !sessionId) {
      return NextResponse.json(
        { error: 'Either payment_intent or session_id is required' },
        { status: 400 }
      );
    }

    // 如果提供了会话ID，先获取会话详情
    if (sessionId) {
      console.log('Retrieving session information for:', sessionId);
      
      // 从Stripe获取会话详情
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      console.log('Session retrieved:', {
        id: session.id,
        payment_intent: session.payment_intent,
        payment_status: session.payment_status,
        customer_email: session.customer_email,
      });
      
      console.log('Full session details:', JSON.stringify({
        payment_status: session.payment_status,
        status: session.status,
        currency: session.currency,
        amount_total: session.amount_total,
        metadata: session.metadata
      }, null, 2));
      
      // 返回会话数据
      return NextResponse.json({
        id: session.id,
        payment_intent: session.payment_intent,
        payment_status: session.payment_status,
        status: session.status,
        customer_email: session.customer_email,
        customer_details: session.customer_details,
        amount_total: session.amount_total,
        currency: session.currency,
        metadata: session.metadata
      });
    }

    // 如果提供了支付意图ID，获取支付意图详情
    if (paymentIntentId) {
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
          orderId: paymentIntent.metadata.orderId, // Ensure orderId is explicitly included
          userEmail: paymentIntent.metadata.userEmail,
          payment_method: paymentIntent.metadata.payment_method
        },
        created: paymentIntent.created
      };

      console.log('Sending payment details:', JSON.stringify(paymentDetails, null, 2)); // 详细日志

      return NextResponse.json(paymentDetails);
    }
  } catch (error) {
    console.error('Error retrieving payment information:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
} 