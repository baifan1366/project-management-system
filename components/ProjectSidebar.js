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
import { supabase } from '@/lib/supabase'
import { api } from '@/lib/api'
import { createSelector } from '@reduxjs/toolkit';

const selectTeamCFItems = state => state?.teamCF?.items ?? [];
const selectTeamCustomFields = createSelector(
  [selectTeamCFItems],
  (items) => {
    // 返回一个新的数组，而不是直接返回输入
    return [...items];
  }
);

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
  const [userTeams, setUserTeams] = useState([]);
  const dropdownRef = useRef(null);
  const prevDialogOpenRef = useRef(isDialogOpen);

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

  // 获取用户加入的团队
  const fetchUserTeams = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const teams = await api.teams.listUserTeams(user.id, projectId);
      setUserTeams(teams);
    } catch (error) {
      console.error('获取用户团队失败:', error);
    }
  }, [projectId]);

  // 监听对话框状态变化
  useEffect(() => {
    // 如果对话框从打开状态变为关闭状态，刷新团队列表
    if (prevDialogOpenRef.current && !isDialogOpen) {
      fetchUserTeams();
    }
    prevDialogOpenRef.current = isDialogOpen;
  }, [isDialogOpen, fetchUserTeams]);

  // 初始加载用户团队
  useEffect(() => {
    if (projectId) {
      fetchUserTeams();
    }
  }, [projectId, fetchUserTeams]);

  const customFields = useSelector(selectTeamCustomFields);

  // 过滤出当前项目的团队
  const menuItems = userTeams.map((team, index) => ({
    ...team,
    id: team.id,
    label: team.name,
    href: `/projects/${projectId}/${team.id}/${customFields[0].id}`, 
    access: team.access,
    order_index: team.order_index || index
  })).sort((a, b) => a.order_index - b.order_index);

  // 加载项目数据
  useEffect(() => {
    const loadData = async () => {
      if (!projectId) return;
      
      const currentProject = projects.find(p => String(p.id) === String(projectId));
      
      if (!currentProject) {
        await dispatch(fetchProjectById(projectId));
      }
    };
    
    // 添加防抖处理
    const debounceTimeout = setTimeout(() => {
      loadData();
    }, 300);

    return () => {
      clearTimeout(debounceTimeout);
    };
  }, [projectId, projects, dispatch]);

  useEffect(() => {
    if (project) {
      setThemeColor(project.theme_color || '#64748b');
    }
  }, [project]);

  // 处理拖拽结束
  const handleDragEnd = useCallback(async (result) => {
    if (!result.destination) return;

    const items = Array.from(menuItems);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // 更新每个项目的order值，保留原始团队的所有字段
    const updatedItems = items.map((item, index) => ({
      ...item,
      order_index: index,
    }));

    try {
      // 更新Redux状态
      await dispatch(updateTeamOrder(updatedItems)).unwrap();
      
      // 重新获取用户团队以确保顺序正确
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const teams = await api.teams.listUserTeams(user.id, projectId);
        setUserTeams(teams);
      }
    } catch (error) {
      console.error('更新团队顺序失败:', error);
    }
  }, [menuItems, projectId, dispatch]);

  // 获取项目名称的首字母
  const getProjectInitial = (name) => {
    return name ? name.charAt(0).toUpperCase() : '?';
  };

  // 判断是否使用深色文字
  const shouldUseDarkText = (color) => {
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
    return null;
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