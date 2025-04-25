import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server';

export async function GET(request,{ params }) {
  try {
    const { userId } = await params;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // 1. 获取用户创建的项目
    const { data: ownedProjects, error: ownedError } = await supabase
      .from('project')
      .select('*')
      .eq('created_by', userId);

    if (ownedError) {
      console.error('Database error (owned projects):', ownedError)
      throw ownedError
    }

    // 2. 获取用户作为团队成员的项目
    const { data: teamProjects, error: teamError } = await supabase
      .from('user_team')
      .select(`
        team:team_id (
          project:project_id (*)
        )
      `)
      .eq('user_id', userId);

    if (teamError) {
      console.error('Database error (team projects):', teamError)
      throw teamError
    }

    // 提取团队项目并去除可能的null值
    const memberProjects = teamProjects
      .map(item => item.team?.project)
      .filter(project => project !== null);

    // 合并两个项目列表并去重
    const allProjectIds = new Set();
    const combinedProjects = [];

    // 首先添加用户自己的项目
    if (ownedProjects) {
      for (const project of ownedProjects) {
        if (!allProjectIds.has(project.id)) {
          allProjectIds.add(project.id);
          combinedProjects.push(project);
        }
      }
    }

    // 然后添加用户作为团队成员的项目
    if (memberProjects) {
      for (const project of memberProjects) {
        if (!allProjectIds.has(project.id)) {
          allProjectIds.add(project.id);
          combinedProjects.push(project);
        }
      }
    }

    return NextResponse.json(combinedProjects);
  } catch (error) {
    console.error('Error fetching projects:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch projects' },
      { status: 500 }
    )
  }
}