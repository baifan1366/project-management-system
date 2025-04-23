import { openai } from '../task-manager-agent/config';
import { safeParseJSON } from '../task-manager-agent/utils';
import { supabase } from '@/lib/supabase';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import pptxgenjs from 'pptxgenjs';
import { v4 as uuidv4 } from 'uuid';

// Get available AI models
export const getAvailableModels = () => {
  return [
    { id: "google/gemini-2.0-flash-exp:free", name: "Gemini Flash 2.0", description: "Fast response time with quality on par with larger models. Enhanced multimodal understanding and function calling." },
    { id: "qwen/qwen2.5-vl-32b-instruct:free", name: "Qwen 2.5 VL", description: "Proficient in recognizing common objects and analyzing texts, charts, and layouts within images." },
    { id: "qwen/qwq-32b:free", name: "QwQ 32B", description: "Advanced reasoning model with enhanced performance in downstream tasks, especially for hard problems." },
    { id: "deepseek/deepseek-v3-base:free", name: "DeepSeek V3 Base", description: "671B parameter MoE model with strong performance across language, reasoning, math, and coding tasks." },
    { id: "deepseek/deepseek-chat-v3-0324:free", name: "DeepSeek Chat V3", description: "685B-parameter mixture-of-experts model with excellent performance on various tasks." },
    { id: "deepseek/deepseek-r1:free", name: "DeepSeek R1", description: "671B parameters with open reasoning tokens. Performance comparable to OpenAI o1." },
    { id: "microsoft/mai-ds-r1:free", name: "MAI-DS-R1", description: "Post-trained variant of DeepSeek-R1 with improved responsiveness on previously blocked topics." },
    { id: "thudm/glm-4-32b:free", name: "GLM-4-32B", description: "32B bilingual model optimized for code generation, function calling, and agent-style tasks." },
    { id: "agentica-org/deepcoder-14b-preview:free", name: "DeepCoder 14B", description: "14B parameter code generation model fine-tuned from DeepSeek-R1-Distill-Qwen-14B." },
    { id: "google/gemma-3-27b-it:free", name: "Gemma 3", description: "Supports multimodal input with improved math, reasoning, and structured outputs." },
    { id: "nvidia/llama-3.1-nemotron-ultra-253b-v1:free", name: "Llama 3.1 Nemotron Ultra", description: "Optimized for advanced reasoning, human-interactive chat, and tool-calling tasks." }
  ];
};

// Default system prompts for different workflow types
const WORKFLOW_PROMPTS = {
  ppt: `You are a professional presentation creator. Your task is to generate a PowerPoint presentation based on the user's input.
Please create a structured outline for a presentation with:
1. A compelling title slide
2. An agenda/overview slide
3. Content slides with clear sections (at least 5-7 slides)
4. A conclusion slide

Format your output EXACTLY as a JSON object with the following structure:
{
  "title": "Presentation Title",
  "slides": [
    {
      "slide_type": "title_slide",
      "title": "Presentation Title",
      "content": "Subtitle or tagline"
    },
    {
      "slide_type": "bullet_slide",
      "title": "Agenda",
      "bullets": ["First topic", "Second topic", "Third topic"]
    },
    {
      "slide_type": "content_slide",
      "title": "Section Title",
      "content": "Main content for the slide",
      "bullets": ["Key point 1", "Key point 2", "Key point 3"]
    },
    {
      "slide_type": "conclusion_slide",
      "title": "Conclusion",
      "content": "Summary statement",
      "bullets": ["Key takeaway 1", "Key takeaway 2", "Call to action"]
    }
  ]
}

IMPORTANT: 
- Make sure the JSON structure is exactly as shown above
- Every slide must have at least a title
- Title slides should have a title and content (subtitle)
- Bullet slides must have a bullets array with at least 3 items
- Content slides should have title, content, and optionally bullets
- Conclusion slides should have title, content, and bullets with key takeaways

Make the presentation professional, visually appealing, and well-structured with 5-10 slides total. Include specific and actionable information.`,

  document: `You are a professional document writer. Your task is to create a well-structured document based on the user's input.
Please generate a document with:
1. A clear title and introduction
2. Well-organized sections with headings
3. Proper formatting for readability (bullet points, numbered lists, etc.)
4. A conclusion section

Format your output as a JSON object with the following structure:
{
  "title": "Document Title",
  "sections": [
    {
      "heading": "Section Heading",
      "content": "Section content with paragraphs separated by newlines",
      "subsections": [
        {
          "heading": "Subsection Heading",
          "content": "Subsection content",
          "bullets": ["Bullet point 1", "Bullet point 2", "Bullet point 3"]
        }
      ]
    }
  ]
}

Make the document comprehensive, well-structured, and professional. Include specific details, examples, and actionable information.`,

  api_request: `You are an API integration specialist. Your task is to help the user make API requests based on their needs.
Please analyze the user's input and generate the appropriate API request information.

Format your output as a JSON object with the following structure:
{
  "api_endpoint": "The full URL for the API request",
  "method": "GET|POST|PUT|DELETE",
  "headers": {
    "Content-Type": "application/json",
    "Authorization": "Bearer TOKEN_PLACEHOLDER"
  },
  "parameters": {
    "param1": "value1",
    "param2": "value2"
  },
  "body": {
    "key1": "value1",
    "key2": "value2"
  },
  "description": "A brief description of what this API request does"
}`,

  data_analysis: `You are a data analysis expert. Your task is to help the user analyze data based on their input.
Please provide a structured analysis with:
1. Summary of the data
2. Key insights
3. Recommended actions

Format your output as a JSON object with the following structure:
{
  "summary": "Brief overview of the data",
  "insights": [
    {
      "title": "Insight Title",
      "description": "Detailed explanation of the insight",
      "importance": "high|medium|low"
    }
  ],
  "recommendations": [
    {
      "title": "Recommendation Title",
      "description": "Detailed explanation of the recommendation",
      "priority": "high|medium|low"
    }
  ]
}`
};

