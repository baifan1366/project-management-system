import { NextResponse } from 'next/server';
import Stripe from 'stripe';

// Initialize Stripe with your secret key
const stripe = new Stripe(process.env.NEXT_PUBLIC_STRIPE_SECRET_KEY);

export async function POST(req) {
  try {
    // 验证 Stripe 密钥
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('Stripe secret key is missing. Check your environment variables.');
    }
    
    // 从请求中获取数据
    const { planName, price, quantity, email, userId, planId, payment_method } = await req.json();
    
    // 验证必要参数
    if (!price || price <= 0) {
      return NextResponse.json({ error: 'Valid price is required' }, { status: 400 });
    }
    
    if (!quantity || quantity < 1) {
      return NextResponse.json({ error: 'Quantity must be at least 1' }, { status: 400 });
    }
    
    if (!planName) {
      return NextResponse.json({ error: 'Plan name is required' }, { status: 400 });
    }
    
    // 创建 Alipay 会话
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['alipay'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: planName,
              description: `${planName} Subscription`,
            },
            unit_amount: Math.round(price * 100), // 转换为分
          },
          quantity: quantity,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/payment`,
      customer_email: email,
      metadata: {
        planName: planName,
        quantity: quantity.toString(),
        userId: userId,
        planId: planId,
        payment_method: payment_method || 'alipay'
      },
    });
    
    // 返回重定向 URL
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Error creating Alipay session:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 