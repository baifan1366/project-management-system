import { NextResponse } from 'next/server';
import { processOutputs } from '@/app/[locale]/ai-workflow/workflow-service';

export const runtime = 'nodejs';
export const maxDuration = 60; // 60 second timeout (max for hobby plan)

// This function processes AI responses after user edits to generate final outputs
export async function POST(request) {
  try {
    const requestData = await request.json();
    const { 
      workflowId, 
      aiResponses, 
      userId, 
      outputSettings = {},
      nodeConnections = {},
      connectionMap = {} // Extract connectionMap 
    } = requestData;
    
    // Validate required parameters
    if (!workflowId || !aiResponses) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }
    
    console.log(`API: Processing outputs for workflow ${workflowId} with formats: ${Object.keys(aiResponses).join(', ')}`);
    console.log(`API: Node connections included: ${Object.keys(nodeConnections).length}`);
    console.log(`API: Connection map included: ${Object.keys(connectionMap).length}`);
    
    // Allow processing without userId in development (using a default)
    const userIdentifier = userId || 'default-user-id';
    console.log('Using user identifier:', userIdentifier);
    
    // Log output settings for debugging
    console.log('Output settings for processing:', outputSettings ? 
      JSON.stringify(outputSettings, null, 2) : 'No output settings provided');
    
    // Process the outputs
    const result = await processOutputs(
      workflowId, 
      aiResponses,
      userIdentifier, 
      outputSettings,
      nodeConnections,
      connectionMap // Pass connectionMap to the processOutputs function
    );
    
    console.log('Output processing completed successfully');
    
    // Add information about the presentation design capabilities
    if (result.pptxUrl || result.ppt) {
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
    if (result.document || result.docxUrl) {
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
    console.error('Error processing outputs:', error);
    
    return NextResponse.json(
      { error: error.message || 'An error occurred while processing outputs' },
      { status: 500 }
    );
  }
} 