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
import { fetchTeamCustomFieldById, fetchTeamCustomField } from '@/lib/redux/features/teamCFSlice';
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
import TaskAgile from '@/components/team/agile/TaskAgile';
import TaskPosts from '@/components/team/posts/TaskPosts';
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { fetchTeamUsers } from '@/lib/redux/features/teamUserSlice';
import { Skeleton } from "@/components/ui/skeleton";

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

// 新增：记忆化选择器，避免 useSelector 返回新数组
const selectTeamUsers = createSelector(
  state => state.teamUsers.teamUsers,
  (_, teamId) => teamId,
  (teamUsers, teamId) => teamUsers[teamId] || []
);

// Skeleton loaders for different field types
const ListSkeleton = () => (
  <div className="grid grid-cols-1 gap-4 mt-4">
    {[1, 2, 3, 4, 5].map((i) => (
      <div key={i} className="space-y-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4 rounded-full" />
          <Skeleton className="h-5 w-2/3" />
        </div>
        <Skeleton className="h-16 w-full" />
      </div>
    ))}
  </div>
);

const KanbanSkeleton = () => (
  <div className="flex gap-4 overflow-x-auto">
    {[1, 2, 3, 4].map((i) => (
      <div key={i} className="flex-shrink-0 w-72">
        <Skeleton className="h-8 w-full mb-2" />
        <div className="space-y-2">
          {[1, 2, 3].map((j) => (
            <Skeleton key={j} className="h-24 w-full rounded" />
          ))}
        </div>
      </div>
    ))}
  </div>
);

const CalendarSkeleton = () => (
  <div className="space-y-4">
    <div className="flex justify-between items-center">
      <Skeleton className="h-8 w-32" />
      <div className="flex gap-2">
        <Skeleton className="h-8 w-8 rounded-full" />
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
    </div>
    <div className="grid grid-cols-7 gap-1">
      {[...Array(7)].map((_, i) => (
        <Skeleton key={i} className="h-8 w-full" />
      ))}
    </div>
    <div className="grid grid-cols-7 gap-1">
      {[...Array(35)].map((_, i) => (
        <Skeleton key={i} className="h-24 w-full rounded" />
      ))}
    </div>
  </div>
);

const GanttSkeleton = () => (
  <div className="space-y-4">
    <div className="flex gap-2 overflow-x-auto">
      {[...Array(10)].map((_, i) => (
        <Skeleton key={i} className="h-8 w-24 flex-shrink-0" />
      ))}
    </div>
    <div className="space-y-2">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="flex items-center gap-2">
          <Skeleton className="h-8 w-48 flex-shrink-0" />
          <Skeleton className="h-8 w-full" />
        </div>
      ))}
    </div>
  </div>
);

// Add another skeleton component
const TaskTabSkeleton = () => (
  <div className="flex space-x-1 pb-4 overflow-x-auto">
    <Skeleton className="h-9 w-full rounded-md" />
  </div>
);

// Add a skeleton for team users
const TeamUsersSkeleton = () => (
  <div className="flex -space-x-2 overflow-hidden">
    {[1, 2, 3, 4].map((i) => (
      <Skeleton key={i} className="inline-block h-8 w-8 rounded-full border-2 border-background" />
    ))}
  </div>
);

