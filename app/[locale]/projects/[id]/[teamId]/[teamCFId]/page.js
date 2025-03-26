'use client';

import { useTranslations } from 'next-intl';
import { useRouter, useParams } from 'next/navigation';
import { Plus, Pen, Filter, SortAsc, Grid, MoreHorizontal, Share2, Star, StarOff, ChevronDown, Circle, Link, Archive, Trash, Palette, Settings2, List, LayoutGrid, Calendar, GanttChart, LayoutDashboard, ArrowLeft, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useEffect, useState, Suspense} from 'react';
import { fetchTeamById, fetchProjectTeams, updateTeamStar } from '@/lib/redux/features/teamSlice';
import { useDispatch, useSelector } from 'react-redux';
import { createSelector } from '@reduxjs/toolkit';
import TaskTab from "@/components/TaskTab"
import InvitationDialog from '@/components/InvitationDialog';
import { fetchTeamCustomFieldById } from '@/lib/redux/features/teamCFSlice';
import TaskList from '@/components/TaskList';

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

export default function TeamCustomFieldPage() {
  const t = useTranslations('CreateTask');
  const router = useRouter();
  const dispatch = useDispatch();
  const params = useParams();
  
  // 从URL参数中获取projectId、teamId和teamCFId
  const projectId = params?.id;
  const teamId = params?.teamId;
  const teamCFId = params?.teamCFId;
  
  // 使用记忆化的选择器
  const teamsState = useSelector(state => state.teams);
  const teamsStatus = useSelector(selectTeamsStatus);
  const teamsError = useSelector(selectTeamError);
  const selectedTeam = useSelector(state => selectTeamById(state, teamId));
  
  const { currentItem, status: cfStatus, error: cfError } = useSelector((state) => state.teamCF);
  
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
      if (!projectId || !teamId || !mounted || !teamCFId) return;

      try {
        setIsLoading(true);
        
        // 加载团队数据
        const teamResult = await dispatch(fetchTeamById(teamId)).unwrap();
        
        // 加载自定义字段数据
        await dispatch(fetchTeamCustomFieldById({
          teamId,
          teamCFId
        }));

        // 检查团队数据是否有效
        const hasValidTeam = teamResult && (
          (Array.isArray(teamResult) && teamResult.length > 0) ||
          (typeof teamResult === 'object' && teamResult.id)
        );

        if (!hasValidTeam) {
          await dispatch(fetchProjectTeams(projectId)).unwrap();
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [dispatch, teamId, teamCFId, mounted]); // 移除 selectedTeam 依赖，确保 teamCFId 变化时重新加载


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

  // 根据自定义字段的类型渲染相应的组件
  const renderCustomFieldContent = () => {
    if (cfStatus === 'loading') {
      return <div></div>;
    }

    if (cfStatus === 'failed') {
      return <div>Error: {cfError}</div>;
    }

    if (!currentItem) {
      return <div></div>;
    }
    const fieldType = currentItem.custom_field?.type;
    if (fieldType === 'LIST') {
      return <TaskList projectId={projectId} teamId={teamId} />;
    }
    
    return <div>暂不支持的字段类型: {fieldType}</div>;
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
        {renderCustomFieldContent()}
      </div>
    </div>
  );
}