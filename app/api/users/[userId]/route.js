import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * Get user basic information by ID or username
 * @param {Object} request - Request object
 * @param {Object} params - Route parameters containing userId
 * @returns {Promise<NextResponse>} Response containing user data
 */
export async function GET(request, { params }) {
  try {
    const { userId } = params;
    
    if (!userId) {
      return NextResponse.json({ 
        success: false, 
        error: 'User ID cannot be empty' 
      }, { status: 400 });
    }

    // Check if userId is numeric (ID) or string (username)
    const isNumeric = /^\d+$/.test(userId);
    
    let query = supabase
      .from('user')
      .select('id, name, avatar_url, email');
    
    // Apply appropriate filter based on whether userId is numeric or a username
    if (isNumeric) {
      query = query.eq('id', userId);
    } else {
      // If not numeric, treat as username
      query = query.ilike('name', userId);
    }
    
    const { data, error } = await query.single();

    if (error) {
      console.error('Failed to get user data:', error);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to get user data' 
      }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ 
        success: false, 
        error: 'User not found' 
      }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      data 
    });
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
