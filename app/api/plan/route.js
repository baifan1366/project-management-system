import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

// GET: Fetch all subscription plans
export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    const { data: plans, error } = await supabase
      .from('subscription_plan')
      .select('*')
      .where('is_active', 'eq', true)
      .order('price', { ascending: true })

    if (error) throw error

    return NextResponse.json({ plans }, { status: 200 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch subscription plans' },
      { status: 500 }
    )
  }
}

// POST: Create a new subscription plan (admin only)
export async function POST(request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const body = await request.json()

    // Verify admin status (you'll need to implement this based on your auth system)
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

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
    const supabase = createRouteHandlerClient({ cookies })
    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Plan ID is required' },
        { status: 400 }
      )
    }

    // Verify admin status
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

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
    const supabase = createRouteHandlerClient({ cookies })
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Plan ID is required' },
        { status: 400 }
      )
    }

    // Verify admin status
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

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
