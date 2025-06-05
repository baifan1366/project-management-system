import { streamAIResponses } from '../../../../[locale]/ai-workflow/workflow-service';

// This function handles the streaming of AI responses
export async function POST(request) {
  try {
    console.log('Stream API: Starting request processing');
    
    // Parse request body
    const body = await request.json();
    const { 
      workflowId, 
      inputs, 
      modelId, 
      userId,
      outputFormats = [],
      outputSettings = {},
      nodeConnections = {},
      connectionMap = {},
      aiModels = []
    } = body;
    
    console.log(`Stream API: Received request for workflow ${workflowId}`);
    
    if (!workflowId) {
      return new Response(JSON.stringify({ error: 'workflowId is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Allow processing without userId in development (using a default)
    const userIdentifier = userId || 'default-user-id';
    console.log('Using user identifier:', userIdentifier);
    
    // Log output settings for debugging
    console.log('Output settings received:', JSON.stringify(outputSettings, null, 2));
    
    // Set up response streaming
    const encoder = new TextEncoder();
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();
    
    // Track if writer is closed
    let isWriterClosed = false;
    
    // Function to send a chunk of data
    const writeChunk = async (data) => {
      if (isWriterClosed) {
        console.log('Skipping write attempt on closed stream');
        return;
      }
      
      try {
        await writer.write(
          encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
        );
      } catch (error) {
        console.warn('Error writing to stream:', error.message);
        isWriterClosed = true;
      }
    };
    
    // Start the streaming process in the background
    streamAIResponses(
      workflowId, 
      inputs, 
      modelId || 'google/gemini-2.0-flash-exp:free', 
      userIdentifier,
      writeChunk,
      {
        outputFormats, 
        outputSettings,
        nodeConnections,
        connectionMap,
        aiModels
      }
    ).then(async () => {
      // Send completion signal
      await writeChunk({ type: 'complete' });
      
      if (!isWriterClosed) {
        try {
          await writer.close();
          isWriterClosed = true;
        } catch (error) {
          console.warn('Error closing stream writer:', error.message);
        }
      }
      
      console.log('Stream API: Stream completed successfully');
    }).catch(async (error) => {
      console.error('Error in streaming workflow:', error);
      
      if (!isWriterClosed) {
        try {
          await writeChunk({ type: 'error', error: error.message });
          await writer.close();
        } catch (closeError) {
          console.warn('Error during error handling and stream closing:', closeError.message);
        } finally {
          isWriterClosed = true;
        }
      }
    });
    
    console.log('Stream API: Returning stream response');
    
    // Return the stream as response
    return new Response(stream.readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    });
  } catch (error) {
    console.error('Error setting up stream:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
} 