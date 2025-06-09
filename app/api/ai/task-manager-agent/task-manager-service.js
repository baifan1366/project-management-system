import { openai, SYSTEM_PROMPT } from './config';
import { safeParseJSON } from './utils';
import * as dbService from './db-service';
import { supabase } from '@/lib/supabase';

// 调用AI解析用户指令
export async function parseInstruction(instruction) {
  try {
    const completion = await openai.chat.completions.create({
      model: "qwen/qwen2.5-vl-32b-instruct:free",
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: instruction }
      ],
      temperature: 0.1,
      max_tokens: 5000,
      response_format: { type: "json_object" },
      user: "IMPORTANT: Respond with valid JSON only. Do not add any text before or after the JSON object."
    });
    
    // 提取并安全解析AI的响应
    // Handle different API response structures (OpenAI vs Google)
    let aiContent = "";
    
    if (completion.choices && completion.choices[0]?.message?.content) {
      // OpenAI response format
      aiContent = completion.choices[0].message.content;
    } else if (completion.candidates && completion.candidates[0]?.content?.parts) {
      // Google Gemini response format
      aiContent = completion.candidates[0].content.parts[0]?.text || "";
    } else if (typeof completion.text === 'string') {
      // Direct text response
      aiContent = completion.text;
    } else if (typeof completion === 'string') {
      // Fallback if the entire response is a string
      aiContent = completion;
    } else {
      // Log the response structure for debugging
      aiContent = "";
    }
        
    // Use safeParseJSON utility to parse the response
    const { data: aiResponse, error: parseError } = safeParseJSON(aiContent);
    
    if (parseError) {
      console.error("AI响应解析失败:", parseError, "原始内容:", aiContent);
      throw new Error('Failed to parse AI response: ' + parseError);
    }
    
    if (!aiResponse) {
      throw new Error('Empty response after parsing');
    }
    
    return aiResponse;
  } catch (error) {
    console.error("调用AI服务失败:", error.message);
    throw new Error('Failed to call AI service: ' + error.message);
  }
}

