import { openai, SYSTEM_PROMPT } from '../config';

export const runtime = 'nodejs';
export const maxDuration = 60; // 60 second timeout

export async function POST(request) {
  try {
    console.log('Task Manager Stream API: Starting request processing');
    
    // Parse request body
    const body = await request.json();
    const { instruction, userId } = body;
    
    if (!instruction) {
      return new Response(JSON.stringify({ error: 'instruction is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Set up response streaming
    const encoder = new TextEncoder();
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();
    
    // Start the streaming process in the background
    (async () => {
      try {
        console.log("Starting AI stream for task manager...");
        const aiStream = await openai.chat.completions.create({
          model: "qwen/qwen2.5-vl-32b-instruct:free",
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: instruction }
          ],
          temperature: 0.1,
          max_tokens: 5000,
          response_format: { type: "json_object" },
          stream: true,
        });
        
        let accumulatedContent = "";
        
        // Send initial chunk to confirm connection is working
        await writer.write(
          encoder.encode(`data: ${JSON.stringify({ type: 'start', message: 'Starting generation' })}\n\n`)
        );
        console.log("Initial stream message sent");
        
        for await (const chunk of aiStream) {
          const content = chunk.choices[0]?.delta?.content || '';
          if (content) {
            accumulatedContent += content;
            await writer.write(
              encoder.encode(`data: ${JSON.stringify({ 
                type: 'chunk', 
                content: content,
                accumulated: accumulatedContent
              })}\n\n`)
            );
            console.log(`Streamed chunk: ${content.length} chars`);
          }
        }
        
        // Send completion signal with final content
        await writer.write(
          encoder.encode(`data: ${JSON.stringify({ 
            type: 'complete', 
            content: accumulatedContent
          })}\n\n`)
        );
        console.log("Stream completed");
        
      } catch (error) {
        console.error('Error in AI streaming:', error);
        await writer.write(
          encoder.encode(`data: ${JSON.stringify({ 
            type: 'error', 
            error: error.message || 'Error in AI streaming'
          })}\n\n`)
        );
      } finally {
        try {
          await writer.close();
          console.log("Stream writer closed");
        } catch (closeError) {
          console.warn('Error closing stream writer:', closeError.message);
        }
      }
    })().catch(error => {
      console.error('Unhandled error in streaming process:', error);
    });
    
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