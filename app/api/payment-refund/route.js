import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import Stripe from 'stripe';
import { v4 as uuidv4 } from 'uuid';

// Initialize Stripe with your secret key - use public variable since that's what you have in env.local
const stripe = new Stripe(process.env.NEXT_PUBLIC_STRIPE_SECRET_KEY);

/**
 * Switch user to free plan after refund
 * @param {string} userId - The user ID
 * @param {number} currentSubscriptionId - The current subscription ID to cancel
 * @returns {Promise<Object>} - The newly created free subscription record
 */
async function switchUserToFreePlan(userId, currentSubscriptionId) {
  try {
    // Get the current subscription details to migrate usage data
    const { data: currentSubscription, error: subError } = await supabase
      .from('user_subscription_plan')
      .select('*')
      .eq('id', currentSubscriptionId)
      .single();

    if (subError) {
      console.error('Error fetching current subscription:', subError);
      throw subError;
    }

    // Set the current subscription to CANCELLED
    const { error: updateError } = await supabase
      .from('user_subscription_plan')
      .update({
        status: 'CANCELLED',
        updated_at: new Date().toISOString()
      })
      .eq('id', currentSubscriptionId);

    if (updateError) {
      console.error('Error cancelling current subscription:', updateError);
      throw updateError;
    }

    // Create a new subscription with the free plan (id=1)
    const newSubscription = {
      user_id: userId,
      plan_id: 1, // Free plan ID
      status: 'ACTIVE',
      start_date: new Date().toISOString(),
      end_date: null, // Free plans typically don't have an end date
      auto_renew: false,
      // Migrate usage data from the previous subscription
      current_projects: currentSubscription?.current_projects || 0,
      current_teams: currentSubscription?.current_teams || 0,
      current_members: currentSubscription?.current_members || 0,
      current_ai_chat: currentSubscription?.current_ai_chat || 0,
      current_ai_task: currentSubscription?.current_ai_task || 0,
      current_ai_workflow: currentSubscription?.current_ai_workflow || 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: newSubscriptionData, error: insertError } = await supabase
      .from('user_subscription_plan')
      .insert(newSubscription)
      .select('*')
      .single();

    if (insertError) {
      console.error('Error creating free plan subscription:', insertError);
      throw insertError;
    }

    return newSubscriptionData;
  } catch (error) {
    console.error('Error in switchUserToFreePlan:', error);
    throw error;
  }
}

