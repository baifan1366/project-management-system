import { NextResponse } from 'next/server';
import { executeWorkflow } from './workflow-service';

export async function POST(request) {
  try {
    const body = await request.json();
    const { 
      workflowId, 
      inputs, 
      modelId, 
      aiModels = [],
      userId, 
      teamId = null,
      projectId = null,
      outputFormats = [], 
      outputSettings = {},
      nodeConnections = {},
      connectionMap = {}
    } = body;
    
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
      { 
        outputFormats,
        outputSettings,
        nodeConnections,
        connectionMap,
        aiModels,
        teamId,
        projectId
      }
    );
    
    // Add information about the presentation design capabilities
    if (result.pptxUrl) {
      result.designInfo = {
        type: "SlideGo-inspired",
        features: [
          "Professional slide designs with modern aesthetics",
          "Dynamic layouts with visual elements and decorative accents",
          "Color-coordinated themes with complementary accent colors",
          "Properly formatted bullets and consistent typography",
          "Slide master with custom backgrounds and styling"
        ]
      };
    }
    
    // Add information about document generation capabilities
    if (result.document) {
      result.documentInfo = {
        type: "Professional Document",
        features: [
          "Clean document formatting with consistent styling",
          "Hierarchical heading structure with navigation-friendly layout",
          "Professional typography with blue headings and proper spacing",
          "Properly formatted bullet points for better readability",
          "Custom sections and subsections with structured content"
        ]
      };
    }
    
    // Add information about task creation if tasks were created
    if (result.task_result && result.task_result.success) {
      result.taskInfo = {
        type: "Project Tasks",
        taskCount: result.task_result.tasksCreated,
        features: [
          "Automatically generated actionable tasks",
          "Tasks integrated with the project management system",
          "Proper task prioritization and categorization",
          "Assignees set based on mentioned team members",
          "Tasks organized in appropriate sections"
        ]
      };
    }
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error executing workflow:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to execute workflow' }, 
      { status: 500 }
    );
  }
}
