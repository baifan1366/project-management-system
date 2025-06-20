import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabase } from '@/lib/supabase';

// Initialize Stripe with API key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || process.env.NEXT_PUBLIC_STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16'
});

export async function POST(request) {
  try {
    // First validate API key exists
    if (!process.env.STRIPE_SECRET_KEY && !process.env.NEXT_PUBLIC_STRIPE_SECRET_KEY) {
      console.error('Missing Stripe API key');
      return NextResponse.json(
        { error: 'Stripe API key not configured' },
        { status: 500 }
      );
    }

    // Get request body
    const body = await request.json();
    const { userId, newPlanId, paymentMethodId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }
    
    if (!newPlanId) {
      return NextResponse.json(
        { error: 'New plan ID is required' },
        { status: 400 }
      );
    }

    // Get user details from database
    const { data: user, error: userError } = await supabase
      .from('user')
      .select('id, stripe_customer_id')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      console.error('Error fetching user:', userError);
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get current subscription details
    const { data: subscriptionData, error: subscriptionError } = await supabase
      .from('user_subscription_plan')
      .select(`
        id, 
        plan_id,
        start_date,
        end_date,
        subscription_plan (
          id,
          name,
          type,
          price,
          billing_interval
        )
      `)
      .eq('user_id', userId)
      .eq('status', 'ACTIVE')
      .order('created_at', { ascending: false })
      .limit(1);

    if (subscriptionError) {
      console.error('Error fetching current subscription:', subscriptionError);
      return NextResponse.json(
        { error: 'Error fetching current subscription' },
        { status: 500 }
      );
    }
    
    // Get the active subscription if available
    const currentSubscription = subscriptionData && subscriptionData.length > 0 
      ? subscriptionData[0] 
      : null;

    // Get new plan details
    const { data: newPlan, error: newPlanError } = await supabase
      .from('subscription_plan')
      .select('*')
      .eq('id', newPlanId)
      .single();

    if (newPlanError || !newPlan) {
      console.error('Error fetching new plan:', newPlanError);
      return NextResponse.json(
        { error: 'New plan not found' },
        { status: 404 }
      );
    }

    // Verify the new plan is an upgrade
    const planTypes = ['FREE', 'PRO', 'ENTERPRISE'];
    const currentType = currentSubscription?.subscription_plan?.type || 'FREE';
    const newType = newPlan.type;
    
    if (planTypes.indexOf(newType) <= planTypes.indexOf(currentType)) {
      return NextResponse.json(
        { error: 'Selected plan is not an upgrade from current plan' },
        { status: 400 }
      );
    }

    // Calculate prorated amount if upgrading mid-cycle (for existing paid plans)
    let amount = newPlan.price;
    let prorationDetails = null;

    if (currentSubscription?.subscription_plan?.price > 0 && 
        currentSubscription.start_date && 
        currentSubscription.end_date) {
      
      const now = new Date();
      const endDate = new Date(currentSubscription.end_date);
      const startDate = new Date(currentSubscription.start_date);
      const totalDays = (endDate - startDate) / (1000 * 60 * 60 * 24);
      const remainingDays = (endDate - now) / (1000 * 60 * 60 * 24);
      
      if (remainingDays > 0) {
        // Calculate remaining value of current subscription
        const remainingValue = (currentSubscription.subscription_plan.price / totalDays) * remainingDays;
        
        // Calculate prorated amount for new subscription
        const proratedNewValue = (newPlan.price / totalDays) * remainingDays;
        
        // Final amount is the difference
        amount = proratedNewValue - remainingValue;
        
        prorationDetails = {
          remainingDays: Math.round(remainingDays),
          remainingValue: remainingValue.toFixed(2),
          proratedNewValue: proratedNewValue.toFixed(2),
          proratedAmount: amount.toFixed(2)
        };
      }
    }

    // Create payment data for the checkout session
    const metadata = {
      userId: userId,
      currentPlanId: currentSubscription?.plan_id,
      newPlanId: newPlanId,
      upgradeType: 'immediate',
      proratedAmount: amount.toFixed(2)
    };

    // Create return URL with success/cancel paths
    const origin = request.headers.get('origin') || 'http://localhost:3000';
    const successUrl = `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${origin}/settings/subscription`;

    // Prepare stripe session creation parameters
    const sessionParams = {
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Upgrade to ${newPlan.name}`,
              description: `${prorationDetails ? 'Prorated upgrade' : 'Immediate upgrade'} from ${currentSubscription?.subscription_plan?.name || 'current plan'} to ${newPlan.name}`
            },
            unit_amount: Math.max(0, Math.round(amount * 100)), // Convert to cents, ensure non-negative
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: metadata,
      locale: 'en',
    };

    // If user has a Stripe customer ID, use it
    if (user.stripe_customer_id) {
      sessionParams.customer = user.stripe_customer_id;
    }

    // If payment method provided, use it
    if (paymentMethodId) {
      sessionParams.payment_method = paymentMethodId;
    }

    // Create the checkout session
    const checkoutSession = await stripe.checkout.sessions.create(sessionParams);

    // Return the session ID and URL
    return NextResponse.json({
      sessionId: checkoutSession.id,
      url: checkoutSession.url,
      amount: amount.toFixed(2),
      prorationDetails
    });

  } catch (error) {
    console.error('Subscription upgrade error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
} 