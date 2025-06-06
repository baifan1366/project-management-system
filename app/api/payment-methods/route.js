import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabase } from '@/lib/supabase';
import { getUserId } from '@/lib/auth/auth';

// Initialize Stripe
const stripe = new Stripe(process.env.NEXT_PUBLIC_STRIPE_SECRET_KEY);

// Get all payment methods for the current user
export async function GET() {
  try {
    const userId = await getUserId();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get user's payment methods from the database
    const { data: paymentMethods, error } = await supabase
      .from('payment_methods')
      .select('*')
      .eq('user_id', userId)
      .order('is_default', { ascending: false });
    
    if (error) {
      console.error('Error fetching payment methods:', error);
      return NextResponse.json(
        { error: 'Failed to fetch payment methods' },
        { status: 500 }
      );
    }

    return NextResponse.json({ payment_methods: paymentMethods });
  } catch (error) {
    console.error('Error in GET /api/payment-methods:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Add a new payment method
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
    const { paymentMethodId, setAsDefault = false } = body;

    if (!paymentMethodId) {
      return NextResponse.json(
        { error: 'Payment method ID is required' },
        { status: 400 }
      );
    }

    // Get user to check if they have a Stripe customer ID
    const { data: user, error: userError } = await supabase
      .from('user')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('Error fetching user:', userError);
      return NextResponse.json(
        { error: 'Failed to fetch user information' },
        { status: 500 }
      );
    }

    let stripeCustomerId = user.stripe_customer_id;

    // If user doesn't have a Stripe customer ID, create one
    if (!stripeCustomerId) {
      const { data: userData, error: userDataError } = await supabase
        .from('user')
        .select('email, name')
        .eq('id', userId)
        .single();

      if (userDataError) {
        console.error('Error fetching user data:', userDataError);
        return NextResponse.json(
          { error: 'Failed to fetch user data' },
          { status: 500 }
        );
      }

      const customer = await stripe.customers.create({
        email: userData.email,
        name: userData.name || userData.email,
        metadata: {
          userId: userId
        }
      });

      stripeCustomerId = customer.id;

      // Update user with Stripe customer ID
      const { error: updateError } = await supabase
        .from('user')
        .update({ stripe_customer_id: stripeCustomerId })
        .eq('id', userId);

      if (updateError) {
        console.error('Error updating user with Stripe customer ID:', updateError);
        return NextResponse.json(
          { error: 'Failed to update user with Stripe customer ID' },
          { status: 500 }
        );
      }
    }

    // Attach payment method to customer
    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: stripeCustomerId
    });

    // Get payment method details
    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);

    // Check if this is the first payment method (make it default in Stripe)
    const { count, error: countError } = await supabase
      .from('payment_methods')
      .select('id', { count: 'exact' })
      .eq('user_id', userId);

    if (countError) {
      console.error('Error counting payment methods:', countError);
      return NextResponse.json(
        { error: 'Failed to count existing payment methods' },
        { status: 500 }
      );
    }

    const isFirstPaymentMethod = count === 0;
    const makeDefault = setAsDefault || isFirstPaymentMethod;

    // If it's the default, update customer's default payment method
    if (makeDefault) {
      await stripe.customers.update(stripeCustomerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId
        }
      });

      // If setting as default, update all other payment methods to not be default
      if (!isFirstPaymentMethod) {
        const { error: updateDefaultError } = await supabase
          .from('payment_methods')
          .update({ is_default: false })
          .eq('user_id', userId);

        if (updateDefaultError) {
          console.error('Error updating existing payment methods:', updateDefaultError);
          return NextResponse.json(
            { error: 'Failed to update existing payment methods' },
            { status: 500 }
          );
        }
      }
    }

    // Save payment method to database
    const cardDetails = paymentMethod.card || {};
    const { error: insertError } = await supabase
      .from('payment_methods')
      .insert({
        user_id: userId,
        stripe_payment_method_id: paymentMethodId,
        card_last4: cardDetails.last4 || null,
        card_brand: cardDetails.brand || null,
        card_exp_month: cardDetails.exp_month || null,
        card_exp_year: cardDetails.exp_year || null,
        is_default: makeDefault
      });

    if (insertError) {
      console.error('Error saving payment method:', insertError);
      return NextResponse.json(
        { error: 'Failed to save payment method' },
        { status: 500 }
      );
    }

    // If user selected auto-renew, update their preference
    if (body.enableAutoRenew) {
      const { error: updateUserError } = await supabase
        .from('user')
        .update({ auto_renew_enabled: true })
        .eq('id', userId);

      if (updateUserError) {
        console.error('Error updating user auto-renew setting:', updateUserError);
        // This isn't critical, so we won't return an error
      }
    }

    return NextResponse.json({
      success: true,
      payment_method: {
        id: paymentMethodId,
        brand: cardDetails.brand,
        last4: cardDetails.last4,
        exp_month: cardDetails.exp_month,
        exp_year: cardDetails.exp_year,
        is_default: makeDefault
      }
    });
  } catch (error) {
    console.error('Error in POST /api/payment-methods:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// Update payment method (set as default)
export async function PUT(req) {
  try {
    const userId = await getUserId();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { paymentMethodId } = body;

    if (!paymentMethodId) {
      return NextResponse.json(
        { error: 'Payment method ID is required' },
        { status: 400 }
      );
    }

    // Verify payment method belongs to user
    const { data: paymentMethod, error: paymentMethodError } = await supabase
      .from('payment_methods')
      .select('stripe_payment_method_id')
      .eq('user_id', userId)
      .eq('stripe_payment_method_id', paymentMethodId)
      .single();

    if (paymentMethodError || !paymentMethod) {
      console.error('Error verifying payment method:', paymentMethodError);
      return NextResponse.json(
        { error: 'Payment method not found or does not belong to user' },
        { status: 404 }
      );
    }

    // Get user's Stripe customer ID
    const { data: user, error: userError } = await supabase
      .from('user')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single();

    if (userError || !user.stripe_customer_id) {
      console.error('Error fetching user Stripe customer ID:', userError);
      return NextResponse.json(
        { error: 'User Stripe customer ID not found' },
        { status: 500 }
      );
    }

    // Update customer's default payment method in Stripe
    await stripe.customers.update(user.stripe_customer_id, {
      invoice_settings: {
        default_payment_method: paymentMethodId
      }
    });

    // Update user's default payment method in our database
    const { error: updateDefaultError } = await supabase
      .from('payment_methods')
      .update({ is_default: false })
      .eq('user_id', userId);

    if (updateDefaultError) {
      console.error('Error updating existing payment methods:', updateDefaultError);
      return NextResponse.json(
        { error: 'Failed to update existing payment methods' },
        { status: 500 }
      );
    }

    const { error: setDefaultError } = await supabase
      .from('payment_methods')
      .update({ is_default: true })
      .eq('user_id', userId)
      .eq('stripe_payment_method_id', paymentMethodId);

    if (setDefaultError) {
      console.error('Error setting default payment method:', setDefaultError);
      return NextResponse.json(
        { error: 'Failed to set default payment method' },
        { status: 500 }
      );
    }

    // Update user's default payment method ID
    const { error: updateUserError } = await supabase
      .from('user')
      .update({ default_payment_method_id: paymentMethodId })
      .eq('id', userId);

    if (updateUserError) {
      console.error('Error updating user default payment method:', updateUserError);
      // Non-critical error, we won't return an error response
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in PUT /api/payment-methods:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// Delete payment method
export async function DELETE(req) {
  try {
    const userId = await getUserId();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const url = new URL(req.url);
    const paymentMethodId = url.searchParams.get('id');

    if (!paymentMethodId) {
      return NextResponse.json(
        { error: 'Payment method ID is required' },
        { status: 400 }
      );
    }

    // Verify payment method belongs to user and check if it's default
    const { data: paymentMethod, error: paymentMethodError } = await supabase
      .from('payment_methods')
      .select('stripe_payment_method_id, is_default')
      .eq('user_id', userId)
      .eq('stripe_payment_method_id', paymentMethodId)
      .single();

    if (paymentMethodError || !paymentMethod) {
      console.error('Error verifying payment method:', paymentMethodError);
      return NextResponse.json(
        { error: 'Payment method not found or does not belong to user' },
        { status: 404 }
      );
    }

    // Get user's Stripe customer ID
    const { data: user, error: userError } = await supabase
      .from('user')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single();

    if (userError || !user.stripe_customer_id) {
      console.error('Error fetching user Stripe customer ID:', userError);
      return NextResponse.json(
        { error: 'User Stripe customer ID not found' },
        { status: 500 }
      );
    }

    // Detach payment method from Stripe
    await stripe.paymentMethods.detach(paymentMethodId);

    // Delete payment method from database
    const { error: deleteError } = await supabase
      .from('payment_methods')
      .delete()
      .eq('user_id', userId)
      .eq('stripe_payment_method_id', paymentMethodId);

    if (deleteError) {
      console.error('Error deleting payment method:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete payment method from database' },
        { status: 500 }
      );
    }

    // If it was the default payment method, update user record
    if (paymentMethod.is_default) {
      // Find another payment method to make default
      const { data: otherPaymentMethods, error: otherError } = await supabase
        .from('payment_methods')
        .select('stripe_payment_method_id')
        .eq('user_id', userId)
        .limit(1);

      if (!otherError && otherPaymentMethods && otherPaymentMethods.length > 0) {
        const newDefaultId = otherPaymentMethods[0].stripe_payment_method_id;
        
        // Update in Stripe
        await stripe.customers.update(user.stripe_customer_id, {
          invoice_settings: {
            default_payment_method: newDefaultId
          }
        });

        // Update in our database
        await supabase
          .from('payment_methods')
          .update({ is_default: true })
          .eq('user_id', userId)
          .eq('stripe_payment_method_id', newDefaultId);

        // Update user record
        await supabase
          .from('user')
          .update({ default_payment_method_id: newDefaultId })
          .eq('id', userId);
      } else {
        // No other payment methods, clear default
        await supabase
          .from('user')
          .update({ default_payment_method_id: null })
          .eq('id', userId);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/payment-methods:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
} 