// Get workflow by ID
export async function getWorkflow(workflowId) {
  const { data, error } = await supabase
    .from('workflows')
    .select('*')
    .eq('id', workflowId)
    .single();
    
  if (error) throw new Error(`Failed to fetch workflow: ${error.message}`);
  if (!data) throw new Error('Workflow not found');
  
  return data;
}

// 将文件上传到 Supabase Storage
async function uploadFileToStorage(fileBuffer, fileName, contentType, userId) {
  try {
    const filePath = `workflows/${userId}/${fileName}`;
    
    const { data, error } = await supabase.storage
      .from("workflow-files")
      .upload(filePath, fileBuffer, {
        contentType,
        upsert: true
      });
    
    if (error) throw error;
    
    // 获取文件的公共URL
    const { data: urlData } = supabase.storage
      .from("workflow-files")
      .getPublicUrl(filePath);
    
    return urlData.publicUrl;
  } catch (error) {
    console.error(`Error uploading file to storage: ${error.message}`);
    throw new Error(`Failed to upload file: ${error.message}`);
  }
}

// Generate PowerPoint presentation from JSON content
async function generatePPTX(content, userId) {
  try {
    console.log("Generating PPTX with content:", JSON.stringify(content, null, 2).substring(0, 500) + "...");
    
    // Create a new presentation
    const pres = new pptxgenjs();
    
    // Set presentation properties
    pres.layout = 'LAYOUT_16x9';
    
    // Check for ppt_generation specific structure or use content directly
    let pptContent = content;
    
    // If the content has a ppt_generation property, use that instead
    if (content.ppt_generation && typeof content.ppt_generation === 'object') {
      console.log("Using ppt_generation key from response");
      pptContent = content.ppt_generation;
    }
    
    // Set title from the content
    pres.title = pptContent.title || 'Presentation';
    console.log(`Setting presentation title: "${pres.title}"`);
    
    // If no slides are found, create a default slide
    if (!pptContent.slides || !Array.isArray(pptContent.slides) || pptContent.slides.length === 0) {
      console.log("No slides found in content, creating default slide");
      const defaultSlide = pres.addSlide();
      
      // Add title to default slide
      defaultSlide.addText(pptContent.title || "Presentation", {
        x: 0.5,
        y: 0.5,
        w: '90%',
        h: 1,
        fontSize: 24,
        bold: true,
        color: '363636'
      });
      
      // Add explanation text
      defaultSlide.addText("This is an automatically generated presentation.", {
        x: 0.5,
        y: 2,
        w: '90%',
        h: 1,
        fontSize: 16,
        color: '666666'
      });
      
      // Add any content as text if available
      if (typeof pptContent === 'object') {
        const contentKeys = Object.keys(pptContent).filter(key => key !== 'title' && key !== 'slides');
        if (contentKeys.length > 0) {
          let contentText = "Content summary:\n";
          contentKeys.forEach(key => {
            if (typeof pptContent[key] === 'string') {
              contentText += `• ${key}: ${pptContent[key].substring(0, 100)}...\n`;
            } else if (Array.isArray(pptContent[key])) {
              contentText += `• ${key}: ${pptContent[key].length} items\n`;
            }
          });
          
          defaultSlide.addText(contentText, {
            x: 0.5,
            y: 3,
            w: '90%',
            h: 3,
            fontSize: 14,
            color: '666666'
          });
        }
      }
    } else {
      // Process each slide
      console.log(`Processing ${pptContent.slides.length} slides`);
      pptContent.slides.forEach((slide, index) => {
        console.log(`Creating slide ${index + 1}: ${slide.title || 'Untitled'}`);
        
        // Add a new slide
        const currentSlide = pres.addSlide();
        
        // Set slide title
        if (slide.title) {
          currentSlide.addText(slide.title, { 
            x: 0.5, 
            y: 0.5, 
            w: '90%', 
            h: 1, 
            fontSize: 24,
            bold: true,
            color: '363636'
          });
        }
        
        // Process content based on slide type
        switch (slide.slide_type) {
          case 'title_slide':
            // Add subtitle if available
            if (slide.content) {
              currentSlide.addText(slide.content, { 
                x: 0.5, 
                y: 1.7, 
                w: '90%', 
                h: 1, 
                fontSize: 18,
                color: '666666'
              });
            }
            break;
            
          case 'bullet_slide':
            // Ensure bullets is an array
            let bullets = [];
            if (slide.bullets && Array.isArray(slide.bullets)) {
              bullets = slide.bullets;
            } else if (slide.bullets && typeof slide.bullets === 'string') {
              // Try to convert string to array if it looks like JSON
              try {
                const parsed = JSON.parse(slide.bullets);
                if (Array.isArray(parsed)) {
                  bullets = parsed;
                } else {
                  // Split by newlines or commas if not valid JSON array
                  bullets = slide.bullets.split(/[\n,]+/).map(b => b.trim()).filter(b => b);
                }
              } catch (e) {
                // Split by newlines or commas if not valid JSON
                bullets = slide.bullets.split(/[\n,]+/).map(b => b.trim()).filter(b => b);
              }
            }
            
            // Ensure we have at least one bullet point
            if (bullets.length === 0 && slide.content) {
              bullets = [slide.content];
            }
            
            // If we have bullets, add them to the slide
            if (bullets.length > 0) {
              const bulletText = bullets.map(bullet => `• ${bullet}`).join('\n');
              currentSlide.addText(bulletText, { 
                x: 0.5, 
                y: 1.5, 
                w: '90%', 
                h: 4, 
                fontSize: 16,
                color: '363636'
              });
            } else if (slide.content) {
              // If no bullets but content is available
              currentSlide.addText(slide.content, { 
                x: 0.5, 
                y: 1.5, 
                w: '90%', 
                h: 4, 
                fontSize: 16,
                color: '363636'
              });
            } else {
              // Add a default bullet if nothing else is available
              currentSlide.addText("• No content available", { 
                x: 0.5, 
                y: 1.5, 
                w: '90%', 
                h: 4, 
                fontSize: 16,
                color: '363636'
              });
            }
            break;
            
          case 'content_slide':
          case 'conclusion_slide':
          default:
            // Add regular content
            if (slide.content) {
              currentSlide.addText(slide.content, { 
                x: 0.5, 
                y: 1.5, 
                w: '90%', 
                h: 4, 
                fontSize: 16,
                color: '363636'
              });
            }
            
            // Add bullets if available - with same validation as bullet slides
            let contentBullets = [];
            if (slide.bullets && Array.isArray(slide.bullets)) {
              contentBullets = slide.bullets;
            } else if (slide.bullets && typeof slide.bullets === 'string') {
              // Try to convert string to array if it looks like JSON
              try {
                const parsed = JSON.parse(slide.bullets);
                if (Array.isArray(parsed)) {
                  contentBullets = parsed;
                } else {
                  // Split by newlines or commas if not valid JSON array
                  contentBullets = slide.bullets.split(/[\n,]+/).map(b => b.trim()).filter(b => b);
                }
              } catch (e) {
                // Split by newlines or commas if not valid JSON
                contentBullets = slide.bullets.split(/[\n,]+/).map(b => b.trim()).filter(b => b);
              }
            }
            
            // If we have bullets, add them to the slide
            if (contentBullets.length > 0) {
              const bulletText = contentBullets.map(bullet => `• ${bullet}`).join('\n');
              currentSlide.addText(bulletText, { 
                x: 0.5, 
                y: slide.content ? 3 : 1.5, 
                w: '90%', 
                h: 4, 
                fontSize: 16,
                color: '363636'
              });
            }
            break;
        }
        
        // Add speaker notes if available
        if (slide.notes) {
          currentSlide.addNotes(slide.notes);
        }
      });
    }
    
    // Generate unique filename
    const filename = `presentation_${uuidv4()}.pptx`;
    
    // 生成并获取PPT内容为buffer
    let pptxBuffer;
    console.log("Generating PPT buffer...");
    await new Promise((resolve, reject) => {
      pres.write('nodebuffer')
        .then(buffer => {
          console.log(`PPT buffer generated successfully, size: ${buffer.length} bytes`);
          pptxBuffer = buffer;
          resolve();
        })
        .catch(err => {
          console.error("Error generating PPT buffer:", err);
          reject(err);
        });
    });
    
    // 上传到Supabase Storage
    console.log("Uploading PPT to storage...");
    const fileUrl = await uploadFileToStorage(
      pptxBuffer, 
      filename, 
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      userId
    );
    console.log("PPT uploaded successfully, URL:", fileUrl);
    
    return fileUrl;
  } catch (error) {
    console.error('Error generating PPTX:', error);
    throw new Error(`Failed to generate PowerPoint: ${error.message}`);
  }
}

