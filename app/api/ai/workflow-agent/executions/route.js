import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }
    
    // Get workflow executions from the database
    const { data: executions, error } = await supabase
      .from('workflow_executions')
      .select(`
        id,
        workflow_id,
        user_id,
        model_id,
        inputs,
        result,
        status,
        output_formats,
        document_urls,
        executed_at,
        api_responses,
        workflow:workflows(id, name, type, description, flow_data)
      `)
      .eq('user_id', userId)
      .order('executed_at', { ascending: false });
      
    if (error) {
      console.error('Error fetching workflow executions:', error);
      return NextResponse.json({ error: 'Failed to fetch workflow executions' }, { status: 500 });
    }
    
    return NextResponse.json(executions);
  } catch (error) {
    console.error('Error in workflow executions API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