export async function POST(req) {
  
  try {

    if (!process.env.NEXT_PUBLIC_STRIPE_SECRET_KEY) {
      console.error('NEXT_PUBLIC_STRIPE_SECRET_KEY is not defined in environment variables');
      return NextResponse.json(
        { error: 'Stripe API key is missing' },
        { status: 500 }
      );
    }
    
    // Log environment variables for debugging (mask sensitive info)
    const stripeKeyMask = process.env.NEXT_PUBLIC_STRIPE_SECRET_KEY 
      ? `${process.env.NEXT_PUBLIC_STRIPE_SECRET_KEY.substring(0, 7)}...` 
      : 'not set';
    
    
    const body = await req.json();
    
    const { refundRequestId } = body;
    
    if (!refundRequestId) {
      console.error('No refundRequestId provided in request body');
      return NextResponse.json({ error: 'refundRequestId is required' }, { status: 400 });
    }
    
    // Get refund request with linked payment info and user info
    const { data: refundRequest, error } = await supabase
      .from('refund_request')
      .select(`
        *,
        payment:payment_id (
          id,
          stripe_payment_id,
          transaction_id,
          amount,
          currency,
          payment_method,
          metadata
        ),
        user:user_id (
          id,
          email,
          name
        )
      `)
      .eq('id', refundRequestId)
      .single();
    
    
    
    
    if (error) throw error;
    if (!refundRequest) {
      return NextResponse.json({ error: 'Refund request not found' }, { status: 404 });
    }
    
    // Check if payment_id exists
    if (!refundRequest.payment_id || !refundRequest.payment) {
      console.error('payment_id is missing or payment record not found in refund_request record');
      return NextResponse.json({ error: 'No payment record linked to this refund request' }, { status: 400 });
    }
    
    // Use the payment amount for refund calculation
    const paymentAmount = refundRequest.payment.amount;
    if (!paymentAmount) {
      return NextResponse.json({ error: 'Payment amount not found for this refund' }, { status: 400 });
    }

    // If refund_amount is not set, use the full payment amount (or add your own proration logic here)
    let refundAmount = refundRequest.refund_amount;
    if (!refundAmount || refundAmount > paymentAmount) {
      refundAmount = paymentAmount;
    }
    
    // Get the payment intent ID from the linked payment
    const paymentIntentId = refundRequest.payment?.stripe_payment_id || refundRequest.payment?.transaction_id;
    
    
    if (!paymentIntentId) {
      return NextResponse.json(
        { error: 'No payment intent ID found for this refund' }, 
        { status: 400 }
      );
    }
    
    // Process refund through Stripe
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount: Math.round(refundAmount * 100), // Convert to cents
    });
    
    // Update the original payment record to status "REFUNDED"
    const { error: paymentUpdateError } = await supabase
      .from('payment')
      .update({
        status: 'REFUNDED',
        updated_at: new Date().toISOString(),
        metadata: {
          ...refundRequest.payment?.metadata,
          refundId: refund.id,
          refundAmount: refundAmount,
          refundDate: new Date().toISOString(),
          refundReason: refundRequest.reason
        }
      })
      .eq('id', refundRequest.payment_id);
    
    if (paymentUpdateError) {
      console.error('Error updating original payment record:', paymentUpdateError);
      return NextResponse.json({ error: 'Failed to update payment record to REFUNDED' }, { status: 500 });
    } else {
      console.log('Updated original payment record status to REFUNDED');
    }
    
    // Switch user to free plan after refund
    const newSubscription = await switchUserToFreePlan(
      refundRequest.user_id, 
      refundRequest.current_subscription_id
    );
    console.log('Switched user to free plan:', newSubscription);
    
    // Update refund status
    await supabase
      .from('refund_request')
      .update({
        status: 'APPROVED',
        processed_at: new Date().toISOString(),
        notes: `Refund processed. Stripe refund ID: ${refund.id}. Original payment record updated to REFUNDED. User switched to free plan.`
      })
      .eq('id', refundRequestId);
    
    // Send refund confirmation email to user
    if (refundRequest.user?.email) {
      try {
        
        
        const emailResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/send-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: refundRequest.user.email,
            subject: 'Your Refund Request Has Been Approved',
            text: `Dear ${refundRequest.user.name || 'Customer'},\n\nWe're pleased to inform you that your refund request has been approved. A refund of $${(refundAmount).toFixed(2)} has been processed back to your original payment method.\n\nRefund details:\n- Refund Amount: $${(refundAmount).toFixed(2)}\n- Refund Date: ${new Date().toLocaleDateString()}\n- Refund ID: ${refund.id}\n- Original Payment Status: Updated to REFUNDED\n\nYour subscription has been changed to our Free plan. You can upgrade at any time from your account settings.\n\nPlease note that it may take 5-10 business days for the refund to appear in your account, depending on your payment provider.\n\nIf you have any questions about your refund, please contact our support team.\n\nThank you for your understanding.\n\nBest regards,\nTeam Sync Support Team`,
            // Use the new template system
            templateType: 'refund_approved',
            templateData: {
              customerName: refundRequest.user.name || 'Customer',
              refundAmount: refundAmount,
              refundDate: new Date().toLocaleDateString(),
              refundId: refund.id,
              reason: refundRequest.reason,
              originalPaymentId: refundRequest.payment_id
            }
          }),
        });
        
        const emailResult = await emailResponse.json();
        
      } catch (emailError) {
        console.error('Error sending refund confirmation email:', emailError);
        // Don't throw here, we still want to return the refund success response
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      refund,
      newSubscription,
      originalPaymentUpdated: !paymentUpdateError,
      originalPaymentId: refundRequest.payment_id
    });
    
  } catch (error) {
    console.error('Refund processing error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}