// Generate Word document from JSON content
async function generateDOCX(content, userId) {
  try {
    // Create a new docxtemplater instance with empty template
    const zip = new PizZip();
    
    // Create a simple Word document
    zip.file('word/document.xml', `
      <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:body>
          <w:p>
            <w:r>
              <w:t>${content.title || 'Document'}</w:t>
            </w:r>
          </w:p>
          ${content.sections ? content.sections.map(section => `
            <w:p>
              <w:r>
                <w:t>${section.heading}</w:t>
              </w:r>
            </w:p>
            <w:p>
              <w:r>
                <w:t>${section.content}</w:t>
              </w:r>
            </w:p>
          `).join('') : ''}
        </w:body>
      </w:document>
    `);
    
    // Generate output
    const buffer = zip.generate({ type: 'nodebuffer' });
    
    // Generate unique filename
    const filename = `document_${uuidv4()}.docx`;
    
    // 上传到Supabase Storage
    const fileUrl = await uploadFileToStorage(
      buffer, 
      filename, 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      userId
    );
    
    return fileUrl;
  } catch (error) {
    console.error('Error generating DOCX:', error);
    throw new Error(`Failed to generate Word document: ${error.message}`);
  }
}

// Helper function to normalize format names for backward compatibility
function normalizeFormatName(format) {
  const formatMap = {
    'ppt_generation': 'ppt',
    'document_generation': 'document',
    'api_request': 'api_request',
    'data_analysis': 'data_analysis'
  };
  
  return formatMap[format] || format;
}

