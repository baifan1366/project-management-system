import { NextResponse } from 'next/server';
import { parseInstruction, createProjectAndTasks, handleInvitation } from './task-manager-service';
import { isInvitationInstruction } from './utils';

export async function POST(request) {
  try {
    // 解析请求体
    const body = await request.json();
    const { instruction, userId, projectId, teamId, sectionId } = body;
    
    console.log("接收到请求:", { 
      instruction: instruction.substring(0, 50) + "...", 
      userId, 
      projectId: projectId || 'none',
      teamId: teamId || 'none',
      sectionId: sectionId || 'none'
    });
    
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
    
    // 检查是否是邀请指令
    if (isInvitationInstruction(instruction)) {
      console.log("检测到邀请指令，直接处理邀请");
      
      try {
        // 使用专门的邀请处理函数
        const invitationResult = await handleInvitation(instruction, userId, projectId, teamId, sectionId);
        
        return NextResponse.json({
          success: true,
          message: 'Team invitations processed successfully',
          invitations: invitationResult.invitations,
          projectId: invitationResult.projectId,
          teamId: invitationResult.teamId
        });
      } catch (inviteError) {
        console.error("处理邀请失败:", inviteError);
        return NextResponse.json(
          { error: 'Failed to process invitation', message: inviteError.message },
          { status: 500 }
        );
      }
    }
    
    // 如果不是邀请指令，调用AI解析指令
    console.log("使用AI解析指令");
    const aiResponse = await parseInstruction(instruction);
    
    // 根据是否提供projectId决定操作类型
    if (projectId) {
      // 对于TeamTaskAssistant - 添加任务到现有项目
      console.log("向现有项目添加任务:", projectId);
      
      // 强制将action设置为create_tasks，确保只添加任务而不创建新项目
      aiResponse.action = "create_tasks";
      
      // 传递所有可能的参数
      const { projectId: existingProjectId, tasks } = await createProjectAndTasks(
        aiResponse, 
        userId, 
        projectId,
        teamId,
        sectionId
      );
      
      return NextResponse.json({
        success: true,
        message: 'Tasks added to existing project successfully',
        projectId: existingProjectId,
        tasks: tasks
      });
    } else {
      // 对于TaskManagerAgent - 创建新项目和任务
      console.log("创建新项目和任务");
      
      // 根据解析结果处理请求
      if (aiResponse.action === "create_project_and_tasks" || aiResponse.action === "create_tasks") {
        // 创建项目和任务
        const { projectId: createdProjectId, tasks } = await createProjectAndTasks(aiResponse, userId);
        
        return NextResponse.json({
          success: true,
          message: 'New project and tasks created successfully',
          projectId: createdProjectId,
          tasks: tasks
        });
      } else {
        return NextResponse.json(
          { error: 'Unsupported action', message: 'The requested action type is not supported' },
          { status: 400 }
        );
      }
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