import { openai } from '../../api/ai/task-manager-agent/config';
import { safeParseJSON, executeApiRequest } from './utils';
import { supabase } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import os from 'os';
import JSZip from 'jszip';
import PptxGenJS from 'pptxgenjs';
import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import { promises as fsPromises } from 'fs';

// Get available AI models
const getAvailableModels = () => {
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
Please create a structured outline for a visually appealing presentation with:
1. A compelling title slide
2. An agenda/overview slide
3. Content slides with clear sections (at least 5-7 slides)
4. A conclusion slide

The presentation will be automatically styled with professional designs similar to SlideGo templates, including:
- Color schemes with complementary accent colors
- Visual elements like shapes, lines, and decorative accents
- Consistent typography with appropriate font sizes for titles and content
- Modern slide layouts with visual hierarchy

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

Make the presentation professional, visually appealing, and well-structured with 5-10 slides total. 
Include specific and actionable information and consider how the content will look when visualized with professional design elements.

For best visual results:
- Keep titles concise (3-8 words)
- Keep bullet points short (1-2 lines each)
- Use strong, impactful wording for titles
- Include a balance of text and list content
- Structure content to have clear visual hierarchy
- Think about contrast between main points and supporting details`,

  document: `You are a professional document writer. Your task is to create a well-structured document based on the user's input.
Please generate a document with:
1. A clear title and introduction
2. Well-organized sections with headings
3. Proper formatting for readability (bullet points, numbered lists, etc.)
4. A conclusion section

Format your output EXACTLY as a JSON object with the following structure:
{
  "title": "Document Title",
  "sections": [
    {
      "heading": "Section Heading",
      "content": "Section content with paragraphs separated by newlines",
      "bullets": ["Bullet point 1", "Bullet point 2", "Bullet point 3"],
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

Important details for creating a well-structured document:
- Provide a descriptive title that clearly represents the document's content
- Each section should have a clear heading and descriptive content
- Use bullets to highlight key points, making them easier to read
- Include subsections for more complex topics
- Maintain a logical flow through the document with proper transitions
- Include a conclusion that summarizes the key points

The document will be styled professionally with:
- Heading hierarchy and proper formatting
- Bullet points rendered with proper indentation and bullet symbols
- Consistent spacing and alignment
- Blue headings with appropriate font sizes
- Footer with generation date

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
}`,

  task: `You are a task management assistant. Your task is to help the user create well-defined tasks based on their input.
Please analyze the user's input and create structured task information.

Format your output EXACTLY as a JSON object with the following structure:
{
  "tasks": [
    {
      "name": "Task Title",
      "description": "Detailed description of what needs to be done",
      "due_date": "YYYY-MM-DD", 
      "status": "HIGH|MEDIUM|LOW",
      "assignees": ["username or email"],
      "duration": 2,
      "tags": ["tag1", "tag2"]
    }
  ]
}

Important details for creating good tasks:
- Provide clear, specific task titles that describe what needs to be done
- Include detailed descriptions with enough context for someone to understand the task
- Set reasonable due dates based on the scope of work
- Assign appropriate priority levels
- Specify team members who should be assigned to the task if mentioned
- Estimate time required if possible
- Add relevant tags to categorize the task

Make the tasks actionable, well-defined, and ready for implementation. Each task should be clear enough that a team member could start working on it without needing additional clarification.`,

  // 添加通用JSON格式
  json: `You are a JSON data generator. Your task is to create well-structured JSON data based on the user's input.
Please analyze the user's input and generate a structured JSON response that best represents that information.

Format your output EXACTLY as a clean JSON object. The structure should be appropriate for the content but follow general best practices:
- Use descriptive keys
- Organize related data into nested objects or arrays
- Use consistent naming conventions
- Include appropriate data types for values

Example structure (adapt to your specific content):
{
  "title": "Main title based on input",
  "summary": "Brief summary of the content",
  "createdAt": "2023-06-15T10:30:00Z",
  "metadata": {
    "source": "Generated from user input",
    "version": "1.0"
  },
  "content": {
    "main": "Primary content based on user input",
    "sections": [
      {
        "heading": "First section heading",
        "text": "First section content",
        "items": ["Item 1", "Item 2", "Item 3"]
      },
      {
        "heading": "Second section heading",
        "text": "Second section content",
        "items": ["Item A", "Item B", "Item C"]
      }
    ]
  }
}

Make sure to generate high-quality, structured data that would be useful for further processing or display.`,

  // Add the 'chat' format to the WORKFLOW_PROMPTS object
  chat: `You are an intelligent assistant that helps users create chat messages.
  Your task is to analyze the user's input and generate concise, well-formatted chat message content.
  
  Please format your response as a JSON object with the following structure:
  {
    "content": "The main message content that will be sent to chat participants",
    "summary": "A brief summary of the message content (for reference only)",
    "suggested_replies": ["Suggested reply 1", "Suggested reply 2", "Suggested reply 3"]
  }
  
  Guidelines:
  1. Create clear, concise content that communicates the key points from the user's input
  2. The content should be conversational and appropriate for a chat message
  3. Include all relevant information from the user's input
  4. Format the content with appropriate line breaks for readability
  5. Provide a brief summary of the message 
  6. Include 2-3 suggested replies that recipients might use
  
  Respond ONLY with the JSON object, nothing else. Do not include explanations, markdown code blocks, or any other text.`,
  
  // Add the 'email' format to the WORKFLOW_PROMPTS object
  email: `You are an expert email writer. Your task is to create professional, well-formatted email content based on the user's input.

Please format your response as a JSON object with the following structure:
{
  "subject": "Clear and concise email subject line",
  "greeting": "Appropriate salutation (e.g., 'Dear Team,' or 'Hello,') depending on context",
  "content": "The main email body with paragraphs separated by newlines",
  "signature": "Professional sign-off (e.g., 'Best regards,' or 'Sincerely,')",
  "sender_name": "Name to appear in the signature"
}

Guidelines:
1. Create a clear, concise subject line that accurately reflects the email's purpose
2. The greeting should be appropriate for the intended audience
3. Write content that is professional, concise, and well-structured
4. Organize content into logical paragraphs with clear transitions
5. Include all relevant information from the user's input
6. Avoid using overly complex language or jargon
7. Choose an appropriate sign-off based on the email's tone and context
8. Provide a sender name that matches the context

Respond ONLY with the JSON object, nothing else. Do not include explanations, comments, or markdown formatting.`
};

// Get workflow by ID
async function getWorkflow(workflowId) {
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
  const maxRetries = 3;
  let lastError = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      console.log(`尝试上传文件到存储 (尝试 ${attempt + 1}/${maxRetries}): ${fileName}`);
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
      
      console.log(`文件上传成功: ${fileName}`);
      return urlData.publicUrl;
    } catch (error) {
      lastError = error;
      console.error(`文件上传尝试 ${attempt + 1} 失败: ${error.message}`);
      
      // 如果是连接超时或网络错误，等待后重试
      if (error.message && (error.message.includes('timeout') || 
                            error.message.includes('network') ||
                            error.message.includes('connection') ||
                            error.code === 'UND_ERR_CONNECT_TIMEOUT')) {
        const retryDelay = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
        console.log(`等待 ${retryDelay}ms 后重试...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        // 继续下一次重试
      } else {
        // 对于其他错误，立即抛出
        throw error;
      }
    }
  }
  
  // 如果经过所有重试后仍然失败
  if (lastError) {
    console.error(`上传文件失败，已达最大重试次数 (${maxRetries}): ${lastError.message}`);
    throw new Error(`Failed to upload file after ${maxRetries} attempts: ${lastError.message}`);
  }
}

