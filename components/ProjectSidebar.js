'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslations } from 'use-intl'
import CreateTeamDialog from './TeamDialog'
import { fetchProjectById } from '@/lib/redux/features/projectSlice'
import { fetchProjectTeams, updateTeamOrder, initializeTeamOrder } from '@/lib/redux/features/teamSlice'
import { useDispatch, useSelector } from 'react-redux'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { Home, Search, Lock, Unlock, Eye, Pencil, Plus, Settings, Users, Bell, Archive, Zap, Edit, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

export default function ProjectSidebar({ projectId }) {
  const t = useTranslations('Projects');
  const pathname = usePathname();
  const dispatch = useDispatch();
  const { projects } = useSelector((state) => state.projects);
  const { teams, lastFetchTime } = useSelector((state) => state.teams);
  const project = projects.find(p => String(p.id) === String(projectId));
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [isDropdownOpen, setDropdownOpen] = useState(false);
  const [themeColor, setThemeColor] = useState('');
  const [isMounted, setIsMounted] = useState(false);
  const dropdownRef = useRef(null);

  // 添加客户端挂载检查
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // 过滤出当前项目的团队
  const projectTeams = teams.filter(team => String(team.project_id) === String(projectId));

  const menuItems = projectTeams.map((team, index) => ({
    ...team,
    id: team.id,
    label: team.name,
    href: `/projects/${projectId}/${team.id}`,
    access: team.access,
    order_index: team.order_index || index
  })).sort((a, b) => a.order_index - b.order_index);

  // 加载项目和团队数据 - 添加防重复请求逻辑
  useEffect(() => {
    const loadData = async () => {
      if (!projectId) return;
      
      const currentProject = projects.find(p => String(p.id) === String(projectId));
      const hasTeams = teams.some(team => String(team.project_id) === String(projectId));
      
      // 检查是否最近已经获取过数据
      const lastFetchTimeForProject = lastFetchTime?.[`project_${projectId}`] || 0;
      const now = Date.now();
      const isRecentFetch = now - lastFetchTimeForProject < 5000; // 5秒内不重复获取
      
      // 使用 Promise.all 同时发起需要的请求
      const requests = [];
      if (!currentProject) {
        requests.push(dispatch(fetchProjectById(projectId)));
      }
      
      // 只有在没有最近获取过数据时才发起请求
      if (!hasTeams && !isRecentFetch) {
        console.log(`获取项目 ${projectId} 的团队数据`);
        requests.push(dispatch(fetchProjectTeams(projectId)));
      } else if (isRecentFetch) {
        console.log(`跳过项目 ${projectId} 的团队数据获取，因为最近已获取过`);
      }
      
      if (requests.length > 0) {
        await Promise.all(requests);
      }
    };
    
    // 添加防抖处理
    const debounceTimeout = setTimeout(() => {
      loadData();
    }, 300); // 300ms 的防抖时间

    return () => {
      clearTimeout(debounceTimeout);
    };
  }, [projectId, projects, teams, lastFetchTime, dispatch]); // 添加 lastFetchTime 作为依赖

  // 检查是否需要初始化顺序 - 添加防重复初始化逻辑
  useEffect(() => {
    const initializeTeamOrderWithCheck = () => {
      if (!projectId || projectTeams.length === 0) return;
      
      // 检查是否需要初始化顺序
      const needsInitialization = projectTeams.length > 0 && 
                                 projectTeams.every(team => !team.order_index || team.order_index === 0);
      
      if (!needsInitialization) return;
      
      // 检查是否正在初始化或最近已初始化
      const isInitializing = lastFetchTime?.[`initializing_${projectId}`];
      const lastInitTime = lastFetchTime?.[`init_order_${projectId}`] || 0;
      const now = Date.now();
      
      if (isInitializing) {
        console.log(`项目 ${projectId} 正在初始化顺序，跳过重复初始化`);
        return;
      }
      
      if (now - lastInitTime < 30000) { // 30秒内不重复初始化
        console.log(`项目 ${projectId} 30秒内已初始化过顺序，跳过`);
        return;
      }
      
      console.log(`初始化项目 ${projectId} 的团队顺序`);
      dispatch(initializeTeamOrder(projectId));
    };
    
    // 添加延迟，确保不会在页面加载时立即触发
    const timeout = setTimeout(() => {
      initializeTeamOrderWithCheck();
    }, 500);
    
    return () => clearTimeout(timeout);
  }, [projectTeams, projectId, lastFetchTime, dispatch]);

  useEffect(() => {
    if (project) {
      setThemeColor(project.theme_color || '#64748b');
    }
  }, [project]);

  // 处理拖拽结束 - 添加防重复更新逻辑
  const handleDragEnd = useCallback((result) => {
    if (!result.destination) return;

    const items = Array.from(menuItems);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // 检查是否正在更新或最近已更新
    const isUpdatingOrder = lastFetchTime?.[`updating_order_${projectId}`];
    const lastOrderTime = lastFetchTime?.[`order_project_${projectId}`] || 0;
    const now = Date.now();
    
    if (isUpdatingOrder) {
      console.log(`项目 ${projectId} 正在更新顺序，跳过重复更新`);
      return;
    }
    
    if (now - lastOrderTime < 5000) { // 5秒内不重复更新
      console.log(`项目 ${projectId} 5秒内已更新过顺序，跳过`);
      return;
    }

    // 更新每个项目的order值，保留原始团队的所有字段
    const updatedItems = items.map((item, index) => ({
      ...item,  // 保留所有原始字段
      order_index: index,  // 只更新order_index
    }));

    console.log(`更新项目 ${projectId} 的团队顺序`);
    // 更新Redux状态
    dispatch(updateTeamOrder(updatedItems));
  }, [menuItems, projectId, lastFetchTime, dispatch]);

  // 获取项目名称的首字母
  const getProjectInitial = (name) => {
    return name ? name.charAt(0).toUpperCase() : '?';
  };

  // 判断是否使用深色文字
  const shouldUseDarkText = (color) => {
    // 如果是白色或非常浅的颜色，返回true
    return color === '#FFFFFF' || color === '#FFF' || color === 'white' || 
           color?.toLowerCase().startsWith('#f') || color?.toLowerCase().startsWith('#e');
  };

  const renderTooltip = (Icon, tooltipText) => (
    <Tooltip delayDuration={50} side="right">
      <TooltipTrigger asChild>
        <div className="flex items-center">
          <Icon size={16} className="text-muted-foreground group-hover:text-foreground transition-colors" />
        </div>
      </TooltipTrigger>
      <TooltipContent side="right">
        <p>{tooltipText}</p>
      </TooltipContent>
    </Tooltip>
  );

  if (!isMounted) {
    return null; // 或者返回一个加载状态的占位符
  }

  return (
    <TooltipProvider>
      <div className="w-64 h-screen bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-r border-border">
        <div className="flex flex-col">
          {/* 项目名称下拉菜单 */}
          <div className="relative" ref={dropdownRef}>
            <button 
              onClick={() => setDropdownOpen(!isDropdownOpen)} 
              className="flex items-center w-full px-4 py-2.5 text-foreground hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <div 
                  className="w-6 h-6 rounded-md flex items-center justify-center text-white text-sm font-medium"
                  style={{ backgroundColor: project?.theme_color || '#E91E63' }}
                >
                  {getProjectInitial(project?.project_name)}
                </div>
                <span className="text-sm font-medium">{project ? project.project_name : 'Project'}</span>
              </div>
              <ChevronDown className="ml-auto text-muted-foreground"/>
            </button>
            <div className={cn(
              "absolute left-0 right-0 mt-1 py-1 bg-popover border border-border rounded-md shadow-lg z-10",
              isDropdownOpen ? 'block' : 'hidden'
            )}>
              <Link href="#" className="flex items-center px-4 py-2 hover:bg-accent text-sm gap-2 text-foreground transition-colors">
                <Zap size={16} className="text-yellow-500" />
                <span>{t('upgrade')}</span>
              </Link>
              <Link href="#" className="flex items-center px-4 py-2 hover:bg-accent text-sm gap-2 text-foreground transition-colors">
                <Edit size={16} className="text-muted-foreground" />
                <span>{t('edit')}</span>
              </Link>
              <Link href="#" className="flex items-center px-4 py-2 hover:bg-accent text-sm gap-2 text-foreground transition-colors">
                <Users size={16} className="text-muted-foreground" />
                <span>{t('members')}</span>
              </Link>
              <Link href="#" className="flex items-center px-4 py-2 hover:bg-accent text-sm gap-2 text-foreground transition-colors">
                <Bell size={16} className="text-muted-foreground" />
                <span>{t('notifications')}</span>
              </Link>
              <Link href="#" className="flex items-center px-4 py-2 hover:bg-accent text-sm gap-2 text-foreground transition-colors">
                <Settings size={16} className="text-muted-foreground" />
                <span>{t('settings')}</span>
              </Link>
              <div className="my-1 border-t border-border"></div>
              <Link href="#" className="flex items-center px-4 py-2 hover:bg-accent text-sm gap-2 text-destructive transition-colors">
                <Archive size={16} className="text-destructive" />
                <span>{t('archiveProject')}</span>
              </Link>
            </div>
          </div>

          {/* 搜索框 */}
          <div className="px-4 py-2">
            <div className="relative">
              <Search size={16} className="absolute left-2 top-2 text-muted-foreground" />
              <input
                type="text"
                placeholder={t('searchPlaceholder')}
                className="w-full pl-8 pr-3 py-1.5 bg-muted text-foreground placeholder-muted-foreground rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
              />
            </div>
          </div>

          {/* 导航链接 */}
          <nav className="mt-2">
            <Link
              href={`/projects/${projectId}`}
              className={cn(
                "flex items-center px-4 py-2 text-foreground hover:bg-accent/50 transition-colors",
                pathname === `/projects/${projectId}` && "bg-accent text-accent-foreground"
              )}
            >
              <Home size={16} className="text-muted-foreground" />
              <span className="ml-2 text-sm">{t('home')}</span>
            </Link>
            
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="teams">
                {(provided) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="space-y-0.5"
                  >
                    {menuItems.map((item, index) => {
                      const isActive = pathname === item.href;
                      return (
                        <Draggable key={item.id} draggableId={String(item.id)} index={index}>
                          {(provided) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                            >
                              <Link
                                href={item.href}
                                className={cn(
                                  "flex items-center px-4 py-1.5 text-foreground group",
                                  isActive ? "bg-accent text-accent-foreground" : "hover:bg-accent/50",
                                  "transition-colors"
                                )}
                              >
                                <div className="flex items-center w-full justify-between">
                                  <div className="flex items-center gap-2">
                                    <div 
                                      className={cn(
                                        "w-4 h-4 rounded-md flex items-center justify-center text-xs font-medium transition-all",
                                        shouldUseDarkText(themeColor) ? "text-gray-900" : "text-white",
                                        "ring-offset-background",
                                        isActive
                                          ? ""
                                          : ""
                                      )}
                                      style={{ backgroundColor: themeColor }}
                                    >
                                      {getProjectInitial(item.label)}
                                    </div>
                                    <span className="text-sm">{item.label}</span>
                                  </div>
                                  <div className="flex items-center">
                                    {(() => {
                                      switch (item.access) {
                                        case 'invite_only':
                                          return renderTooltip(Lock, t('inviteOnlyTooltip'));
                                        case 'can_edit':
                                          return renderTooltip(Pencil, t('canEditTooltip'));
                                        case 'can_check':
                                          return renderTooltip(Eye, t('canCheckTooltip'));
                                        case 'can_view':
                                          return renderTooltip(Unlock, t('canViewTooltip'));
                                        default:
                                          return renderTooltip(Lock, t('inviteOnlyTooltip'));
                                      }
                                    })()}
                                  </div>
                                </div>
                              </Link>
                            </div>
                          )}
                        </Draggable>
                      );
                    })}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          </nav>

          {/* 创建团队按钮 */}
          <button 
            onClick={() => setDialogOpen(true)} 
            className="flex items-center w-full px-4 py-2 text-foreground hover:bg-accent/50 transition-colors mt-2"
          >
            <Plus size={16} className="text-muted-foreground" />
            <span className="ml-2 text-sm">{t('new_team')}</span>
          </button>
        </div>

        <CreateTeamDialog 
          isOpen={isDialogOpen} 
          onClose={() => setDialogOpen(false)} 
          projectId={projectId}
        />
      </div>
    </TooltipProvider>
  )
} 