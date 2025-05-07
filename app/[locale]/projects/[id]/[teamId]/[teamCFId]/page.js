'use client';

import { useTranslations } from 'next-intl';
import { useParams, useRouter } from 'next/navigation';
import { Plus, Pen, Filter, SortAsc, Grid, MoreHorizontal, Share2, Star, StarOff, ChevronDown, Circle, Link, Archive, Trash, Palette, Settings2, List, LayoutGrid, Calendar, GanttChart, LayoutDashboard, ArrowLeft, Users, Check, TextQuote, CircleCheck, FileUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useEffect, useState, useMemo } from 'react';
import { fetchTeamById, fetchProjectTeams, updateTeamStar, updateTeam, fetchUserTeams } from '@/lib/redux/features/teamSlice';
import { useDispatch, useSelector } from 'react-redux';
import { createSelector } from '@reduxjs/toolkit';
import { fetchTeamCustomFieldById } from '@/lib/redux/features/teamCFSlice';
import { store } from '@/lib/redux/store';
import { useGetUser } from '@/lib/hooks/useGetUser';
import { useConfirm } from '@/hooks/use-confirm';
import TaskTab from "@/components/team/TaskTab"
import InvitationDialog from '@/components/team/InvitationDialog';
import EditTeamDialog from '@/components/team/EditTeamDialog';
import TaskList from '@/components/team/list/TaskList';
import TaskGantt from '@/components/team/gantt/TaskGantt';
import TaskKanban from '@/components/team/kanban/TaskKanban';
import TaskFile from '@/components/team/file/TaskFile';
import TaskWorkflow from '@/components/team/workflow/TaskWorkflow';
import TaskOverview from '@/components/team/overview/TaskOverview';
import TaskTimeline from '@/components/team/timeline/TaskTimeline';
import TaskNotion from '@/components/team/notion/TaskNotion';
import TaskCalendar from '@/components/team/calendar/TaskCalendar';

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
  const tConfirm = useTranslations('confirmation');
  const router = useRouter();
  // 从URL参数中获取projectId、teamId和teamCFId
  const projectId = params?.id;
  const teamId = params?.teamId;
  const teamCFId = params?.teamCFId;
  // 使用记忆化的选择器
  const teamsError = useSelector(selectTeamError);
  const selectedTeam = useSelector(state => selectTeamById(state, teamId));
  const { user } = useGetUser();
  const { confirm } = useConfirm();
  const { currentItem, status: cfStatus, error: cfError } = useSelector((state) => state.teamCF);
  const [isLoading, setIsLoading] = useState(false);
  const [currentView, setCurrentView] = useState('list');
  const [open, setOpen] = useState(false);
  const [editTeamOpen, setEditTeamOpen] = useState(false);
  const [editTeamActiveTab, setEditTeamActiveTab] = useState("details");
  const [addButtonText, setAddButtonText] = useState('addTask');  
  const [onClose, setOnClose] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  // 将 star 状态直接从 selectedTeam 中获取，无需额外的 useEffect
  const isStarred = selectedTeam?.star || false;  
  
  // 当视图切换时，触发refreshKey更新
  const handleViewChange = (newView) => {
    setCurrentView(newView);
    // 增加refreshKey强制重新加载数据
    setRefreshKey(prev => prev + 1);
  };
  
  // 定义团队状态及对应颜色
  const statusColors = {
    PENDING: "text-yellow-500",
    IN_PROGRESS: "text-blue-500",
    COMPLETED: "text-green-500",
    CANCELLED: "text-red-500",
    ON_HOLD: "text-gray-500"
  };
  
  const statusBgColors = {
    PENDING: "bg-transparent",
    IN_PROGRESS: "bg-transparent",
    COMPLETED: "bg-transparent",
    CANCELLED: "bg-transparent",
    ON_HOLD: "bg-transparent"
  };

  const statusFocusColors = {
    PENDING: "focus:bg-yellow-100 focus:text-yellow-700",
    IN_PROGRESS: "focus:bg-blue-100 focus:text-blue-700",
    COMPLETED: "focus:bg-green-100 focus:text-green-700",
    CANCELLED: "focus:bg-red-100 focus:text-red-700",
    ON_HOLD: "focus:bg-gray-100 focus:text-gray-700"
  }

  const statusTopHoverColors = {
    PENDING: "hover:bg-accent",
    IN_PROGRESS: "hover:bg-accent",
    COMPLETED: "hover:bg-accent",
    CANCELLED: "hover:bg-accent",
    ON_HOLD: "hover:bg-accent"
  };

  const statusHoverColors = {
    PENDING: "hover:bg-yellow-100",
    IN_PROGRESS: "hover:bg-blue-100",
    COMPLETED: "hover:bg-green-100",
    CANCELLED: "hover:bg-red-100",
    ON_HOLD: "hover:bg-gray-100"
  };

  const handleEditSuccess = () => {
    setRefreshKey(prev => {
      const newValue = prev + 1;
      return newValue;
    }); // 每次编辑后递增
  };

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
            
            // 数据加载完成后，更新刷新键以触发customFieldContent重新渲染
            setRefreshKey(prev => prev + 1);
          }
        } else {
          // 如果未加载完成，则监听状态变化
          unsubscribe = store.subscribe(() => {
            const currentStatus = teamCustomFieldsStatus(store.getState());
            if (currentStatus === 'succeeded' && isMounted) {
              dispatch(fetchTeamCustomFieldById({
                teamId,
                teamCFId
              })).then(() => {
                // 数据加载完成后，更新刷新键以触发重新渲染
                setRefreshKey(prev => prev + 1);
              });
              
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

  useEffect(() => {
    // 如果团队已归档，立即跳转到项目主页
    if (selectedTeam?.archive) {
      // NOTE: This navigation is triggered because the team has been archived.
      router.replace(`/projects/${projectId}`);
      return;
    }
    // 只要团队数据变化就刷新页面（可选，通常只需依赖 selectedTeam.archive）
    // router.replace(router.asPath); // 如果你想强制刷新页面，可以取消注释
  }, [selectedTeam, projectId, router]);

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
      return <TaskList projectId={projectId} teamId={teamId} teamCFId={teamCFId} refreshKey={refreshKey}/>;
    }
    if (fieldType === 'GANTT') {
      return <TaskGantt projectId={projectId} teamId={teamId} teamCFId={teamCFId} refreshKey={refreshKey}/>
    }
    if (fieldType === 'KANBAN') {
      return <TaskKanban projectId={projectId} teamId={teamId} teamCFId={teamCFId} refreshKey={refreshKey}/>
    }
    if (fieldType === 'FILES') {
      return <TaskFile projectId={projectId} teamId={teamId} teamCFId={teamCFId} refreshKey={refreshKey}/>
    }
    if (fieldType === 'WORKFLOW') {
      return <TaskWorkflow projectId={projectId} teamId={teamId} teamCFId={teamCFId} refreshKey={refreshKey}/>
    }
    if (fieldType === 'OVERVIEW') {
      return <TaskOverview projectId={projectId} teamId={teamId} teamCFId={teamCFId} refreshKey={refreshKey} />
    }
    if (fieldType === 'TIMELINE') {
      return <TaskTimeline projectId={projectId} teamId={teamId} teamCFId={teamCFId} refreshKey={refreshKey}/>
    }
    if (fieldType === 'CALENDAR') {
      return <TaskCalendar projectId={projectId} teamId={teamId} teamCFId={teamCFId} refreshKey={refreshKey}/>
    }
    if (fieldType === 'NOTE') {
      return <TaskNotion projectId={projectId} teamId={teamId} teamCFId={teamCFId} refreshKey={refreshKey}/>
    }
    return <div>暂不支持的字段类型: {fieldType}</div>;
  }, [currentItem, projectId, teamId, teamCFId, cfStatus, cfError, refreshKey]);

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
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error('Error updating star status:', error);
    }
  };

  const handleArchiveTeam = async () => {
    confirm({
      title: tConfirm('confirmArchiveTeam'),
      description: `${tConfirm('team')} "${selectedTeam.name}" ${tConfirm('willBeArchived')}`,
      variant: 'error',
      onConfirm: async () => {
        const userId = user?.id;
        // Await the updateTeam dispatch to ensure the archive operation completes before fetching user teams
        await dispatch(updateTeam({ 
          teamId, 
          data: {
            archive: true
          },
          user_id: userId,
          old_values: selectedTeam,
          updated_at: new Date().toISOString()
        }));
        console.log("confirm archive");
        setRefreshKey(prev => prev + 1);
        // Await fetching the updated user teams list
        await dispatch(fetchUserTeams({ userId, projectId }));
        setOnClose(true);
      }
    });
  };

  const handleStatusChange = async (newStatus) => {
    try {
      const userId = user?.id;
      await dispatch(updateTeam({ 
        teamId, 
        data: {
          status: newStatus
        },
        user_id: userId,
        old_values: selectedTeam,
        updated_at: new Date().toISOString()
      })).unwrap();
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error('Error updating team status:', error);
    }
  };

  return (
    <div className="w-full h-full flex flex-col">
      <div className="max-w-none border-0 bg-background text-foreground flex flex-col flex-grow">
        <div>
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-1">
              <h2 className="text-xl font-semibold">{selectedTeam?.name}</h2>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-60 p-1">
                  <DropdownMenuItem 
                    className="flex items-center px-3 py-2 text-sm"
                    onClick={() => {
                      setEditTeamActiveTab("details");
                      setEditTeamOpen(true);
                    }}
                  >
                    <Pen className="h-4 w-4 mr-2" />
                    {t('editTeamDetails')}
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="flex items-center px-3 py-2 text-sm"
                    onClick={() => {
                      setEditTeamActiveTab("members");
                      setEditTeamOpen(true);
                    }}
                  >
                    <Users className="h-4 w-4 mr-2" />
                    {t('manageMembers')}
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="flex items-center px-3 py-2 text-sm"
                    onClick={() => {
                      setEditTeamActiveTab("access");
                      setEditTeamOpen(true);
                    }}
                  >
                    <Settings2 className="h-4 w-4 mr-2" />
                    {t('editTeamAccess')}
                  </DropdownMenuItem>
                  <hr className="my-1" />
                  <DropdownMenuItem 
                    className="text-red-500 flex items-center px-3 py-2 text-sm focus:text-red-500"
                    onClick={handleArchiveTeam}
                    onClose={() => onClose(false)}
                  >
                    <Archive className="h-4 w-4 mr-2" />
                    {t('archiveTeam')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button variant="ghost" size="icon" onClick={handleStarClick}>
                {isStarred ? <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" /> : <Star className="h-4 w-4" />}
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    size="sm"
                    className={selectedTeam?.status ? `border-transparent shadow-none flex items-center px-3 py-2 text-sm rounded-sm ${statusBgColors[selectedTeam.status]} ${statusColors[selectedTeam.status]} ${statusTopHoverColors[selectedTeam.status]} transition-colors duration-200` : ""}
                  >
                    <Circle 
                      className="h-4 w-4" 
                      style={selectedTeam?.status ? {fill: 'currentColor'} : {}} 
                    />
                    {selectedTeam?.status ? t(selectedTeam.status) : t('setStatus')}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-55 p-1">
                  <DropdownMenuItem 
                    className={`flex items-center px-3 py-2 text-sm rounded-sm ${statusColors.PENDING} ${statusHoverColors.PENDING} transition-colors duration-200 ${statusFocusColors.PENDING}`}
                    onClick={() => handleStatusChange('PENDING')}
                  >
                    <Circle className="h-4 w-4" style={{fill: 'currentColor'}} />
                    {t('PENDING')}
                    {selectedTeam?.status === 'PENDING' && <Check className="h-4 w-4 ml-auto" />}
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className={`flex items-center px-3 py-2 text-sm rounded-sm ${statusColors.IN_PROGRESS} ${statusHoverColors.IN_PROGRESS} transition-colors duration-200 ${statusFocusColors.IN_PROGRESS}`}
                    onClick={() => handleStatusChange('IN_PROGRESS')}
                  >
                    <Circle className="h-4 w-4" style={{fill: 'currentColor'}} />
                    {t('IN_PROGRESS')}
                    {selectedTeam?.status === 'IN_PROGRESS' && <Check className="h-4 w-4 ml-auto" />}
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className={`flex items-center px-3 py-2 text-sm rounded-sm ${statusColors.COMPLETED} ${statusHoverColors.COMPLETED} transition-colors duration-200 ${statusFocusColors.COMPLETED}`}
                    onClick={() => handleStatusChange('COMPLETED')}
                  >
                    <Circle className="h-4 w-4" style={{fill: 'currentColor'}} />
                    {t('COMPLETED')}
                    {selectedTeam?.status === 'COMPLETED' && <Check className="h-4 w-4 ml-auto" />}
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className={`flex items-center px-3 py-2 text-sm rounded-sm ${statusColors.CANCELLED} ${statusHoverColors.CANCELLED} transition-colors duration-200 ${statusFocusColors.CANCELLED}`}
                    onClick={() => handleStatusChange('CANCELLED')}
                  >
                    <Circle className="h-4 w-4" style={{fill: 'currentColor'}} />
                    {t('CANCELLED')}
                    {selectedTeam?.status === 'CANCELLED' && <Check className="h-4 w-4 ml-auto" />}
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className={`flex items-center px-3 py-2 text-sm rounded-sm ${statusColors.ON_HOLD} ${statusHoverColors.ON_HOLD} transition-colors duration-200 ${statusFocusColors.ON_HOLD}`}
                    onClick={() => handleStatusChange('ON_HOLD')}
                  >
                    <Circle className="h-4 w-4" style={{fill: 'currentColor'}} />
                    {t('ON_HOLD')}
                    {selectedTeam?.status === 'ON_HOLD' && <Check className="h-4 w-4 ml-auto" />}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => setOpen(true)}>
                <Share2 className="h-4 w-4" />
              </Button>
              <InvitationDialog
                open={open}
                onClose={() => setOpen(false)}
              />
            </div>
          </div>
          <div className="overflow-x-auto" style={{ 
            scrollbarWidth: 'none', 
            msOverflowStyle: 'none' 
          }}>
            <style jsx>{`
              div::-webkit-scrollbar {
                display: none;
              }
            `}</style>
            <TaskTab projectId={projectId} teamId={teamId} onViewChange={handleViewChange} />
          </div>
        </div>
        <div className="w-full p-0">
          <div className="w-full border-b py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex">
                <Button variant="outline" size="sm" className="rounded-l-md rounded-r-none border-r-0">
                  <Plus className="h-4 w-4 mr-1" />
                  {t(addButtonText)}
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="rounded-l-none rounded-r-md px-1">
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => setAddButtonText('addTask')} className="flex">
                      <CircleCheck className="h-4 w-4 mr-1" />
                      <span className="text-sm">{t('task')}</span>
                      {addButtonText === 'addTask' && <Check className="h-4 w-4 ml-auto" />}                      
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setAddButtonText('addSection')} className="flex">
                      <TextQuote className="h-4 w-4 mr-1" />
                      <span className="text-sm">{t('section')}</span>
                      {addButtonText === 'addSection' && <Check className="h-4 w-4 ml-auto" />}                      
                    </DropdownMenuItem>
                    {/* <DropdownMenuItem onClick={() => setAddButtonText('addAttachment')} className="flex">
                      <FileUp className="h-4 w-4 mr-1" />
                      <span className="text-sm">{t('attachment')}</span>
                      {addButtonText === 'addAttachment' && <Check className="h-4 w-4 ml-auto" />}
                    </DropdownMenuItem> */}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
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
            </div>
          </div>
        </div>
        <div className="overflow-y-auto flex-grow h-0 mb-2 w-full max-w-full lg:px-2 md:px-1 sm:px-0.5 px-0" data-rbd-scroll-container-style="true">
          {customFieldContent}
        </div>
      </div>
      <EditTeamDialog 
        open={editTeamOpen} 
        onClose={() => setEditTeamOpen(false)} 
        team={selectedTeam}
        activeTab={editTeamActiveTab}
        onSuccess={handleEditSuccess}
        projectId={projectId}
      />
    </div>
  );
}