import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// DELETE /api/teams/teamUser - 删除单个团队成员
export async function DELETE(request) {
  try {
    // 从请求体中获取teamId和userId
    const body = await request.json();
    const { teamId, userId, createdBy } = body;
    
    // 验证必要参数
    if (!teamId || !userId) {
      return NextResponse.json(
        { error: '团队ID和用户ID是必需的' },
        { status: 400 }
      );
    }
    
    console.log(`API Route: 开始删除团队成员, teamId=${teamId}, userId=${userId}`);
    
    // 首先检查记录是否存在
    const { data: existingRecord, error: checkError } = await supabase
      .from('user_team')
      .select('id')
      .eq('team_id', teamId)
      .eq('user_id', userId)
      .single();
      
    if (checkError || !existingRecord) {
      console.error('API Route: 团队成员不存在或查询错误:', checkError);
      return NextResponse.json(
        { error: '团队成员不存在或查询出错' },
        { status: 404 }
      );
    }
    
    // 删除团队成员记录
    const { data: deletedRecord, error: deleteError } = await supabase
      .from('user_team')
      .delete()
      .eq('team_id', teamId)
      .eq('user_id', userId)
      .select();
      
    if (deleteError) {
      console.error('API Route: 删除团队成员失败:', deleteError);
      return NextResponse.json(
        { error: '删除团队成员失败: ' + deleteError.message },
        { status: 500 }
      );
    }
    
    console.log('API Route: 团队成员删除成功，删除的记录:', deletedRecord);
    
    return NextResponse.json({
      success: true,
      message: '团队成员已成功删除',
      deletedRecord,
      teamId,
      userId
    });
    
  } catch (error) {
    console.error('API Route: 删除团队成员时出错:', error);
    return NextResponse.json(
      { error: '服务器内部错误: ' + error.message },
      { status: 500 }
    );
  }
}

// PATCH /api/teams/teamUser - 更新团队成员角色
export async function PATCH(request) {
  try {
    // 从请求体中获取teamId、userId和新角色
    const body = await request.json();
    const { teamId, userId, role, createdBy } = body;
    
    // 验证必要参数
    if (!teamId || !userId || !role) {
      return NextResponse.json(
        { error: '团队ID、用户ID和角色是必需的' },
        { status: 400 }
      );
    }
    
    console.log(`API Route: 开始更新团队成员角色, teamId=${teamId}, userId=${userId}, role=${role}`);
    
    // 首先检查记录是否存在
    const { data: existingRecord, error: checkError } = await supabase
      .from('user_team')
      .select('*')
      .eq('team_id', teamId)
      .eq('user_id', userId)
      .single();
      
    if (checkError || !existingRecord) {
      console.error('API Route: 团队成员不存在或查询错误:', checkError);
      return NextResponse.json(
        { error: '团队成员不存在或查询出错' },
        { status: 404 }
      );
    }
    
    // 获取teamUser表的id作为entityId
    const teamUserId = existingRecord.id;
    console.log('API Route: 找到的团队成员ID:', teamUserId);
    
    // 更新团队成员角色
    const { data: updatedRecord, error: updateError } = await supabase
      .from('user_team')
      .update({ role, updated_at: new Date().toISOString() })
      .eq('team_id', teamId)
      .eq('user_id', userId)
      .select();
      
    if (updateError) {
      console.error('API Route: 更新团队成员角色失败:', updateError);
      return NextResponse.json(
        { error: '更新团队成员角色失败: ' + updateError.message },
        { status: 500 }
      );
    }
    
    // 确保我们有返回数据
    if (!updatedRecord || updatedRecord.length === 0) {
      console.log('API Route: 更新成功但没有返回记录');
      return NextResponse.json({
        success: true,
        message: '团队成员角色已成功更新',
        teamId,
        userId,
        role,
        entityId: teamUserId
      });
    }
    
    console.log('API Route: 团队成员角色更新成功，更新的记录:', updatedRecord);
    
    return NextResponse.json({
      success: true,
      message: '团队成员角色已成功更新',
      updatedRecord: updatedRecord[0],
      teamId,
      userId,
      role,
      entityId: updatedRecord[0].id
    });
    
  } catch (error) {
    console.error('API Route: 更新团队成员角色时出错:', error);
    return NextResponse.json(
      { error: '服务器内部错误: ' + error.message },
      { status: 500 }
    );
  }
} 