// Generate PowerPoint presentation from JSON content
async function generatePPTX(content, userId) {
  try {
    console.log("Generating PPTX with content:", JSON.stringify(content, null, 2).substring(0, 500) + "...");
    
    // Check if content has an error
    if (content.error) {
      console.error("Cannot generate PPTX from error content:", content.error);
      return { error: content.error };
    }
    
    // Helper function to safely convert any value to string
    const safeToString = (value) => {
      if (value === null || value === undefined) return '';
      if (typeof value === 'string') return value;
      if (typeof value === 'object') return JSON.stringify(value);
      return String(value);
    };
    
    // Check the content structure
    let pptContent = content;
    if (content.ppt_generation && typeof content.ppt_generation === 'object') {
      console.log("Using ppt_generation key from response");
      pptContent = content.ppt_generation;
    }
    
    // Setup title and slides
    const title = safeToString(pptContent.title || 'Presentation');
    const slides = Array.isArray(pptContent.slides) ? pptContent.slides : [];
    
    // Create a new presentation
    const pres = new PptxGenJS();
    
    // Set presentation properties
    pres.layout = 'LAYOUT_16x9';
    pres.author = 'AI Workflow';
    pres.title = title;
    pres.company = 'Generated by AI';
    pres.revision = '1';
    
    // Add title slide
    const titleSlide = pres.addSlide();
    titleSlide.background = { color: 'FFFFFF' };
    titleSlide.addText(title, { 
      x: 1, 
      y: 1.5, 
      w: '80%', 
      h: 1.5, 
      fontSize: 44, 
      color: '0066CC', 
      bold: true, 
      align: 'center' 
    });
    
    titleSlide.addText('Generated Presentation', { 
      x: 1, 
      y: 3.5, 
      w: '80%', 
      h: 0.8, 
      fontSize: 28, 
      color: '666666', 
      align: 'center' 
    });
    
    // Add date at bottom
    titleSlide.addText(`Created: ${new Date().toLocaleDateString()}`, {
      x: 1,
      y: 5,
      w: '80%',
      h: 0.5,
      fontSize: 14,
      color: '999999',
      align: 'center'
    });
    
    // Add content slides
    if (slides && slides.length > 0) {
      slides.forEach((slide, idx) => {
        const slideTitle = safeToString(slide.title || `Slide ${idx + 1}`);
        const slideContent = safeToString(slide.content || '');
        const slideBullets = Array.isArray(slide.bullets) 
          ? slide.bullets.map(bullet => safeToString(bullet))
          : [];
        
        // Create a new slide
        const newSlide = pres.addSlide();
        newSlide.background = { color: 'FFFFFF' };
        
        // Add colored top bar
        newSlide.addShape('rect', {
          x: 0, y: 0, w: '100%', h: 0.5, fill: { color: '0066CC' }
        });
        
        // Add title
        newSlide.addText(slideTitle, { 
          x: 0.5, 
          y: 0.7, 
          w: '90%', 
          h: 0.8, 
          fontSize: 32, 
          color: '0066CC', 
          bold: true 
        });
        
        // Add content if available
        if (slideContent) {
          newSlide.addText(slideContent, { 
            x: 0.5, 
            y: 1.8, 
            w: '90%', 
            h: 1.5, 
            fontSize: 20, 
            color: '333333' 
          });
        }
        
        // Add bullets if available
        if (slideBullets.length > 0) {
          const bulletPoints = slideBullets.map(bullet => ({ text: bullet }));
          
          newSlide.addText(bulletPoints, { 
            x: 0.5, 
            y: slideContent ? 3.5 : 1.8, 
            w: '90%', 
            h: 3, 
            color: '333333', 
            bullet: { type: 'bullet' }, 
            fontSize: 18
          });
        }
        
        // Add slide number
        newSlide.addText(`${idx + 1}`, {
          x: '90%',
          y: '95%',
          w: 0.5,
          h: 0.3,
          fontSize: 12,
          color: '999999'
        });
      });
    } else {
      // Add a default slide if no slides available
      const defaultSlide = pres.addSlide();
      defaultSlide.background = { color: 'FFFFFF' };
      
      // Add colored top bar
      defaultSlide.addShape('rect', {
        x: 0, y: 0, w: '100%', h: 0.5, fill: { color: '0066CC' }
      });
      
      defaultSlide.addText('No Slides Available', { 
        x: 0.5, 
        y: 0.7, 
        w: '90%', 
        h: 0.8, 
        fontSize: 32, 
        color: '0066CC', 
        bold: true 
      });
      
      defaultSlide.addText('This presentation doesn\'t contain any slides.', { 
        x: 0.5, 
        y: 1.8, 
        w: '90%', 
        h: 1.5, 
        fontSize: 20, 
        color: '333333' 
      });
      
      // Add slide number
      defaultSlide.addText('1', {
        x: '90%',
        y: '95%',
        w: 0.5,
        h: 0.3,
        fontSize: 12,
        color: '999999'
      });
    }
    
    // Generate the PPTX file
    const pptxBuffer = await pres.write('nodebuffer');
    
    // Generate a unique filename
    const fileName = `presentation_${uuidv4()}.pptx`;
    
    // Upload to Supabase Storage
    const fileUrl = await uploadFileToStorage(
      pptxBuffer,
      fileName,
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      userId
    );
    
    console.log(`Presentation PPTX uploaded to: ${fileUrl}`);
    
    return fileUrl;
  } catch (error) {
    console.error(`Error generating PPTX: ${error.message}`);
    throw new Error(`Failed to generate presentation: ${error.message}`);
  }
}

