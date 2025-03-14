import { NextResponse } from 'next/server'
import Stripe from 'stripe';

// 初始化 Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

export async function POST(req) {
  try {
    // 验证 Stripe 密钥
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('Stripe secret key is missing. Check your environment variables.');
    }
    
    // 从请求中获取数据
    const { amount, quantity } = await req.json();
    
    // 验证必要参数
    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Valid amount is required' }, { status: 400 });
    }
    
    if (!quantity || quantity < 1) {
      return NextResponse.json({ error: 'Quantity must be at least 1' }, { status: 400 });
    }
    
    console.log('Creating payment intent for amount:', amount * quantity);

    // 创建支付意向
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * quantity * 100), // 转换为分
      currency: 'usd',
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        quantity: quantity.toString()
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