import { supabase } from '@/lib/supabase';
import { getDefaultTagIdsForField } from './utils';

// 创建项目
export async function createProject(projectData, userId) {
  
  // Ensure all required fields have values
  const newProjectData = {
    project_name: projectData.project_name || 'Untitled Project',
    description: projectData.description || '',
    visibility: projectData.visibility || 'private',
    status: projectData.status || 'PENDING',
    created_by: userId,
    // Include any other fields from projectData
    ...projectData
  };
  
  // Ensure created_by is set correctly (in case it was overwritten by projectData)
  newProjectData.created_by = userId;
  
  // 插入项目到数据库
  const { data: createdProject, error: projectError } = await supabase
    .from('project')
    .insert([newProjectData])
    .select();
    
  if (projectError) {
    console.error("创建项目失败:", projectError);
    throw new Error(`Failed to create project: ${projectError.message}`);
  }
  
  return createdProject[0];
}

// 创建团队
export async function createTeam(projectId, projectName, userId) {
  const newTeamData = {
    name: projectName + " Team",
    description: "Default team for " + projectName,
    access: "can_edit",
    created_by: userId,
    project_id: projectId,
    status: 'PENDING'
  };
  
  
  const { data: createdTeam, error: teamError } = await supabase
    .from('team')
    .insert([newTeamData])
    .select();
    
  if (teamError) {
    console.error("创建团队失败:", teamError);
    throw new Error(`Failed to create team: ${teamError.message}`);
  }
  
  const teamId = createdTeam[0].id;
  return teamId;
}

// 创建团队自定义字段
export async function createTeamCustomField(teamId, fieldData, userId) {
  
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
  // First check if a value already exists for this team custom field
  const { data: existingValues, error: checkError } = await supabase
    .from('team_custom_field_value')
    .select('id')
    .eq('team_custom_field_id', teamCustomFieldId)
    .limit(1);
    
  if (checkError) {
    console.error(`Failed to check existing values for field ${fieldData.name}:`, checkError);
    // Continue with the function rather than throwing error
  }
  
  // If there's already a value for this field, skip creation
  if (existingValues && existingValues.length > 0) {
    return;
  }
  
  let valueData = {};
  
  // Set different values based on field type
  if (fieldData.id === 1) { // Overview
    valueData = {
      team_custom_field_id: teamCustomFieldId,
      name: "Project Overview",
      description: "High-level overview of project progress and metrics",
      icon: "LayoutGrid",
      value: {
        sections: ["progress", "recent", "upcoming"],
        refreshInterval: 300
      },
      created_by: userId
    };
  }
  else if (fieldData.id === 2) { // List
    valueData = {
      team_custom_field_id: teamCustomFieldId,
      name: "Task List",
      description: "Simple list format for displaying tasks",
      icon: "List",
      value: {
        defaultView: "list",
        showCompletedTasks: true
      },
      created_by: userId
    };
  }
  else if (fieldData.id === 3) { // Timeline
    valueData = {
      team_custom_field_id: teamCustomFieldId,
      name: "Project Timeline",
      description: "Display tasks in timeline format",
      icon: "CalendarClock",
      value: {
        zoom: "month",
        showMilestones: true,
        groupBy: "assignee"
      },
      created_by: userId
    };
  }
  else if (fieldData.id === 4) { // Kanban
    valueData = {
      team_custom_field_id: teamCustomFieldId,
      name: "Kanban Board",
      description: "Kanban board for task management",
      icon: "SquareKanban",
      value: {
        defaultView: "board",
        showCompletedTasks: true,
        groupBy: "status"
      },
      created_by: userId
    };
  }
  else if (fieldData.id === 5) { // Calendar
    valueData = {
      team_custom_field_id: teamCustomFieldId,
      name: "Task Calendar",
      description: "Calendar view for scheduling tasks",
      icon: "CalendarRange",
      value: {
        defaultView: "month",
        showWeekends: true,
        firstDayOfWeek: 0
      },
      created_by: userId
    };
  }
  else if (fieldData.id === 6) { // Posts
    valueData = {
      team_custom_field_id: teamCustomFieldId,
      name: "Project Posts",
      description: "Manage project-related posts and announcements",
      icon: "Pen",
      value: {
        sortBy: "createdAt",
        showAuthor: true
      },
      created_by: userId
    };
  }
  else if (fieldData.id === 7) { // Files
    valueData = {
      team_custom_field_id: teamCustomFieldId,
      name: "Project Files",
      description: "Manage task-related files and documents",
      icon: "Files",
      value: {
        sortBy: "createdAt",
        showFolders: true
      },
      created_by: userId
    };
  }
  else if (fieldData.id === 8) { // Gantt
    valueData = {
      team_custom_field_id: teamCustomFieldId,
      name: "Gantt Chart",
      description: "Project progress in Gantt chart format",
      icon: "ChartGantt",
      value: {
        showCriticalPath: true,
        showDependencies: true,
        timeScale: "week"
      },
      created_by: userId
    };
  }
  else if (fieldData.id === 9) { // Workflow
    valueData = {
      team_custom_field_id: teamCustomFieldId,
      name: "Workflow View",
      description: "Display tasks in workflow format",
      icon: "Workflow",
      value: {
        showSteps: true,
        autoProgress: false
      },
      created_by: userId
    };
  }
  else if (fieldData.id === 10) { // Note
    valueData = {
      team_custom_field_id: teamCustomFieldId,
      name: "Project Notes",
      description: "Text field for task-related notes",
      icon: "NotebookText",
      value: {
        editorType: "rich",
        autosave: true
      },
      created_by: userId
    };
  }
  else if (fieldData.id === 11) { // Agile
    valueData = {
      team_custom_field_id: teamCustomFieldId,
      name: "Agile Board",
      description: "Agile board for managing tasks in agile workflow",
      icon: "BookText",
      value: {
        sprintDuration: 14,
        showBurndownChart: true,
        enableStoryPoints: true
      },
      created_by: userId
    };
  }
  
  // Create field value (without checking for error code 23505)
  const { error: teamCustomFieldValueError } = await supabase
    .from('team_custom_field_value')
    .insert([valueData]);
    
  if (teamCustomFieldValueError) {
    // Check if it's a primary key conflict error (23505)
    if (teamCustomFieldValueError.code === '23505' || 
        (teamCustomFieldValueError.message && 
        teamCustomFieldValueError.message.includes('23505'))) {
      console.warn(`${valueData.name} view configuration already exists, skipping creation`);
    } else {
      console.error(`Failed to create ${valueData.name} view configuration:`, teamCustomFieldValueError);
      throw new Error(`Failed to create ${valueData.name} view config: ${teamCustomFieldValueError.message}`);
    }
  }
}