// Generate Word document from JSON content
async function generateDOCX(content, userId) {
  try {
    console.log("Generating DOCX with content:", JSON.stringify(content, null, 2).substring(0, 500) + "...");
    
    // Check if content has an error
    if (content.error) {
      console.error("Cannot generate DOCX from error content:", content.error);
      return { error: content.error };
    }
    
    // Helper function to safely convert any value to string
    const safeToString = (value) => {
      if (value === null || value === undefined) return '';
      if (typeof value === 'string') return value;
      if (typeof value === 'object') return JSON.stringify(value);
      return String(value);
    };
    
    // Process title
    const title = safeToString(content.title || 'Document');
    
    // Create document structure
    let documentSections = [];
    
    if (!content.sections && typeof content === 'object') {
      console.log("Content is not in expected format, creating a structured document from raw data");
      
      if (Object.keys(content).length > 0) {
        documentSections = Object.keys(content).map(key => {
          const value = content[key];
          let sectionContent = "";
          let sectionBullets = [];
          
          if (typeof value === 'string') {
            sectionContent = value;
          } else if (Array.isArray(value)) {
            sectionBullets = value.map(item => safeToString(item));
          } else if (typeof value === 'object' && value !== null) {
            sectionContent = JSON.stringify(value, null, 2);
          } else {
            sectionContent = String(value);
          }
          
          return {
            heading: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' '),
            content: sectionContent,
            bullets: sectionBullets,
            subsections: []
          };
        });
      } else {
        documentSections = [{
          heading: "Generated Content",
          content: "No content available",
          bullets: [],
          subsections: []
        }];
      }
    } else if (content.sections && Array.isArray(content.sections)) {
      documentSections = content.sections.map(section => {
        return {
          heading: safeToString(section.heading || ""),
          content: safeToString(section.content || ""),
          bullets: Array.isArray(section.bullets) 
            ? section.bullets.map(bullet => safeToString(bullet)) 
            : [],
          subsections: Array.isArray(section.subsections) 
            ? section.subsections.map(subsection => ({
                heading: safeToString(subsection.heading || ""),
                content: safeToString(subsection.content || ""),
                bullets: Array.isArray(subsection.bullets) 
                  ? subsection.bullets.map(bullet => safeToString(bullet)) 
                  : []
              })) 
            : []
        };
      });
    }
    
    // Create a basic Word document template with proper structure
    const zip = new JSZip();

    // Add basic Word document structure files
    // [Content_Types].xml
    zip.file("[Content_Types].xml", 
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
      '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>' +
      '<Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>' +
      '<Override PartName="/word/webSettings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.webSettings+xml"/>' +
      '<Override PartName="/word/fontTable.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.fontTable+xml"/>' +
      '<Override PartName="/word/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>' +
      '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>' +
      '<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>' +
      '</Types>'
    );

    // _rels/.rels
    zip.file("_rels/.rels", 
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
      '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>' +
      '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>' +
      '</Relationships>'
    );

    // word/_rels/document.xml.rels
    zip.file("word/_rels/document.xml.rels", 
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
      '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/>' +
      '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/webSettings" Target="webSettings.xml"/>' +
      '<Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/fontTable" Target="fontTable.xml"/>' +
      '<Relationship Id="rId5" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="theme/theme1.xml"/>' +
      '</Relationships>'
    );

    // docProps/app.xml
    zip.file("docProps/app.xml", 
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties">' +
      '<Application>AI Workflow Generator</Application>' +
      '<AppVersion>1.0.0</AppVersion>' +
      '</Properties>'
    );

    // docProps/core.xml
    zip.file("docProps/core.xml", 
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" ' +
      'xmlns:dc="http://purl.org/dc/elements/1.1/" ' +
      'xmlns:dcterms="http://purl.org/dc/terms/" ' +
      'xmlns:dcmitype="http://purl.org/dc/dcmitype/" ' +
      'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">' +
      `<dc:title>${title}</dc:title>` +
      '<dc:creator>AI Workflow</dc:creator>' +
      `<dcterms:created xsi:type="dcterms:W3CDTF">${new Date().toISOString()}</dcterms:created>` +
      `<dcterms:modified xsi:type="dcterms:W3CDTF">${new Date().toISOString()}</dcterms:modified>` +
      '</cp:coreProperties>'
    );

    // Add required Word files
    // word/styles.xml
    zip.file("word/styles.xml", 
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
      '<w:docDefaults>' +
      '<w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:eastAsia="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/><w:sz w:val="24"/></w:rPr></w:rPrDefault>' +
      '</w:docDefaults>' +
      '<w:style w:type="paragraph" w:styleId="Normal"><w:name w:val="Normal"/><w:pPr/><w:rPr/></w:style>' +
      '<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="Heading 1"/><w:pPr><w:keepNext/><w:spacing w:before="240" w:after="120"/></w:pPr><w:rPr><w:color w:val="0066CC"/><w:sz w:val="36"/><w:b/></w:rPr></w:style>' +
      '<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="Heading 2"/><w:pPr><w:keepNext/><w:spacing w:before="240" w:after="120"/></w:pPr><w:rPr><w:color w:val="0066CC"/><w:sz w:val="32"/><w:b/></w:rPr></w:style>' +
      '<w:style w:type="paragraph" w:styleId="Heading3"><w:name w:val="Heading 3"/><w:pPr><w:keepNext/><w:spacing w:before="240" w:after="120"/></w:pPr><w:rPr><w:color w:val="0066CC"/><w:sz w:val="28"/><w:b/></w:rPr></w:style>' +
      '</w:styles>'
    );

    // word/settings.xml
    zip.file("word/settings.xml",
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
      '<w:zoom w:percent="100"/>' +
      '</w:settings>'
    );

    // word/webSettings.xml
    zip.file("word/webSettings.xml",
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<w:webSettings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
      '</w:webSettings>'
    );

    // word/fontTable.xml
    zip.file("word/fontTable.xml",
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<w:fonts xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
      '<w:font w:name="Calibri"><w:panose1 w:val="020F0502020204030204"/><w:charset w:val="00"/><w:family w:val="swiss"/><w:pitch w:val="variable"/><w:sig w:usb0="E0002AFF" w:usb1="C000247B" w:usb2="00000009" w:usb3="00000000" w:csb0="000001FF" w:csb1="00000000"/></w:font>' +
      '</w:fonts>'
    );

    // word/theme/theme1.xml
    zip.file("word/theme/theme1.xml",
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="Office Theme">' +
      '<a:themeElements><a:clrScheme name="Office"><a:dk1><a:sysClr val="windowText" lastClr="000000"/></a:dk1><a:lt1><a:sysClr val="window" lastClr="FFFFFF"/></a:lt1><a:dk2><a:srgbClr val="1F497D"/></a:dk2><a:lt2><a:srgbClr val="EEECE1"/></a:lt2><a:accent1><a:srgbClr val="4F81BD"/></a:accent1><a:accent2><a:srgbClr val="C0504D"/></a:accent2><a:accent3><a:srgbClr val="9BBB59"/></a:accent3><a:accent4><a:srgbClr val="8064A2"/></a:accent4><a:accent5><a:srgbClr val="4BACC6"/></a:accent5><a:accent6><a:srgbClr val="F79646"/></a:accent6><a:hlink><a:srgbClr val="0000FF"/></a:hlink><a:folHlink><a:srgbClr val="800080"/></a:folHlink></a:clrScheme><a:fontScheme name="Office"><a:majorFont><a:latin typeface="Calibri"/><a:ea typeface=""/><a:cs typeface=""/></a:majorFont><a:minorFont><a:latin typeface="Calibri"/><a:ea typeface=""/><a:cs typeface=""/></a:minorFont></a:fontScheme><a:fmtScheme name="Office"><a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:gradFill><a:gsLst><a:gs pos="0"><a:schemeClr val="phClr"/></a:gs><a:gs pos="50000"><a:schemeClr val="phClr"/></a:gs><a:gs pos="100000"><a:schemeClr val="phClr"/></a:gs></a:gsLst></a:gradFill></a:fillStyleLst><a:lnStyleLst><a:ln w="6350" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln></a:lnStyleLst><a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst><a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:bgFillStyleLst></a:fmtScheme></a:themeElements></a:theme>'
    );

    // Create document.xml with our content
    let documentXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
      '<w:body>';

    // Add title
    documentXml += 
      '<w:p>' +
      '<w:pPr><w:pStyle w:val="Heading1"/></w:pPr>' +
      '<w:r><w:t>' + title + '</w:t></w:r>' +
      '</w:p>';
    
    // Add date
    documentXml += 
      '<w:p>' +
      '<w:r><w:rPr><w:color w:val="666666"/><w:sz w:val="20"/></w:rPr><w:t>Date: ' + new Date().toLocaleDateString() + '</w:t></w:r>' +
      '</w:p>';
    
    // Add separator
    documentXml += '<w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="4" w:space="1" w:color="DDDDDD"/></w:pBdr></w:pPr><w:r><w:t></w:t></w:r></w:p>';
    
    // Add all sections
    documentSections.forEach(section => {
      // Add section heading
      documentXml +=
        '<w:p>' +
        '<w:pPr><w:pStyle w:val="Heading2"/></w:pPr>' +
        '<w:r><w:t>' + section.heading + '</w:t></w:r>' +
        '</w:p>';
      
      // Add section content
      if (section.content) {
        documentXml +=
          '<w:p>' +
          '<w:r><w:t>' + section.content + '</w:t></w:r>' +
          '</w:p>';
      }
      
      // Add section bullets
      if (section.bullets && section.bullets.length > 0) {
        section.bullets.forEach(bullet => {
          documentXml +=
            '<w:p>' +
            '<w:pPr>' +
            '<w:pStyle w:val="ListParagraph"/>' +
            '<w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr>' +
            '<w:ind w:left="720" w:hanging="360"/>' +
            '</w:pPr>' +
            '<w:r><w:t>' + bullet + '</w:t></w:r>' +
            '</w:p>';
        });
      }
      
      // Add subsections
      if (section.subsections && section.subsections.length > 0) {
        section.subsections.forEach(subsection => {
          // Add subsection heading
          documentXml +=
            '<w:p>' +
            '<w:pPr><w:pStyle w:val="Heading3"/></w:pPr>' +
            '<w:r><w:t>' + subsection.heading + '</w:t></w:r>' +
            '</w:p>';
          
          // Add subsection content
          if (subsection.content) {
            documentXml +=
              '<w:p>' +
              '<w:r><w:t>' + subsection.content + '</w:t></w:r>' +
              '</w:p>';
          }
          
          // Add subsection bullets
          if (subsection.bullets && subsection.bullets.length > 0) {
            subsection.bullets.forEach(bullet => {
              documentXml +=
                '<w:p>' +
                '<w:pPr>' +
                '<w:pStyle w:val="ListParagraph"/>' +
                '<w:numPr><w:ilvl w:val="1"/><w:numId w:val="1"/></w:numPr>' +
                '<w:ind w:left="1440" w:hanging="360"/>' +
                '</w:pPr>' +
                '<w:r><w:t>' + bullet + '</w:t></w:r>' +
                '</w:p>';
            });
          }
        });
      }
      
      // Add separator after each section
      documentXml += '<w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="4" w:space="1" w:color="DDDDDD"/></w:pBdr></w:pPr><w:r><w:t></w:t></w:r></w:p>';
    });
    
    // Add a section break at the end
    documentXml += '<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr>';
    
    // Close document
    documentXml += '</w:body></w:document>';
    
    // Add document to zip
    zip.file("word/document.xml", documentXml);
    
    // Generate the DOCX file
    const docxBuffer = await zip.generateAsync({ type: "nodebuffer" });
    
    // Generate a unique filename
    const fileName = `document_${uuidv4()}.docx`;
    
    // Upload to Supabase Storage
    const fileUrl = await uploadFileToStorage(
      docxBuffer,
      fileName,
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      userId
    );
    
    console.log('Document generated successfully:', fileUrl);
    
    // Return the URL directly instead of an object
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
    'data_analysis': 'data_analysis',
    'task_management': 'task'
  };
  
  return formatMap[format] || format;
}

