import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.NEXT_PUBLIC_STRIPE_SECRET_KEY);

export async function GET(request) {
  try {
    // 获取 URL 参数
    const { searchParams } = new URL(request.url);
    const paymentIntentId = searchParams.get('payment_intent');
    const sessionId = searchParams.get('session_id');
    
    if (!paymentIntentId && !sessionId) {
      return NextResponse.json(
        { error: 'Missing payment_intent or session_id parameter' },
        { status: 400 }
      );
    }
    
    let paymentDetails = {};
    
    // 处理支付意向
    if (paymentIntentId) {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      
      paymentDetails = {
        id: paymentIntent.id,
        status: paymentIntent.status,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        planName: paymentIntent.metadata?.planName || 'Subscription Plan',
        quantity: paymentIntent.metadata?.quantity || 1,
        paymentMethod: paymentIntent.payment_method_types[0],
        created: new Date(paymentIntent.created * 1000).toISOString(),
      };
    }
    
    // 处理结账会话
    if (sessionId) {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      
      // 获取行项目信息
      const lineItems = await stripe.checkout.sessions.listLineItems(sessionId);
      
      paymentDetails = {
        id: session.id,
        status: session.payment_status,
        amount: session.amount_total,
        currency: session.currency,
        planName: session.metadata?.planName || lineItems.data[0]?.description || 'Subscription Plan',
        quantity: session.metadata?.quantity || lineItems.data[0]?.quantity || 1,
        paymentMethod: session.payment_method_types[0],
        created: new Date(session.created * 1000).toISOString(),
      };
    }
    
    return NextResponse.json(paymentDetails);
  } catch (error) {
    console.error('Error retrieving payment status:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to retrieve payment status' },
      { status: 500 }
    );
  }
} 