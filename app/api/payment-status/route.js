import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabase } from '@/lib/supabase';

// Initialize Stripe with API key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || process.env.NEXT_PUBLIC_STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16'
});

// Helper to process subscription upgrade
const processUpgrade = async (metadata) => {
  if (!metadata.upgradeType || !metadata.userId || !metadata.newPlanId) {
    return { success: false, error: 'Missing required upgrade metadata' };
  }

  try {
    // Get current date for start_date
    const startDate = new Date().toISOString();
    
    // Get new plan details
    const { data: planData, error: planError } = await supabase
      .from('subscription_plan')
      .select('billing_interval, type')
      .eq('id', metadata.newPlanId)
      .single();
    
    if (planError) throw planError;
    
    // Calculate end date based on billing interval
    let endDate = null;
    if (planData.type !== 'FREE') {  // Only set end date for non-free plans
      if (planData.billing_interval === 'MONTHLY') {
        endDate = new Date();
        endDate.setMonth(endDate.getMonth() + 1);
        endDate = endDate.toISOString();
      } else if (planData.billing_interval === 'YEARLY') {
        endDate = new Date();
        endDate.setFullYear(endDate.getFullYear() + 1);
        endDate = endDate.toISOString();
      }
    }
    
    // Find all active subscription plans for this user
    const { data: activeSubscriptions, error: activeSubError } = await supabase
      .from('user_subscription_plan')
      .select('id, plan_id, status')
      .eq('user_id', metadata.userId)
      .or('status.eq.ACTIVE,status.eq.active')
      .order('created_at', { ascending: false });
    
    if (activeSubError) throw activeSubError;
    
    const now = new Date().toISOString();
    
    // Deactivate ALL active subscription plans
    if (activeSubscriptions && activeSubscriptions.length > 0) {
      for (const subscription of activeSubscriptions) {
        // Deactivate each active subscription plan
        await supabase
          .from('user_subscription_plan')
          .update({
            status: 'DEACTIVATED',
            updated_at: now
          })
          .eq('id', subscription.id);
      }
    }
    
    // Find the most recent subscription to migrate usage data from
    const { data: mostRecentSubscription, error: recentError } = await supabase
      .from('user_subscription_plan')
      .select('*')
      .eq('user_id', metadata.userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (recentError) throw recentError;
      
    // Migrate usage data if available
    let currentUsage = {
      current_projects: 0,
      current_teams: 0,
      current_members: 0,
      current_ai_chat: 0,
      current_ai_task: 0,
      current_ai_workflow: 0,
      current_storage: 0
    };
    
    // Migrate usage data if available from any recent subscription
    if (mostRecentSubscription) {
      currentUsage = {
        current_projects: mostRecentSubscription.current_projects || 0,
        current_teams: mostRecentSubscription.current_teams || 0,
        current_members: mostRecentSubscription.current_members || 0,
        current_ai_chat: mostRecentSubscription.current_ai_chat || 0,
        current_ai_task: mostRecentSubscription.current_ai_task || 0,
        current_ai_workflow: mostRecentSubscription.current_ai_workflow || 0,
        current_storage: mostRecentSubscription.current_storage || 0
      };
    }
    
    // Insert new subscription with the new plan
    const newData = {
      user_id: metadata.userId,
      plan_id: metadata.newPlanId,
      status: 'ACTIVE',
      start_date: startDate,
      end_date: endDate,
      auto_renew: planData.type !== 'FREE',
      ...currentUsage,
      created_at: now,
      updated_at: now
    };
      
    const result = await supabase
      .from('user_subscription_plan')
      .insert(newData);
    
    if (result.error) throw result.error;
    
    return { success: true };
  } catch (error) {
    console.error('Error processing upgrade:', error);
    return { success: false, error: error.message };
  }
};

export async function GET(request) {
  try {
    // First validate API key exists
    if (!process.env.STRIPE_SECRET_KEY && !process.env.NEXT_PUBLIC_STRIPE_SECRET_KEY) {
      console.error('Missing Stripe API key');
      return NextResponse.json(
        { error: 'Stripe API key not configured' },
        { status: 500 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const paymentIntentId = searchParams.get('payment_intent');
    const sessionId = searchParams.get('session_id');

    // Handle checkout session details retrieval
    if (sessionId) {
      const session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['line_items', 'payment_intent']
      });

      // Check if this is a subscription upgrade
      if (session.metadata && session.metadata.upgradeType) {
        // Process the upgrade if the payment was successful
        if (session.payment_status === 'paid') {
          const upgradeResult = await processUpgrade(session.metadata);
          
          if (!upgradeResult.success) {
            console.error('Failed to process upgrade:', upgradeResult.error);
            // Still return session data but include the error
            return NextResponse.json({
              ...session,
              upgradeError: upgradeResult.error
            });
          }
        }
      }

      return NextResponse.json(session);
    }

    // Handle payment intent details retrieval
    if (paymentIntentId) {
      try {
        // Ensure paymentIntentId is a string
        if (typeof paymentIntentId !== 'string') {
          return NextResponse.json(
            { error: 'Invalid payment intent ID format' },
            { status: 400 }
          );
        }
        
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
        
        // Check if this is a subscription upgrade
        if (paymentIntent.metadata && paymentIntent.metadata.upgradeType) {
          // Process the upgrade if the payment was successful
          if (paymentIntent.status === 'succeeded') {
            const upgradeResult = await processUpgrade(paymentIntent.metadata);
            
            if (!upgradeResult.success) {
              console.error('Failed to process upgrade:', upgradeResult.error);
              // Still return payment intent data but include the error
              return NextResponse.json({
                ...paymentIntent,
                upgradeError: upgradeResult.error
              });
            }
          }
        }
        
        return NextResponse.json(paymentIntent);
      } catch (error) {
        console.error('Error retrieving payment intent:', error);
        return NextResponse.json(
          { error: `Error retrieving payment intent: ${error.message}` },
          { status: error.statusCode || 500 }
        );
      }
    }

    // If neither parameter provided
    return NextResponse.json(
      { error: 'Missing payment_intent or session_id parameter' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Payment status error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
} 