import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import Stripe from 'stripe';

// Initialize Stripe with your secret key - use public variable since that's what you have in env.local
const stripe = new Stripe(process.env.NEXT_PUBLIC_STRIPE_SECRET_KEY);

export async function POST(req) {
  console.log('Payment refund API route hit!');
  try {
    // Check if Stripe is properly initialized
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
    console.log('Environment check: Stripe key is', stripeKeyMask);
    
    const body = await req.json();
    console.log('Received refund request body:', body);
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
          currency
        ),
        user:user_id (
          id,
          email,
          name
        )
      `)
      .eq('id', refundRequestId)
      .single();
    
    console.log('Refund request data:', refundRequest);
    console.log('Refund request error:', error);
    
    if (error) throw error;
    if (!refundRequest) {
      return NextResponse.json({ error: 'Refund request not found' }, { status: 404 });
    }
    
    // Check if payment_id exists
    if (!refundRequest.payment_id) {
      console.error('payment_id is missing in refund_request record');
      return NextResponse.json({ error: 'No payment record linked to this refund request' }, { status: 400 });
    }
    
    // Get the payment intent ID from the linked payment
    const paymentIntentId = refundRequest.payment?.stripe_payment_id || refundRequest.payment?.transaction_id;
    console.log('Payment intent ID:', paymentIntentId);
    
    if (!paymentIntentId) {
      return NextResponse.json(
        { error: 'No payment intent ID found for this refund' }, 
        { status: 400 }
      );
    }
    
    // Process refund through Stripe
    console.log('Creating Stripe refund with payment_intent:', paymentIntentId, 'amount:', Math.round(refundRequest.refund_amount * 100));
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount: Math.round(refundRequest.refund_amount * 100), // Convert to cents
    });
    
    console.log('Stripe refund created:', refund);
    
    // Update refund status
    await supabase
      .from('refund_request')
      .update({
        status: 'APPROVED',
        processed_at: new Date().toISOString(),
        notes: `Refund processed. Stripe refund ID: ${refund.id}`
      })
      .eq('id', refundRequestId);
    
    // Send refund confirmation email to user
    if (refundRequest.user?.email) {
      try {
        console.log('Sending refund confirmation email to:', refundRequest.user.email);
        
        const emailResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/send-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: refundRequest.user.email,
            subject: 'Your Refund Request Has Been Approved',
            text: `Dear ${refundRequest.user.name || 'Customer'},\n\nWe're pleased to inform you that your refund request has been approved. A refund of $${(refundRequest.refund_amount).toFixed(2)} has been processed back to your original payment method.\n\nRefund details:\n- Refund Amount: $${(refundRequest.refund_amount).toFixed(2)}\n- Refund Date: ${new Date().toLocaleDateString()}\n- Refund ID: ${refund.id}\n\nPlease note that it may take 5-10 business days for the refund to appear in your account, depending on your payment provider.\n\nIf you have any questions about your refund, please contact our support team.\n\nThank you for your understanding.\n\nBest regards,\nTeam Sync Support Team`,
            // Use the new template system
            templateType: 'refund_approved',
            templateData: {
              customerName: refundRequest.user.name || 'Customer',
              refundAmount: refundRequest.refund_amount,
              refundDate: new Date().toLocaleDateString(),
              refundId: refund.id,
              reason: refundRequest.reason
            }
          }),
        });
        
        const emailResult = await emailResponse.json();
        console.log('Email sent result:', emailResult);
      } catch (emailError) {
        console.error('Error sending refund confirmation email:', emailError);
        // Don't throw here, we still want to return the refund success response
      }
    }
    
    return NextResponse.json({ success: true, refund });
    
  } catch (error) {
    console.error('Refund processing error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}