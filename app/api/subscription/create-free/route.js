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

    // Create the subscription with null end_date for free plans
    const { error: subError } = await supabase.from('user_subscription_plan').insert({
      user_id: userId,
      plan_id: freePlanId,
      status: 'ACTIVE',
      start_date: new Date().toISOString(),
      end_date: null, // Free plans don't have an end date
      auto_renew: false,
      current_projects: 0,
      current_teams: 0,
      current_members: 0,
      current_ai_chat: 0,
      current_ai_task: 0,
      current_ai_workflow: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
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