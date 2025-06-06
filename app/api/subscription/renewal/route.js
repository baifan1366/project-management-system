import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabase } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import { getUserId } from '@/lib/auth/auth';

// Initialize Stripe
const stripe = new Stripe(process.env.NEXT_PUBLIC_STRIPE_SECRET_KEY);

/**
 * Check and process subscription renewals
 * This endpoint is designed to be called by the server/cron job
 * to process automatic renewals
 */
export async function POST(req) {
  try {
    const userId = await getUserId();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get user's subscription and payment information
    const { data: user, error: userError } = await supabase
      .from('user')
      .select('auto_renew_enabled, default_payment_method_id, stripe_customer_id')
      .eq('id', userId)
      .single();
    
    if (userError) {
      console.error('Error fetching user payment information:', userError);
      return NextResponse.json(
        { error: 'Failed to fetch user payment information' },
        { status: 500 }
      );
    }

    // Check if auto-renewal is enabled
    if (!user.auto_renew_enabled) {
      return NextResponse.json(
        { error: 'Auto-renewal is not enabled for this user' },
        { status: 400 }
      );
    }

    // Check if user has a default payment method in the user table
    if (!user.default_payment_method_id) {
      // Check if there's a payment method marked as default in the payment_methods table
      const { data: defaultPaymentMethods, error: paymentMethodError } = await supabase
        .from('payment_methods')
        .select('stripe_payment_method_id')
        .eq('user_id', userId)
        .eq('is_default', true)
        .limit(1);
        
      if (paymentMethodError) {
        console.error('Error checking for default payment methods:', paymentMethodError);
        return NextResponse.json(
          { error: 'Failed to check payment methods' },
          { status: 500 }
        );
      }
      
      // If we found a default payment method in the table, use it and update the user record
      if (defaultPaymentMethods && defaultPaymentMethods.length > 0) {
        const defaultPaymentMethodId = defaultPaymentMethods[0].stripe_payment_method_id;
        
        // Update the user record with the default payment method
        const { error: updateUserError } = await supabase
          .from('user')
          .update({ default_payment_method_id: defaultPaymentMethodId })
          .eq('id', userId);
          
        if (updateUserError) {
          console.error('Error updating user default payment method:', updateUserError);
          // Continue with the payment method we found, even if updating the user record failed
        }
        
        // Set the default payment method for this operation
        user.default_payment_method_id = defaultPaymentMethodId;
      } else {
        // No default payment method found in either place
        return NextResponse.json(
          { error: 'No default payment method set. Please set a default payment method before testing renewal.' },
          { status: 400 }
        );
      }
    }

    // Get active subscription
    const { data: subscription, error: subscriptionError } = await supabase
      .from('user_subscription_plan')
      .select(`
        id, 
        plan_id, 
        auto_renew,
        end_date,
        last_renewal_attempt,
        renewal_failure_count,
        plan:plan_id (
          id,
          name,
          type,
          price,
          billing_interval
        )
      `)
      .eq('user_id', userId)
      .or('status.eq.ACTIVE,status.eq.active')
      .order('created_at', { ascending: false })
      .limit(1);
    
    // Handle case where no active subscription is found
    if (subscriptionError) {
      console.error('Error fetching subscription:', subscriptionError);
      return NextResponse.json(
        { error: 'Failed to fetch subscription' },
        { status: 500 }
      );
    }
    
    if (!subscription || subscription.length === 0) {
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 404 }
      );
    }

    const currentSubscription = subscription[0];

    // For test renewal, skip the renewal window check
    const isTestRenewal = req.headers.get('x-test-renewal') === 'true';
    
    if (!isTestRenewal) {
      // Calculate if subscription is within the renewal window (7 days before expiration)
      const endDate = new Date(currentSubscription.end_date);
      const now = new Date();
      const renewalWindow = new Date(endDate);
      renewalWindow.setDate(renewalWindow.getDate() - 7); // 7 days before expiration
      
      if (now < renewalWindow) {
        return NextResponse.json(
          { error: 'Subscription is not yet within the renewal window' },
          { status: 400 }
        );
      }

      // Check if this is a retry and if we've exceeded the retry limit
      if (currentSubscription.renewal_failure_count >= 3 && 
          currentSubscription.last_renewal_attempt && 
          (new Date() - new Date(currentSubscription.last_renewal_attempt)) < 24 * 60 * 60 * 1000) {
        return NextResponse.json(
          { error: 'Maximum renewal retry attempts reached. Please update payment information.' },
          { status: 400 }
        );
      }
    }

    // Process the payment through Stripe
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(currentSubscription.plan.price * 100), // Convert to cents
        currency: 'usd',
        customer: user.stripe_customer_id,
        payment_method: user.default_payment_method_id,
        confirm: true,
        off_session: true,
        description: `Subscription renewal for ${currentSubscription.plan.name}`,
        metadata: {
          subscription_id: currentSubscription.id,
          plan_id: currentSubscription.plan_id,
          user_id: userId
        }
      });

      if (paymentIntent.status === 'succeeded') {
        // Payment successful, extend subscription
        const newEndDate = new Date(currentSubscription.end_date);
        
        // Add appropriate time based on billing interval
        if (currentSubscription.plan.billing_interval === 'MONTHLY') {
          newEndDate.setMonth(newEndDate.getMonth() + 1);
        } else if (currentSubscription.plan.billing_interval === 'YEARLY') {
          newEndDate.setFullYear(newEndDate.getFullYear() + 1);
        } else {
          // Default to monthly if not specified
          newEndDate.setMonth(newEndDate.getMonth() + 1);
        }

        // Update subscription end date
        const { error: updateError } = await supabase
          .from('user_subscription_plan')
          .update({
            end_date: newEndDate.toISOString(),
            last_renewal_attempt: new Date().toISOString(),
            renewal_failure_count: 0 // Reset failure count
          })
          .eq('id', currentSubscription.id);
        
        if (updateError) {
          console.error('Error updating subscription end date:', updateError);
          return NextResponse.json(
            { error: 'Payment successful but failed to update subscription' },
            { status: 500 }
          );
        }

        // Create payment record
        const { error: paymentError } = await supabase
          .from('payment')
          .insert({
            order_id: crypto.randomUUID(),
            user_id: userId,
            amount: currentSubscription.plan.price,
            currency: 'USD',
            payment_method: 'CARD',
            status: 'COMPLETED',
            transaction_id: paymentIntent.id,
            stripe_payment_id: paymentIntent.id,
            is_processed: true
          });
        
        if (paymentError) {
          console.error('Error creating payment record:', paymentError);
          // Non-critical error, we'll continue
        }

        return NextResponse.json({
          success: true,
          new_end_date: newEndDate.toISOString()
        });
      } else {
        // Payment pending or requires action
        // Increment failure count
        await supabase
          .from('user_subscription_plan')
          .update({
            last_renewal_attempt: new Date().toISOString(),
            renewal_failure_count: currentSubscription.renewal_failure_count + 1
          })
          .eq('id', currentSubscription.id);
        
        return NextResponse.json(
          { error: 'Payment requires additional action', payment_intent_id: paymentIntent.id },
          { status: 402 }
        );
      }
    } catch (stripeError) {
      console.error('Error processing payment:', stripeError);

      // Increment failure count
      await supabase
        .from('user_subscription_plan')
        .update({
          last_renewal_attempt: new Date().toISOString(),
          renewal_failure_count: currentSubscription.renewal_failure_count + 1
        })
        .eq('id', currentSubscription.id);
      
      return NextResponse.json(
        { error: stripeError.message || 'Payment processing failed' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error in POST /api/subscription/renewal:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
} 