// 处理创建项目和任务
export async function createProjectAndTasks(
  aiResponse, 
  userId, 
  existingProjectId = null,
  providedTeamId = null,
  providedSectionId = null
) {
  let projectId = existingProjectId;
  let tasksResults = [];
  
  // 创建项目（如果需要）
  if (!existingProjectId && aiResponse.action === "create_project_and_tasks" && aiResponse.project) {
    const createdProject = await dbService.createProject(aiResponse.project, userId);
    projectId = createdProject.id;
    
    // 创建团队
    const teamId = await dbService.createTeam(projectId, aiResponse.project.project_name, userId);
    
    // 使用AI推荐的自定义字段，将它们关联到团队
    
    // 定义要关联的字段ID和排序，使用AI推荐或默认配置
    const customFieldsToAssociate = aiResponse.recommended_views || [
      { "id": 1, "name": "Overview", "order_index": 0 },
      { "id": 2, "name": "List", "order_index": 1 },
      { "id": 3, "name": "Timeline", "order_index": 2 },
      { "id": 4, "name": "Kanban", "order_index": 3 }, 
      { "id": 5, "name": "Calendar", "order_index": 4 },
      { "id": 6, "name": "Posts", "order_index": 8 },
      { "id": 7, "name": "Files", "order_index": 5 },
      //{ "id": 8, "name": "Gantt", "order_index": 6 },
      //{ "id": 9, "name": "Workflow", "order_index": 7 },
      //{ "id": 10, "name": "Note", "order_index": 9 },
      //{ "id": 11, "name": "Agile", "order_index": 10 }
    ];
    
    
    // 创建team_custom_field关联
    for (let i = 0; i < customFieldsToAssociate.length; i++) {
      const fieldData = customFieldsToAssociate[i];
      
      // 创建团队自定义字段关联
      const teamCustomField = await dbService.createTeamCustomField(teamId, fieldData, userId);
      const teamCustomFieldId = teamCustomField.id;
      
      // 创建自定义字段值
      await dbService.createTeamCustomFieldValue(teamCustomFieldId, fieldData, userId);
    }
    
    // 添加用户到团队
    try {
      await dbService.addUserToTeam(userId, teamId);
    } catch (error) {
      console.error("Failed to add user to team, but continuing process:", error);
      // Don't rethrow, continue with task creation
    }
    
    // 添加团队成员（如果有）
    if (aiResponse.team_members && Array.isArray(aiResponse.team_members) && aiResponse.team_members.length > 0) {
      for (const member of aiResponse.team_members) {
        if (member && member.email) {
          try {
            await dbService.inviteTeamMember(teamId, member.email, member.role || 'CAN_VIEW', userId);
          } catch (error) {
            console.error(`Failed to invite member ${member.email}, but continuing:`, error);
            // Don't rethrow, continue with next member
          }
        }
      }
    }
    
    // 获取团队的默认分区
    const { data: sectionData, error: sectionError } = await supabase
      .from('section')
      .select('id')
      .eq('team_id', teamId);
      
    if (sectionError) {
      console.error("获取分区失败:", sectionError);
      throw new Error(`Failed to get section: ${sectionError.message}`);
    }
    
    if (!sectionData || sectionData.length === 0) {
      // 创建默认分区
      try {
        const newSection = await dbService.createSection(teamId, userId);
        var sectionId = newSection.id;
      } catch (error) {
        console.error("Failed to create section, but continuing process:", error);
        // Create a temporary section ID if needed
        var sectionId = 0;
      }
    } else {
      var sectionId = sectionData[0].id;
    }
    
    // 处理任务
    if (aiResponse.tasks && aiResponse.tasks.length > 0) {
      
      for (const taskInfo of aiResponse.tasks) {
        
        // 常规任务处理流程
        const taskData = await dbService.createTask(taskInfo, userId);
        const taskId = taskData.id;
        
        // 将任务添加到分区
        await dbService.addTaskToSection(sectionId, taskId);
        
        tasksResults.push(taskData);
      }
    }
  }
  // 仅创建任务（如果有现有项目ID）
  else if (existingProjectId) {    
    // 使用提供的团队ID，或者查询项目关联的团队
    let teamId = providedTeamId;
    
    if (!teamId) {
      const { data: teamData, error: teamError } = await supabase
        .from('team')
        .select('id')
        .eq('project_id', existingProjectId);
        
      if (teamError) {
        console.error("获取团队失败:", teamError);
        throw new Error(`Failed to get team: ${teamError.message}`);
      }
      
      if (!teamData || teamData.length === 0) {
        console.error("项目没有关联的团队");
        throw new Error("Project has no associated teams");
      }
      
      // 使用第一个团队（如果有多个）
      teamId = teamData[0].id;
    }
    
    // 添加团队成员（如果有）
    if (aiResponse.team_members && Array.isArray(aiResponse.team_members) && aiResponse.team_members.length > 0) {
      for (const member of aiResponse.team_members) {
        if (member && member.email) {
          try {
            await dbService.inviteTeamMember(teamId, member.email, member.role || 'CAN_VIEW', userId);
          } catch (error) {
            console.error(`Failed to invite member ${member.email}, but continuing:`, error);
            // Don't rethrow, continue with next member
          }
        }
      }
    }
    
    // 使用提供的分区ID，或者查询/创建分区
    let sectionId = providedSectionId;
    
    if (!sectionId) {
      // 获取团队的默认分区
      const { data: sectionData, error: sectionError } = await supabase
        .from('section')
        .select('id')
        .eq('team_id', teamId);
        
      if (sectionError) {
        console.error("获取分区失败:", sectionError);
        throw new Error(`Failed to get section: ${sectionError.message}`);
      }
      
      if (!sectionData || sectionData.length === 0) {
        // 创建默认分区
        const newSection = await dbService.createSection(teamId, userId);
        sectionId = newSection.id;
      } else {
        sectionId = sectionData[0].id;
      }
    }
    
    // 处理任务
    if (aiResponse.tasks && aiResponse.tasks.length > 0) {
      
      for (const taskInfo of aiResponse.tasks) {
        
        // 常规任务处理流程
        const taskData = await dbService.createTask(taskInfo, userId);
        const taskId = taskData.id;
        
        // 将任务添加到分区
        await dbService.addTaskToSection(sectionId, taskId);
        
        tasksResults.push(taskData);
      }
    }
  }
  
  return {
    projectId,
    tasks: tasksResults
  };
}

// 直接处理邀请指令
export async function handleInvitation(instruction, userId, projectId, teamId, sectionId) {
  
  // 提取邮箱
  const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const emails = instruction.match(emailPattern);
  
  if (!emails || emails.length === 0) {
    throw new Error("No email addresses found in invitation instruction");
  }
  
  
  // 获取或查询团队ID
  let targetTeamId = teamId;
  if (!targetTeamId && projectId) {
    const { data: teamData, error: teamError } = await supabase
      .from('team')
      .select('id')
      .eq('project_id', projectId);
      
    if (teamError) {
      console.error("获取团队失败:", teamError);
      throw new Error(`Failed to get team: ${teamError.message}`);
    }
    
    if (!teamData || teamData.length === 0) {
      console.error("项目没有关联的团队");
      throw new Error("Project has no associated teams");
    }
    
    // 使用第一个团队
    targetTeamId = teamData[0].id;
  }
  
  if (!targetTeamId) {
    console.error("无法确定要邀请加入的团队");
    throw new Error("No team specified for invitation");
  }
  
  // 处理每个邮箱的邀请
  const results = [];
  
  for (const email of emails) {
    try {
      const inviteResult = await dbService.inviteTeamMember(targetTeamId, email, 'CAN_VIEW', userId);
      results.push({ email, success: true });
    } catch (error) {
      console.error(`邀请 ${email} 失败:`, error);
      results.push({ email, success: false, error: error.message });
    }
  }
  
  return {
    success: results.some(r => r.success),
    invitations: results,
    projectId,
    teamId: targetTeamId
  };
} 