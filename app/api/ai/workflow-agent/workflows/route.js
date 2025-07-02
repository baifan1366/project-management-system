import { NextResponse } from 'next/server';
import { createWorkflow, updateWorkflow, getUserWorkflows, getWorkflow } from '../../../../[locale]/ai-workflow/workflow-service';
import { supabase } from '@/lib/supabase';

export const runtime = 'nodejs';
export const maxDuration = 60; // 60 second timeout (max for hobby plan)

// GET endpoint to fetch all workflows for a user
export async function GET(request) {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized: userId is required' }, { status: 401 });
    }
    
    // Check if requesting a specific workflow
    const id = url.searchParams.get('id');
    
    let result;
    if (id) {
      // Get a specific workflow by ID
      result = await getWorkflow(id);
    } else {
      // Get all workflows for the user
      result = await getUserWorkflows(userId);
    }
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching workflows:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch workflows' }, 
      { status: 500 }
    );
  }
}

// POST endpoint to create a new workflow
export async function POST(request) {
  try {
    const body = await request.json();
    const { userId } = body;
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized: userId is required' }, { status: 401 });
    }
    
    // Validate required fields
    if (!body.name || !body.type || !body.prompt) {
      return NextResponse.json(
        { error: 'Missing required fields: name, type, and prompt are required' }, 
        { status: 400 }
      );
    }
    
    const workflow = {
      name: body.name,
      description: body.description || '',
      type: body.type,
      prompt: body.prompt,
      input_schema: body.input_schema || {},
      flow_data: body.flow_data || null,
      is_public: !!body.is_public,
      icon: body.icon || '📄'
    };
    
    const result = await createWorkflow(workflow, userId);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error creating workflow:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create workflow' }, 
      { status: 500 }
    );
  }
}

// PUT endpoint to update an existing workflow
export async function PUT(request) {
  try {
    const body = await request.json();
    const { userId } = body;
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized: userId is required' }, { status: 401 });
    }
    
    if (!body.id) {
      return NextResponse.json({ error: 'Workflow ID is required' }, { status: 400 });
    }
    
    const updates = {};
    
    // Only include fields that are being updated
    if (body.name !== undefined) updates.name = body.name;
    if (body.description !== undefined) updates.description = body.description;
    if (body.type !== undefined) updates.type = body.type;
    if (body.prompt !== undefined) updates.prompt = body.prompt;
    if (body.input_schema !== undefined) updates.input_schema = body.input_schema;
    if (body.flow_data !== undefined) updates.flow_data = body.flow_data;
    if (body.is_public !== undefined) updates.is_public = !!body.is_public;
    if (body.icon !== undefined) updates.icon = body.icon;
    
    const result = await updateWorkflow(body.id, updates, userId);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error updating workflow:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update workflow' }, 
      { status: 500 }
    );
  }
}

// DELETE endpoint to delete a workflow
export async function DELETE(request) {
  try {
    const url = new URL(request.url);
    let userId = url.searchParams.get('userId');
    const id = url.searchParams.get('id');
    
    // Try to get userId and id from request body if not in URL
    if (!userId || !id) {
      try {
        const body = await request.json();
        userId = userId || body.userId;
        
        if (!userId) {
          return NextResponse.json({ error: 'Unauthorized: userId is required' }, { status: 401 });
        }
      } catch (err) {
        // No body or invalid JSON
        if (!userId) {
          return NextResponse.json({ error: 'Unauthorized: userId is required' }, { status: 401 });
        }
      }
    }
    
    if (!id) {
      return NextResponse.json({ error: 'Workflow ID is required' }, { status: 400 });
    }
    
    // First, verify ownership by getting the workflow
    const { data: workflow, error: fetchError } = await supabase
      .from('workflows')
      .select('created_by')
      .eq('id', id)
      .single();
      
    if (fetchError) {
      console.error('Error fetching workflow:', fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }
    
    if (!workflow) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
    }
    
    // Verify ownership
    if (workflow.created_by !== userId) {
      return NextResponse.json({ error: 'Permission denied: You do not own this workflow' }, { status: 403 });
    }
    
    // Perform hard delete
    const { error: deleteError } = await supabase
      .from('workflows')
      .delete()
      .eq('id', id);
    
    if (deleteError) {
      console.error('Error deleting workflow:', deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }
    
    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error('Error deleting workflow:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete workflow' }, 
      { status: 500 }
    );
  }
} 