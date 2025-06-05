import { NextResponse } from 'next/server';
import { executeWorkflow, getUserWorkflows, createWorkflow, updateWorkflow, getWorkflow } from '../../../[locale]/ai-workflow/workflow-service';
import { supabase } from '@/lib/supabase';

export async function POST(request) {
  try {    
    console.log('Main API: POST request received');
    
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
    console.log('Using user identifier:', userIdentifier);
    
    // Execute the workflow
    console.log(`Main API: Executing workflow ${workflowId}`);
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
    
    console.log('Main API: Workflow execution completed successfully');
    
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
    console.log('Main API: GET request received');
    
    // Get the URL and extract parameters
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    const userId = url.searchParams.get('userId');
    
    // Allow processing without userId in development (using a default)
    const userIdentifier = userId || 'default-user-id';
    console.log('Using user identifier:', userIdentifier);
    
    if (id) {
      // Get a specific workflow
      console.log(`Main API: Getting workflow ${id}`);
      const workflow = await getWorkflow(id);
      return new NextResponse(JSON.stringify(workflow), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      // Get all workflows for user
      console.log(`Main API: Getting workflows for user ${userIdentifier}`);
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
    console.log('Main API: PUT request received');
    
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
    console.log('Using user identifier:', userIdentifier);
    
    // Update the workflow
    console.log(`Main API: Updating workflow ${id}`);
    const workflow = await updateWorkflow(id, updates, userIdentifier);
    
    console.log('Main API: Workflow updated successfully');
    
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
    console.log('Main API: DELETE request received');
    
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
    console.log(`Main API: Attempting to delete workflow ${id} by user ${userIdentifier}`);
    
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
    
    console.log(`Main API: Successfully deleted workflow ${id}`);
    
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
