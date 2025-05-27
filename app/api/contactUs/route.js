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
    } else if (body.type === 'downgrade') {
      // Validate required downgrade fields
      if (!body.userId || !body.currentSubscriptionId || !body.targetPlanId || !body.reason) {
        console.log('Missing downgrade fields:', { 
          userId: !!body.userId, 
          currentSubscriptionId: !!body.currentSubscriptionId, 
          targetPlanId: !!body.targetPlanId, 
          reason: !!body.reason 
        });
        return NextResponse.json(
          { error: 'User ID, current subscription, target plan, and reason are required for downgrade requests' },
          { status: 400 }
        );
      }
      contactData.message = body.reason;
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

    // If this is a downgrade request, create the downgrade request record
    if (body.type === 'downgrade') {
      const downgradeData = {
        contact_id: contact.id,
        user_id: body.userId,
        current_subscription_id: body.currentSubscriptionId,
        target_plan_id: body.targetPlanId,
        reason: body.reason,
        status: 'PENDING',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      console.log('Preparing to insert downgrade data:', downgradeData);

      const { error: downgradeError } = await supabase
        .from('downgrade_request')
        .insert([downgradeData]);

      if (downgradeError) {
        console.error('Error creating downgrade request:', downgradeError);
        console.error('Downgrade data that failed:', downgradeData);
        return NextResponse.json(
          { error: `Failed to submit downgrade request: ${downgradeError.message}` },
          { status: 500 }
        );
      }

      console.log('Successfully created downgrade request');
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