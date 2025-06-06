import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getUserId } from '@/lib/auth/auth';

// Get auto-renew status
export async function GET() {
  try {
    const userId = await getUserId();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get user's auto-renew preference and default payment method
    const { data: user, error } = await supabase
      .from('user')
      .select('auto_renew_enabled, default_payment_method_id')
      .eq('id', userId)
      .single();
    
    if (error) {
      console.error('Error fetching user auto-renew status:', error);
      return NextResponse.json(
        { error: 'Failed to fetch auto-renew status' },
        { status: 500 }
      );
    }

    // Get current active subscription
    const { data: subscriptions, error: subscriptionError } = await supabase
      .from('user_subscription_plan')
      .select(`
        id, 
        plan_id, 
        auto_renew, 
        end_date,
        plan:plan_id (
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
    
    if (subscriptionError) {
      console.error('Error fetching subscription:', subscriptionError);
      return NextResponse.json(
        { error: 'Failed to fetch subscription' },
        { status: 500 }
      );
    }

    // Get the first subscription if available
    const subscription = subscriptions && subscriptions.length > 0 ? subscriptions[0] : null;
    
    // Check if the plan is a free plan
    const isFreePlan = subscription?.plan?.type === 'FREE' || !subscription?.plan?.billing_interval;

    // Check if user has a default payment method
    const hasDefaultPaymentMethod = !!user.default_payment_method_id;

    return NextResponse.json({
      auto_renew_enabled: isFreePlan ? false : user.auto_renew_enabled,
      has_payment_method: hasDefaultPaymentMethod,
      current_subscription: subscription,
      is_free_plan: isFreePlan
    });
  } catch (error) {
    console.error('Error in GET /api/subscription/auto-renew:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Toggle auto-renew
export async function POST(req) {
  try {
    const userId = await getUserId();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { enabled } = body;
    
    if (typeof enabled !== 'boolean') {
      return NextResponse.json(
        { error: 'The "enabled" field must be a boolean' },
        { status: 400 }
      );
    }

    // Get user information
    const { data: user, error: userError } = await supabase
      .from('user')
      .select('default_payment_method_id')
      .eq('id', userId)
      .single();
    
    if (userError) {
      console.error('Error fetching user:', userError);
      return NextResponse.json(
        { error: 'Failed to fetch user information' },
        { status: 500 }
      );
    }

    // Get the current active subscription to check if it's a free plan
    const { data: subscriptions, error: subscriptionQueryError } = await supabase
      .from('user_subscription_plan')
      .select(`
        id,
        plan:plan_id (
          type,
          billing_interval
        )
      `)
      .eq('user_id', userId)
      .or('status.eq.ACTIVE,status.eq.active')
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (subscriptionQueryError) {
      console.error('Error checking subscription type:', subscriptionQueryError);
      return NextResponse.json(
        { error: 'Failed to check subscription type' },
        { status: 500 }
      );
    }
    
    // Check if the active subscription is a free plan
    const isFreePlan = subscriptions && 
                     subscriptions.length > 0 && 
                     (subscriptions[0].plan?.type === 'FREE' || !subscriptions[0].plan?.billing_interval);
    
    // If trying to enable auto-renewal on a free plan, return an error
    if (enabled && isFreePlan) {
      return NextResponse.json(
        { error: 'Auto-renewal cannot be enabled for free plans as they do not expire.' },
        { status: 400 }
      );
    }

    // If enabling auto-renew, make sure user has a payment method
    if (enabled) {
      // Check for payment methods in the database
      const { data: paymentMethods, error: paymentMethodError } = await supabase
        .from('payment_methods')
        .select('id, stripe_payment_method_id')
        .eq('user_id', userId)
        .limit(1);
        
      if (paymentMethodError) {
        console.error('Error checking payment methods:', paymentMethodError);
        return NextResponse.json(
          { error: 'Failed to check payment methods' },
          { status: 500 }
        );
      }
      
      const hasPaymentMethod = paymentMethods && paymentMethods.length > 0;
      
      if (!hasPaymentMethod) {
        return NextResponse.json(
          { error: 'You must add a payment method before enabling auto-renewal' },
          { status: 400 }
        );
      }
      
      // If user doesn't have a default payment method set, set the first one as default
      if (!user.default_payment_method_id && hasPaymentMethod) {
        const { error: updateUserError } = await supabase
          .from('user')
          .update({ default_payment_method_id: paymentMethods[0].stripe_payment_method_id })
          .eq('id', userId);
          
        if (updateUserError) {
          console.error('Error setting default payment method:', updateUserError);
          // Non-critical error, continue anyway
        }
      }
    }

    // Update user's auto-renew preference
    const { error: updateUserError } = await supabase
      .from('user')
      .update({ auto_renew_enabled: enabled })
      .eq('id', userId);
    
    if (updateUserError) {
      console.error('Error updating user auto-renew preference:', updateUserError);
      return NextResponse.json(
        { error: 'Failed to update auto-renew preference' },
        { status: 500 }
      );
    }

    // Also update the current active subscription
    const { data: activeSubscriptions, error: subscriptionError } = await supabase
      .from('user_subscription_plan')
      .select('id')
      .eq('user_id', userId)
      .or('status.eq.ACTIVE,status.eq.active')
      .order('created_at', { ascending: false })
      .limit(1);
    
    // Log found subscriptions for debugging
    console.log('Found subscriptions:', activeSubscriptions);
    
    // Update the subscription if one exists and it's not a free plan
    if (!subscriptionError && activeSubscriptions && activeSubscriptions.length > 0 && !isFreePlan) {
      const subscription = activeSubscriptions[0];
      const { error: updateSubscriptionError } = await supabase
        .from('user_subscription_plan')
        .update({ 
          auto_renew: enabled,
          payment_method_id: enabled ? user.default_payment_method_id : null
        })
        .eq('id', subscription.id);
      
      if (updateSubscriptionError) {
        console.error('Error updating subscription auto-renew:', updateSubscriptionError);
        return NextResponse.json(
          { error: 'Failed to update subscription auto-renewal setting' },
          { status: 500 }
        );
      }
    } else if (subscriptionError) {
      console.error('Error fetching active subscriptions:', subscriptionError);
      return NextResponse.json(
        { error: 'Failed to fetch active subscriptions' },
        { status: 500 }
      );
    } else {
      // If no active subscription exists, log this fact
      console.log('No active subscription found for user', userId);
    }

    return NextResponse.json({
      success: true,
      auto_renew_enabled: enabled
    });
  } catch (error) {
    console.error('Error in POST /api/subscription/auto-renew:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
} 