// Create tasks from the AI response
async function createTasksFromResult(taskResult, userId, teamId, projectId) {
  try {
    console.log(`Creating tasks from result for user ${userId}, project ${projectId}, team ${teamId}`);
    
    // Import the createTask function from db-service.js
    const { createTask, addTaskToSection, createSection } = require('../../api/ai/task-manager-agent/db-service');
    
    // Ensure we have a valid task result
    if (!taskResult || !taskResult.tasks || !Array.isArray(taskResult.tasks)) {
      console.error("Invalid task result format:", taskResult);
      return { 
        success: false, 
        error: "Invalid task result format. Expected 'tasks' array.",
        tasksCreated: 0
      };
    }

    // Create a default section for the tasks if no teamId is provided
    // or if team exists but no section exists for it yet
    let sectionId = null;
    if (teamId) {
      try {
        // First check if the team already has a section
        const { supabase } = require('@/lib/supabase');
        const { data: existingSections, error: fetchError } = await supabase
          .from('section')
          .select('id')
          .eq('team_id', teamId)
          .limit(1);
        
        if (fetchError) {
          console.error("Error fetching sections:", fetchError);
        }
        
        if (existingSections && existingSections.length > 0) {
          // Use the existing section
          sectionId = existingSections[0].id;
          console.log(`Using existing section with ID: ${sectionId}`);
        } else {
          // Create a new section for the team
          const section = await createSection(teamId, userId);
          sectionId = section.id;
          console.log(`Created new section with ID: ${sectionId}`);
        }
      } catch (error) {
        console.error("Error working with sections:", error);
      }
    }
    
    // Process each task
    const createdTasks = [];
    const failedTasks = [];
    
    for (const taskInfo of taskResult.tasks) {
      try {
        // Create the task
        const task = await createTask(taskInfo, userId);
        console.log(`Created task with ID: ${task.id}`);
        
        // Add task to section if section exists
        if (sectionId) {
          await addTaskToSection(sectionId, task.id);
          console.log(`Added task ${task.id} to section ${sectionId}`);
        }
        
        createdTasks.push({
          id: task.id,
          title: taskInfo.title
        });
      } catch (error) {
        console.error(`Failed to create task "${taskInfo.title}":`, error);
        failedTasks.push({
          title: taskInfo.title,
          error: error.message
        });
      }
    }
    
    return {
      success: createdTasks.length > 0,
      tasksCreated: createdTasks.length,
      tasksFailed: failedTasks.length,
      tasks: createdTasks,
      failedTasks: failedTasks,
      sectionId: sectionId,
      teamId: teamId,
      projectId: projectId
    };
  } catch (error) {
    console.error("Error creating tasks:", error);
    return {
      success: false,
      error: error.message,
      tasksCreated: 0
    };
  }
}

