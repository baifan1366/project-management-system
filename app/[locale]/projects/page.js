'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useSelector, useDispatch } from 'react-redux';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarIcon, EyeIcon, CheckCircleIcon, PlusCircleIcon, MessageSquareIcon, Plus, Archive, RefreshCcw, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getSubscriptionLimit } from '@/lib/subscriptionService';
import { limitExceeded } from '@/lib/redux/features/subscriptionSlice';
import useGetUser from '@/lib/hooks/useGetUser';
import CreateProjectDialog from '@/components/CreateProject';
import { toggleShowArchived, restoreProject } from '@/lib/redux/features/projectSlice';
import { useConfirm } from '@/hooks/use-confirm';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function ProjectsPage() {
  const { locale } = useParams();
  const router = useRouter();
  const dispatch = useDispatch();
  const { projects, status, showArchived } = useSelector((state) => state.projects);
  const t = useTranslations('Projects');
  const [formattedProjects, setFormattedProjects] = useState([]);
  const { user } = useGetUser();
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const { confirm } = useConfirm();
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => {
    if (projects.length > 0) {
      // 根据showArchived状态和statusFilter筛选项目
      const filteredProjects = projects.filter(project => {
        const matchesArchiveState = showArchived ? project.archived : !project.archived;
        const matchesStatusFilter = statusFilter === 'ALL' || project.status === statusFilter;
        return matchesArchiveState && matchesStatusFilter;
      });
      
      const formatted = filteredProjects.map(project => ({
        ...project,
        created_at: new Date(project.created_at).toLocaleDateString('en-US', { timeZone: 'UTC' }),
      }));
      setFormattedProjects(formatted);
    }
  }, [projects, showArchived, statusFilter]);

  const handleCardClick = (projectId) => {
    router.push(`/${locale}/projects/${projectId}`);
  };

  const handleAddTask = (e, projectId) => {
    e.stopPropagation();
    router.push(`/${locale}/projects/${projectId}/tasks/create`);
  };

  const handleTeamsChat = (e, projectId) => {
    e.stopPropagation();
    // 这里可以添加Teams集成的链接或功能
    window.open(`https://teams.microsoft.com/l/chat/0/0?users=${projectId}`, '_blank');
  };

  const handleRestoreProject = (e, projectId) => {
    e.stopPropagation();
    confirm({
      title: t('restoreProjectConfirmTitle'),
      description: t('restoreProjectConfirmDescription'),
      variant: "info",
      onConfirm: async () => {
        try {
          await dispatch(restoreProject(projectId)).unwrap();
        } catch (error) {
          console.error('恢复项目失败:', error);
        }
      }
    });
  };

  // 切换已归档/未归档项目视图
  const handleToggleArchived = () => {
    dispatch(toggleShowArchived());
  };

  // 添加检查订阅限制的函数
  const checkLimit = async (e) => {
    e.preventDefault();
    
    try {
      if (!user || !user.id) {
        console.error('User not authenticated');
        router.push(`/${locale}/login`);
        return;
      }
      
      const limitCheck = await getSubscriptionLimit(user.id, 'create_project');
      
      if (limitCheck && !limitCheck.allowed) {
        // 使用 Redux 的 limitExceeded action 显示限制模态框
        dispatch(limitExceeded({
          actionType: 'create_project',
          origin: 'projects/createProject',
          limitInfo: limitCheck
        }));
        return;
      }
      
      // 限制检查通过，跳转到创建项目页面
      router.push(`/${locale}/createProject`);
    } catch (error) {
      console.error('检查订阅限制失败:', error);
    }
  };

  const handleStatusFilterChange = (status) => {
    setStatusFilter(status);
  };

  const getStatusFilterLabel = () => {
    if (statusFilter === 'ALL') return t('allStatuses');
    return t(`status.${statusFilter.toLowerCase()}`);
  };

  if (status === 'loading') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="overflow-hidden bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-3 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="h-full m-6">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-bold tracking-tight">{t('projects')}</h1>
          {showArchived && (
            <Badge variant="outline" className="ml-2 bg-muted">
              {t('archivedProjects')}
            </Badge>
          )}
          {statusFilter !== 'ALL' && (
            <Badge variant="outline" className="ml-2 bg-muted">
              {getStatusFilterLabel()}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <Filter size={16} />
                {t('filterByStatus')}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>{t('projectStatus')}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem onClick={() => handleStatusFilterChange('ALL')}>
                  <span className={statusFilter === 'ALL' ? 'font-bold' : ''}>
                    {t('allStatuses')}
                  </span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleStatusFilterChange('PENDING')}>
                  <span className={statusFilter === 'PENDING' ? 'font-bold' : ''}>
                    {t('status.pending')}
                  </span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleStatusFilterChange('IN_PROGRESS')}>
                  <span className={statusFilter === 'IN_PROGRESS' ? 'font-bold' : ''}>
                    {t('status.in_progress')}
                  </span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleStatusFilterChange('COMPLETED')}>
                  <span className={statusFilter === 'COMPLETED' ? 'font-bold' : ''}>
                    {t('status.completed')}
                  </span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleStatusFilterChange('CANCELLED')}>
                  <span className={statusFilter === 'CANCELLED' ? 'font-bold' : ''}>
                    {t('status.cancelled')}
                  </span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleStatusFilterChange('ON_HOLD')}>
                  <span className={statusFilter === 'ON_HOLD' ? 'font-bold' : ''}>
                    {t('status.on_hold')}
                  </span>
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            onClick={handleToggleArchived}
            size="sm"
            variant="outline"
            className="flex items-center gap-2"
          >
            {showArchived ? (
              <>
                <RefreshCcw size={16} />
                {t('showActiveProjects')}
              </>
            ) : (
              <>
                <Archive size={16} />
                {t('showArchivedProjects')}
              </>
            )}
          </Button>
          
          {!showArchived && (
            <Button
              onClick={() => setOpenCreateDialog(true)}
              size="icon"
              variant="outline"
              className="inline-flex items-center justify-center transition-colors"
            >
              <Plus size={20}/>
            </Button>
          )}
        </div>
      </div>
      <ScrollArea className="h-[calc(100vh-10rem)]">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {formattedProjects.length === 0 ? (
            <div className="col-span-full text-center text-muted-foreground">
              {showArchived ? t('noArchivedProjects') : t('noProjects')}
            </div>
          ) : (
            formattedProjects.map((project) => (
              <Card 
                key={project.id}
                suppressHydrationWarning={true} 
                onClick={() => handleCardClick(project.id)}
                className={`relative overflow-hidden border transition-all duration-300 
                  bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-sm
                  hover:bg-gradient-to-br hover:from-card/95 hover:to-card/70
                  hover:border-primary/20 hover:shadow-[0_0_15px_rgba(var(--primary-rgb),0.15)]
                  cursor-pointer group
                  ${showArchived ? "border-dashed border-muted-foreground/30" : "border-transparent"}`}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/0 to-primary/0 opacity-0 group-hover:opacity-100 group-hover:via-primary/10 transition-opacity duration-700 pointer-events-none"></div>
                
                <CardHeader className="pb-2">
                  <CardTitle className="text-xl group-hover:text-primary transition-colors duration-300">
                    <div className="break-all hyphens-auto overflow-wrap-anywhere whitespace-normal overflow-hidden">
                      {project.project_name}
                    </div>
                  </CardTitle>
                  <CardDescription className="line-clamp-2 mt-1">{project.description}</CardDescription>
                </CardHeader>
                
                <CardContent>
                  <div className="flex flex-col gap-3 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4 text-muted-foreground/70" />
                      <span className="text-muted-foreground/70">{t('created_at')}:</span>
                      <span className="ml-auto font-medium">{project.created_at}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <EyeIcon className="h-4 w-4 text-muted-foreground/70" />
                      <span className="text-muted-foreground/70">{t('visibility')}:</span>
                      <span className="ml-auto font-medium">
                        {t(`${project.visibility ? project.visibility.toLowerCase() : ''}`)}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <CheckCircleIcon className="h-4 w-4 text-muted-foreground/70" />
                      <span className="text-muted-foreground/70">{t('statusTitle')}:</span>
                      <span className="ml-auto font-medium">
                        {t(`status.${project.status ? project.status.toLowerCase() : ''}`)}
                      </span>
                    </div>
                  </div>
                </CardContent>

                <CardFooter className="pt-0 pb-4 px-6 flex justify-end gap-2">
                  <TooltipProvider>
                    {showArchived ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-8 w-8 rounded-full bg-background/80 hover:bg-green-600/10 hover:text-green-600 border-none shadow-sm"
                            onClick={(e) => handleRestoreProject(e, project.id)}
                          >
                            <RefreshCcw className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{t('restoreProject')}</p>
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="icon" 
                              className="h-8 w-8 rounded-full bg-background/80 hover:bg-primary/10 hover:text-primary border-none shadow-sm"
                              onClick={(e) => handleAddTask(e, project.id)}
                            >
                              <PlusCircleIcon className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{t('addTask')}</p>
                          </TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="icon" 
                              className="h-8 w-8 rounded-full bg-background/80 hover:bg-[#4b53bc]/10 hover:text-[#4b53bc] border-none shadow-sm"
                              onClick={(e) => handleTeamsChat(e, project.id)}
                            >
                              <MessageSquareIcon className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{t('openInTeams')}</p>
                          </TooltipContent>
                        </Tooltip>
                      </>
                    )}
                  </TooltipProvider>
                </CardFooter>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>
      <CreateProjectDialog open={openCreateDialog} onOpenChange={setOpenCreateDialog} />
    </div>
  );
}