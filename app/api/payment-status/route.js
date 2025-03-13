import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.NEXT_PUBLIC_STRIPE_SECRET_KEY);

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const paymentIntent = searchParams.get('payment_intent');

  try {
    const intent = await stripe.paymentIntents.retrieve(paymentIntent);
    
    return NextResponse.json({
      status: intent.status,
      amount: intent.amount / 100, // Convert from cents to dollars
      currency: intent.currency,
      payment_method: intent.payment_method,
      created: intent.created
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 