// Add user to team
export async function addUserToTeam(userId, teamId) {
  
  // First check if user is already in team
  const { data: existingUserTeam, error: checkError } = await supabase
    .from('user_team')
    .select('id')
    .eq('user_id', userId)
    .eq('team_id', teamId)
    .limit(1);
    
  if (checkError) {
    console.error("Failed to check if user is in team:", checkError);
    // Continue anyway - we'll check for duplicates on insert
  }
  
  // If user is already in team, return success
  if (existingUserTeam && existingUserTeam.length > 0) {
    return;
  }
  
  // Important: Don't specify the 'id' field - let PostgreSQL auto-generate it
  try {
    const { error: userTeamError } = await supabase
      .from('user_team')
      .insert([{
        user_id: userId,
        team_id: teamId,
        role: 'OWNER',
        created_by: userId
      }]);
      
    if (userTeamError) {
      // Check if it's a duplicate entry error (user is already in team)
      if (userTeamError.code === '23505' && 
          userTeamError.message.includes('user_team_user_id_team_id_key')) {
        // User is already in team, this is fine
        return;
      }
      
      console.error("Failed to add user to team:", userTeamError);
      // Don't throw error - continue with the rest of the process
    }
  } catch (error) {
    console.error("Error in addUserToTeam:", error);
    // Don't throw error - continue with the rest of the process
  }
}

