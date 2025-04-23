import { NextResponse } from 'next/server';
import { openai } from '../../task-manager-agent/config';
import { safeParseJSON } from '../../task-manager-agent/utils';

// System prompt for workflow generation
const WORKFLOW_GENERATION_PROMPT = `
You are an AI assistant that generates workflow templates for different purposes.
Your task is to create a detailed workflow based on the user's input, with proper prompt templates and input variables.

Generate the workflow in the following structure:
{
  "name": "Workflow name",
  "description": "Detailed description of the workflow",
  "type": "ppt_generation|document_generation|api_request|data_analysis",
  "prompt": "Detailed prompt template with {{variable}} placeholders",
  "input_schema": {
    "fields": [
      {
        "name": "variable_name",
        "label": "User-friendly label",
        "type": "text|textarea|number",
        "required": true|false
      }
    ]
  }
}

For example, if generating a PowerPoint presentation workflow:
- Choose type: "ppt_generation"
- Include variables like {{topic}}, {{audience}}, {{slides_count}}
- Create a detailed prompt that guides the AI to generate high-quality slides
- Define all necessary input fields with appropriate types and labels

Make sure the prompt template is detailed and includes instructions for formatting, structure, and content.
Use proper JSON format with no trailing commas.
`;

export async function POST(request) {
  try {
    const body = await request.json();
    const { description, workflowType, userId } = body;
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized: userId is required' }, { status: 401 });
    }
    
    if (!description) {
      return NextResponse.json(
        { error: 'Workflow description is required' }, 
        { status: 400 }
      );
    }
    
    // Select the appropriate model
    const model = "google/gemini-2.0-flash-exp:free";
    
    // Generate the workflow template with AI
    const completion = await openai.chat.completions.create({
      model: model,
      messages: [
        { role: 'system', content: WORKFLOW_GENERATION_PROMPT },
        { role: 'user', content: `Generate a ${workflowType || ''} workflow based on this description: ${description}` }
      ],
      temperature: 0.7,
      max_tokens: 2000,
      response_format: { type: "json_object" }
    });
    
    // Extract and parse the AI response
    const aiContent = completion.choices[0]?.message?.content || "";
    const { data: workflowTemplate, error: parseError } = safeParseJSON(aiContent);
    
    if (parseError || !workflowTemplate) {
      console.error("AI response parsing failed:", parseError, "Original content:", aiContent);
      throw new Error('Failed to parse AI response: ' + (parseError || 'Invalid response format'));
    }
    
    // Ensure the workflow has the required fields
    if (!workflowTemplate.name || !workflowTemplate.type || !workflowTemplate.prompt) {
      throw new Error('Generated workflow is missing required fields');
    }
    
    return NextResponse.json(workflowTemplate);
  } catch (error) {
    console.error('Error generating workflow:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate workflow' }, 
      { status: 500 }
    );
  }
} 