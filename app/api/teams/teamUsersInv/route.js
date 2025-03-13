import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

// GET 获取团队邀请列表
export async function GET(request) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const teamId = searchParams.get('teamId');

    if (!teamId) {
      return NextResponse.json(
        { error: '缺少团队ID参数' },
        { status: 400 }
      );
    }

    // 获取团队邀请列表
    const { data: invitations, error } = await supabase
      .from('user_team_invitation')
      .select('*')
      .eq('team_id', teamId);

    if (error) {
      throw error;
    }

    // 确保返回数组
    return NextResponse.json(invitations || []);
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// POST 创建新的团队邀请
export async function POST(request) {
  try {
    const body = await request.json();
    const { teamId, userEmail, role, created_by } = body;

    if (!teamId || !userEmail || !role || !created_by) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      );
    }

    // 创建邀请
    const { data: invitation, error } = await supabase
      .from('user_team_invitation')
      .insert([
        {
          team_id: teamId,
          user_email: userEmail,
          role: role,
          created_by: created_by
        }
      ])
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json(invitation);
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// PATCH 更新邀请状态
export async function PATCH(request) {
  try {
    const body = await request.json();
    const { invitationId, status } = body;

    if (!invitationId || !status) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      );
    }

    // 更新邀请状态
    const { data: updatedInvitation, error } = await supabase
      .from('user_team_invitation')
      .update({ status })
      .eq('id', invitationId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json(updatedInvitation);
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// DELETE 删除邀请
export async function DELETE(request) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const invitationId = searchParams.get('invitationId');

    if (!invitationId) {
      return NextResponse.json(
        { error: '缺少邀请ID参数' },
        { status: 400 }
      );
    }

    // 删除邀请
    const { error } = await supabase
      .from('user_team_invitation')
      .delete()
      .eq('id', invitationId);

    if (error) {
      throw error;
    }

    return NextResponse.json({ message: '邀请已成功删除' });
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
