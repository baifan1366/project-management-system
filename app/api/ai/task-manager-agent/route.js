import { NextResponse } from 'next/server';
import { parseInstruction, createProjectAndTasks } from './task-manager-service';
import { createErrorResponse, createSuccessResponse } from './utils';

export async function POST(request) {
  try {
    // 解析请求体
    const body = await request.json();
    const { instruction, userId, projectId } = body;
    
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
    
    // 调用AI解析指令
    const aiResponse = await parseInstruction(instruction);
    
    // 根据解析结果处理请求
    if (aiResponse.action === "create_project_and_tasks" || aiResponse.action === "create_tasks") {
      // 创建项目和任务
      const { projectId: createdProjectId, tasks } = await createProjectAndTasks(aiResponse, userId, projectId);
      
      return NextResponse.json({
        success: true,
        message: 'Tasks processed successfully',
        projectId: createdProjectId,
        tasks: tasks
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