import { NextResponse } from 'next/server';
import { executeWorkflow } from './workflow-service';

export async function POST(request) {
  try {
    const body = await request.json();
    const { workflowId, inputs, modelId, userId, outputFormats = [] } = body;
    
    if (!workflowId) {
      return NextResponse.json({ error: 'Workflow ID is required' }, { status: 400 });
    }
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }
    
    const result = await executeWorkflow(
      workflowId, 
      inputs, 
      modelId, 
      userId, 
      { outputFormats }
    );
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error executing workflow:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to execute workflow' }, 
      { status: 500 }
    );
  }
}
