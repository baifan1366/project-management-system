'use client';

import { useTranslations } from 'next-intl';
import { useRouter, useParams } from 'next/navigation';
import { Plus, Pen, Filter, SortAsc, Grid, MoreHorizontal, Share2, Star, StarOff, ChevronDown, Circle, Link, Archive, Trash, Palette, Settings2, List, LayoutGrid, Calendar, GanttChart, LayoutDashboard, ArrowLeft, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useEffect, useState, Suspense, useRef } from 'react';
import { fetchTeamById, fetchProjectTeams, updateTeamStar, fetchTeamUsers } from '@/lib/redux/features/teamSlice';
import { useDispatch, useSelector } from 'react-redux';
import { createSelector } from '@reduxjs/toolkit';
import TaskTab from "@/components/TaskTab"
import dynamic from 'next/dynamic';
import InvitationDialog from '@/components/InvitationDialog';

const TaskList = dynamic(() => import('@/components/TaskList'), {
  loading: () => <div>Loading...</div>
});

// 创建记忆化的选择器
const selectTeams = state => state.teams.teams;
const selectTeamsStatus = state => state.teams.status;
const selectTeamError = state => state.teams.error;

const selectTeamById = createSelector(
  [selectTeams, (_, teamId) => teamId],
  (teams, teamId) => {
    if (!teams || !teamId) return null;
    return teams.find(team => String(team.id) === String(teamId)) || null;
  }
);

// 创建一个统一的数据获取hook
// 没用到 但是别删！删了就error啦！！
const useProjectData = (projectId) => {
  const dispatch = useDispatch();
  const { projects, teams } = useSelector((state) => ({
    projects: state.projects.projects,
    teams: state.teams.teams
  }));

  useEffect(() => {
    const loadData = async () => {
      if (!projectId) return;
      
      // 只在数据不存在时加载
      if (!projects.some(p => String(p.id) === String(projectId))) {
        await dispatch(fetchProjectById(projectId));
      }
      
      if (!teams.some(team => String(team.project_id) === String(projectId))) {
        await dispatch(fetchProjectTeams(projectId));
      }
    };
    
    loadData();
  }, [projectId]); // 只依赖 projectId

  return {
    project: projects.find(p => String(p.id) === String(projectId)),
    teams: teams.filter(team => String(team.project_id) === String(projectId))
  };
};