// Execute a workflow
async function executeWorkflow(workflowId, inputs, modelId, userId, options = {}) {
  // 获取传入的选项
  const { 
    outputFormats = [], 
    outputSettings = {},
    nodeConnections = {},
    connectionMap = {},
    aiModels = [],
    teamId = null,
    projectId = null
  } = options;
  
  // 获取工作流
  const workflow = await getWorkflow(workflowId);
  
  // 准备模型列表
  // 如果aiModels列表有多个模型，我们将使用它们进行多模型处理
  // 否则使用单个modelId
  const models = aiModels.length > 1 ? aiModels : [modelId || 'google/gemini-2.0-flash-exp:free'];
  
  // 准备用户提示，替换输入占位符
  let userPrompt = workflow.prompt;
  
  // 替换提示中的输入占位符
  if (inputs && typeof inputs === 'object') {
    Object.keys(inputs).forEach(key => {
      userPrompt = userPrompt.replace(`{{${key}}}`, inputs[key]);
    });
  }
  
  // 初始化结果和文档URL
  const results = {};
  const documentUrls = {};
  const apiResponses = {};
  const modelResults = {}; // 存储每个模型的结果
  
  try {
    // 如果未指定特定输出格式，则使用工作流类型
    if (outputFormats.length === 0) {
      // 规范化工作流类型为新的格式名称
      outputFormats.push(normalizeFormatName(workflow.type));
    } else {
      // 规范化所有提供的输出格式
      for (let i = 0; i < outputFormats.length; i++) {
        outputFormats[i] = normalizeFormatName(outputFormats[i]);
      }
    }
    
    console.log(`执行工作流，输出格式: ${outputFormats.join(', ')}`);
    console.log('节点连接:', JSON.stringify(nodeConnections));
    console.log('连接图:', JSON.stringify(connectionMap));
    console.log('使用模型:', models.join(', '));
    
    // STEP 1: 首先处理API节点，它们的结果将用于后续AI处理
    let apiExecutionResults = {};
    if (Object.keys(connectionMap).length > 0) {
      console.log('1. 第一步: 执行API请求');
      
      // 查找输出类型为API的节点
      const apiNodes = [];
      for (const nodeId in outputSettings) {
        if (outputSettings[nodeId] && outputSettings[nodeId].type === 'api') {
          apiNodes.push(nodeId);
        }
      }
      
      // 检查是否有API节点连接到AI模型节点
      for (const nodeId of apiNodes) {
        const apiSettings = outputSettings[nodeId];
        console.log(`处理API节点 ${nodeId}`);
        
        // 查找哪些节点使用了这个API节点的输出
        const connectedToModelNodes = [];
        
        // 在connectionMap中查找连接到此API节点的节点
        for (const sourceId in connectionMap) {
          // 如果这个节点的输出连接到了API节点
          if (connectionMap[sourceId] && connectionMap[sourceId].includes(nodeId)) {
            // 使用outputSettings来确定节点类型
            if (outputSettings[sourceId]) {
              // 推测节点类型 - processNode通常没有特定类型，不在outputSettings中
              connectedToModelNodes.push(sourceId);
              console.log(`找到连接到API节点 ${nodeId} 的节点: ${sourceId}`);
            }
          }
        }
        
        // 如果有节点连接到此API节点
        if (connectedToModelNodes.length > 0) {
          console.log(`API节点 ${nodeId} 连接到了 ${connectedToModelNodes.length} 个节点`);
          
          try {
            // 执行API请求
            console.log(`执行API请求: ${apiSettings.url}, 方法: ${apiSettings.method}`);
            
            // 使用输入作为API请求体
            const apiResponse = await executeApiRequest(
              apiSettings.url,
              apiSettings.method,
              inputs
            );
            
            // 存储API响应
            apiResponses[nodeId] = apiResponse;
            apiExecutionResults[nodeId] = apiResponse.data;
            
            console.log(`API请求成功，状态码: ${apiResponse.status}`);
          } catch (apiError) {
            console.error(`执行API请求时出错:`, apiError);
            apiResponses[nodeId] = {
              success: false, 
              error: apiError.message || 'API请求失败'
            };
          }
        }
      }
    }
    
    // STEP 2: 执行AI处理，使用API响应作为输入
    console.log('2. 第二步: 执行AI处理');
    for (const model of models) {
      console.log(`使用模型 ${model} 处理...`);
      modelResults[model] = {};
      
      // 收集所有输出节点类型，以便特殊处理Task和Chat节点
      const formatToNodeMap = {};
      for (const [nodeId, settings] of Object.entries(outputSettings)) {
        if (settings.type) {
          if (!formatToNodeMap[settings.type]) {
            formatToNodeMap[settings.type] = [];
          }
          formatToNodeMap[settings.type].push(nodeId);
        }
      }
      
      // 收集API数据
      const apiDataByNodeType = {
        task: {},
        chat: {}
      };
      
      // 为Task和Chat节点收集API数据
      for (const nodeType of ['task', 'chat']) {
        const nodeIds = formatToNodeMap[nodeType] || [];
        for (const nodeId of nodeIds) {
          // 查找连接到这个节点的API节点
          const connectedApiNodes = [];
          
          // 从connectionMap反向查找 - 找到哪些节点有连接到当前节点
          for (const sourceId in connectionMap) {
            // 如果源节点连接到当前节点，并且源节点是API类型
            if (connectionMap[sourceId] && connectionMap[sourceId].includes(nodeId) && 
                outputSettings[sourceId] && outputSettings[sourceId].type === 'api' && 
                apiResponses[sourceId]) {
              connectedApiNodes.push(sourceId);
              console.log(`找到连接到${nodeType}节点 ${nodeId} 的API节点: ${sourceId}`);
            }
          }
          
          // 收集连接的API节点数据
          for (const apiNodeId of connectedApiNodes) {
            if (apiResponses[apiNodeId]?.data) {
              apiDataByNodeType[nodeType][apiNodeId] = apiResponses[apiNodeId].data;
              console.log(`将API节点 ${apiNodeId} 的数据添加到 ${nodeType} 节点 ${nodeId} 的上下文`);
            }
          }
        }
      }
      
      // 为每个输出格式执行单独的AI请求
      for (const format of outputFormats) {
        // 如果是API格式，不需要执行AI
        if (format === 'api') continue;
          
        // 获取此格式的合适系统提示
        const formatPrompt = WORKFLOW_PROMPTS[format];
        
        if (!formatPrompt) {
          console.warn(`未找到格式的提示模板: ${format}`);
          
          // 对于其他未知格式，使用JSON格式的提示
          if (format !== 'api') {
            console.log(`使用通用JSON格式的提示代替: ${format}`);
            const jsonPrompt = WORKFLOW_PROMPTS['json'];
            
            if (jsonPrompt) {
              // 特殊处理task和chat格式，添加API数据
              let apiDataForFormat = {};
              if (format === 'task' && Object.keys(apiDataByNodeType.task).length > 0) {
                apiDataForFormat = apiDataByNodeType.task;
              } else if (format === 'chat' && Object.keys(apiDataByNodeType.chat).length > 0) {
                apiDataForFormat = apiDataByNodeType.chat;
              }
              
              // 执行AI请求使用JSON格式提示
              const formatResult = await processAIRequest(model, jsonPrompt, userPrompt, format, results, apiDataForFormat);
              modelResults[model][format] = formatResult;
            }
          }
          continue;
        }
        
        console.log(`为格式执行AI请求: ${format} 使用模型: ${model}`);
        
        // 特殊处理task和chat格式，添加API数据
        let apiDataForFormat = {};
        if (format === 'task' && Object.keys(apiDataByNodeType.task).length > 0) {
          apiDataForFormat = apiDataByNodeType.task;
          console.log(`为任务生成添加API数据上下文`);
        } else if (format === 'chat' && Object.keys(apiDataByNodeType.chat).length > 0) {
          apiDataForFormat = apiDataByNodeType.chat;
          console.log(`为聊天消息生成添加API数据上下文`);
        }
        
        // 扩展处理AI请求函数，传入API数据
        const formatResult = await processAIRequest(model, formatPrompt, userPrompt, format, results, apiDataForFormat);
        modelResults[model][format] = formatResult;
      }
    }
    
    // 合并多个模型的结果
    // 如果有多个模型处理相同格式，优先使用第二个模型的结果（假设第二个是更高质量的模型）
    for (const format of outputFormats) {
      for (const model of models) {
        if (modelResults[model] && modelResults[model][format]) {
          results[format] = modelResults[model][format];
        }
      }
    }
    
    // STEP 3: 处理输出节点
    console.log('3. 第三步: 处理输出节点');
    
    // 处理PPT生成
    if (outputFormats.includes('ppt')) {
      console.log('生成PPT文档...');
      try {
        // 使用AI生成的PPT内容，不直接使用API响应
        const pptContent = results['ppt'] || { error: "No valid presentation content generated" };
        const pptUrl = await generatePPTX(pptContent, userId);
        documentUrls['ppt'] = pptUrl;
        console.log('PPT生成成功:', pptUrl);
      } catch (error) {
        console.error('生成PPT时出错:', error);
        documentUrls['ppt_error'] = error.message;
      }
    }
    
    // 处理文档生成
    if (outputFormats.includes('document')) {
      console.log('生成Word文档...');
      try {
        // 使用AI生成的文档内容，不直接使用API响应
        let docContent = results['document'] || { error: "No valid document content generated" };
        
        const docUrl = await generateDOCX(docContent, userId);
        // Store the URL directly for consistency
        documentUrls['document'] = docUrl;
        
        // Add doc alias for backwards compatibility
        documentUrls['docxUrl'] = docUrl;
        
        // 添加文档信息到结果中
        documentUrls['documentInfo'] = {
          type: 'Professional Document',
          features: [
            'Clean document formatting with consistent styling',
            'Hierarchical heading structure with navigation-friendly layout',
            'Professional typography with blue headings and proper spacing',
            'Properly formatted bullet points for better readability',
            'Custom sections and subsections with structured content'
          ]
        };
        
        console.log('文档生成成功:', docUrl);
      } catch (error) {
        console.error('生成文档时出错:', error);
        documentUrls['document_error'] = error.message;
      }
    }
    
    // 创建一个映射，跟踪哪些文档节点连接到哪些电子邮件和聊天节点
    const docToNodeConnections = {};
    
    // 通过connectionMap分析节点连接关系
    for (const sourceId in connectionMap) {
      const targetNodes = connectionMap[sourceId] || [];
      
      // 检查源节点是否为PPT或文档节点
      const sourceSettings = outputSettings[sourceId] || {};
      
      console.log(`分析节点连接: 源节点 ${sourceId} (类型: ${sourceSettings.type || 'unknown'}) -> 目标节点: [${targetNodes.join(', ')}]`);
      
      // 更智能的节点类型检测：
      // 1. 通过outputSettings中的明确类型
      // 2. 通过节点ID中的关键词猜测
      // 3. 如果节点ID是node_1等标准名称，且在输出格式中有document或ppt，则认为是对应类型
      let isDocumentNode = false;
      
      if (sourceSettings.type === 'ppt' || sourceSettings.type === 'document') {
        // 通过明确设置的类型识别
        isDocumentNode = true;
      } else if (sourceId.includes('doc') || sourceId.includes('document') || sourceId.includes('ppt') || sourceId.includes('presentation')) {
        // 通过ID中的关键词猜测
        isDocumentNode = true;
        console.log(`根据ID猜测 ${sourceId} 为文档节点`);
      } else if (/node_\d+/.test(sourceId)) {
        // 如果是node_1这样的标准节点名，检查是否处理了document或ppt格式
        if (outputFormats.includes('document') || outputFormats.includes('ppt')) {
          console.log(`将 ${sourceId} 视为潜在的文档节点，因为工作流包含文档/PPT输出格式`);
          
          // 如果有node_1指向node_2，且我们处理了文档格式，则假设node_1是文档节点
          const firstNodePattern = /node_1/i;
          if (firstNodePattern.test(sourceId)) {
            isDocumentNode = true;
            console.log(`将节点 ${sourceId} 标记为文档节点，因为它是流程中的第一个节点且工作流生成了文档`);
          }
        }
      }
      
      if (isDocumentNode) {
        // 用检测到的类型更新源节点的类型，如果之前没有设置
        if (!sourceSettings.type) {
          // 判断更可能是哪种文档类型
          const detectedType = outputFormats.includes('ppt') ? 'ppt' : 'document';
          console.log(`将节点 ${sourceId} 的类型设置为 ${detectedType}`);
          
          // 更新outputSettings以便后续处理使用
          if (!outputSettings[sourceId]) {
            outputSettings[sourceId] = {};
          }
          outputSettings[sourceId].type = detectedType;
        }
        
        // 收集可能的目标节点 - 过滤出邮件和聊天节点
        const potentialTargets = targetNodes.filter(targetId => {
          const targetSettings = outputSettings[targetId] || {};
          
          // 检查明确的类型设置
          if (targetSettings.type === 'email' || targetSettings.type === 'chat') {
            return true;
          }
          
          // 通过ID中的关键词猜测
          if (targetId.includes('email') || targetId.includes('mail') || 
              targetId.includes('chat') || targetId.includes('message')) {
            
            // 更新目标节点的类型，如果之前没有设置
            if (!targetSettings.type) {
              const guessedType = targetId.includes('email') || targetId.includes('mail') ? 'email' : 'chat';
              console.log(`根据ID猜测 ${targetId} 为 ${guessedType} 节点`);
              
              if (!outputSettings[targetId]) {
                outputSettings[targetId] = {};
              }
              outputSettings[targetId].type = guessedType;
            }
            return true;
          }
          
          // 如果node_1指向node_2，且node_2没有确定类型，但我们有email或chat格式
          if (/node_\d+/.test(targetId)) {
            if (outputFormats.includes('email') || outputFormats.includes('chat')) {
              console.log(`将 ${targetId} 视为潜在的邮件/聊天节点`);
              
              // 根据位置和输出格式猜测类型
              if (!targetSettings.type) {
                const guessedType = outputFormats.includes('email') ? 'email' : 'chat';
                
                if (!outputSettings[targetId]) {
                  outputSettings[targetId] = {};
                }
                outputSettings[targetId].type = guessedType;
                console.log(`将节点 ${targetId} 的类型设置为 ${guessedType}`);
              }
              return true;
            }
          }
          
          return false;
        });
        
        // 保存连接关系
        if (potentialTargets.length > 0) {
          docToNodeConnections[sourceId] = potentialTargets;
          console.log(`文档节点 ${sourceId} 连接到以下节点: [${potentialTargets.join(', ')}]`);
        }
      }
    }
    
    // 输出在文档生成之后所检测到的所有连接关系
    console.log('检测到的文档节点连接关系:', JSON.stringify(docToNodeConnections));
    console.log('节点类型设置:', JSON.stringify(Object.entries(outputSettings).map(([id, settings]) => ({
      id,
      type: settings.type
    }))));
    
    // 处理任务创建
    if (outputFormats.includes('task')) {
      console.log('处理任务创建...');
      try {
        // 获取任务数据来源
        const taskContent = results['task'];
        
        // 获取task节点的设置和API连接情况
        const taskNodes = Object.entries(outputSettings).filter(([_, settings]) => 
          settings.type === 'task'
        );
        
        if (taskNodes.length > 0) {
          const [nodeId, nodeSettings] = taskNodes[0];
          console.log(`Using task settings from node ${nodeId}`);
          
          // 设置任务的团队和项目ID
          let taskTeamId = teamId;
          let taskProjectId = projectId;
          
          // 设置特定节点的团队和项目ID
          if (nodeSettings.teamId) {
            taskTeamId = nodeSettings.teamId;
          }
          
          if (nodeSettings.projectId) {
            taskProjectId = nodeSettings.projectId;
          }
          
          // 检查是否有任务内容
          if (taskContent) {
            // 创建任务
            const taskResult = await createTasksFromResult(taskContent, userId, taskTeamId, taskProjectId);
            results['task_result'] = taskResult;
            
            if (taskResult.success) {
              console.log(`Successfully created ${taskResult.tasksCreated} tasks`);
            } else {
              console.error(`Failed to create tasks: ${taskResult.error}`);
            }
          } else {
            console.error('No task content available in AI response');
            results['task_result'] = { 
              success: false, 
              error: 'No task content generated by AI' 
            };
          }
        }
      } catch (error) {
        console.error('处理任务创建时出错:', error);
        results['task_error'] = error.message;
      }
    }
    
    // 处理聊天消息发送
    if (outputFormats.includes('chat')) {
      console.log('处理聊天消息发送...');
      try {
        // Find chat nodes in the output settings
        const chatNodes = Object.entries(outputSettings).filter(([_, settings]) => 
          settings.type === 'chat'
        );
        
        if (chatNodes.length > 0) {
          // Process each chat node
          for (const [nodeId, nodeSettings] of chatNodes) {
            console.log(`Processing chat node ${nodeId}`);
            
            // Get chat session IDs, message template and format
            const chatSessionIds = nodeSettings.chatSessionIds || [];
            const messageTemplate = nodeSettings.messageTemplate || 'Hello, this is an automated message from the workflow system:\n\n{{content}}';
            const messageFormat = nodeSettings.messageFormat || 'text';
            
            if (chatSessionIds.length > 0) {
              // 使用AI生成的聊天内容
              let contentToSend = results['chat'] || results['json'] || results['text'] || { content: 'No content was generated.' };
              
              // 转换内容为字符串
              let contentStr = '';
              if (typeof contentToSend === 'object') {
                // Try to use a 'content' field if it exists
                if (contentToSend.content) {
                  contentStr = contentToSend.content;
                } else {
                  // Otherwise stringify the whole object
                  contentStr = JSON.stringify(contentToSend, null, 2);
                }
              } else {
                contentStr = String(contentToSend);
              }
              
              // 检查是否有连接到此聊天节点的文档节点
              const connectedDocuments = [];
              
              // 查找连接到此聊天节点的所有文档节点
              for (const docNodeId in docToNodeConnections) {
                if (docToNodeConnections[docNodeId].includes(nodeId)) {
                  const docNodeType = outputSettings[docNodeId].type;
                  let docUrl = '';
                  
                  // 获取文档URL
                  if (docNodeType === 'ppt' && documentUrls['ppt']) {
                    docUrl = documentUrls['ppt'];
                    connectedDocuments.push({ type: 'presentation', url: docUrl });
                  } else if (docNodeType === 'document' && documentUrls['document']) {
                    docUrl = documentUrls['document'];
                    connectedDocuments.push({ type: 'document', url: docUrl });
                  }
                }
              }
              
              // 将文档URL添加到消息内容中
              if (connectedDocuments.length > 0) {
                let docLinksStr = '\n\nAttachment:\n';
                connectedDocuments.forEach((doc, index) => {
                  docLinksStr += `${index + 1}. ${doc.type === 'presentation' ? 'PowerPoint' : 'Word'}: ${doc.url}\n`;
                });
                contentStr += docLinksStr;
                console.log(`已将 ${connectedDocuments.length} 个文档链接添加到聊天消息中`);
              }
              
              // 替换模板中的内容占位符
              const finalMessage = messageTemplate.replace('{{content}}', contentStr);
              
              // 发送消息到选择的聊天会话
              console.log(`Sending messages to ${chatSessionIds.length} chat sessions with format ${messageFormat}`);
              const chatResult = await sendChatSessionMessages(chatSessionIds, finalMessage, messageFormat, userId);
              
              // 存储结果
              results[`chat_result_${nodeId}`] = chatResult;
            } else {
              console.warn(`No chat sessions selected for node ${nodeId}`);
              results[`chat_result_${nodeId}`] = { 
                success: false, 
                error: 'No chat sessions selected' 
              };
            }
          }
        } else {
          console.warn('Chat output format specified but no chat nodes found in settings');
        }
      } catch (error) {
        console.error('发送聊天消息时出错:', error);
        results['chat_error'] = error.message;
      }
    }
    
    // 处理邮件发送
    if (outputFormats.includes('email')) {
      console.log('处理邮件发送...');
      try {
        // Find email nodes in the output settings
        const emailNodes = Object.entries(outputSettings).filter(([_, settings]) => 
          settings.type === 'email'
        );
        
        if (emailNodes.length > 0) {
          // Process each email node
          for (const [nodeId, nodeSettings] of emailNodes) {
            console.log(`Processing email node ${nodeId}`);
            
            // Check if recipients are specified
            if (nodeSettings.recipients) {
              // 使用AI生成的内容
              let content = results['email'] || results['json'] || results['text'] || results['document'] || results['chat'] || { content: 'No content was generated.' };
              
              // 检查是否有连接到此邮件节点的文档节点
              const connectedDocuments = [];
              
              // 查找连接到此邮件节点的所有文档节点
              for (const docNodeId in docToNodeConnections) {
                if (docToNodeConnections[docNodeId].includes(nodeId)) {
                  const docNodeType = outputSettings[docNodeId].type;
                  let docUrl = '';
                  
                  // 获取文档URL
                  if (docNodeType === 'ppt' && documentUrls['ppt']) {
                    docUrl = documentUrls['ppt'];
                    connectedDocuments.push({ type: 'presentation', url: docUrl });
                  } else if (docNodeType === 'document' && documentUrls['document']) {
                    docUrl = documentUrls['document'];
                    connectedDocuments.push({ type: 'document', url: docUrl });
                  }
                }
              }
              
              // 如果连接了文档，将文档URL添加到内容中
              if (connectedDocuments.length > 0 && typeof content === 'object') {
                if (!content.attachedFiles) {
                  content.attachedFiles = [];
                }
                
                connectedDocuments.forEach(doc => {
                  content.attachedFiles.push({
                    type: doc.type,
                    url: doc.url
                  });
                });
                
                console.log(`已将 ${connectedDocuments.length} 个文档添加到邮件内容中`);
              }
              
              // 发送邮件
              console.log(`Sending email to recipients: ${nodeSettings.recipients}`);
              const emailResult = await sendEmail(nodeSettings, content, userId);
              
              // 存储结果
              results['email_result'] = emailResult;
              
              if (emailResult.success) {
                console.log(`Email sent successfully to ${emailResult.sentCount} recipients`);
              } else {
                console.error(`Failed to send email: ${emailResult.error}`);
              }
            } else {
              console.warn(`No recipients specified for email node ${nodeId}`);
              results['email_result'] = { 
                success: false, 
                error: 'No recipients specified' 
              };
            }
          }
        } else {
          console.warn('Email output format specified but no email nodes found in settings');
        }
      } catch (error) {
        console.error('发送邮件时出错:', error);
        results['email_error'] = error.message;
      }
    }
    
    // 处理节点间的通用连接关系 (除了上面特殊处理过的)
    if (Object.keys(connectionMap).length > 0) {
      console.log('处理其他节点间的连接关系');
      
      // 检查是否有API节点需要处理
      for (const nodeId in nodeConnections) {
        // 获取节点的输出类型和设置
        const apiSettings = outputSettings[nodeId];
        
        // 跳过已经在上面处理过的API节点
        if (apiSettings && apiSettings.type === 'api' && !apiResponses[nodeId]) {
          console.log(`处理其他API节点 ${nodeId}`);
          
          // 获取连接到此API节点的源节点
          const sourceNodes = nodeConnections[nodeId]?.sourceNodes || [];
          
          if (sourceNodes.length > 0) {
            console.log(`API节点 ${nodeId} 有 ${sourceNodes.length} 个源节点`);
            
            // 遍历所有源节点
            for (const sourceId of sourceNodes) {
              // 获取源节点的输出设置
              const sourceSettings = outputSettings[sourceId];
              
              // 如果源节点是JSON输出，使用它作为API请求体
              if (sourceSettings && sourceSettings.type === 'json') {
                console.log(`使用JSON节点 ${sourceId} 作为API请求体`);
                
                // 修复获取JSON结果的方式 - 检查各种可能的结果格式
                let jsonResult = null;
                
                // 检查流程节点生成的结果，通常保存在格式名称对应的键下
                for (const format in results) {
                  if (results[format]) {
                    jsonResult = results[format];
                    console.log(`找到结果格式: ${format}, 使用此结果作为API请求数据`);
                    break;
                  }
                }
                
                if (!jsonResult) {
                  console.error(`未找到可用于API请求的JSON结果，来自节点 ${sourceId}`);
                  apiResponses[nodeId] = {
                    success: false,
                    error: '没有可用于API请求的JSON数据'
                  };
                  continue;
                }
                
                // 执行API请求
                console.log(`使用节点 ${nodeId} 的API设置执行请求`);
                console.log(`请求URL: ${apiSettings.url}, 方法: ${apiSettings.method}`);
                console.log(`请求数据:`, JSON.stringify(jsonResult).substring(0, 200) + '...');
                
                try {
                  // 使用API设置和JSON结果执行请求
                  const apiResponse = await executeApiRequest(
                    apiSettings.url,
                    apiSettings.method,
                    jsonResult
                  );
                  
                  // 存储API响应
                  apiResponses[nodeId] = apiResponse;
                  console.log(`API请求成功，状态码: ${apiResponse.status}`);
                } catch (apiError) {
                  console.error(`执行API请求时出错:`, apiError);
                  apiResponses[nodeId] = {
                    success: false, 
                    error: apiError.message || 'API请求失败'
                  };
                }
              }
            }
          }
        }
      }
    }
    
    // 保存执行记录
    await saveWorkflowExecution(
      workflowId, 
      userId, 
      models.join(', '), // 使用所有模型ID
      inputs, 
      results, 
      outputFormats,
      documentUrls,
      apiResponses
    );
    
    // 将API响应添加到结果中，使其在UI中可见
    if (Object.keys(apiResponses).length > 0) {
      results.api_results = {};
      
      // 处理每个API响应，提取关键信息
      for (const [nodeId, response] of Object.entries(apiResponses)) {
        results.api_results[nodeId] = {
          success: response.success,
          status: response.status,
          data: response.data,
          error: response.error
        };
      }
      
      console.log('添加API响应到结果中:', Object.keys(results.api_results).length);
    }
    
    return {
      workflowId,
      results,
      models, // 返回使用的所有模型
      outputFormats,
      apiResponses,
      // 将documentUrls中的属性分解到结果对象中，使其更容易在前端访问
      ...documentUrls 
    };
  } catch (error) {
    console.error("执行工作流时出错:", error);
    throw new Error(`工作流执行失败: ${error.message}`);
  }
}

