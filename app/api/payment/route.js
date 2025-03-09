import { NextResponse } from 'next/server'
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(req) {
  try {
    const { amount, quantity } = await req.json();
    console.log('Creating payment intent for amount:', amount * quantity);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount * quantity * 100,
      currency: 'usd',
      automatic_payment_methods: {
        enabled: true,
      },
    });

    return NextResponse.json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}