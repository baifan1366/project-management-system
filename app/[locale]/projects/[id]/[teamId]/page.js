'use client';

import { useTranslations } from 'next-intl';
import { useRouter, useParams } from 'next/navigation';
import { Plus, Pen, Filter, SortAsc, Grid, MoreHorizontal, Share2, Star, StarOff, ChevronDown, Circle, Link, Archive, Trash, Palette, Settings2, List, LayoutGrid, Calendar, GanttChart, LayoutDashboard, ArrowLeft, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useEffect, useState, Suspense } from 'react';
import { fetchTeamById, fetchProjectTeams, updateTeamStar } from '@/lib/redux/features/teamSlice';
import { useDispatch, useSelector } from 'react-redux';
import TaskTab from "@/components/TaskTab"
import dynamic from 'next/dynamic';
import InvitationDialog from '@/components/InvitationDialog';

const TaskList = dynamic(() => import('@/components/TaskList'), {
  loading: () => <div>加载中...</div>
});

export default function Task() {
  const t = useTranslations('CreateTask');
  const router = useRouter();
  const dispatch = useDispatch();
  const params = useParams();
  const { id: projectId, teamId } = params;
  
  // 将 Redux 选择器移到组件顶层
  const reduxTeams = useSelector((state) => state.teams.teams);
  const reduxTeamsStatus = useSelector((state) => state.teams.status);
  
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isStarred, setIsStarred] = useState(false);
  const [teams, setTeams] = useState([]);
  const [teamsStatus, setTeamsStatus] = useState('loading');
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [currentView, setCurrentView] = useState('list');
  const [open, setOpen] = useState(false);

  // 处理客户端挂载
  useEffect(() => {
    setMounted(true);
  }, []);

  // 处理 Redux 状态更新
  useEffect(() => {
    if (mounted) {
      const team = reduxTeams.find(team => String(team.id) === String(teamId));
      setTeams(reduxTeams);
      setTeamsStatus(reduxTeamsStatus);
      setSelectedTeam(team);
      if (team) {
        setIsStarred(team.star || false);
        setIsLoading(false);
      }
    }
  }, [mounted, reduxTeams, reduxTeamsStatus, teamId]);

  // 处理数据加载
  useEffect(() => {
    const loadData = async () => {
      if (projectId && teamId && mounted && teamsStatus !== 'loading') {
        const team = reduxTeams.find(team => String(team.id) === String(teamId));
        const hasProjectTeams = reduxTeams.some(t => String(t.project_id) === String(projectId));
        
        try {
          // 只在必要时加载数据
          const promises = [];
          if (!hasProjectTeams) {
            promises.push(dispatch(fetchProjectTeams(projectId)));
          }
          if (!team) {
            promises.push(dispatch(fetchTeamById(teamId)));
          }
          
          if (promises.length > 0) {
            await Promise.all(promises);
          } else {
            setIsLoading(false);
          }
        } catch (error) {
          console.error('Error loading data:', error);
          setIsLoading(false);
        }
      }
    };
    loadData();
  }, [dispatch, projectId, teamId, mounted, reduxTeams, teamsStatus]);

  // 在客户端渲染之前返回加载状态
  if (!mounted) {
    return <div className="h-screen" suppressHydrationWarning />;
  }

  if (isLoading || teamsStatus === 'loading') {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg" suppressHydrationWarning>Loading...</div>
      </div>
    );
  }

  if (!selectedTeam) {
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
      }));
    } catch (error) {
      // 如果失败，恢复原始状态
      setIsStarred(!newStarStatus);
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
                <Circle />
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

