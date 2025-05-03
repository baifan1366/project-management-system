import { openai } from '../../api/ai/task-manager-agent/config';
import { safeParseJSON, executeApiRequest, createDocxTemplate } from './utils';
import { supabase } from '@/lib/supabase';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import pptxgenjs from 'pptxgenjs';
import { v4 as uuidv4 } from 'uuid';

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
      "title": "Task Title",
      "description": "Detailed description of what needs to be done",
      "due_date": "YYYY-MM-DD", 
      "priority": "HIGH|MEDIUM|LOW",
      "assignees": ["username or email"],
      "estimated_hours": 2,
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
  
  Respond ONLY with the JSON object, nothing else. Do not include explanations, markdown code blocks, or any other text.`
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
    
    // Define design themes - SlideGo inspired designs
    const designThemes = {
      professional: {
        title: { color: '0064D2', fontSize: 36, bold: true, fontFace: 'Arial' },
        subtitle: { color: '404040', fontSize: 20, fontFace: 'Arial' },
        content: { color: '333333', fontSize: 16, fontFace: 'Arial' },
        bullets: { color: '333333', fontSize: 16, fontFace: 'Arial' },
        background: { type: 'solid', color: 'FFFFFF' },
        accent: { color: '0064D2' },
        chartColors: ['0064D2', '00B050', 'FF6600', 'FFCC00', '9933CC']
      },
      creative: {
        title: { color: 'FF5733', fontSize: 40, bold: true, fontFace: 'Calibri' },
        subtitle: { color: '404040', fontSize: 22, fontFace: 'Calibri' },
        content: { color: '333333', fontSize: 18, fontFace: 'Calibri' },
        bullets: { color: '333333', fontSize: 18, fontFace: 'Calibri' },
        background: { 
          type: 'gradient', 
          color1: 'FFFFFF',
          color2: 'FFF5F0',
          angle: 45
        },
        accent: { color: 'FF5733' },
        chartColors: ['FF5733', '33A8FF', 'FFCC00', '33FF57', 'CC33FF']
      },
      minimal: {
        title: { color: '202020', fontSize: 38, bold: true, fontFace: 'Helvetica' },
        subtitle: { color: '606060', fontSize: 24, fontFace: 'Helvetica' },
        content: { color: '404040', fontSize: 16, fontFace: 'Helvetica' },
        bullets: { color: '404040', fontSize: 16, fontFace: 'Helvetica' },
        background: { type: 'solid', color: 'FFFFFF' },
        accent: { color: '202020' },
        chartColors: ['202020', '606060', 'A0A0A0', 'D0D0D0', 'F0F0F0']
      },
      colorful: {
        title: { color: '4A0D67', fontSize: 42, bold: true, fontFace: 'Trebuchet MS' },
        subtitle: { color: '4A0D67', fontSize: 24, fontFace: 'Trebuchet MS' },
        content: { color: '333333', fontSize: 18, fontFace: 'Trebuchet MS' },
        bullets: { color: '333333', fontSize: 18, fontFace: 'Trebuchet MS' },
        background: { 
          type: 'gradient', 
          color1: 'FFFFFF',
          color2: 'F0E6F5',
          angle: 90
        },
        accent: { color: '4A0D67' },
        chartColors: ['4A0D67', '84E6F8', 'FFB677', 'ADFFBC', 'FF7777']
      }
    };
    
    // Choose a design theme (can be random or based on content type)
    const designKeys = Object.keys(designThemes);
    const designTheme = designThemes[designKeys[Math.floor(Math.random() * designKeys.length)]];
    
    // Apply theme to master slide
    pres.defineSlideMaster({
      title: 'MASTER_SLIDE',
      background: designTheme.background,
      objects: [
        // Add accent line or shape based on theme
        { 
          rect: { 
            x: 0, 
            y: 0, 
            w: '100%', 
            h: 0.3, 
            fill: { color: designTheme.accent.color } 
          } 
        },
        // Add subtle footer
        { 
          text: { 
            text: 'Generated with AI Workflow',  
            options: { 
              x: 0.5, 
              y: '95%', 
              w: '90%', 
              h: 0.3, 
              align: 'center',
              fontSize: 10,
              color: '808080'
            } 
          } 
        }
      ],
      slideNumber: { x: '90%', y: '95%' }
    });
    
    // Check for ppt_generation specific structure or use content directly
    let pptContent = content;
    
    // If the content has a ppt_generation property, use that instead
    if (content.ppt_generation && typeof content.ppt_generation === 'object') {
      console.log("Using ppt_generation key from response");
      pptContent = content.ppt_generation;
    }
    
    // Check if content has error
    if (pptContent.error) {
      console.log("Content has error, using default presentation");
      // Create a default presentation with error information
      pres.title = 'Error in Presentation Generation';
      
      // Add title slide
      const slide1 = pres.addSlide({ masterName: 'MASTER_SLIDE' });
      slide1.addText('Error in Presentation Generation', {
        x: 0.5, y: 0.5, w: '90%', h: 1, 
        fontSize: designTheme.title.fontSize, 
        bold: designTheme.title.bold,
        color: 'FF0000',
        fontFace: designTheme.title.fontFace
      });
      slide1.addText(`An error occurred: ${pptContent.error}`, {
        x: 0.5, y: 1.7, w: '90%', h: 1,
        fontSize: designTheme.subtitle.fontSize,
        color: '666666',
        fontFace: designTheme.subtitle.fontFace
      });
      
      // Add information slide
      const slide2 = pres.addSlide({ masterName: 'MASTER_SLIDE' });
      slide2.addText('Troubleshooting', {
        x: 0.5, y: 0.5, w: '90%', h: 1,
        fontSize: designTheme.title.fontSize,
        bold: designTheme.title.bold,
        color: designTheme.title.color,
        fontFace: designTheme.title.fontFace
      });
      slide2.addText('Possible solutions:', {
        x: 0.5, y: 1.5, w: '90%', h: 4,
        fontSize: designTheme.subtitle.fontSize,
        color: designTheme.subtitle.color,
        fontFace: designTheme.subtitle.fontFace
      });
      const bullets = [
        '• Try again with a different prompt',
        '• Use a different AI model',
        '• Check if your input is clear and specific',
        '• Ensure the system has permissions to generate content'
      ];
      slide2.addText(bullets.join('\n'), {
        x: 0.5, y: 2.5, w: '90%', h: 4,
        fontSize: designTheme.bullets.fontSize,
        color: designTheme.bullets.color,
        fontFace: designTheme.bullets.fontFace
      });
    } else {
      // Set title from the content
      pres.title = pptContent.title || 'Presentation';
      console.log(`Setting presentation title: "${pres.title}"`);
      
      // If no slides are found, create a default slide
      if (!pptContent.slides || !Array.isArray(pptContent.slides) || pptContent.slides.length === 0) {
        console.log("No slides found in content, creating default slide");
        const defaultSlide = pres.addSlide({ masterName: 'MASTER_SLIDE' });
        
        // Add title to default slide
        defaultSlide.addText(pptContent.title || "Presentation", {
          x: 0.5,
          y: 0.5,
          w: '90%',
          h: 1,
          fontSize: designTheme.title.fontSize,
          bold: designTheme.title.bold,
          color: designTheme.title.color,
          fontFace: designTheme.title.fontFace
        });
        
        // Add explanation text
        defaultSlide.addText("This is an automatically generated presentation.", {
          x: 0.5,
          y: 2,
          w: '90%',
          h: 1,
          fontSize: designTheme.subtitle.fontSize,
          color: designTheme.subtitle.color,
          fontFace: designTheme.subtitle.fontFace
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
              fontSize: designTheme.content.fontSize,
              color: designTheme.content.color,
              fontFace: designTheme.content.fontFace
            });
          }
        }
      } else {
        // Process each slide
        console.log(`Processing ${pptContent.slides.length} slides`);
        pptContent.slides.forEach((slide, index) => {
          console.log(`Creating slide ${index + 1}: ${slide.title || 'Untitled'}`);
          
          // Add a new slide with master
          const currentSlide = pres.addSlide({ masterName: 'MASTER_SLIDE' });
          
          // Add visual design elements based on the slide type and theme
          
          // Add decorative element (varies by theme and slide position)
          if (index === 0) {
            // Title slide gets special treatment
            currentSlide.addShape('RECTANGLE', { 
              x: 0, 
              y: 0, 
              w: '100%', 
              h: '100%', 
              fill: { 
                type: 'solid',
                color: designTheme.background.type === 'gradient' 
                  ? designTheme.background.color1 
                  : designTheme.background.color
              }
            });
            
            // Add accent shapes based on design theme
            if (designTheme === designThemes.professional) {
              // Add blue accent bar
              currentSlide.addShape('RECTANGLE', {
                x: 0,
                y: 0,
                w: 2,
                h: '100%',
                fill: { color: designTheme.accent.color }
              });
            } else if (designTheme === designThemes.creative) {
              // Add circular accents
              for (let i = 0; i < 5; i++) {
                currentSlide.addShape('OVAL', {
                  x: 8 + (i * 0.5),
                  y: 0.5 + (i * 0.8),
                  w: 1,
                  h: 1,
                  fill: { color: designTheme.accent.color },
                  opacity: 0.7 - (i * 0.1)
                });
              }
            } else if (designTheme === designThemes.colorful) {
              // Add gradient overlay
              currentSlide.addShape('RECTANGLE', {
                x: 0,
                y: 0,
                w: '30%',
                h: '100%',
                fill: { 
                  type: 'gradient',
                  color1: designTheme.accent.color,
                  color2: 'FFFFFF',
                  angle: 90
                },
                opacity: 0.2
              });
            }
          } else {
            // Content slides get different decorative elements
            if (designTheme === designThemes.professional) {
              // Add header bar
              currentSlide.addShape('RECTANGLE', {
                x: 0,
                y: 0,
                w: '100%',
                h: 0.8,
                fill: { color: designTheme.accent.color },
                opacity: 0.1
              });
            } else if (designTheme === designThemes.creative) {
              // Add corner accent
              currentSlide.addShape('OVAL', {
                x: 9,
                y: -1,
                w: 3,
                h: 3,
                fill: { color: designTheme.accent.color },
                opacity: 0.2
              });
            } else if (designTheme === designThemes.minimal) {
              // Add subtle line
              currentSlide.addShape('LINE', {
                x: 0.5,
                y: 1.3,
                w: 9,
                h: 0,
                line: { color: designTheme.accent.color, width: 1 }
              });
            }
          }
          
          // Set slide title
          if (slide.title) {
            let titleY = 0.5;
            if (index === 0) {
              // Title slide gets special title positioning
              titleY = designTheme === designThemes.professional ? 2.5 : 
                      designTheme === designThemes.creative ? 3 : 2;
            }
            
            currentSlide.addText(slide.title, { 
              x: index === 0 && designTheme === designThemes.colorful ? 3.5 : 0.5, 
              y: titleY, 
              w: '90%', 
              h: 1, 
              fontSize: index === 0 ? designTheme.title.fontSize + 4 : designTheme.title.fontSize,
              bold: designTheme.title.bold,
              color: designTheme.title.color,
              fontFace: designTheme.title.fontFace
            });
          }
          
          // Process content based on slide type
          switch (slide.slide_type) {
            case 'title_slide':
              // Add subtitle if available
              if (slide.content) {
                currentSlide.addText(slide.content, { 
                  x: designTheme === designThemes.colorful ? 3.5 : 0.5, 
                  y: designTheme === designThemes.professional ? 3.5 : 
                     designTheme === designThemes.creative ? 4 : 3,
                  w: '90%', 
                  h: 1, 
                  fontSize: designTheme.subtitle.fontSize,
                  color: designTheme.subtitle.color,
                  fontFace: designTheme.subtitle.fontFace
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
              
              // If we have bullets, add them to the slide with styling
              if (bullets.length > 0) {
                // Style bullets in a visually appealing way based on the theme
                currentSlide.addText(bullets, { 
                  x: 0.5, 
                  y: 1.8, 
                  w: '90%', 
                  h: 5, 
                  fontSize: designTheme.bullets.fontSize,
                  color: designTheme.bullets.color,
                  fontFace: designTheme.bullets.fontFace,
                  bullet: true,
                  bulletType: designTheme === designThemes.minimal ? 'DEFAULT' : 'BULLET',
                  bulletColor: designTheme.accent.color
                });
              } else if (slide.content) {
                // If no bullets but content is available
                currentSlide.addText(slide.content, { 
                  x: 0.5, 
                  y: 1.8, 
                  w: '90%', 
                  h: 4, 
                  fontSize: designTheme.content.fontSize,
                  color: designTheme.content.color,
                  fontFace: designTheme.content.fontFace
                });
              } else {
                // Add a default bullet if nothing else is available
                currentSlide.addText(["No content available"], { 
                  x: 0.5, 
                  y: 1.8, 
                  w: '90%', 
                  h: 4, 
                  fontSize: designTheme.bullets.fontSize,
                  color: designTheme.bullets.color,
                  fontFace: designTheme.bullets.fontFace,
                  bullet: true
                });
              }
              break;
              
            case 'content_slide':
            case 'conclusion_slide':
            default:
              // Add regular content with styling
              if (slide.content) {
                currentSlide.addText(slide.content, { 
                  x: 0.5, 
                  y: 1.8, 
                  w: '90%', 
                  h: 4, 
                  fontSize: designTheme.content.fontSize,
                  color: designTheme.content.color,
                  fontFace: designTheme.content.fontFace
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
              
              // If we have bullets, add them to the slide with styling
              if (contentBullets.length > 0) {
                // Position bullets after content or at standard position if no content
                const bulletY = slide.content ? 3 : 1.8;
                
                currentSlide.addText(contentBullets, { 
                  x: 0.5, 
                  y: bulletY, 
                  w: '90%', 
                  h: 5, 
                  fontSize: designTheme.bullets.fontSize,
                  color: designTheme.bullets.color,
                  fontFace: designTheme.bullets.fontFace,
                  bullet: true,
                  bulletType: designTheme === designThemes.minimal ? 'DEFAULT' : 'BULLET',
                  bulletColor: designTheme.accent.color
                });
              }
              
              // For conclusion slides, add a special footer or graphic
              if (slide.slide_type === 'conclusion_slide') {
                currentSlide.addText('Thank You!', {
                  x: 0.5,
                  y: 5,
                  w: '90%',
                  h: 1,
                  fontSize: 28,
                  bold: true,
                  color: designTheme.accent.color,
                  fontFace: designTheme.title.fontFace,
                  align: 'center'
                });
              }
              break;
          }
        });
      }
    }
    
    // Generate a unique filename
    const fileName = `presentation_${uuidv4()}.pptx`;
    
    // Write the PPT to a buffer
    const pptBuffer = await pres.writeBuffer();
    
    // Upload to Supabase Storage
    const pptxUrl = await uploadFileToStorage(
      pptBuffer,
      fileName,
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      userId
    );
    
    console.log(`PPTX uploaded to: ${pptxUrl}`);
    
    return pptxUrl;
  } catch (error) {
    console.error(`Error generating PPTX: ${error.message}`);
    throw new Error(`Failed to generate presentation: ${error.message}`);
  }
}

// Generate Word document from JSON content
async function generateDOCX(content, userId) {
  try {
    console.log("Generating DOCX with content:", JSON.stringify(content, null, 2).substring(0, 500) + "...");
    
    // Read the template file
    const fs = require('fs');
    const path = require('path');
    const templatePath = path.resolve(process.cwd(), 'app/api/ai/workflow-agent/templates/document_template.docx');
    
    // Check if template exists, if not create it
    if (!fs.existsSync(templatePath)) {
      console.log('Document template not found, creating a new one...');
      await createDocxTemplate();
    }
    
    // Read the template
    const content_buffer = fs.readFileSync(templatePath, 'binary');
    const zip = new PizZip(content_buffer);
    
    // Create a new instance of Docxtemplater using the updated API
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true
    });
    
    // Helper function to recursively stringify objects
    function stringifyObjectValues(obj) {
      if (obj === null || obj === undefined) return "";
      
      // If it's already a string, return it
      if (typeof obj === 'string') return obj;
      
      // If it's a primitive, convert to string
      if (typeof obj !== 'object') return String(obj);
      
      // If it's an array, stringify each item
      if (Array.isArray(obj)) {
        return obj.map(item => {
          if (typeof item === 'object' && item !== null) {
            return JSON.stringify(item, null, 2);
          }
          return String(item);
        });
      }
      
      // It's an object, process each property
      const result = {};
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          const value = obj[key];
          
          if (Array.isArray(value)) {
            // Handle arrays
            result[key] = stringifyObjectValues(value);
          } else if (typeof value === 'object' && value !== null) {
            // For nested objects, stringify them
            if (key === 'subsections') {
              // Special handling for subsections - keep structure but stringify content
              result[key] = value.map(subsection => {
                const processed = {...subsection};
                if (typeof processed.content === 'object') {
                  processed.content = JSON.stringify(processed.content, null, 2);
                }
                if (Array.isArray(processed.bullets)) {
                  processed.bullets = processed.bullets.map(bullet => 
                    typeof bullet === 'object' ? JSON.stringify(bullet, null, 2) : String(bullet)
                  );
                }
                return processed;
              });
            } else {
              // For other objects, convert to JSON string
              result[key] = JSON.stringify(value, null, 2);
            }
          } else {
            // For primitives, convert to string
            result[key] = String(value);
          }
        }
      }
      return result;
    }
    
    // Process title
    const title = typeof content.title === 'string' ? content.title : 
                  (typeof content.title === 'object' ? JSON.stringify(content.title, null, 2) : "Document");
    
    // Create a document structure if we have raw data
    let documentSections = [];
    
    // Check if content is not already in the expected format
    if (!content.sections && typeof content === 'object') {
      console.log("Content is not in expected format, creating a structured document from raw data");
      
      // Convert raw data to a document format
      documentSections = [{
        heading: "Generated Content",
        content: JSON.stringify(content, null, 2),
        bullets: [],
        subsections: []
      }];
      
      // Try to create a more structured document by extracting keys from content
      if (Object.keys(content).length > 0) {
        documentSections = Object.keys(content).map(key => {
          const value = content[key];
          let sectionContent = "";
          let sectionBullets = [];
          
          if (typeof value === 'string') {
            sectionContent = value;
          } else if (Array.isArray(value)) {
            sectionBullets = value.map(item => typeof item === 'object' ? JSON.stringify(item, null, 2) : String(item));
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
      }
    }
    // Process sections if available in the expected format
    else if (content.sections && Array.isArray(content.sections)) {
      // Use the existing sections but process them to handle objects
      documentSections = content.sections.map(section => {
        return {
          heading: section.heading || "",
          content: typeof section.content === 'object' ? JSON.stringify(section.content, null, 2) : (section.content || ""),
          bullets: Array.isArray(section.bullets) ? section.bullets.map(bullet => 
            typeof bullet === 'object' ? JSON.stringify(bullet, null, 2) : String(bullet)
          ) : [],
          subsections: Array.isArray(section.subsections) ? section.subsections.map(subsection => ({
            heading: subsection.heading || "",
            content: typeof subsection.content === 'object' ? JSON.stringify(subsection.content, null, 2) : (subsection.content || ""),
            bullets: Array.isArray(subsection.bullets) ? subsection.bullets.map(bullet => 
              typeof bullet === 'object' ? JSON.stringify(bullet, null, 2) : String(bullet)
            ) : []
          })) : []
        };
      });
    }
    
    // Apply our recursive stringify to ensure everything is properly formatted
    const processedSections = stringifyObjectValues({sections: documentSections}).sections;
    
    // Prepare the template data
    const templateData = {
      title: title,
      sections: processedSections,
      current_date: new Date().toLocaleDateString(),
      has_sections: processedSections.length > 0
    };
    
    // Log the template data for debugging
    console.log("Template data structure:", JSON.stringify({
      titleType: typeof title,
      sectionsCount: processedSections.length,
      sampleSection: processedSections.length > 0 ? {
        heading: processedSections[0].heading,
        contentType: typeof processedSections[0].content,
        contentPreview: typeof processedSections[0].content === 'string' ? 
                         processedSections[0].content.substring(0, 50) : 'Not a string',
        bulletsCount: processedSections[0].bullets ? processedSections[0].bullets.length : 0,
        subsectionsCount: processedSections[0].subsections ? processedSections[0].subsections.length : 0
      } : 'No sections'
    }, null, 2));
    
    // Set the template variables
    doc.setData(templateData);
    
    // Render the document
    try {
      doc.render();
    } catch (error) {
      console.error('Error rendering document:', error);
      throw new Error(`Error rendering document: ${error.message}`);
    }
    
    // Get the rendered content
    const buffer = doc.getZip().generate({
      type: 'nodebuffer',
      compression: 'DEFLATE'
    });
    
    // Generate unique filename
    const filename = `document_${uuidv4()}.docx`;
    
    // Upload to Supabase Storage
    const fileUrl = await uploadFileToStorage(
      buffer, 
      filename, 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      userId
    );
    
    console.log('Document generated successfully:', fileUrl);
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
    
    // 为每个模型执行处理
    for (const model of models) {
      console.log(`使用模型 ${model} 处理...`);
      modelResults[model] = {};
      
      // 为每个输出格式执行单独的AI请求
      for (const format of outputFormats) {
        // 获取此格式的合适系统提示
        const formatPrompt = WORKFLOW_PROMPTS[format];
        
        if (!formatPrompt) {
          console.warn(`未找到格式的提示模板: ${format}`);
          
          // 即使没有特定的提示模板，也使用通用JSON格式
          // 这样API节点也能够接收数据
          if (format === 'api') {
            // API格式不需要实际执行，它只是接收数据的节点
            continue;
          } else {
            // 对于其他未知格式，使用JSON格式的提示
            console.log(`使用通用JSON格式的提示代替: ${format}`);
            const jsonPrompt = WORKFLOW_PROMPTS['json'];
            
            if (jsonPrompt) {
              // 执行AI请求使用JSON格式提示
              const formatResult = await processAIRequest(model, jsonPrompt, userPrompt, format, results);
              modelResults[model][format] = formatResult;
            }
            continue;
          }
        }
        
        console.log(`为格式执行AI请求: ${format} 使用模型: ${model}`);
        
        // 执行AI请求
        const formatResult = await processAIRequest(model, formatPrompt, userPrompt, format, results);
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
    
    // 处理PPT生成
    if (outputFormats.includes('ppt')) {
      console.log('生成PPT文档...');
      try {
        // 检查是否有有效的PPT内容或错误内容
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
        // Check if there's API response data that should be used for document generation
        let docContent = results['document'] || { error: "No valid document content generated" };
        
        // Check for API response data from connected API nodes
        if (Object.keys(connectionMap).length > 0) {
          for (const nodeId in nodeConnections) {
            const nodeSettings = outputSettings[nodeId];
            // If this is a document node with API input source
            if (nodeSettings && nodeSettings.type === 'document') {
              // Find API nodes that connect to this document node
              const sourceNodes = Object.keys(connectionMap).filter(id => 
                connectionMap[id].includes(nodeId) && outputSettings[id]?.type === 'api'
              );
              
              if (sourceNodes.length > 0) {
                console.log(`Found API source nodes for document ${nodeId}: ${sourceNodes.join(', ')}`);
                // Use the first API response as document content
                const apiSourceId = sourceNodes[0];
                if (apiResponses[apiSourceId] && apiResponses[apiSourceId].data) {
                  console.log(`Using API response from ${apiSourceId} for document generation`);
                  docContent = apiResponses[apiSourceId].data;
                }
              }
            }
          }
        }
        
        const docUrl = await generateDOCX(docContent, userId);
        documentUrls['document'] = docUrl;
        console.log('文档生成成功:', docUrl);
      } catch (error) {
        console.error('生成文档时出错:', error);
        documentUrls['document_error'] = error.message;
      }
    }
    
    // 处理任务创建
    if (outputFormats.includes('task')) {
      console.log('处理任务创建...');
      try {
        // Check if there's task data in the results
        const taskContent = results['task'];
        if (taskContent) {
          // Get team and project IDs from output settings if available
          let taskTeamId = teamId;
          let taskProjectId = projectId;
          
          // Find any task nodes in the output settings
          const taskNodes = Object.entries(outputSettings).filter(([_, settings]) => 
            settings.type === 'task'
          );
          
          if (taskNodes.length > 0) {
            const [nodeId, nodeSettings] = taskNodes[0];
            console.log(`Using task settings from node ${nodeId}`);
            
            // Override with node-specific team and project if available
            if (nodeSettings.teamId) {
              taskTeamId = nodeSettings.teamId;
            }
            
            if (nodeSettings.projectId) {
              taskProjectId = nodeSettings.projectId;
            }
          }
          
          // Create tasks using the task data with project and team
          const taskResult = await createTasksFromResult(taskContent, userId, taskTeamId, taskProjectId);
          
          // Store the task creation result
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
              // Determine the content to use
              // First, check if there's dedicated chat content in the results
              let contentToSend = results['chat'] || results['json'] || results['text'] || { content: 'No content was generated.' };
              
              // If the content is an object, convert it to string
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
              
              // Replace {{content}} in the message template with the actual content
              const finalMessage = messageTemplate.replace('{{content}}', contentStr);
              
              // Send messages to the selected chat sessions
              console.log(`Sending messages to ${chatSessionIds.length} chat sessions with format ${messageFormat}`);
              const chatResult = await sendChatSessionMessages(chatSessionIds, finalMessage, messageFormat, userId);
              
              // Store the chat message sending result
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
    
    // 处理节点间的连接关系
    if (Object.keys(connectionMap).length > 0) {
      console.log('处理节点间的连接关系');
      
      // 检查是否有API节点需要处理
      for (const nodeId in nodeConnections) {
        // 获取节点的输出类型和设置
        const apiSettings = outputSettings[nodeId];
        
        if (apiSettings && apiSettings.type === 'api') {
          console.log(`处理API节点 ${nodeId}`);
          
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
async function processAIRequest(model, formatPrompt, userPrompt, format, results) {
  try {
    // 特殊处理deepseek模型，添加明确的JSON格式要求
    let updatedPrompt = formatPrompt;
    if (model.includes('deepseek')) {
      updatedPrompt = formatPrompt + "\n\nVERY IMPORTANT: Your response MUST be valid JSON only. Do not include any explanation or commentary. Start your response with '{' and end with '}'. Do not include any text before or after the JSON object.";
    }
    
    // 创建基本请求配置
    const requestConfig = {
      model: model,
      messages: [
        { role: 'system', content: updatedPrompt },
        { role: 'user', content: userPrompt }
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
    
    // 使用特定格式的提示执行AI请求
    const completion = await openai.chat.completions.create(requestConfig);
    
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

// Add the new function to the exports
export {
  getAvailableModels,
  getWorkflow, 
  executeWorkflow, 
  saveWorkflowExecution, 
  createWorkflow, 
  updateWorkflow, 
  getUserWorkflows,
  sendChatSessionMessages 
};