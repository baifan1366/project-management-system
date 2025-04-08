//payment intent
import { NextResponse } from 'next/server'
import Stripe from 'stripe';

// 确保使用正确的环境变量名称
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || process.env.NEXT_PUBLIC_STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16'  // 指定 API 版本
});

export async function POST(request) {
  try {
    // 首先验证是否有 API key
    if (!process.env.STRIPE_SECRET_KEY && !process.env.NEXT_PUBLIC_STRIPE_SECRET_KEY) {
      console.error('Missing Stripe API key');
      return NextResponse.json(
        { error: 'Stripe API key not configured' },
        { status: 500 }
      );
    }

    // 解析请求体并立即记录
    const body = await request.json();
    console.log('Received payment request body:', body);

    // 解构参数并验证
    const { planId, amount, quantity = 1, userId, planName } = body;

    // 详细的参数验证
    if (!userId) {
      console.error('Missing userId in request body');
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    if (!planId) {
      console.error('Missing planId in request body');
      return NextResponse.json({ error: 'planId is required' }, { status: 400 });
    }

    if (!amount && amount !== 0) {
      console.error('Missing amount in request body');
      return NextResponse.json({ error: 'amount is required' }, { status: 400 });
    }

    // 创建支付意向
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount * 100 * quantity,
      currency: 'usd',
      metadata: {
        planId,
        userId,
        planName: planName || '',
        quantity: quantity.toString()
      }
    });

    console.log('Payment intent created:', paymentIntent.id);

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret
    });
  } catch (error) {
    console.error('Payment route error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}