// 邀请团队成员
export async function inviteTeamMember(teamId, email, role = 'CAN_VIEW', invitedBy) {
  
  // 首先获取团队信息
  const { data: teamData, error: teamError } = await supabase
    .from('team')
    .select('name, project_id')
    .eq('id', teamId)
    .single();
    
  if (teamError) {
    console.error("获取团队信息失败:", teamError);
    throw new Error(`Failed to get team info: ${teamError.message}`);
  }
  
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
        
    // 给用户发送通知 - 不等待完成
    createTeamNotification(
      userId, 
      'TEAM_INVITATION',
      `Added to team: ${teamData.name}`,
      `You have been added to the team "${teamData.name}"`,
      teamId,
      'team'
    ).catch(error => {
      console.error("Failed to create notification, but continuing:", error);
    });
  } else {
    // 如果用户不存在，创建邀请记录
    const { error: inviteError } = await supabase
      .from('user_team_invitation')
      .insert([{
        user_email: email,
        team_id: teamId,
        role: role.toUpperCase(),
        status: 'PENDING',  // Explicitly set status
        created_by: invitedBy
      }]);
      
    if (inviteError) {
      console.error("创建团队邀请失败:", inviteError);
      throw new Error(`Failed to create team invitation: ${inviteError.message}`);
    }
    
    // 发送邀请邮件 - 不等待完成
    const invitationDetails = {
      teamId: teamId,
      teamName: teamData.name,
      permission: role.toUpperCase(),
      projectId: teamData.project_id
    };
    
    // 异步发送邮件，不等待
    sendInvitationEmail(email, teamData.name, invitationDetails).catch(emailError => {
      console.error("发送邀请邮件失败，但继续流程:", emailError);
    });
  }
  
  // 通知邀请者 - 不等待完成
  if (invitedBy) {
    createTeamNotification(
      invitedBy,
      'TEAM_INVITATION',
      `Invitation sent to ${email}`,
      `You invited ${email} to join the team "${teamData.name}"`,
      teamId,
      'team'
    ).catch(error => {
      console.error("Failed to create notification, but continuing:", error);
    });
  }
  
  return { success: true, email, teamId, role };
}

// 异步发送邀请邮件函数
async function sendInvitationEmail(email, teamName, invitationDetails) {
  try {
    const emailResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/send-team-invitation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: email,
        subject: `You're invited to join ${teamName} on Team Sync`,
        invitationDetails: invitationDetails
      }),
    });
    
    if (!emailResponse.ok) {
      const errorData = await emailResponse.json();
      throw new Error(errorData.error || "Failed to send invitation email");
    }
    
    return true;
  } catch (error) {
    console.error("发送邀请邮件失败:", error);
    return false;
  }
}