// Save workflow execution record
async function saveWorkflowExecution(workflowId, userId, model, inputs, results, outputFormats, documentUrls = {}, apiResponses = {}) {
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
        document_urls: documentUrls,
        api_responses: apiResponses
      });
      
    if (error) throw new Error(`保存工作流执行失败: ${error.message}`);
    
    return data;
  } catch (error) {
    console.error("保存工作流执行时出错:", error);
    // 我们不希望因为记录失败而导致整个执行失败
    return null;
  }
}

// Create a new workflow
async function createWorkflow(workflow, userId) {
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
async function updateWorkflow(workflowId, updates, userId) {
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
async function getUserWorkflows(userId) {
  const { data, error } = await supabase
    .from('workflows')
    .select('*')
    .or(`created_by.eq.${userId},is_public.eq.true`)
    .order('created_at', { ascending: false });
    
  if (error) throw new Error(`Failed to fetch workflows: ${error.message}`);
  
  return data || [];
}

// 将AI请求处理逻辑提取为单独的函数
async function processAIRequest(model, formatPrompt, userPrompt, format, results, apiData = {}) {
  try {
    // 特殊处理deepseek模型，添加明确的JSON格式要求
    let updatedPrompt = formatPrompt;
    if (model.includes('deepseek')) {
      updatedPrompt = formatPrompt + "\n\nVERY IMPORTANT: Your response MUST be valid JSON only. Do not include any explanation or commentary. Start your response with '{' and end with '}'. Do not include any text before or after the JSON object.";
    }
    
    // 如果有API数据，将其添加到用户提示中
    let enhancedUserPrompt = userPrompt;
    if (Object.keys(apiData).length > 0) {
      // 准备API数据字符串
      const apiDataStr = JSON.stringify(apiData, null, 2);
      enhancedUserPrompt = `
Here is data from an API response that you should use for this task:
\`\`\`json
${apiDataStr}
\`\`\`

Based on the above API data, please ${userPrompt}`;
      
      console.log('使用API数据增强提示');
    }
    
    // 创建基本请求配置
    const requestConfig = {
      model: model,
      messages: [
        { role: 'system', content: updatedPrompt },
        { role: 'user', content: enhancedUserPrompt }
      ],
      temperature: 0.3,
      max_tokens: 5000
    };
    
    // 根据模型提供者添加适当的response_format设置
    // OpenAI和Anthropic支持response_format
    if (model.includes('openai') || model.includes('gpt') || model.includes('claude')) {
      requestConfig.response_format = { type: "json_object" };
    }
    // Gemini使用不同的参数名称
    else if (model.includes('gemini')) {
      requestConfig.response_format = { type: "json_object" };
    }
    // 其他模型可能不支持response_format，依赖于system prompt
    
    console.log(`向模型 ${model} 发送请求，格式: ${format}`);
    
    // 实现指数退避重试逻辑
    const maxRetries = 3;
    let lastError = null;
    let completion = null;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // 使用特定格式的提示执行AI请求
        completion = await openai.chat.completions.create(requestConfig);
        // 如果成功则退出循环
        break;
      } catch (error) {
        lastError = error;
        // 检查是否为速率限制错误
        if (error.status === 429) {
          const retryDelay = Math.pow(2, attempt) * 1000 + Math.random() * 1000; // 指数退避 + 随机抖动
          console.log(`遇到速率限制，等待 ${retryDelay}ms 后重试 (尝试 ${attempt + 1}/${maxRetries})...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          // 继续下一次重试
        } else {
          // 对于其他错误，立即抛出
          throw error;
        }
      }
    }
    
    // 如果经过所有重试后仍然失败
    if (!completion && lastError) {
      throw lastError;
    }
    
    // Add diagnostic logging
    console.log(`从模型 ${model} 收到响应:`, JSON.stringify(completion).substring(0, 300) + '...');
    
    // Check if completion has the expected structure
    if (!completion || !completion.choices || !Array.isArray(completion.choices) || completion.choices.length === 0) {
      console.error(`从模型 ${model} 接收到无效响应:`, completion);
      results[format] = { error: `无效的模型响应结构` };
      return { error: `无效的模型响应结构` };
    }
    
    // 提取并解析AI响应
    const aiContent = completion.choices[0]?.message?.content || "";
    
    // Check if content is empty or null
    if (!aiContent) {
      console.error(`从模型 ${model} 接收到空内容`);
      results[format] = { error: `模型返回了空内容` };
      return { error: `模型返回了空内容` };
    }
    
    // 尝试清理非JSON内容
    let cleanedContent = aiContent;
    
    // 查找JSON内容的开始和结束
    const jsonStart = cleanedContent.indexOf('{');
    const jsonEnd = cleanedContent.lastIndexOf('}') + 1;
    
    if (jsonStart >= 0 && jsonEnd > jsonStart) {
      // 提取JSON部分
      cleanedContent = cleanedContent.substring(jsonStart, jsonEnd);
    }
    
    // 解析JSON
    const { data: formatResult, error: parseError } = safeParseJSON(cleanedContent);
    
    if (parseError || !formatResult) {
      console.error(`格式${format}的AI响应解析失败:`, parseError, "原始内容:", aiContent);
      console.log("尝试清理后的内容:", cleanedContent);
      results[format] = { error: `解析AI响应失败: ${parseError || '无效的响应格式'}` };
      return { error: `解析AI响应失败: ${parseError || '无效的响应格式'}` };
    }
    
    // 记录结果结构以进行调试
    console.log(`格式${format}的AI响应结构:`, JSON.stringify({
      hasTitle: !!formatResult.title,
      hasSlides: !!formatResult.slides,
      hasSections: !!formatResult.sections,
      resultKeys: Object.keys(formatResult)
    }));
    
    // 存储此格式的结果
    results[format] = formatResult;
    
    // 返回处理结果
    return formatResult;
  } catch (error) {
    console.error(`处理AI请求时出错:`, error);
    results[format] = { error: `处理AI请求时出错: ${error.message}` };
    return { error: `处理AI请求时出错: ${error.message}` };
  }
}

/**
 * Sends a message to multiple chat sessions
 * @param {string[]} sessionIds - Array of chat session IDs to send messages to
 * @param {string} content - Message content
 * @param {string} format - Message format (text, markdown, html)
 * @param {string} userId - User ID of the sender
 * @returns {Promise<object>} - Result object with success status and message IDs
 */
async function sendChatSessionMessages(sessionIds, content, format = 'text', userId) {
  try {
    if (!sessionIds || !Array.isArray(sessionIds) || sessionIds.length === 0) {
      throw new Error('No chat sessions provided');
    }

    if (!content || content.trim() === '') {
      throw new Error('Message content cannot be empty');
    }

    if (!userId) {
      throw new Error('User ID is required');
    }

    // Format the message according to the specified format
    let formattedContent = content;
    
    // Add format-specific markers if needed
    if (format === 'markdown') {
      // If it's markdown, we don't need to do anything special
      formattedContent = content;
    } else if (format === 'html') {
      // If it's HTML, wrap it in a special marker for the frontend to render correctly
      formattedContent = `<html-content>${content}</html-content>`;
    }

    // Create an array of message objects to insert
    const messagesToInsert = sessionIds.map(sessionId => ({
      session_id: sessionId,
      user_id: userId,
      content: formattedContent,
    }));

    // Insert all messages in a batch
    const { data, error } = await supabase
      .from('chat_message')
      .insert(messagesToInsert)
      .select('id, session_id');

    if (error) {
      console.error('Error sending chat messages:', error);
      throw error;
    }

    // For each session, we need to create read status records for all participants except the sender
    const messageIds = data.map(message => message.id);
    const sessionIdsWithMsgs = data.map(message => message.session_id);
    
    // Get all participants for the sessions
    const { data: participants, error: participantsError } = await supabase
      .from('chat_participant')
      .select('user_id, session_id')
      .in('session_id', sessionIdsWithMsgs);
    
    if (participantsError) {
      console.error('Error fetching participants:', participantsError);
      // We don't throw here because messages were already sent
    }
    
    if (participants && participants.length > 0) {
      // Create read status records for each message and each participant (except sender)
      const readStatusRecords = [];
      
      data.forEach(message => {
        const sessionParticipants = participants.filter(p => p.session_id === message.session_id);
        
        sessionParticipants.forEach(participant => {
          if (participant.user_id !== userId) {
            readStatusRecords.push({
              message_id: message.id,
              user_id: participant.user_id,
              read_at: null
            });
          }
        });
      });
      
      if (readStatusRecords.length > 0) {
        const { error: readStatusError } = await supabase
          .from('chat_message_read_status')
          .insert(readStatusRecords);
        
        if (readStatusError) {
          console.error('Error creating read status records:', readStatusError);
          // We don't throw here because messages were already sent
        }
      }
    }

    return {
      success: true,
      messageIds,
      sessionIds: sessionIdsWithMsgs
    };
  } catch (error) {
    console.error('Error in sendChatSessionMessages:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Send email with nodemailer
async function sendEmail(emailSettings, content, userId) {
  try {
    console.log('Sending email with settings:', JSON.stringify({
      recipients: emailSettings.recipients,
      subject: emailSettings.subject,
      useCustomSmtp: emailSettings.useCustomSmtp
    }));
    
    // Prepare the email content by replacing the content placeholder
    let emailContent = emailSettings.template || 'Hello,\n\nThis is an automated email:\n\n{{content}}\n\nRegards,\nWorkflow System';
    
    // Convert content to string if it's an object
    let contentStr = '';
    let attachedFiles = [];
    
    if (typeof content === 'object') {
      try {
        // Check if there are attached files
        if (content.attachedFiles && Array.isArray(content.attachedFiles) && content.attachedFiles.length > 0) {
          attachedFiles = content.attachedFiles;
          console.log(`Found ${attachedFiles.length} attached files in content`);
        }
        
        // Try to extract a 'content' field if it exists
        if (content.content) {
          contentStr = content.content;
        } else {
          // Otherwise stringify the whole object without the attachedFiles field
          const contentCopy = { ...content };
          delete contentCopy.attachedFiles;
          contentStr = JSON.stringify(contentCopy, null, 2);
        }
      } catch (error) {
        contentStr = String(content);
      }
    } else {
      contentStr = String(content);
    }
    
    // Add file links to the content if there are any attached files
    if (attachedFiles.length > 0) {
      contentStr += '\n\nAttachments:\n';
      attachedFiles.forEach((file, index) => {
        contentStr += `${index + 1}. ${file.type === 'presentation' ? 'PowerPoint 演示文稿' : 'Word 文档'}: ${file.url}\n`;
      });
    }
    
    // Replace placeholder with actual content
    emailContent = emailContent.replace('{{content}}', contentStr);
    
    // Create transporter based on settings
    let transporter;
    
    if (emailSettings.useCustomSmtp && emailSettings.smtp) {
      // Use custom SMTP settings
      transporter = nodemailer.createTransport({
        host: emailSettings.smtp.host,
        port: emailSettings.smtp.port || 587,
        secure: (emailSettings.smtp.port === '465'),
        auth: {
          user: emailSettings.smtp.user,
          pass: emailSettings.smtp.password
        }
      });
      
      console.log(`Using custom SMTP: ${emailSettings.smtp.host}:${emailSettings.smtp.port}`);
    } else {
      // Use default SMTP settings from environment variables
      const defaultHost = process.env.NEXT_PUBLIC_SMTP_HOSTNAME;
      const defaultPort = process.env.NEXT_PUBLIC_SMTP_PORT || 587;
      const defaultUser = process.env.NEXT_PUBLIC_SMTP_USERNAME;
      const defaultPass = process.env.NEXT_PUBLIC_SMTP_PASSWORD;
      const defaultFrom = process.env.NEXT_PUBLIC_SMTP_FROM;
      
      if (!defaultHost || !defaultUser || !defaultPass) {
        throw new Error('Default SMTP settings are not configured in environment variables');
      }
      
      transporter = nodemailer.createTransport({
        host: defaultHost,
        port: defaultPort,
        secure: (defaultPort === '465'),
        auth: {
          user: defaultUser,
          pass: defaultPass
        }
      });
      
      console.log(`Using default SMTP: ${defaultHost}:${defaultPort}`);
    }
    
    // Split recipients by comma
    const recipientsList = emailSettings.recipients.split(',').map(email => email.trim()).filter(Boolean);
    
    if (recipientsList.length === 0) {
      throw new Error('No valid recipients specified');
    }
    
    // Prepare email options
    const mailOptions = {
      from: emailSettings.useCustomSmtp && emailSettings.smtp.from 
        ? emailSettings.smtp.from 
        : process.env.SMTP_FROM || 'workflow@example.com',
      to: recipientsList.join(', '),
      subject: emailSettings.subject || 'Automated email from workflow system',
      text: emailContent
    };
    
    // Send the email
    const info = await transporter.sendMail(mailOptions);
    
    console.log('Email sent successfully:', info.messageId);
    
    // Return success result
    return {
      success: true,
      messageId: info.messageId,
      sentCount: recipientsList.length,
      recipients: recipientsList.join(', '),
      subject: emailSettings.subject,
      usedCustomSmtp: emailSettings.useCustomSmtp,
      includedFiles: attachedFiles.length
    };
  } catch (error) {
    console.error('Error sending email:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Add the new function to the exports
export {
  getAvailableModels,
  getWorkflow, 
  executeWorkflow, 
  saveWorkflowExecution, 
  createWorkflow, 
  updateWorkflow, 
  getUserWorkflows,
  sendChatSessionMessages,
  sendEmail
};