export default function Task() {
  const t = useTranslations('CreateTask');
  const router = useRouter();
  const dispatch = useDispatch();
  const params = useParams();
  
  // 从URL参数中获取projectId和teamId
  const projectId = params?.id;
  const teamId = params?.teamId;
  
  // 使用记忆化的选择器
  const teamsState = useSelector(state => state.teams);
  const teamsStatus = useSelector(selectTeamsStatus);
  const teamsError = useSelector(selectTeamError);
  const selectedTeam = useSelector(state => selectTeamById(state, teamId));
  
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isStarred, setIsStarred] = useState(false);
  const [currentView, setCurrentView] = useState('list');
  const [open, setOpen] = useState(false);

  // 处理客户端挂载
  useEffect(() => {
    setMounted(true);
  }, []);

  // 处理数据加载
  useEffect(() => {
    const loadData = async () => {
      if (!projectId || !teamId || !mounted) return;

      try {
        setIsLoading(true);
        
        // 先加载团队数据
        const teamResult = await dispatch(fetchTeamById(teamId)).unwrap();
        
        // 检查团队数据是否有效
        const hasValidTeam = teamResult && (
          (Array.isArray(teamResult) && teamResult.length > 0) ||
          (typeof teamResult === 'object' && teamResult.id)
        );

        // 如果没有找到有效的团队数据，加载项目团队
        if (!hasValidTeam) {
          await dispatch(fetchProjectTeams(projectId)).unwrap();
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (!selectedTeam) {
      loadData();
    }
  }, [dispatch, projectId, teamId, mounted, selectedTeam]);

  // 更新星标状态
  useEffect(() => {
    if (selectedTeam) {
      setIsStarred(selectedTeam.star || false);
    }
  }, [selectedTeam]);

  // 在客户端渲染之前返回加载状态
  if (!mounted) {
    return <div className="h-screen" suppressHydrationWarning />;
  }

  // 处理加载状态
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg" suppressHydrationWarning>Loading...</div>
      </div>
    );
  }

  // 处理错误状态
  if (teamsError) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg text-red-500" suppressHydrationWarning>
          {typeof teamsError === 'string' ? teamsError : 'Failed to load team data'}
        </div>
      </div>
    );
  }

  // 处理团队不存在的情况
  if (!selectedTeam && !isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg" suppressHydrationWarning>Team not found</div>
      </div>
    );
  }

  const handleStarClick = async () => {
    const newStarStatus = !isStarred;
    setIsStarred(newStarStatus);
    try {
      await dispatch(updateTeamStar({ 
        teamId: selectedTeam.id, 
        star: newStarStatus 
      })).unwrap();
    } catch (error) {
      setIsStarred(!newStarStatus);
      console.error('Error updating star status:', error);
    }
  };

  const renderContent = () => {
    switch (currentView) {
      case 'list':
        return (
          <Suspense fallback={<div>加载中...</div>}>
            <TaskList projectId={projectId} teamId={teamId} />
          </Suspense>
        );
      case 'dashboard':
        return (
          <div className="p-4">
            <div className="text-sm text-muted-foreground">仪表板视图开发中...</div>
          </div>
        );
      case 'board':
        return (
          <div className="p-4">
            <div className="text-sm text-muted-foreground">看板视图开发中...</div>
          </div>
        );
      case 'calendar':
        return (
          <div className="p-4">
            <div className="text-sm text-muted-foreground">日历视图开发中...</div>
          </div>
        );
      case 'gantt':
        return (
          <div className="p-4">
            <div className="text-sm text-muted-foreground">甘特图视图开发中...</div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto px-4 py-2" suppressHydrationWarning>
      <div className="border-0 bg-background text-foreground">
        <div className="border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => router.back()}
                className="text-gray-800 mr-4 dark:text-gray-200"
                suppressHydrationWarning
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <h2 className="text-xl font-semibold" suppressHydrationWarning>{selectedTeam?.name}</h2>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-64 p-1">
                  <DropdownMenuItem className="flex items-center px-3 py-2 text-sm">
                    <Pen className="h-4 w-4 mr-2" />
                    {t('editTeamDetails')}
                  </DropdownMenuItem>
                  <DropdownMenuItem className="flex items-center px-3 py-2 text-sm">
                    <Palette className="h-4 w-4 mr-2" />
                    {t('setColorAndIcon')}
                  </DropdownMenuItem>
                  <DropdownMenuItem className="flex items-center px-3 py-2 text-sm">
                    <Link className="h-4 w-4 mr-2" />
                    {t('copyTeamLink')}
                  </DropdownMenuItem>
                  <hr className="my-1" />
                  <DropdownMenuItem className="flex items-center px-3 py-2 text-sm">
                    <Users className="h-4 w-4 mr-2" />
                    {t('manageMembers')}
                  </DropdownMenuItem>
                  <DropdownMenuItem className="flex items-center px-3 py-2 text-sm">
                    <Settings2 className="h-4 w-4 mr-2" />
                    {t('manageTeamPermissions')}
                  </DropdownMenuItem>
                  <DropdownMenuItem className="flex items-center px-3 py-2 text-sm">
                    <Grid className="h-4 w-4 mr-2" />
                    {t('manageDependencies')}
                  </DropdownMenuItem>
                  <hr className="my-1" />
                  <DropdownMenuItem className="text-red-500 flex items-center px-3 py-2 text-sm">
                    <Archive className="h-4 w-4 mr-2" />
                    {t('archiveTeam')}
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-red-500 flex items-center px-3 py-2 text-sm">
                    <Trash className="h-4 w-4 mr-2" />
                    {t('deleteTeam')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button variant="ghost" size="icon" onClick={handleStarClick}>
                {isStarred ? <Star className="h-4 w-4" /> : <StarOff className="h-4 w-4" />}
              </Button>
              <Button variant="ghost" size="sm">
                <Circle className="h-4 w-4 mr-2" />
                {t('setStatus')}
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => setOpen(true)}>
                <Share2 className="h-4 w-4" />
              </Button>
              <InvitationDialog
                open={open}
                onClose={() => setOpen(false)}
              />
              <Button variant="ghost" size="icon">
                <Palette className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <TaskTab projectId={projectId} teamId={teamId} onViewChange={setCurrentView} />
        </div>
        <div className="p-0">
          <div className="border-b p-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-1" />
                {t('addTask')}
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm">
                <Filter className="h-4 w-4 mr-1" />
                {t('filter')}
              </Button>
              <Button variant="ghost" size="sm">
                <SortAsc className="h-4 w-4 mr-1" />
                {t('sort')}
              </Button>
              <Button variant="ghost" size="sm">
                <Grid className="h-4 w-4 mr-1" />
                {t('group')}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem>{t('options')}</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
        {renderContent()}
      </div>
    </div>
  )
}

