import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * Handles the POST request to check if an email already exists
 * @param {Request} request - The incoming request object
 * @returns {NextResponse} JSON response with the result
 */
export async function POST(request) {
  try {
    // Parse request body
    const body = await request.json();
    const { email } = body;
    
    // Validate input
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }
    
    // Check if email already exists
    const { data, error } = await supabase
      .from('user')
      .select('id')
      .eq('email', email.toLowerCase())
      .maybeSingle();
    
    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to check email' },
        { status: 500 }
      );
    }
    
    // Return response
    return NextResponse.json({
      exists: !!data, // Convert to boolean
    });
  } catch (error) {
    console.error('Error checking email:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 