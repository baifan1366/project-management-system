import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { supabase } from '@/lib/supabase';

// Initialize OpenAI client with OpenRouter API
const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.NEXT_PUBLIC_OPEN_ROUTER_KEY,
  defaultHeaders: {
    "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
    "X-Title": "Team Sync"
  }
});

// System prompt for the task manager agent
const SYSTEM_PROMPT = `
You are Pengy, a helpful penguin-themed AI assistant specialized in managing projects and tasks. 
Your job is to help users create projects and tasks based on their natural language instructions.
Your personality is friendly, efficient, and somewhat playful - occasionally using penguin-related 
metaphors like "let's waddle through this project together" or "diving into tasks efficiently".

You must extract the following information from the user's message:
1. Project information (if any):
   - Project name
   - Project description
   - Project visibility (private/public)

2. Task information (if any):
   - Task title
   - Task description
   - Due date (if mentioned)
   - Priority (low, medium, high, urgent)
   - Assignees (if mentioned)

Parse the user's request and respond with a structured JSON containing the extracted information.
If information is missing, use reasonable defaults where appropriate.

IMPORTANT: Your response MUST be a valid JSON object with no additional text, comments or explanations.

Respond ONLY with the JSON object matching this format:
{
  "action": "create_project_and_tasks", // or "create_tasks" if only tasks are mentioned
  "project": {
    "project_name": "string",
    "description": "string", 
    "visibility": "private", // or "public"
    "theme_color": "white", // default theme color
    "status": "PENDING" // default for new projects
  },
  "tasks": [
    {
      "title": "string",
      "description": "string",
      "due_date": "YYYY-MM-DD", // or null if not specified
      "priority": "MEDIUM", // LOW, MEDIUM, HIGH, URGENT
      "assignees": [] // array of user IDs or emails
    }
  ]
}
`;

// 安全地解析JSON字符串
function safeParseJSON(jsonString) {
  try {
    // 尝试直接解析
    return { data: JSON.parse(jsonString), error: null };
  } catch (error) {
    console.error("JSON解析错误，原始字符串:", jsonString);
    
    try {
      // 如果常规解析失败，尝试清理字符串然后解析
      // 1. 查找第一个 '{' 和最后一个 '}'
      const startIdx = jsonString.indexOf('{');
      const endIdx = jsonString.lastIndexOf('}');
      
      if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
        const jsonSubstring = jsonString.substring(startIdx, endIdx + 1);
        return { data: JSON.parse(jsonSubstring), error: null };
      }
      
      return { data: null, error: "无法提取有效的JSON内容" };
    } catch (cleanError) {
      return { data: null, error: error.message };
    }
  }
}

