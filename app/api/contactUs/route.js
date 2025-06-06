import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Initialize Supabase client with environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function POST(request) {
  try {
    // Parse the request body
    const body = await request.json();
    console.log('Received request body:', body);
    
    // Validate required fields
    if (!body.email || !body.type) {
      return NextResponse.json(
        { error: 'Email and type are required fields' },
        { status: 400 }
      );
    }
    
    // Prepare data based on form type
    const contactData = {
      type: body.type.toUpperCase(),
      email: body.email,
      status: 'NEW',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // Add type-specific fields
    if (body.type === 'general') {
      if (!body.message) {
        return NextResponse.json(
          { error: 'Message is required for general inquiries' },
          { status: 400 }
        );
      }
      contactData.message = body.message;
    } else if (body.type === 'enterprise') {
      // Validate required enterprise fields
      if (!body.firstName || !body.lastName || !body.companyName) {
        return NextResponse.json(
          { error: 'First name, last name, and company name are required for enterprise inquiries' },
          { status: 400 }
        );
      }
      
      contactData.first_name = body.firstName;
      contactData.last_name = body.lastName;
      contactData.company_name = body.companyName;
      contactData.role = body.role || null;
      contactData.purchase_timeline = body.timeline || null;
      contactData.user_quantity = body.userQty || null;
    } else if (body.type === 'refund') {
      // Validate required refund fields
      if (!body.userId || !body.currentSubscriptionId || !body.firstName || !body.lastName || 
          !body.selectedReason || !body.details) {
        console.log('Missing refund fields:', { 
          userId: !!body.userId, 
          currentSubscriptionId: !!body.currentSubscriptionId, 
          firstName: !!body.firstName,
          lastName: !!body.lastName,
          selectedReason: !!body.selectedReason,
          details: !!body.details
        });
        return NextResponse.json(
          { error: 'User ID, current subscription, first name, last name, reason, and details are required for refund requests' },
          { status: 400 }
        );
      }
      contactData.first_name = body.firstName;
      contactData.last_name = body.lastName;
      contactData.message = body.details;
    }

    console.log('Preparing to insert contact data:', contactData);
    
    // Insert contact record and get the generated ID
    const { data: contact, error: contactError } = await supabase
      .from('contact')
      .insert(contactData)
      .select()
      .single();
      
    if (contactError) {
      console.error('Error creating contact:', contactError);
      console.error('Contact data that failed:', contactData);
      return NextResponse.json(
        { error: `Failed to submit contact form: ${contactError.message}` },
        { status: 500 }
      );
    }

    console.log('Successfully created contact:', contact);

    // If this is a refund request, create the refund request record
    if (body.type === 'refund') {
      // Fetch the most recent payment for this subscription
      const { data: paymentData, error: paymentError } = await supabase
        .from('payment')
        .select('*')
        .eq('user_id', body.userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
        
      if (paymentError) {
        console.error('Error fetching payment record:', paymentError);
        return NextResponse.json(
          { error: 'Could not find payment record for refund' },
          { status: 400 }
        );
      }
      
      const refundData = {
        contact_id: contact.id,
        user_id: body.userId,
        payment_id: paymentData.id,
        current_subscription_id: body.currentSubscriptionId,
        first_name: body.firstName,
        last_name: body.lastName,
        reason: body.selectedReason,
        details: body.details,
        status: 'PENDING',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      console.log('Preparing to insert refund data:', refundData);

      const { error: refundError } = await supabase
        .from('refund_request')
        .insert([refundData]);

      if (refundError) {
        console.error('Error creating refund request:', refundError);
        console.error('Refund data that failed:', refundData);
        return NextResponse.json(
          { error: `Failed to submit refund request: ${refundError.message}` },
          { status: 500 }
        );
      }

      console.log('Successfully created refund request');
    }
    
    // Return success response
    return NextResponse.json({ 
      success: true, 
      message: 'Contact form submitted successfully',
      data: contact
    });
    
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: `An unexpected error occurred: ${error.message}` },
      { status: 500 }
    );
  }
} 