const TeamCustomFieldPage = () => {
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
  // 从Redux获取项目数据
  const project = useSelector(state => 
    state.projects.projects ? state.projects.projects.find(p => p && String(p.id) === String(projectId)) : null
  );
  const { user } = useGetUser();
  const { confirm } = useConfirm();
  const { currentItem, status: cfStatus, error: cfError } = useSelector((state) => state.teamCF);
  // 替换为记忆化选择器
  const teamUsers = useSelector(state => selectTeamUsers(state, teamId));
  const [isLoading, setIsLoading] = useState(false);
  const [currentView, setCurrentView] = useState('list');
  const [open, setOpen] = useState(false);
  const [editTeamOpen, setEditTeamOpen] = useState(false);
  const [editTeamActiveTab, setEditTeamActiveTab] = useState("details");
  const [addButtonText, setAddButtonText] = useState('addTask');  
  const [triggerAction, setTriggerAction] = useState(false);
  const [onClose, setOnClose] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showVisibilityDialog, setShowVisibilityDialog] = useState(false);
  // 将 star 状态直接从 selectedTeam 中获取，无需额外的 useEffect
  const isStarred = selectedTeam?.star || false;
  
  // 添加一个新状态用于控制团队不存在的警告对话框
  const [showTeamNotFound, setShowTeamNotFound] = useState(false);
  // 添加状态用于控制项目已归档的警告对话框
  const [showArchivedDialog, setShowArchivedDialog] = useState(false);
  
  // 添加新状态，防止重复加载
  const [dataLoaded, setDataLoaded] = useState(false);
  const [teamCFLoaded, setTeamCFLoaded] = useState(false);
  const [teamUsersLoaded, setTeamUsersLoaded] = useState(false);
  
  // 添加缺失字段的翻译
  const fieldNotFoundText = "字段不存在或已被删除";
  const fieldMayBeDeletedText = "该字段可能已被删除或尚未创建";
  
  // 检查当前用户是否为团队所有者
  const isCurrentUserOwner = () => {
    if (!teamUsers || !user?.id) return false;
    const currentUserTeamMember = teamUsers.find(tu => String(tu.user.id) === String(user.id));
    return currentUserTeamMember?.role === 'OWNER';
  };
  
  // 检查当前用户是否为团队成员
  const isCurrentUserTeamMember = () => {
    if (!teamUsers || !user?.id) return false;
    // 这里有问题：当teamUsers为空数组时，即使用户是成员也会返回false
    // 确保在数据加载完成前不进行限制检查
    if (teamUsers.length === 0 && isLoading) return true;
    return teamUsers.some(tu => String(tu.user.id) === String(user.id));
  };
  
  // 当视图切换时，触发refreshKey更新
  const handleViewChange = (newView) => {
    setCurrentView(newView);
    // 增加refreshKey强制重新加载数据
    setRefreshKey(prev => prev + 1);
  };

  // 添加刷新内容的函数，传递给TaskTab组件
  const handleRefreshContent = () => {
    // 增加refreshKey强制重新加载数据
    setRefreshKey(prev => prev + 1);
    // 可以在这里添加其他需要刷新的逻辑
    return Promise.resolve(); // 返回一个成功的Promise
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
    // 增加刷新整个页面的功能
    window.location.reload();
    
    // 保留原有功能作为备份，虽然在页面刷新后这段代码不会执行
    setRefreshKey(prev => {
      const newValue = prev + 1;
      return newValue;
    }); // 每次编辑后递增
  };

  // 添加处理Plus按钮点击的函数
  const handleAddButtonClick = () => {
    // 如果addButtonText为空，设置默认值
    if (!addButtonText) {
      setAddButtonText('addTask');
    }
    
    // 触发动作信号并重置
    setTriggerAction(true);
    
    // 刷新内容
    setRefreshKey(prev => prev + 1);
    
    // 在短暂延迟后重置triggerAction
    setTimeout(() => {
      setTriggerAction(false);
    }, 500);
  };

  useEffect(() => {
    let isMounted = true;
    
    const loadData = async () => {
      if (!projectId || !teamId || !teamCFId || dataLoaded) return;

      try {
        setIsLoading(true);
        
        // 检查项目是否已归档
        if (project && project.archived) {
          if (isMounted) {
            setShowArchivedDialog(true);
            setIsLoading(false);
          }
          return;
        }

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

        // 检查项目是否已归档（API获取的数据）
        try {
          const projectResponse = await fetch(`/api/projects?projectId=${projectId}`);
          const projectData = await projectResponse.json();

          if (projectData.length > 0 && projectData[0].archived) {
            if (isMounted) {
              setShowArchivedDialog(true);
              setIsLoading(false);
            }
            return;
          }
        } catch (error) {
          console.error('Error checking project status:', error);
        }
        
        // 标记数据已加载
        if (isMounted) {
          setDataLoaded(true);
        }
      } catch (error) {
        console.error('Error loading team data:', error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadData();
    
    return () => {
      isMounted = false;
    };
  }, [dispatch, projectId, teamId, teamCFId, dataLoaded, project]);

  // Update the useEffect for loading team users data to show loading state
  useEffect(() => {
    let isMounted = true;
    
    const loadTeamUsers = async () => {
      if (!teamId || teamUsersLoaded || !dataLoaded) return;
      
      try {
        // Set a local loading state for team users
        if (isMounted) {
          setIsLoading(true);
        }
        
        await dispatch(fetchTeamUsers(teamId)).unwrap();
        
        if (isMounted) {
          setTeamUsersLoaded(true);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error loading team users:', error);
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    
    loadTeamUsers();
    
    return () => {
      isMounted = false;
    };
  }, [dispatch, teamId, teamUsersLoaded, dataLoaded]);

  // Update the useEffect for loading custom field data to show proper loading state
  useEffect(() => {
    let isMounted = true;
    
    const loadTeamCF = async () => {
      if (!teamId || !teamCFId || teamCFLoaded || !dataLoaded) return;
      
      try {
        // Show loading state
        if (isMounted) {
          setIsLoading(true);
        }
        
        const result = await dispatch(fetchTeamCustomFieldById({
          teamId,
          teamCFId
        })).unwrap();
        
        // Check if custom field exists
        if (!result || !result.id) {
          console.error('自定义字段不存在或已被删除:', teamCFId);
          
          // If field doesn't exist, get all team fields
          const allFields = await dispatch(fetchTeamCustomField(teamId)).unwrap();
          
          if (Array.isArray(allFields) && allFields.length > 0) {
            // Other fields exist, redirect to first field
            const sortedFields = [...allFields].sort((a, b) => 
              (a.order_index || 0) - (b.order_index || 0)
            );
            const firstFieldId = sortedFields[0].id;
            
            router.replace(`/projects/${projectId}/${teamId}/${firstFieldId}`);
            return;
          } else {
            // No fields exist, return to project page
            router.replace(`/projects/${projectId}`);
            return;
          }
        }
        
        if (isMounted) {
          setTeamCFLoaded(true);
          setRefreshKey(prev => prev + 1);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error loading team custom field:', error);
        
        // Error handling - if error is due to field not existing
        try {
          // Try to get all team fields
          const allFields = await dispatch(fetchTeamCustomField(teamId)).unwrap();
          
          if (Array.isArray(allFields) && allFields.length > 0) {
            // Other fields exist, redirect to first field
            const sortedFields = [...allFields].sort((a, b) => 
              (a.order_index || 0) - (b.order_index || 0)
            );
            const firstFieldId = sortedFields[0].id;
            
            router.replace(`/projects/${projectId}/${teamId}/${firstFieldId}`);
          } else {
            // No fields exist, return to project page
            router.replace(`/projects/${projectId}`);
          }
        } catch (redirectError) {
          console.error('重定向处理失败:', redirectError);
          // Last resort - go back to project page
          router.replace(`/projects/${projectId}`);
        } finally {
          if (isMounted) {
            setIsLoading(false);
          }
        }
      }
    };
    
    loadTeamCF();
    
    return () => {
      isMounted = false;
    };
  }, [dispatch, teamId, teamCFId, teamCFLoaded, dataLoaded, projectId, router]);

  useEffect(() => {
    // 如果团队已归档，立即跳转到项目主页
    if (selectedTeam?.archive) {
      // NOTE: This navigation is triggered because the team has been archived.
      router.replace(`/projects/${projectId}`);
      return;
    }
  }, [selectedTeam, projectId, router]);

  // 修改验证逻辑，彻底修复所有者/成员无法访问的问题
  useEffect(() => {
    // 只有在数据和团队成员都已加载完成后才验证
    if (dataLoaded && teamUsersLoaded && !isLoading) {
      // 首先检查团队是否存在
      if (!selectedTeam) {
        setShowTeamNotFound(true);
        return;
      }
      
      // 如果用户数据和团队成员数据都已加载
      if (user?.id && teamUsers.length > 0) {
        // 明确检查用户是否为团队成员
        const isMember = teamUsers.some(tu => String(tu.user.id) === String(user.id));
        if (!isMember) {
          setShowTeamNotFound(true);
        }
      }
    }
  }, [dataLoaded, teamUsersLoaded, isLoading, selectedTeam, teamUsers, user]);

  const handleCloseTeamNotFound = () => {
    setShowTeamNotFound(false);
    router.replace(`/${params.locale}/projects/${projectId}`);
  };

  // 使用 useMemo 缓存自定义字段内容渲染结果
  const customFieldContent = useMemo(() => {
    if (cfStatus === 'loading') {
      // Return different skeleton loaders based on the current view or last known field type
      // If we don't know the type yet, use a default skeleton
      if (currentItem?.custom_field?.type) {
        switch (currentItem.custom_field.type) {
          case 'LIST':
            return <ListSkeleton />;
          case 'KANBAN':
            return <KanbanSkeleton />;
          case 'CALENDAR':
            return <CalendarSkeleton />;
          case 'GANTT':
            return <GanttSkeleton />;
          default:
            return (
              <div className="grid grid-cols-1 gap-4 mt-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                ))}
              </div>
            );
        }
      } else {
        // Default skeleton when we don't know the field type
        return (
          <div className="grid grid-cols-1 gap-4 mt-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-16 w-full" />
              </div>
            ))}
          </div>
        );
      }
    }

    if (cfStatus === 'failed') {
      return <div>Error: {cfError}</div>;
    }

    // 如果currentItem为空或没有custom_field属性，则返回提示或尝试重定向
    if (!currentItem || !currentItem.custom_field) {
      // 如果已尝试加载但仍然没有数据，可能是字段已被删除
      if (teamCFLoaded) {
        return (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="text-lg text-muted-foreground mb-2">{fieldNotFoundText}</div>
            <div className="text-sm text-muted-foreground">{fieldMayBeDeletedText}</div>
          </div>
        );
      }
      return <div></div>;
    }

    const fieldType = currentItem.custom_field?.type;
    if (fieldType === 'LIST') {
      return <TaskList projectId={projectId} teamId={teamId} teamCFId={teamCFId} refreshKey={refreshKey} addButtonText={addButtonText} triggerAction={triggerAction}/>;
    }
    if (fieldType === 'GANTT') {
      return <TaskGantt projectId={projectId} teamId={teamId} teamCFId={teamCFId} refreshKey={refreshKey} addButtonText={addButtonText} triggerAction={triggerAction}/>;
    }
    if (fieldType === 'KANBAN') {
      return <TaskKanban projectId={projectId} teamId={teamId} teamCFId={teamCFId} refreshKey={refreshKey} addButtonText={addButtonText} triggerAction={triggerAction}/>;
    }
    if (fieldType === 'FILES') {
      return <TaskFile projectId={projectId} teamId={teamId} teamCFId={teamCFId} refreshKey={refreshKey} addButtonText={addButtonText}/>;
    }
    if (fieldType === 'WORKFLOW') {
      return <TaskWorkflow projectId={projectId} teamId={teamId} teamCFId={teamCFId} refreshKey={refreshKey} addTask={triggerAction && addButtonText === 'addTask'}/>;
    }
    if (fieldType === 'OVERVIEW') {
      return <TaskOverview projectId={projectId} teamId={teamId} teamCFId={teamCFId} refreshKey={refreshKey} addButtonText={addButtonText}/>;
    }
    if (fieldType === 'TIMELINE') {
      return <TaskTimeline projectId={projectId} teamId={teamId} teamCFId={teamCFId} refreshKey={refreshKey} addTask={triggerAction && addButtonText === 'addTask'}/>;
    }
    if (fieldType === 'CALENDAR') {
      return <TaskCalendar projectId={projectId} teamId={teamId} teamCFId={teamCFId} refreshKey={refreshKey} addTask={triggerAction && addButtonText === 'addTask'}/>;
    }
    if (fieldType === 'NOTE') { 
      return <TaskNotion projectId={projectId} teamId={teamId} teamCFId={teamCFId} refreshKey={refreshKey} addButtonText={addButtonText} triggerAction={triggerAction}/>;
    }
    if (fieldType === 'AGILE') {
      return <TaskAgile projectId={projectId} teamId={teamId} teamCFId={teamCFId} refreshKey={refreshKey} addButtonText={addButtonText}/>;
    }
    if (fieldType === 'POSTS') {
      return <TaskPosts projectId={projectId} teamId={teamId} teamCFId={teamCFId} refreshKey={refreshKey} addButtonText={addButtonText}/>;
    }
    return <div>Not supported field type: {fieldType}</div>;
  }, [currentItem, projectId, teamId, teamCFId, cfStatus, cfError, refreshKey, teamCFLoaded, fieldNotFoundText, fieldMayBeDeletedText, addButtonText, triggerAction]);

  // 处理加载状态
  if (isLoading) {
    return (
      <div className="w-full h-full flex flex-col">
        <div className="max-w-full border-0 bg-background text-foreground flex flex-col flex-grow">
          <div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between py-2 gap-2">
              <div className="flex flex-wrap items-center gap-1 max-w-full">
                <Skeleton className="h-8 w-[180px] sm:w-[220px]" />
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-8 w-24" />
              </div>
              <div className="flex items-center self-end sm:self-auto gap-2 mt-1 sm:mt-0">
                <Skeleton className="h-8 w-8 rounded-full" />
              </div>
            </div>
            <div className="overflow-x-auto">
              <TaskTabSkeleton />
            </div>
          </div>
          <div className="overflow-y-auto flex-grow h-0 mb-2 mt-2 w-full max-w-full lg:px-2 md:px-1 sm:px-0.5 px-0">
            <div className="grid grid-cols-1 gap-4 mt-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ))}
            </div>
          </div>
        </div>
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

  // 处理归档项目对话框关闭
  const handleArchivedDialogClose = () => {
    setShowArchivedDialog(false);
    router.replace(`/${params.locale}/projects`);
  };

  // 如果团队不存在，显示警告对话框
  if (showTeamNotFound) {
    return (
      <AlertDialog open={showTeamNotFound} onOpenChange={setShowTeamNotFound}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tConfirm('warning')}</AlertDialogTitle>
            <AlertDialogDescription>
              {tConfirm('teamNotFound')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={handleCloseTeamNotFound}>{tConfirm('close')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }
  
  // 如果项目已归档，显示归档警告对话框
  if (showArchivedDialog) {
    return (
      <AlertDialog open={showArchivedDialog} onOpenChange={setShowArchivedDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('projectArchived')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('projectArchivedDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={handleArchivedDialogClose}>{t('close')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
      <div className="max-w-full border-0 bg-background text-foreground flex flex-col flex-grow">
        <div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between py-2 gap-2">
            <div className="flex flex-wrap items-center gap-1 max-w-full">
              <div 
                className="group relative"
                title={selectedTeam?.name}
              >
                <h2 className="text-xl font-semibold truncate sm:truncate md:text-clip md:overflow-visible md:whitespace-normal max-w-[180px] sm:max-w-[220px] md:max-w-none mr-1">{selectedTeam?.name}</h2>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
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
                  {/* if owner, can archive, else cursor-not-allow */}
                  {isCurrentUserOwner() ? (
                    <DropdownMenuItem 
                      className="text-red-500 flex items-center px-3 py-2 text-sm focus:text-red-500"
                      onClick={handleArchiveTeam}
                      onClose={() => onClose(false)}
                    >
                      <Archive className="h-4 w-4 mr-2" />
                      {t('archiveTeam')}
                    </DropdownMenuItem>
                  ) : (
                    <div className="text-red-500 flex items-center px-3 py-2 text-sm cursor-not-allowed">
                      <Archive className="h-4 w-4 mr-2" />
                      {t('archiveTeam')}
                    </div>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
              {isCurrentUserOwner() ? (
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleStarClick}>
                  {isStarred ? <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" /> : <Star className="h-4 w-4" />}
                </Button>
              ) : (
                <Button variant="ghost" size="icon" className="h-8 w-8 cursor-not-allowed">
                  {isStarred ? <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" /> : <Star className="h-4 w-4" />}
                </Button>
              )}
              
              <div className="flex-shrink-0">
                {isCurrentUserOwner() ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        size="sm"
                        className={selectedTeam?.status ? `border-transparent shadow-none flex items-center px-2 sm:px-3 py-1 sm:py-2 text-xs sm:text-sm rounded-sm ${statusBgColors[selectedTeam.status]} ${statusColors[selectedTeam.status]} ${statusTopHoverColors[selectedTeam.status]} transition-colors duration-200` : ""}
                      >
                        <Circle 
                          className="h-3 w-3 sm:h-4 sm:w-4" 
                          style={selectedTeam?.status ? {fill: 'currentColor'} : {}} 
                        />
                        <span className="ml-1 truncate max-w-[80px] sm:max-w-full">
                          {selectedTeam?.status ? t(selectedTeam.status) : t('setStatus')}
                        </span>
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
                ) : (
                  <Button 
                    size="sm"
                    className={selectedTeam?.status ? `border-transparent shadow-none flex items-center px-2 sm:px-3 py-1 sm:py-2 text-xs sm:text-sm rounded-sm ${statusBgColors[selectedTeam.status]} ${statusColors[selectedTeam.status]} ${statusTopHoverColors[selectedTeam.status]} transition-colors duration-200 cursor-not-allowed` : "cursor-not-allowed"}
                  >
                    <Circle 
                      className="h-3 w-3 sm:h-4 sm:w-4" 
                      style={selectedTeam?.status ? {fill: 'currentColor'} : {}} 
                    />
                    <span className="ml-1 truncate max-w-[80px] sm:max-w-full">
                      {selectedTeam?.status ? t(selectedTeam.status) : t('setStatus')}
                    </span>
                  </Button>
                )}
              </div>
            </div>
            <div className="flex items-center self-end sm:self-auto gap-2 mt-1 sm:mt-0">
              {isCurrentUserOwner() && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => {
                    if (project?.visibility === 'public') {
                      setOpen(true);
                    } else {
                      setShowVisibilityDialog(true);
                    }
                  }}
                >
                  <Share2 className="h-4 w-4" />
                </Button>
              )}
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
            <TaskTab projectId={projectId} teamId={teamId} onViewChange={handleViewChange} handleRefreshContent={handleRefreshContent} />
          </div>
        </div>
        {/* <div className="w-full p-0">
          { currentItem?.custom_field?.type !== 'AGILE' &&
          currentItem?.custom_field?.type !== 'OVERVIEW' && (
            <div className="w-full border-b py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex">
                {currentItem?.custom_field?.type !== 'FILES' && 
                 currentItem?.custom_field?.type !== 'KANBAN' &&
                 currentItem?.custom_field?.type !== 'LIST' &&
                 currentItem?.custom_field?.type !== 'POSTS' && (
                  <>
                    <Button 
                      onClick={handleAddButtonClick}
                      variant="outline" 
                      size="sm" 
                      className="rounded-l-md rounded-r-none border-r-0"
                    >
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
                        <DropdownMenuItem 
                          onClick={() => setAddButtonText('addSection')} 
                          className="flex"
                          disabled={currentItem?.custom_field?.type === 'TIMELINE' || currentItem?.custom_field?.type === 'WORKFLOW' || currentItem?.custom_field?.type === 'CALENDAR'} 
                        >
                          <TextQuote className="h-4 w-4 mr-1" />
                          <span className="text-sm">{t('section')}</span>
                          {addButtonText === 'addSection' && <Check className="h-4 w-4 ml-auto" />}                      
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm">
                <Filter className="h-4 w-4 mr-1" />
                <span className="hidden md:inline">{t('filter')}</span>
              </Button>
              <Button variant="ghost" size="sm">
                <Grid className="h-4 w-4 mr-1" />
                <span className="hidden md:inline">{t('group')}</span>
              </Button>
            </div>
            
          </div>
          )}
          
        </div> */}
        <div className="overflow-y-auto flex-grow h-0 mb-2 mt-2 w-full max-w-full lg:px-2 md:px-1 sm:px-0.5 px-0" data-rbd-scroll-container-style="true">
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
      <AlertDialog open={showVisibilityDialog} onOpenChange={setShowVisibilityDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('projectNotPublic')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('projectNotPublicDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowVisibilityDialog(false)}>
              {t('ok')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default TeamCustomFieldPage;