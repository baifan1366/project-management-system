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
      created_at: new Date().toISOString(),
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
    }
    
    // Add user ID if available
    if (body.userId) {
      contactData.created_by = body.userId;
    }
    
    // Insert data into Supabase
    const { data, error } = await supabase
      .from('contact')
      .insert([contactData])
      .select();
      
    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to submit contact form' },
        { status: 500 }
      );
    }
    
    // Return success response
    return NextResponse.json({ 
      success: true, 
      message: 'Contact form submitted successfully',
      data: data[0]
    });
    
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
} 