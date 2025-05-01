import { NextResponse } from 'next/server';
import { MessageSquare } from 'lucide-react';


/**
 * GET handler to retrieve available chat node configurations
 * @route GET /api/ai/workflow-agent/chat-nodes
 */
export async function GET(request) {
  try {
    
    // Return available chat node configurations
    const chatNodes = [
      {
        id: 'chat-output',
        type: 'output',
        outputType: 'chat',
        label: 'Chat Message',
        description: 'Sends messages to selected chat sessions',
        icon: '<MessageSquare size={16} />',
        userId: session.user.id,
        chatSessionIds: [],
        messageTemplate: 'Hello, this is an automated message from the workflow system:\n\n{{content}}',
        messageFormat: 'text'
      }
    ];

    return NextResponse.json(chatNodes);
  } catch (error) {
    console.error('Error in chat nodes API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST handler to create a new chat message node
 * @route POST /api/ai/workflow-agent/chat-nodes
 * @body {nodeType, outputType, userId} - Node configuration data
 */
export async function POST(request) {
  try {
    // Get the session to authenticate the request
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Parse the request body
    const body = await request.json();
    const { nodeType, outputType, userId } = body;
    
    // Validate the request body
    if (nodeType !== 'output' || outputType !== 'chat') {
      return NextResponse.json({ error: 'Invalid node configuration' }, { status: 400 });
    }
    
    // Ensure the user can only create nodes for themselves
    if (userId !== session.user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    
    // Create a new chat node configuration
    const newNode = {
      id: `chat-${Date.now()}`,
      type: nodeType,
      outputType: outputType,
      label: 'Chat Message',
      description: 'Sends messages to selected chat sessions',
      icon: '<MessageSquare size={16} />',
      userId: userId,
      chatSessionIds: [],
      messageTemplate: 'Hello, this is an automated message from the workflow system:\n\n{{content}}',
      messageFormat: 'text'
    };
    
    return NextResponse.json(newNode);
  } catch (error) {
    console.error('Error creating chat node:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 