export async function POST(request) {
  try {
    // Parse request body
    const body = await request.json();
    const { instruction, userId } = body;
    
    console.log("接收到请求:", { instruction: instruction.substring(0, 50) + "...", userId });
    
    // 验证必要参数
    if (!instruction) {
      return NextResponse.json(
        { error: 'Invalid request', message: 'Instruction cannot be empty' },
        { status: 400 }
      );
    }
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'User ID is required' },
        { status: 401 }
      );
    }
    
    // Call AI to parse the instruction
    console.log("正在调用AI解析指令...");
    const completion = await openai.chat.completions.create({
      model: "qwen/qwen2.5-vl-32b-instruct:free",
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: instruction }
      ],
      temperature: 0.2,
      max_tokens: 1500,
      response_format: { type: "json_object" }
    });
    
    // 提取并安全解析AI的响应
    const aiContent = completion.choices[0]?.message?.content || "";
    console.log("AI响应:", aiContent.substring(0, 200) + "...");
    
    const { data: aiResponse, error: parseError } = safeParseJSON(aiContent);
    
    if (parseError || !aiResponse) {
      console.error("AI响应解析失败:", parseError, "原始内容:", aiContent);
      return NextResponse.json(
        { error: 'AI response error', message: 'Failed to parse AI response: ' + (parseError || 'Invalid response format') },
        { status: 500 }
      );
    }
    
    // Process the response based on the action
    if (aiResponse.action === "create_project_and_tasks" || aiResponse.action === "create_tasks") {
      // Create project if needed
      let projectId = body.projectId; // Use existing project ID if provided
      
      if (aiResponse.action === "create_project_and_tasks" && aiResponse.project) {
        // Add current user as creator
        const newProjectData = {
          ...aiResponse.project,
          created_by: userId
        };
        
        console.log("正在创建项目:", newProjectData);
        
        // Insert project into database
        const { data: createdProject, error: projectError } = await supabase
          .from('project')
          .insert([newProjectData])
          .select();
          
        if (projectError) {
          console.error("创建项目失败:", projectError);
          throw new Error(`Failed to create project: ${projectError.message}`);
        }
        
        projectId = createdProject[0].id;
        console.log("项目创建成功，ID:", projectId);
      }
      
      // Process tasks
      const tasksResults = [];
      
      if (aiResponse.tasks && aiResponse.tasks.length > 0 && projectId) {
        console.log("开始处理任务...");
        
        // Create a team if we have a new project
        if (aiResponse.action === "create_project_and_tasks") {
          const newTeamData = {
            name: aiResponse.project.project_name + " Team",
            description: "Default team for " + aiResponse.project.project_name,
            access: "can_edit",
            created_by: userId,
            project_id: projectId
          };
          
          console.log("正在创建团队:", newTeamData);
          
          const { data: createdTeam, error: teamError } = await supabase
            .from('team')
            .insert([newTeamData])
            .select();
            
          if (teamError) {
            console.error("创建团队失败:", teamError);
            throw new Error(`Failed to create team: ${teamError.message}`);
          }
          
          const teamId = createdTeam[0].id;
          console.log("团队创建成功，ID:", teamId);
          
          // Add user to team
          console.log("正在将用户添加到团队...");
          const { error: userTeamError } = await supabase
            .from('user_team')
            .insert([{
              user_id: userId,
              team_id: teamId,
              role: 'OWNER',
              created_by: userId
            }]);
            
          if (userTeamError) {
            console.error("将用户添加到团队失败:", userTeamError);
            throw new Error(`Failed to add user to team: ${userTeamError.message}`);
          }
            
          // Create a default section
          console.log("正在创建默认分区...");
          const { data: sectionData, error: sectionError } = await supabase
            .from('section')
            .insert([{
              name: "默认分区",
              team_id: teamId,
              created_by: userId,
              task_ids: [] // 确保初始化为空数组
            }])
            .select();
            
          if (sectionError) {
            console.error("创建分区失败:", sectionError);
            throw new Error(`Failed to create section: ${sectionError.message}`);
          }
          
          const sectionId = sectionData[0].id;
          console.log("分区创建成功，ID:", sectionId);
          
          // Process each task
          for (const taskInfo of aiResponse.tasks) {
            // Create task record
            console.log("正在创建任务:", taskInfo.title);
            const { data: taskData, error: taskError } = await supabase
              .from('task')
              .insert([{
                created_by: userId,
                tag_values: {
                  title: taskInfo.title,
                  description: taskInfo.description || '',
                  due_date: taskInfo.due_date || null,
                  priority: taskInfo.priority || 'MEDIUM',
                  status: 'TODO'
                }
              }])
              .select();
              
            if (taskError) {
              console.error("创建任务失败:", taskError);
              throw new Error(`Failed to create task: ${taskError.message}`);
            }
            
            const taskId = taskData[0].id;
            console.log("任务创建成功，ID:", taskId);
            
            // Update section's task_ids array
            console.log("正在将任务添加到分区...");
            const { error: updateSectionError } = await supabase
              .from('section')
              .update({
                task_ids: [...(sectionData[0].task_ids || []), taskId]
              })
              .eq('id', sectionId);
              
            if (updateSectionError) {
              console.error("更新分区任务列表失败:", updateSectionError);
              throw new Error(`Failed to update section task list: ${updateSectionError.message}`);
            }
              
            tasksResults.push(taskData[0]);
          }
        }
      }
      
      return NextResponse.json({
        success: true,
        message: 'Tasks processed successfully',
        projectId: projectId,
        tasks: tasksResults
      });
    } else {
      return NextResponse.json(
        { error: 'Unsupported action', message: 'The requested action type is not supported' },
        { status: 400 }
      );
    }
    
  } catch (error) {
    console.error('Task manager agent failed:', error);
    
    return NextResponse.json(
      { 
        error: 'Task manager agent failed',
        message: error.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
} 