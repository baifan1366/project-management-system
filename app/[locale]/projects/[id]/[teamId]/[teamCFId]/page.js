'use client';

import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import { Plus, Pen, Filter, SortAsc, Grid, MoreHorizontal, Share2, Star, StarOff, ChevronDown, Circle, Link, Archive, Trash, Palette, Settings2, List, LayoutGrid, Calendar, GanttChart, LayoutDashboard, ArrowLeft, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useEffect, useState, useMemo } from 'react';
import { fetchTeamById, fetchProjectTeams, updateTeamStar } from '@/lib/redux/features/teamSlice';
import { useDispatch, useSelector } from 'react-redux';
import { createSelector } from '@reduxjs/toolkit';
import TaskTab from "@/components/team/TaskTab"
import InvitationDialog from '@/components/team/InvitationDialog';
import { fetchTeamCustomFieldById } from '@/lib/redux/features/teamCFSlice';
import TaskList from '@/components/team/list/TaskList';
import TaskGantt from '@/components/team/gantt/TaskGantt';
import TaskKanban from '@/components/team/kanban/TaskKanban';
import { store } from '@/lib/redux/store';

// 创建记忆化的选择器
const selectTeams = state => state.teams.teams;
const selectTeamError = state => state.teams.error;

const selectTeamById = createSelector(
  [selectTeams, (_, teamId) => teamId],
  (teams, teamId) => {
    if (!teams || !teamId) return null;
    return teams.find(team => String(team.id) === String(teamId)) || null;
  }
);

export default function TeamCustomFieldPage() {
  const t = useTranslations('CreateTask');
  const dispatch = useDispatch();
  const params = useParams();
  
  // 从URL参数中获取projectId、teamId和teamCFId
  const projectId = params?.id;
  const teamId = params?.teamId;
  const teamCFId = params?.teamCFId;
  
  // 使用记忆化的选择器
  const teamsError = useSelector(selectTeamError);
  const selectedTeam = useSelector(state => selectTeamById(state, teamId));
  
  const { currentItem, status: cfStatus, error: cfError } = useSelector((state) => state.teamCF);
  
  const [isLoading, setIsLoading] = useState(false);
  const [currentView, setCurrentView] = useState('list');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let unsubscribe = null;
    let isMounted = true;
    
    const loadData = async () => {
      if (!projectId || !teamId || !teamCFId) return;

      try {
        setIsLoading(true);
        
        // 先加载团队数据
        const teamResult = await dispatch(fetchTeamById(teamId)).unwrap();

        // 检查团队数据是否有效
        const hasValidTeam = teamResult && (
          (Array.isArray(teamResult) && teamResult.length > 0) ||
          (typeof teamResult === 'object' && teamResult.id)
        );

        if (!hasValidTeam) {
          await dispatch(fetchProjectTeams(projectId)).unwrap();
        }

        // 检查Redux状态中是否已加载完成所有团队的自定义字段
        const teamCustomFieldsStatus = (state) => state.teams.status;
        const status = teamCustomFieldsStatus(store.getState());
        
        // 只有在所有团队的自定义字段加载完成后，才加载特定字段
        if (status === 'succeeded') {
          if (isMounted) {
            await dispatch(fetchTeamCustomFieldById({
              teamId,
              teamCFId
            })).unwrap();
          }
        } else {
          // 如果未加载完成，则监听状态变化
          unsubscribe = store.subscribe(() => {
            const currentStatus = teamCustomFieldsStatus(store.getState());
            if (currentStatus === 'succeeded' && isMounted) {
              dispatch(fetchTeamCustomFieldById({
                teamId,
                teamCFId
              }));
              
              if (unsubscribe) {
                unsubscribe();
                unsubscribe = null;
              }
            }
          });
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadData();
    
    // 清理函数
    return () => {
      isMounted = false;
      setIsLoading(false);
      
      // 如果存在订阅，则取消订阅
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [dispatch, projectId, teamId, teamCFId]);

  // 将 star 状态直接从 selectedTeam 中获取，无需额外的 useEffect
  const isStarred = selectedTeam?.star || false;

  // 使用 useMemo 缓存自定义字段内容渲染结果
  const customFieldContent = useMemo(() => {
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
      return <TaskList projectId={projectId} teamId={teamId} teamCFId={teamCFId} />;
    }
    if (fieldType === 'GANTT') {
      return <TaskGantt projectId={projectId} teamId={teamId} teamCFId={teamCFId} />
    }
    if (fieldType === 'KANBAN') {
      return <TaskKanban projectId={projectId} teamId={teamId} teamCFId={teamCFId} />
    }
    
    return <div>暂不支持的字段类型: {fieldType}</div>;
  }, [currentItem]);

  // 处理加载状态
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  // 处理错误状态
  if (teamsError) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg text-red-500">
          {typeof teamsError === 'string' ? teamsError : 'Failed to load team data'}
        </div>
      </div>
    );
  }

  // 处理团队不存在的情况
  if (!selectedTeam && !isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Team not found</div>
      </div>
    );
  }

  const handleStarClick = async () => {
    const newStarStatus = !selectedTeam.star;
    try {
      await dispatch(updateTeamStar({ 
        teamId: selectedTeam.id, 
        star: newStarStatus 
      })).unwrap();
    } catch (error) {
      console.error('Error updating star status:', error);
    }
  };

  return (
    <div className="w-full h-full flex flex-col">
      <div className="max-w-none border-0 bg-background text-foreground flex flex-col flex-grow">
        <div>
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold">{selectedTeam?.name}</h2>
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
        <div className="w-full p-0">
          <div className="w-full border-b py-2 flex items-center justify-between">
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
        <div className="overflow-y-auto flex-grow h-0 mb-2" data-rbd-scroll-container-style="true">
          {customFieldContent}
        </div>
      </div>
    </div>
  );
}