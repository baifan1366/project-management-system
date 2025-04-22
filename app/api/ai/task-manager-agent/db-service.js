import { supabase } from '@/lib/supabase';
import { getDefaultTagIdsForField } from './config';

// 创建项目
export async function createProject(projectData, userId) {
  console.log("正在创建项目:", projectData);
  
  // 添加当前用户作为创建者
  const newProjectData = {
    ...projectData,
    created_by: userId
  };
  
  // 插入项目到数据库
  const { data: createdProject, error: projectError } = await supabase
    .from('project')
    .insert([newProjectData])
    .select();
    
  if (projectError) {
    console.error("创建项目失败:", projectError);
    throw new Error(`Failed to create project: ${projectError.message}`);
  }
  
  console.log("项目创建成功，ID:", createdProject[0].id);
  return createdProject[0];
}

// 创建团队
export async function createTeam(projectId, projectName, userId) {
  const newTeamData = {
    name: projectName + " Team",
    description: "Default team for " + projectName,
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
  return teamId;
}

// 创建团队自定义字段
export async function createTeamCustomField(teamId, fieldData, userId) {
  console.log(`正在关联自定义字段 ${fieldData.name} (ID: ${fieldData.id}) 到团队...`);
  
  // 创建team_custom_field关联
  const { data: teamCustomField, error: teamCustomFieldError } = await supabase
    .from('team_custom_field')
    .insert([{
      team_id: teamId,
      custom_field_id: fieldData.id,
      order_index: fieldData.order_index,
      tag_ids: getDefaultTagIdsForField(fieldData.id),
      created_by: userId
    }])
    .select();
    
  if (teamCustomFieldError) {
    console.error(`创建团队自定义字段关联失败:`, teamCustomFieldError);
    throw new Error(`Failed to create team custom field: ${teamCustomFieldError.message}`);
  }
  
  return teamCustomField[0];
}

// 创建团队自定义字段值
export async function createTeamCustomFieldValue(teamCustomFieldId, fieldData, userId) {
  let valueData = {};
  
  // 根据字段类型设置不同的值
  if (fieldData.id === 1) { // List视图
    valueData = {
      team_custom_field_id: teamCustomFieldId,
      name: "任务列表",
      description: "简单列表格式显示任务",
      icon: "List",
      value: {
        defaultView: "list",
        showCompletedTasks: true
      },
      created_by: userId
    };
  }
  else if (fieldData.id === 2) { // Dashboard视图
    valueData = {
      team_custom_field_id: teamCustomFieldId,
      name: "项目仪表盘",
      description: "项目进度和指标的可视化仪表盘",
      icon: "BarChart3",
      value: {
        showMetrics: true,
        refreshInterval: 60
      },
      created_by: userId
    };
  }
  else if (fieldData.id === 3) { // File视图
    valueData = {
      team_custom_field_id: teamCustomFieldId,
      name: "项目文件",
      description: "管理与任务相关的文件",
      icon: "Files",
      value: {
        sortBy: "createdAt",
        showFolders: true
      },
      created_by: userId
    };
  }
  else if (fieldData.id === 4) { // Gantt视图
    valueData = {
      team_custom_field_id: teamCustomFieldId,
      name: "甘特图",
      description: "项目进度的甘特图表示",
      icon: "GanttChart",
      value: {
        showCriticalPath: true,
        showDependencies: true,
        timeScale: "week"
      },
      created_by: userId
    };
  }
  else if (fieldData.id === 5) { // Board视图
    valueData = {
      team_custom_field_id: teamCustomFieldId,
      name: "团队任务看板",
      description: "任务看板视图",
      icon: "LayoutDashboard",
      value: {
        defaultView: "board",
        showCompletedTasks: true,
        groupBy: "status"
      },
      created_by: userId
    };
  }
  else if (fieldData.id === 6) { // Calendar视图
    valueData = {
      team_custom_field_id: teamCustomFieldId,
      name: "团队日历",
      description: "任务日历视图",
      icon: "Calendar",
      value: {
        defaultView: "month",
        showWeekends: true,
        firstDayOfWeek: 0
      },
      created_by: userId
    };
  }
  else if (fieldData.id === 7) { // Note视图
    valueData = {
      team_custom_field_id: teamCustomFieldId,
      name: "项目笔记",
      description: "项目相关笔记和文档",
      icon: "Text",
      value: {
        editorType: "rich",
        autosave: true
      },
      created_by: userId
    };
  }
  else if (fieldData.id === 8) { // Timeline视图
    valueData = {
      team_custom_field_id: teamCustomFieldId,
      name: "项目时间线",
      description: "任务时间线视图",
      icon: "GanttChart",
      value: {
        zoom: "month",
        showMilestones: true,
        groupBy: "assignee"
      },
      created_by: userId
    };
  }
  else if (fieldData.id === 9) { // Overview视图
    valueData = {
      team_custom_field_id: teamCustomFieldId,
      name: "项目概览",
      description: "项目进度和指标概览",
      icon: "LayoutGrid",
      value: {
        sections: ["progress", "recent", "upcoming"],
        refreshInterval: 300
      },
      created_by: userId
    };
  }
  
  // 创建字段值
  const { error: teamCustomFieldValueError } = await supabase
    .from('team_custom_field_value')
    .insert([valueData]);
    
  if (teamCustomFieldValueError) {
    // 检查是否为主键冲突错误 (23505)
    if (teamCustomFieldValueError.code === '23505' || 
        (teamCustomFieldValueError.message && 
        teamCustomFieldValueError.message.includes('23505'))) {
      console.warn(`${valueData.name}视图配置已存在，跳过创建`);
    } else {
      console.error(`创建${valueData.name}视图配置失败:`, teamCustomFieldValueError);
      throw new Error(`Failed to create ${valueData.name} view config: ${teamCustomFieldValueError.message}`);
    }
  }
}

// 将用户添加到团队
export async function addUserToTeam(userId, teamId) {
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
}

// 邀请团队成员
export async function inviteTeamMember(teamId, email, role = 'CAN_VIEW', invitedBy) {
  console.log(`正在邀请成员 ${email} 加入团队 ${teamId}，角色: ${role}...`);
  
  // 首先检查用户是否已存在
  const { data: existingUsers, error: userQueryError } = await supabase
    .from('user')
    .select('id')
    .eq('email', email)
    .limit(1);
    
  if (userQueryError) {
    console.error("查询用户失败:", userQueryError);
    throw new Error(`Failed to query user: ${userQueryError.message}`);
  }
  
  if (existingUsers && existingUsers.length > 0) {
    // 如果用户已存在，直接添加到团队
    const userId = existingUsers[0].id;
    
    const { error: addMemberError } = await supabase
      .from('user_team')
      .insert([{
        user_id: userId,
        team_id: teamId,
        role: role.toUpperCase(),
        created_by: invitedBy
      }]);
      
    if (addMemberError) {
      console.error("将用户添加到团队失败:", addMemberError);
      throw new Error(`Failed to add member to team: ${addMemberError.message}`);
    }
    
    console.log(`成功将用户 ${email} 添加到团队`);
  } else {
    // 如果用户不存在，创建邀请记录
    const { error: inviteError } = await supabase
      .from('user_team_invitation')
      .insert([{
        team_id: teamId,
        user_email: email,
        role: role.toUpperCase(),
        created_by: invitedBy
      }]);
      
    if (inviteError) {
      console.error("创建团队邀请失败:", inviteError);
      throw new Error(`Failed to create team invitation: ${inviteError.message}`);
    }
    
    console.log(`已为 ${email} 创建团队邀请`);
  }
}

// 创建默认分区
export async function createSection(teamId, userId) {
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
  
  return sectionData[0];
}

// 创建任务
export async function createTask(taskInfo, userId) {
  console.log("正在创建任务:", taskInfo.title);
  
  // 构建标准化的tag_values对象
  const tagValues = {
    title: taskInfo.title,
    description: taskInfo.description || '',
    due_date: taskInfo.due_date || null,
    priority: taskInfo.priority || 'MEDIUM',
    status: 'TODO'
  };
  
  // 调试输出
  console.log("任务数据:", JSON.stringify(tagValues, null, 2));
  
  const { data: taskData, error: taskError } = await supabase
    .from('task')
    .insert([{
      created_by: userId,
      tag_values: tagValues
    }])
    .select();
    
  if (taskError) {
    console.error("创建任务失败:", taskError);
    throw new Error(`Failed to create task: ${taskError.message}`);
  }
  
  console.log("任务创建成功，ID:", taskData[0].id);
  return taskData[0];
}

// 将任务添加到分区
export async function addTaskToSection(sectionId, taskId) {
  // 获取当前最新的section数据，以获取最新的task_ids数组
  const { data: currentSectionData, error: getSectionError } = await supabase
    .from('section')
    .select('task_ids')
    .eq('id', sectionId)
    .single();
    
  if (getSectionError) {
    console.error("获取分区数据失败:", getSectionError);
    throw new Error(`Failed to get current section data: ${getSectionError.message}`);
  }
  
  // 使用最新的task_ids数组进行更新
  const currentTaskIds = currentSectionData.task_ids || [];
  
  // Update section's task_ids array
  console.log("正在将任务添加到分区...");
  const { error: updateSectionError } = await supabase
    .from('section')
    .update({
      task_ids: [...currentTaskIds, taskId]
    })
    .eq('id', sectionId);
    
  if (updateSectionError) {
    console.error("更新分区任务列表失败:", updateSectionError);
    throw new Error(`Failed to update section task list: ${updateSectionError.message}`);
  }
} 