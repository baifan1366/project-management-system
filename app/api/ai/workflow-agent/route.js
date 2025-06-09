import { NextResponse } from 'next/server';
import { executeWorkflow, getUserWorkflows, createWorkflow, updateWorkflow, getWorkflow } from '../../../[locale]/ai-workflow/workflow-service';
import { supabase } from '@/lib/supabase';

export const runtime = 'nodejs';
export const maxDuration = 60; // 60 second timeout (max for hobby plan)

export async function POST(request) {
  try {    
    
    
    // Parse request body
    const body = await request.json();
    const { workflowId, inputs, modelId, userId, outputFormats, outputSettings, nodeConnections, connectionMap, aiModels } = body;
    
    if (!workflowId) {
      return new NextResponse(JSON.stringify({ error: 'workflowId is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Allow processing without userId in development (using a default)
    const userIdentifier = userId || 'default-user-id';
    
    
    // Execute the workflow
    
    const result = await executeWorkflow(
      workflowId, 
      inputs, 
      modelId || 'google/gemini-2.0-flash-exp:free', 
      userIdentifier,
      {
        outputFormats, 
        outputSettings,
        nodeConnections,
        connectionMap,
        aiModels
      }
    );
    
    
    
    return new NextResponse(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error in workflow execution:', error);
    return new NextResponse(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function GET(request) {
  try {
    
    
    // Get the URL and extract parameters
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    const userId = url.searchParams.get('userId');
    
    // Allow processing without userId in development (using a default)
    const userIdentifier = userId || 'default-user-id';
    
    
    if (id) {
      // Get a specific workflow
      
      const workflow = await getWorkflow(id);
      return new NextResponse(JSON.stringify(workflow), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      // Get all workflows for user
      
      const workflows = await getUserWorkflows(userIdentifier);
      return new NextResponse(JSON.stringify(workflows), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } catch (error) {
    console.error('Error in workflow API:', error);
    return new NextResponse(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function PUT(request) {
  try {
    
    
    // Parse request body
    const body = await request.json();
    const { id, userId, ...updates } = body;
    
    if (!id) {
      return new NextResponse(JSON.stringify({ error: 'id is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Allow processing without userId in development (using a default)
    const userIdentifier = userId || 'default-user-id';
    
    
    // Update the workflow
    
    const workflow = await updateWorkflow(id, updates, userIdentifier);
    
    
    
    return new NextResponse(JSON.stringify(workflow), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error in workflow update:', error);
    return new NextResponse(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function DELETE(request) {
  try {
    
    
    // Get the URL and extract parameters
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    const userId = url.searchParams.get('userId');
    
    if (!id) {
      return new NextResponse(JSON.stringify({ error: 'id is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Allow processing without userId in development (using a default)
    const userIdentifier = userId || 'default-user-id';
    
    
    // First verify ownership
    const { data: workflow, error: fetchError } = await supabase
      .from('workflows')
      .select('created_by')
      .eq('id', id)
      .single();
      
    if (fetchError) {
      return new NextResponse(JSON.stringify({ error: fetchError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (!workflow) {
      return new NextResponse(JSON.stringify({ error: 'Workflow not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // For development: relaxed ownership validation
    if (userIdentifier !== 'default-user-id' && workflow.created_by !== userIdentifier) {
      return new NextResponse(JSON.stringify({ error: 'Permission denied' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Perform deletion
    const { error: deleteError } = await supabase
      .from('workflows')
      .delete()
      .eq('id', id);
      
    if (deleteError) {
      return new NextResponse(JSON.stringify({ error: deleteError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    
    
    return new NextResponse(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error in workflow deletion:', error);
    return new NextResponse(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
