import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getUserId } from '@/lib/auth/auth';
import crypto from 'crypto';
import { sendSubscriptionRenewalSuccessEmail, sendSubscriptionRenewalFailureEmail } from '@/lib/email';

/**
 * Record a user heartbeat (POST)
 * Updates the user's heartbeat timestamp and checks for subscription renewal
 */
export async function POST() {
  try {
    const userId = await getUserId();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // First check if the user already has a heartbeat record
    const { data: existingHeartbeat } = await supabase
      .from('user_heartbeats')
      .select('id')
      .eq('user_id', userId)
      .limit(1);
    
    let result;
    
    if (existingHeartbeat && existingHeartbeat.length > 0) {
      // Update existing heartbeat
      result = await supabase
        .from('user_heartbeats')
        .update({ 
          last_heartbeat: new Date().toISOString() 
        })
        .eq('user_id', userId);
    } else {
      // Create new heartbeat record
      result = await supabase
        .from('user_heartbeats')
        .insert({ 
          user_id: userId,
          last_heartbeat: new Date().toISOString() 
        });
    }
    
    if (result.error) {
      console.error('Error updating heartbeat:', result.error);
      return NextResponse.json(
        { error: 'Failed to update heartbeat' },
        { status: 500 }
      );
    }

    // Check for subscription renewal
    await checkSubscriptionRenewal(userId);
    
    // Check for subscription expiration
    await checkSubscriptionExpiration(userId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating heartbeat:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Check if the user has a subscription that needs renewal
 * If found, trigger the renewal process
 */
async function checkSubscriptionRenewal(userId) {
  try {
    
    
    // Get user's auto-renew preference
    const { data: user, error: userError } = await supabase
      .from('user')
      .select('auto_renew_enabled, default_payment_method_id, stripe_customer_id')
      .eq('id', userId)
      .limit(1);

    if (userError || !user || user.length === 0) {
      
      return;
    }

    const userRecord = user[0];
    
    if (!userRecord.auto_renew_enabled) {
      // Auto-renew not enabled
      
      return;
    }

    // Check for active subscription near expiration (within 24 hours)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const { data: subscriptions, error: subError } = await supabase
      .from('user_subscription_plan')
      .select(`
        id, 
        plan_id, 
        end_date, 
        auto_renew, 
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
      .lt('end_date', tomorrow.toISOString())
      .order('end_date', { ascending: true })
      .limit(1);

    // If no subscription found or query error, just exit without error
    if (subError) {
      
      return;
    }

    // Check if we have a subscription to process
    if (!subscriptions || subscriptions.length === 0) {
      
      return;
    }

    const subscription = subscriptions[0];
    
    // If subscription doesn't have auto-renew enabled, exit
    if (!subscription.auto_renew) {
      
      return;
    }

    // Check if we've already attempted renewal recently (within last hour)
    if (subscription.last_renewal_attempt) {
      const lastAttempt = new Date(subscription.last_renewal_attempt);
      const oneHourAgo = new Date();
      oneHourAgo.setHours(oneHourAgo.getHours() - 1);

      if (lastAttempt > oneHourAgo) {
        // Already attempted recently, skip to avoid multiple attempts
        
        return;
      }
    }

    // Check if user has a default payment method in the user table
    if (!userRecord.default_payment_method_id) {
      // Check if there's a payment method marked as default in the payment_methods table
      const { data: defaultPaymentMethods, error: paymentMethodError } = await supabase
        .from('payment_methods')
        .select('stripe_payment_method_id')
        .eq('user_id', userId)
        .eq('is_default', true)
        .limit(1);
        
      if (paymentMethodError) {
        
        return;
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
          
          // Continue with the payment method we found, even if updating the user record failed
        } else {
          // Update the local user object with the new payment method ID
          userRecord.default_payment_method_id = defaultPaymentMethodId;
          
        }
      } else {
        // No default payment method found in either place
        
        return;
      }
    }

    // Mark that we're attempting renewal
    
    await supabase
      .from('user_subscription_plan')
      .update({ 
        last_renewal_attempt: new Date().toISOString() 
      })
      .eq('id', subscription.id);

    // Trigger the renewal process directly with the same logic as the API endpoint
    // This avoids issues with fetch() in server-side contexts
    try {
      
      
      // Import Stripe directly in this function to ensure it's available
      const Stripe = require('stripe');
      const stripe = new Stripe(process.env.NEXT_PUBLIC_STRIPE_SECRET_KEY);
      
      // Create a payment intent with Stripe
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(subscription.plan.price * 100), // Convert to cents
        currency: 'usd',
        customer: userRecord.stripe_customer_id,
        payment_method: userRecord.default_payment_method_id,
        confirm: true,
        off_session: true,
        description: `Subscription renewal for ${subscription.plan.name}`,
        metadata: {
          subscription_id: subscription.id,
          plan_id: subscription.plan_id,
          user_id: userId
        }
      });

      

      if (paymentIntent.status === 'succeeded') {
        // Payment successful, extend subscription
        const newEndDate = new Date(subscription.end_date);
        
        // Add appropriate time based on billing interval
        if (subscription.plan.billing_interval === 'MONTHLY') {
          newEndDate.setMonth(newEndDate.getMonth() + 1);
        } else if (subscription.plan.billing_interval === 'YEARLY') {
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
          .eq('id', subscription.id);
        
        if (updateError) {
          console.error('Error updating subscription end date:', updateError);
          return;
        }

        // Create payment record
        const { error: paymentError } = await supabase
          .from('payment')
          .insert({
            order_id: crypto.randomUUID(),
            user_id: userId,
            amount: subscription.plan.price,
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


        // Get user information for email
        const { data: userData, error: userDataError } = await supabase
          .from('user')
          .select('email, name')
          .eq('id', userId)
          .limit(1);
          
        if (!userDataError && userData && userData.length > 0) {
          // Send email notification for successful renewal
          await sendSubscriptionRenewalSuccessEmail({
            to: userData[0].email,
            name: userData[0].name || 'Valued Customer',
            planName: subscription.plan.name,
            amount: (subscription.plan.price / 100).toFixed(2), // Convert from cents to dollars
            newExpiryDate: new Date(newEndDate).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            }),
            locale: 'en'
          });
          
        } else {
          console.error('Error fetching user data for email:', userDataError);
        }
      } else {
        // Payment pending or requires action
        // Increment failure count
        await supabase
          .from('user_subscription_plan')
          .update({
            last_renewal_attempt: new Date().toISOString(),
            renewal_failure_count: (subscription.renewal_failure_count || 0) + 1
          })
          .eq('id', subscription.id);
        
        

        // Get user information for email
        const { data: userData, error: userDataError } = await supabase
          .from('user')
          .select('email, name')
          .eq('id', userId)
          .limit(1);
          
        if (!userDataError && userData && userData.length > 0) {
          // Send email notification for failed renewal
          await sendSubscriptionRenewalFailureEmail({
            to: userData[0].email,
            name: userData[0].name || 'Valued Customer',
            planName: subscription.plan.name,
            errorReason: 'Payment requires additional action',
            expiryDate: new Date(subscription.end_date).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            }),
            locale: 'en'
          });
          
        } else {
          console.error('Error fetching user data for email:', userDataError);
        }
      }
    } catch (stripeError) {
      console.error('Error processing payment:', stripeError);

      // Increment failure count
      await supabase
        .from('user_subscription_plan')
        .update({
          last_renewal_attempt: new Date().toISOString(),
          renewal_failure_count: (subscription.renewal_failure_count || 0) + 1
        })
        .eq('id', subscription.id);
        
      // Get user information for email
      const { data: userData, error: userDataError } = await supabase
        .from('user')
        .select('email, name')
        .eq('id', userId)
        .limit(1);
        
      if (!userDataError && userData && userData.length > 0) {
        // Send email notification for failed renewal
        await sendSubscriptionRenewalFailureEmail({
          to: userData[0].email,
          name: userData[0].name || 'Valued Customer',
          planName: subscription.plan.name,
          errorReason: `Payment failed: ${stripeError.message || 'Unknown error'}`,
          expiryDate: new Date(subscription.end_date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          }),
          locale: 'en'
        });
        
      } else {
        console.error('Error fetching user data for email:', userDataError);
      }
    }
  } catch (error) {
    
    // Don't throw error, as this is a background process
  }
}

/**
 * Check if the user has an expired subscription
 * If found, mark it as expired and activate the free plan
 */
async function checkSubscriptionExpiration(userId) {
  try {
    const now = new Date().toISOString();
    
    // Find active subscriptions that have expired
    const { data: expiredSubscriptions, error: expiredError } = await supabase
      .from('user_subscription_plan')
      .select('id, plan_id')
      .eq('user_id', userId)
      .or('status.eq.ACTIVE,status.eq.active')
      .lt('end_date', now)
      .not('end_date', 'is', null) // Skip subscriptions with no end date (typically free plans)
      .order('end_date', { ascending: true });
    
    if (expiredError) {
      console.error('Error checking for expired subscriptions:', expiredError);
      return;
    }
    
    // If no expired subscriptions, exit
    if (!expiredSubscriptions || expiredSubscriptions.length === 0) {
      return;
    }
    
    
    
    // Get the free plan ID (typically 1)
    const FREE_PLAN_ID = 1;
    
    // First try to use the stored procedure, but have robust fallback
    try {
      // Begin a transaction to ensure all updates happen together
      const { error: transactionError } = await supabase.rpc('handle_subscription_expiration', {
        p_user_id: userId,
        p_expired_subscription_ids: expiredSubscriptions.map(sub => sub.id),
        p_free_plan_id: FREE_PLAN_ID
      });
      
      if (transactionError) {
        throw new Error(`Stored procedure error: ${transactionError.message}`);
      }
      
      
      return; // Successfully used the stored procedure
    } catch (procedureError) {
      // Log the error but continue with the fallback implementation
      console.error('Failed to use stored procedure for expiration handling, using fallback implementation:', procedureError);
    }
    
    
    
    // Fallback implementation: manually handle the updates
    // Mark expired subscriptions as EXPIRED
    for (const subscription of expiredSubscriptions) {
      await supabase
        .from('user_subscription_plan')
        .update({ 
          status: 'EXPIRED',
          updated_at: now
        })
        .eq('id', subscription.id);
      
      
    }
    
    // Check if user already has an active free plan
    const { data: existingFreePlan } = await supabase
      .from('user_subscription_plan')
      .select('id')
      .eq('user_id', userId)
      .eq('plan_id', FREE_PLAN_ID)
      .or('status.eq.ACTIVE,status.eq.active')
      .limit(1);
    
    if (!existingFreePlan || existingFreePlan.length === 0) {
      // Check for an existing deactivated free plan to reactivate
      const { data: inactiveFreePlan } = await supabase
        .from('user_subscription_plan')
        .select('id')
        .eq('user_id', userId)
        .eq('plan_id', FREE_PLAN_ID)
        .or('status.eq.DEACTIVATED,status.eq.INACTIVE,status.eq.EXPIRED')
        .order('updated_at', { ascending: false })
        .limit(1);
      
      if (inactiveFreePlan && inactiveFreePlan.length > 0) {
        // Reactivate the existing free plan
        await supabase
          .from('user_subscription_plan')
          .update({ 
            status: 'ACTIVE',
            start_date: now,
            end_date: null, // Free plans don't expire
            updated_at: now
          })
          .eq('id', inactiveFreePlan[0].id);
        
        
      } else {
        // Create a new free plan subscription
        await supabase
          .from('user_subscription_plan')
          .insert({
            user_id: userId,
            plan_id: FREE_PLAN_ID,
            status: 'ACTIVE',
            start_date: now,
            end_date: null, // Free plans don't expire
            auto_renew: false // Free plans don't need auto-renewal
          });
        
        
      }
    } else {
      
    }
    
    // Send notification to the user about subscription expiration
    try {
      // Add to notifications table
      await supabase
        .from('notification')
        .insert({
          user_id: userId,
          type: 'SYSTEM',
          title: 'Subscription Expired',
          content: 'Your subscription has expired. You have been downgraded to the free plan.',
          read: false
        });
      
      
    } catch (notifyError) {
      console.error('Error sending expiration notification:', notifyError);
    }
  } catch (error) {
    console.error('Error in checkSubscriptionExpiration:', error);
    // Don't throw error, as this is a background process
  }
} 