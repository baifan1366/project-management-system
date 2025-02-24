'use client';

import { useTranslations } from 'next-intl';
import { useRouter, useParams } from 'next/navigation';
import { Plus, Pen, Filter, SortAsc, Grid, MoreHorizontal, Share2, Star, StarOff, ChevronDown, Circle, Link, Archive, Trash, Palette, Settings2, List, LayoutGrid, Calendar, GanttChart, LayoutDashboard, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useEffect, useState } from 'react';
import { fetchTeamById, fetchProjectTeams, updateTeamStar } from '@/lib/redux/features/teamSlice';
import { useDispatch, useSelector } from 'react-redux';

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

  // 处理客户端挂载
  useEffect(() => {
    setMounted(true);
  }, []);

  // 处理 Redux 状态更新
  useEffect(() => {
    if (mounted) {
      setTeams(reduxTeams);
      setTeamsStatus(reduxTeamsStatus);
      const team = reduxTeams.find(team => String(team.id) === String(teamId));
      setSelectedTeam(team);
      if (team) {
        setIsStarred(team.star || false);
      }
    }
  }, [mounted, reduxTeams, reduxTeamsStatus, teamId]);

  // 处理数据加载
  useEffect(() => {
    const loadData = async () => {
      if (projectId && teamId && mounted) {
        try {
          await Promise.all([
            dispatch(fetchProjectTeams(projectId)),
            dispatch(fetchTeamById(teamId))
          ]);
        } finally {
          setIsLoading(false);
        }
      }
    };
    loadData();
  }, [dispatch, projectId, teamId, mounted]);

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
                    <Settings2 className="h-4 w-4 mr-2" />
                    {t('manageTeamPermissions')}
                  </DropdownMenuItem>
                  <DropdownMenuItem className="flex items-center px-3 py-2 text-sm">
                    <Palette className="h-4 w-4 mr-2" />
                    {t('setColorAndIcon')}
                  </DropdownMenuItem>
                  <hr className="my-1" />
                  <DropdownMenuItem className="flex items-center px-3 py-2 text-sm">
                    <Grid className="h-4 w-4 mr-2" />
                    {t('manageDependencies')}
                  </DropdownMenuItem>
                  <DropdownMenuItem className="flex items-center px-3 py-2 text-sm">
                    <Link className="h-4 w-4 mr-2" />
                    {t('copyTeamLink')}
                  </DropdownMenuItem>
                  <DropdownMenuItem className="flex items-center px-3 py-2 text-sm">
                    <Archive className="h-4 w-4 mr-2" />
                    {t('archive')}
                  </DropdownMenuItem>
                  <hr className="my-1" />
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
              <Button variant="ghost" size="icon">
                <Share2 className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon">
                <Palette className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <Tabs defaultValue="list" className="mt-2">
            <TabsList className="border-b-0">
              <TabsTrigger value="list" className="flex items-center gap-1">
                <List className="h-4 w-4" />
                {t('list')}
              </TabsTrigger>
              <TabsTrigger value="dashboard" className="flex items-center gap-1">
                <LayoutDashboard className="h-4 w-4" />
                {t('dashboard')}
              </TabsTrigger>
              <TabsTrigger value="board" className="flex items-center gap-1">
                <LayoutGrid className="h-4 w-4" />
                {t('board')}
              </TabsTrigger>
              <TabsTrigger value="calendar" className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {t('calendar')}
              </TabsTrigger>
              <TabsTrigger value="gantt" className="flex items-center gap-1">
                <GanttChart className="h-4 w-4" />
                {t('gantt')}
              </TabsTrigger>
              <Button variant="ghost" size="icon" className="ml-1 hover:bg-accent hover:text-accent-foreground">
                <Plus className="h-4 w-4" />
              </Button>
            </TabsList>
          </Tabs>
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
      </div>
    </div>
  )
}

