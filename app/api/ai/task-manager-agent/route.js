import { parseInstruction, createProjectAndTasks, handleInvitation } from './task-manager-service';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { instruction, userId, projectId, teamId, sectionId } = await request.json();
    
    if (!instruction) {
      return NextResponse.json({ error: 'Instruction is required' }, { status: 400 });
    }

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }
    
    
    
    // Use fetch to call the process-response endpoint internally
    const internalResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/ai/task-manager-agent/process-response`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        // The process-response endpoint expects an AI response, not an instruction
        // So we need to call parseInstruction first
        aiResponse: await parseInstruction(instruction),
        userId,
        projectId,
        teamId,
        sectionId
      }),
    });
    
    const data = await internalResponse.json();
    return NextResponse.json(data, { status: internalResponse.status });
    
  } catch (error) {
    console.error("Error in task-manager-agent API:", error);
    return NextResponse.json({
      error: error.message || 'An error occurred',
      success: false
    }, { status: 500 });
  }
} 