// 创建团队相关通知
async function createTeamNotification(
  userId,
  type,
  title,
  content,
  relatedEntityId,
  relatedEntityType = 'team'
) {
  try {
    const notificationData = {
      user_id: userId,
      title: title,
      content: content,
      type: type,
      related_entity_id: relatedEntityId ? relatedEntityId.toString() : null,
      related_entity_type: relatedEntityType,
      is_read: false
    };
    
    // 调用通知API
    const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(notificationData),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Failed to create notification: ${errorData.error || response.statusText}`);
    }
    
    return true;
  } catch (error) {
    console.error('创建通知失败:', error);
    return false;
  }
}

// Create default section
export async function createSection(teamId, userId) {
  
  try {
    // First check if a section already exists for this team
    const { data: existingSections, error: checkError } = await supabase
      .from('section')
      .select('id')
      .eq('team_id', teamId)
      .limit(1);
      
    if (checkError) {
      console.error("Failed to check for existing sections:", checkError);
      // Continue anyway
    }
    
    // If a section already exists for this team, return it
    if (existingSections && existingSections.length > 0) {
      return existingSections[0];
    }
    
    // Implement retry logic with random IDs for section creation
    const maxRetries = 5;
    let retryCount = 0;
    let lastError = null;
    
    while (retryCount < maxRetries) {
      try {
        // For first attempt, let PostgreSQL auto-generate ID
        // For retries, use a random ID
        let insertData = {
          name: "Section",
          team_id: teamId,
          created_by: userId,
          task_ids: [], // Initialize as empty array
          order_index: 0 // Explicitly set order_index
        };
        
        // Add random ID for retry attempts
        if (retryCount > 0) {
          // Generate a large random ID to avoid conflicts
          const randomId = Math.floor(100000 + Math.random() * 900000);
          insertData.id = randomId;
        }
        
        const { data: sectionData, error: sectionError } = await supabase
          .from('section')
          .insert([insertData])
          .select();
          
        if (sectionError) {
          throw sectionError;
        }
        
        return sectionData[0];
      } catch (error) {
        lastError = error;
        
        // Check if it's a duplicate key error (23505)
        const errorDetails = typeof error.message === 'string' ? error.message : JSON.stringify(error);
        const isDuplicateKeyError = errorDetails.includes('23505') || 
                                   errorDetails.includes('duplicate key') || 
                                   errorDetails.includes('already exists');
        
        if (!isDuplicateKeyError) {
          console.error("Failed to create section with non-recoverable error:", error);
          break;
        }
        
        retryCount++;
        
        // Short delay before next retry
        await new Promise(resolve => setTimeout(resolve, 500 * Math.pow(2, retryCount)));
      }
    }
    
    // If all retries failed, try one last time to get an existing section
    const { data: fallbackSection, error: fallbackError } = await supabase
      .from('section')
      .select('id')
      .eq('team_id', teamId)
      .limit(1);
      
    if (!fallbackError && fallbackSection && fallbackSection.length > 0) {
      return fallbackSection[0];
    }
    
    // Return a mock section as last resort
    console.error("Failed to create section after multiple attempts and couldn't find existing section:", lastError);
    return { id: 0, name: "Default Section", team_id: teamId, task_ids: [] };
  } catch (error) {
    console.error("Error in createSection:", error);
    // Return a mock section to continue the process
    return { id: 0, name: "Default Section", team_id: teamId, task_ids: [] };
  }
}

// 查找用户ID通过名称或邮箱
export async function getUserIdByNameOrEmail(nameOrEmail) {  
  if (!nameOrEmail) {
    return null;
  }
  
  // 先尝试按邮箱匹配
  if (nameOrEmail.includes('@')) {
    const { data: userData, error: userError } = await supabase
      .from('user')
      .select('id')
      .eq('email', nameOrEmail.trim().toLowerCase())
      .limit(1);
      
    if (userError) {
      console.error("查询用户失败:", userError);
      return null;
    }
    
    if (userData && userData.length > 0) {
      return userData[0].id;
    }
  }
  
  // 然后尝试按名称匹配
  const { data: userData, error: userError } = await supabase
    .from('user')
    .select('id')
    .ilike('name', `%${nameOrEmail.trim()}%`)
    .limit(1);
    
  if (userError) {
    console.error("查询用户失败:", userError);
    return null;
  }
  
  if (userData && userData.length > 0) {
    return userData[0].id;
  }
  
  return null;
}

// 创建任务
export async function createTask(taskInfo, userId) {
  
  // Process assignee logic
  let assigneeId = null;
  
  // Check if task info has specified assignees
  if (taskInfo.assignees && taskInfo.assignees.length > 0) {
    // Get the first specified username or email from AI response
    const assigneeName = taskInfo.assignees[0];
    assigneeId = await getUserIdByNameOrEmail(assigneeName);
  }
  
  // Build standardized tag_values object
  const tagValues = {
    1: taskInfo.name,
    5: taskInfo.description || '',
    6: taskInfo.start_date || new Date().toISOString().split('T')[0], //yyyy-mm-dd
    4: taskInfo.due_date || null,
    10: taskInfo.tag || 'MEDIUM',
    3: taskInfo.status ||'IN PROGRESS',
    2: assigneeId || ''
  };
  
  // Implement retry logic with exponential backoff
  const maxRetries = 5;
  let retryCount = 0;
  let lastError = null;
  
  while (retryCount < maxRetries) {
    try {
      const { data: taskData, error: taskError } = await supabase
        .from('task')
        .insert([{
          created_by: userId,
          tag_values: tagValues
        }])
        .select();
        
      // If we get here, the operation succeeded
      if (taskError) {
        throw taskError;
      }
      
      return taskData[0];
    } catch (error) {
      lastError = error;
      
      // Check if it's a duplicate key error (23505)
      const errorDetails = typeof error.message === 'string' ? error.message : JSON.stringify(error);
      const isDuplicateKeyError = errorDetails.includes('23505') || 
                                 errorDetails.includes('duplicate key') || 
                                 errorDetails.includes('already exists');
      
      // If it's not a duplicate key error, no need to retry
      if (!isDuplicateKeyError) {
        console.error("Failed to create task with non-recoverable error:", error);
        break;
      }
      
      retryCount++;
      
      // For duplicate key errors, try with an explicit insert using a random ID
      // This is only for the retries, not the first attempt
      try {
        // Generate a large random ID that's unlikely to conflict
        const randomId = Math.floor(100000 + Math.random() * 900000);
        
        const { data: taskData, error: taskError } = await supabase
          .from('task')
          .insert([{
            id: randomId,
            created_by: userId,
            tag_values: tagValues
          }])
          .select();
          
        if (taskError) {
          console.error(`Retry with random ID ${randomId} failed:`, taskError);
          // Continue to next iteration
        } else {
          return taskData[0];
        }
      } catch (retryError) {
        console.error("Error during retry:", retryError);
        // Continue to next iteration
      }
      
      // Short delay before next retry
      await new Promise(resolve => setTimeout(resolve, 500 * Math.pow(2, retryCount)));
    }
  }
  
  // If we've exhausted all retries, throw the last error
  console.error(`Failed to create task after ${maxRetries} attempts:`, lastError);
  throw new Error(`Failed to create task after ${maxRetries} attempts: ${lastError.message}`);
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