import { createProjectAndTasks, handleInvitation } from '../task-manager-service';
import { NextResponse } from 'next/server';
import { safeParseJSON } from '../utils';

export async function POST(request) {
  try {
    
    const { aiResponse, userId, projectId, teamId, sectionId } = await request.json();
    
    if (!aiResponse) {
      return NextResponse.json({ error: 'AI response is required' }, { status: 400 });
    }

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }
    
    // Parse the AI response if it's a string
    let parsedResponse;
    if (typeof aiResponse === 'string') {
      const { data: parsed, error: parseError } = safeParseJSON(aiResponse);
      if (parseError) {
        console.error("Failed to parse AI response:", parseError);
        return NextResponse.json({ error: 'Invalid JSON in AI response' }, { status: 400 });
      }
      parsedResponse = parsed;
    } else {
      parsedResponse = aiResponse;
    }
    
    // Determine if this is a direct invitation or task creation
    const isInvitation = parsedResponse.action === "invite_members";

    try {
      let result;
      
      if (isInvitation) {
        // Handle invitation flow
        result = await handleInvitation(
          JSON.stringify(parsedResponse), 
          userId, 
          projectId, 
          teamId, 
          sectionId
        );
      } else {
        // Handle project and task creation flow
        result = await createProjectAndTasks(
          parsedResponse, 
          userId,
          projectId || null, 
          teamId || null,
          sectionId || null
        );
      }
      
      
      return NextResponse.json({
        success: true,
        ...result
      });
    } catch (error) {
      console.error("Error during response processing:", error);
      return NextResponse.json({ 
        error: error.message || 'Processing failed',
        success: false
      }, { status: 500 });
    }
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json({
      error: error.message || 'An error occurred',
      success: false
    }, { status: 500 });
  }
} 