// Execute a workflow
export async function executeWorkflow(workflowId, inputs, modelId, userId, options = {}) {
  // Fetch the workflow
  const workflow = await getWorkflow(workflowId);
  
  // Extract options
  const { outputFormats = [] } = options;
  
  // Select model (default to Gemini Flash 2.0 if not specified)
  const model = modelId || 'google/gemini-2.0-flash-exp:free';
  
  // Prepare the user prompt with inputs
  let userPrompt = workflow.prompt;
  
  // Replace input placeholders in the prompt
  if (inputs && typeof inputs === 'object') {
    Object.keys(inputs).forEach(key => {
      userPrompt = userPrompt.replace(`{{${key}}}`, inputs[key]);
    });
  }
  
  // Initialize results and document URLs
  const results = {};
  const documentUrls = {};
  
  try {
    // If no specific output formats are specified, use the workflow type
    if (outputFormats.length === 0) {
      // Normalize the workflow type to the new format name
      outputFormats.push(normalizeFormatName(workflow.type));
    } else {
      // Normalize all provided output formats
      for (let i = 0; i < outputFormats.length; i++) {
        outputFormats[i] = normalizeFormatName(outputFormats[i]);
      }
    }
    
    console.log(`Executing workflow with output formats: ${outputFormats.join(', ')}`);
    
    // Execute a separate AI request for each output format
    for (const format of outputFormats) {
      // Get the appropriate system prompt for this format
      const formatPrompt = WORKFLOW_PROMPTS[format];
      
      if (!formatPrompt) {
        console.warn(`No prompt template found for format: ${format}`);
        continue;
      }
      
      console.log(`Executing AI request for format: ${format}`);
      
      // Execute the AI request with the format-specific prompt
      const completion = await openai.chat.completions.create({
        model: model,
        messages: [
          { role: 'system', content: formatPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 2500,
        response_format: { type: "json_object" }
      });
      
      // Extract and parse the AI response
      const aiContent = completion.choices[0]?.message?.content || "";
      const { data: formatResult, error: parseError } = safeParseJSON(aiContent);
      
      if (parseError || !formatResult) {
        console.error(`AI response parsing failed for format ${format}:`, parseError, "Original content:", aiContent);
        results[format] = { error: `Failed to parse AI response: ${parseError || 'Invalid response format'}` };
        continue;
      }
      
      // Log the structure of the result for debugging
      console.log(`AI response structure for ${format}:`, JSON.stringify({
        hasTitle: !!formatResult.title,
        hasSlides: !!formatResult.slides,
        hasSections: !!formatResult.sections,
        resultKeys: Object.keys(formatResult)
      }));
      
      // Store the result for this format
      results[format] = formatResult;
      
      // Generate documents based on the format
      if (format === 'ppt') {
        try {
          documentUrls.pptxUrl = await generatePPTX(formatResult, userId);
        } catch (docError) {
          console.error(`Error generating PowerPoint for format ${format}:`, docError);
        }
      } else if (format === 'document') {
        try {
          documentUrls.docxUrl = await generateDOCX(formatResult, userId);
        } catch (docError) {
          console.error(`Error generating Word document for format ${format}:`, docError);
        }
      }
    }
    
    // Save the execution record with output formats
    await saveWorkflowExecution(
      workflowId, 
      userId, 
      model, 
      inputs, 
      results, 
      outputFormats,
      documentUrls
    );
    
    return {
      workflowId,
      results,
      model,
      outputFormats,
      ...documentUrls // Include document URLs in the response
    };
  } catch (error) {
    console.error("Error executing workflow:", error);
    throw new Error(`Workflow execution failed: ${error.message}`);
  }
}

// Save workflow execution record
async function saveWorkflowExecution(workflowId, userId, model, inputs, results, outputFormats, documentUrls = {}) {
  try {
    const { data, error } = await supabase
      .from('workflow_executions')
      .insert({
        workflow_id: workflowId,
        user_id: userId,
        model_id: model,
        inputs: inputs,
        result: results,
        status: 'completed',
        executed_at: new Date().toISOString(),
        output_formats: outputFormats,
        document_urls: documentUrls
      });
      
    if (error) throw new Error(`Failed to save workflow execution: ${error.message}`);
    
    return data;
  } catch (error) {
    console.error("Error saving workflow execution:", error);
    // We don't want to fail the overall execution if just the recording fails
    return null;
  }
}

// Create a new workflow
export async function createWorkflow(workflow, userId) {
  const { data, error } = await supabase
    .from('workflows')
    .insert({
      ...workflow,
      created_by: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single();
    
  if (error) throw new Error(`Failed to create workflow: ${error.message}`);
  
  return data;
}

// Update an existing workflow
export async function updateWorkflow(workflowId, updates, userId) {
  // First check if the user has permission to update this workflow
  const { data: existing, error: fetchError } = await supabase
    .from('workflows')
    .select('created_by')
    .eq('id', workflowId)
    .single();
    
  if (fetchError) throw new Error(`Failed to fetch workflow: ${fetchError.message}`);
  if (!existing) throw new Error('Workflow not found');
  
  // Verify ownership or admin status
  if (existing.created_by !== userId) {
    // Check if user is an admin (implementation depends on your auth structure)
    const isAdmin = false; // Replace with proper admin check
    if (!isAdmin) throw new Error('Permission denied: You do not have rights to update this workflow');
  }
  
  // Perform the update
  const { data, error } = await supabase
    .from('workflows')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', workflowId)
    .select()
    .single();
    
  if (error) throw new Error(`Failed to update workflow: ${error.message}`);
  
  return data;
}

// Get workflows for a user (created by them or shared with them)
export async function getUserWorkflows(userId) {
  const { data, error } = await supabase
    .from('workflows')
    .select('*')
    .or(`created_by.eq.${userId},is_public.eq.true`)
    .order('created_at', { ascending: false });
    
  if (error) throw new Error(`Failed to fetch workflows: ${error.message}`);
  
  return data || [];
}