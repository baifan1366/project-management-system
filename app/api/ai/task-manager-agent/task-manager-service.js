import { openai, SYSTEM_PROMPT } from './config';
import { safeParseJSON } from './utils';
import * as dbService from './db-service';
import { supabase } from '@/lib/supabase';

// 调用AI解析用户指令
export async function parseInstruction(instruction) {
  console.log("正在调用AI解析指令...");
  const completion = await openai.chat.completions.create({
    model: "google/gemini-2.0-flash-exp:free",
    //model: "qwen/qwen2.5-vl-32b-instruct:free",
    //model: "qwen/qwq-32b:free",
    //model: "deepseek/deepseek-chat-v3-0324:free",
    //model="deepseek/deepseek-r1:free",
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: instruction }
    ],
    temperature: 0.1,
    max_tokens: 1500,
    response_format: { type: "json_object" },
    // 添加明确指示，确保响应是纯JSON
    user: "IMPORTANT: Respond with valid JSON only. Do not add any text before or after the JSON object."
  });
  
  // 提取并安全解析AI的响应
  const aiContent = completion.choices[0]?.message?.content || "";
  console.log("AI响应:", aiContent.substring(0, 200) + "...");
  
  const { data: aiResponse, error: parseError } = safeParseJSON(aiContent);
  
  if (parseError || !aiResponse) {
    console.error("AI响应解析失败:", parseError, "原始内容:", aiContent);
    throw new Error('Failed to parse AI response: ' + (parseError || 'Invalid response format'));
  }
  
  return aiResponse;
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
    console.log("创建新项目和任务流程");
    const createdProject = await dbService.createProject(aiResponse.project, userId);
    projectId = createdProject.id;
    
    // 创建团队
    const teamId = await dbService.createTeam(projectId, aiResponse.project.project_name, userId);
    
    // 使用AI推荐的自定义字段，将它们关联到团队
    console.log("正在关联自定义字段到团队...");
    
    // 定义要关联的字段ID和排序，使用AI推荐或默认配置
    const customFieldsToAssociate = aiResponse.recommended_views || [
      { id: 1, name: "List", order_index: 0 },      // List视图
      { id: 5, name: "Board", order_index: 1 },     // 看板视图
      { id: 6, name: "Calendar", order_index: 2 },  // 日历视图
      { id: 4, name: "Gantt", order_index: 3 },     // 甘特图视图
      { id: 8, name: "Timeline", order_index: 4 },  // 时间线视图
      { id: 9, name: "Overview", order_index: 5 }   // 概览
    ];
    
    console.log("将使用以下自定义字段:", customFieldsToAssociate);
    
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
    await dbService.addUserToTeam(userId, teamId);
    
    // 添加团队成员（如果有）
    if (aiResponse.team_members && Array.isArray(aiResponse.team_members) && aiResponse.team_members.length > 0) {
      for (const member of aiResponse.team_members) {
        if (member && member.email) {
          await dbService.inviteTeamMember(teamId, member.email, member.role || 'CAN_VIEW', userId);
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
      console.log("未找到现有分区，创建新分区");
      // 创建默认分区
      const newSection = await dbService.createSection(teamId, userId);
      var sectionId = newSection.id;
    } else {
      console.log(`找到 ${sectionData.length} 个分区，使用第一个分区`);
      var sectionId = sectionData[0].id;
    }
    
    // 处理任务
    if (aiResponse.tasks && aiResponse.tasks.length > 0) {
      for (const taskInfo of aiResponse.tasks) {
        // 创建任务
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
    console.log("向现有项目添加任务流程");
    
    // 使用提供的团队ID，或者查询项目关联的团队
    let teamId = providedTeamId;
    
    if (!teamId) {
      console.log("未提供团队ID，尝试查询项目关联的团队");
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
      console.log(`找到 ${teamData.length} 个团队，使用第一个团队 ID: ${teamId}`);
    } else {
      console.log(`使用提供的团队 ID: ${teamId}`);
    }
    
    // 添加团队成员（如果有）
    if (aiResponse.team_members && Array.isArray(aiResponse.team_members) && aiResponse.team_members.length > 0) {
      for (const member of aiResponse.team_members) {
        if (member && member.email) {
          await dbService.inviteTeamMember(teamId, member.email, member.role || 'CAN_VIEW', userId);
        }
      }
    }
    
    // 使用提供的分区ID，或者查询/创建分区
    let sectionId = providedSectionId;
    
    if (!sectionId) {
      console.log("未提供分区ID，尝试查询团队分区");
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
        console.log("未找到现有分区，创建新分区");
        // 创建默认分区
        const newSection = await dbService.createSection(teamId, userId);
        sectionId = newSection.id;
      } else {
        console.log(`找到 ${sectionData.length} 个分区，使用第一个分区`);
        sectionId = sectionData[0].id;
      }
    } else {
      console.log(`使用提供的分区 ID: ${sectionId}`);
    }
    
    // 处理任务
    if (aiResponse.tasks && aiResponse.tasks.length > 0) {
      for (const taskInfo of aiResponse.tasks) {
        // 创建任务
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