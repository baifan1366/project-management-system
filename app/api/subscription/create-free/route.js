import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function POST(req) {
  const { userId, email, name } = await req.json();

  if (!userId || !email) {
    return NextResponse.json({ error: 'Missing userId or email' }, { status: 400 });
  }

  try {
    // The user has specified that the free plan ID is 1.
    const freePlanId = 1;

    // Create the subscription, setting it to be active for 100 years
    const { error: subError } = await supabase.from('user_subscription_plan').insert({
      user_id: userId,
      plan_id: freePlanId,
      status: 'ACTIVE',
      start_date: new Date().toISOString(),
      end_date: new Date(new Date().setFullYear(new Date().getFullYear() + 100)).toISOString()
    });

    if (subError) {
      console.error('Error inserting subscription:', subError);
      throw subError;
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error creating free subscription:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 