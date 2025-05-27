import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { useGetUser } from '@/lib/hooks/useGetUser';

const supabaseUrl = 'https://xvvuzblglnbbsrmzgexp.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh2dnV6YmxnbG5iYnNybXpnZXhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk4NjA4NjgsImV4cCI6MjA1NTQzNjg2OH0.S9--0XYykXk_lyTIcaSuF2psp9Zeb69U0orCys8SD7U'

// GET: Fetch all subscription plans
export async function GET() {
  try {
    console.log('1. Creating Supabase client')
    
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    console.log('2. Fetching active subscription plans')
    const { data, error } = await supabase
      .from('subscription_plan')
      .select('*')
      .eq('is_active', true) // 只获取激活的计划
      .order('price', { ascending: true })
      .order('id', { ascending: true })

    console.log('3. Query result:', { data, error })

    if (error) {
      throw error
    }

    return NextResponse.json({ plans: data || [] })
    
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch subscription plans', details: error.message },
      { status: 500 }
    )
  }
}

// POST: Create a new subscription plan (admin only)
export async function POST(request) {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey)
    const body = await request.json()

    // Verify admin status (you'll need to implement this based on your auth system)
    const { user, error:authError } = useGetUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Validate required fields
    const requiredFields = [
      'name',
      'type',
      'price',
      'billing_interval',
      'features',
      'max_members',
      'max_projects',
      'storage_limit'
    ]

    for (const field of requiredFields) {
      if (!(field in body)) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        )
      }
    }

    const { data: plan, error } = await supabase
      .from('subscription_plan')
      .insert([body])
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ plan }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create subscription plan' },
      { status: 500 }
    )
  }
}

// PATCH: Update an existing subscription plan (admin only)
export async function PATCH(request) {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey)
    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Plan ID is required' },
        { status: 400 }
      )
    }

    // Verify admin status
    const { user, error:authError } = useGetUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { data: plan, error } = await supabase
      .from('subscription_plan')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ plan }, { status: 200 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update subscription plan' },
      { status: 500 }
    )
  }
}

// DELETE: Delete a subscription plan (admin only)
export async function DELETE(request) {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey)
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Plan ID is required' },
        { status: 400 }
      )
    }

    // Verify admin status
    const { user, error:authError } = useGetUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { error } = await supabase
      .from('subscription_plan')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json(
      { message: 'Plan deleted successfully' },
      { status: 200 }
    )
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete subscription plan' },
      { status: 500 }
    )
  }
}
