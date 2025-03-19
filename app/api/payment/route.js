import { NextResponse } from 'next/server'
import Stripe from 'stripe';

const stripe = new Stripe(process.env.NEXT_PUBLIC_STRIPE_SECRET_KEY);

export async function POST(req) {
  try {
    // 验证 Stripe 密钥
    if (!process.env.NEXT_PUBLIC_STRIPE_SECRET_KEY) {
      throw new Error('Stripe secret key is missing');
    }
    
    // 从请求中获取数据，包括邮箱
    const { amount, quantity, planName, planId, email } = await req.json();
    
    // 验证必要参数
    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Valid amount is required' }, { status: 400 });
    }
    
    if (!quantity || quantity < 1) {
      return NextResponse.json({ error: 'Quantity must be at least 1' }, { status: 400 });
    }

    const minAmount = Math.max(amount * 100, 50);
    
    console.log('Creating payment intent for:', { amount: minAmount * quantity, email });

    // 创建支付意向
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(minAmount * quantity),
      currency: 'usd',
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        planName: planName,
        planId: planId,
        quantity: quantity.toString(),
        userEmail: email  // 存储邮箱到 metadata
      }
    });
    
    console.log('Payment intent created with ID:', paymentIntent.id);
    
    // 返回客户端密钥
    return NextResponse.json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}