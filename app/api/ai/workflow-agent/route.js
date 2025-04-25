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
        aiModels
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
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error executing workflow:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to execute workflow' }, 
      { status: 500 }
    );
  }
}
