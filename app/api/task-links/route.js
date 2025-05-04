import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

// Handle GET request to fetch all task links
export async function GET(request) {
  try {
    // Query all rows from the task_links table
    const { data, error } = await supabase
      .from('task_links')
      .select('*')
      .order('id', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// Handle POST request to create a new task link
export async function POST(request) {
  try {
    const { source_task_id, target_task_id, link_type } = await request.json();

    // Insert the new link into the 'task_links' table
    const { data, error } = await supabase
      .from('task_links')
      .insert([
        {
          source_task_id,
          target_task_id,
          link_type: link_type || 0, // Default to finish-to-start
        },
      ])
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
