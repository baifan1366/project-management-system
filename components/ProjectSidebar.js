'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useTranslations } from 'use-intl'
import CreateTeamDialog from './TeamDialog'
import { fetchProjectById } from '@/lib/redux/features/projectSlice'
import { updateTeamOrder, fetchUserTeams, fetchTeamCustomFieldForTeam } from '@/lib/redux/features/teamSlice'
import { useDispatch, useSelector } from 'react-redux'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { Home, Search, Lock, Unlock, Eye, Pencil, Plus, Settings, Users, Bell, Archive, Zap, Edit, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { supabase } from '@/lib/supabase'
import { createSelector } from '@reduxjs/toolkit';

// 修改: 使用简单选择器而不是createSelector
const selectTeamCustomFields = state => state?.teams?.teamCustomFields ?? [];

// 修改: 改进选择器实现，确保有转换逻辑
const selectTeamFirstCFIds = createSelector(
  [state => state?.teams?.teamFirstCFIds ?? {}],
  (teamFirstCFIds) => {
    // 添加转换逻辑，例如过滤或格式化
    return Object.entries(teamFirstCFIds).reduce((acc, [teamId, cfId]) => {
      acc[teamId] = cfId;
      return acc;
    }, {});
  }
);

export default function ProjectSidebar({ projectId }) {
  const t = useTranslations('Projects');
  const pathname = usePathname();
  const dispatch = useDispatch();
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [isDropdownOpen, setDropdownOpen] = useState(false);
  const [themeColor, setThemeColor] = useState('');
  const dropdownRef = useRef(null);
  
  // 修改: 从Redux store获取用户团队和自定义字段
  const customFields = useSelector(selectTeamCustomFields);
  const teamFirstCFIds = useSelector(selectTeamFirstCFIds);
  const userTeams = useSelector(state => state.teams.userTeams); 
  const [projectName, setProjectName] = useState('');
  const { projects } = useSelector((state) => state.projects);
  const project = projects.find(p => String(p.id) === String(projectId));

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
  
  // 获取用户加入的团队 - 修改为使用Redux Action
  const fetchTeams = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 使用Redux action获取用户团队
      const teams = await dispatch(fetchUserTeams({ userId: user.id, projectId })).unwrap();
      
      // 对每个团队都获取自定义字段
      if (teams && teams.length > 0) {
        for (const team of teams) {
          await dispatch(fetchTeamCustomFieldForTeam(team.id)).unwrap();
        }
      }
    } catch (error) {
      console.error('获取用户团队失败:', error);
    }
  }, [projectId, dispatch]);

  // 初始加载用户团队
  useEffect(() => {
    dispatch(fetchProjectById(projectId));
    if (projectId) {
      fetchTeams();
    }
  }, [projectId, fetchTeams]);

  useEffect(() => {
    if (project) {
      setThemeColor(project.theme_color || '#64748b');
      setProjectName(project.project_name || 'Project');
    }
  }, [project]);

  // 确保有自定义字段数据后再生成菜单项
  const menuItems = useMemo(() => {
    if (!customFields || customFields.length === 0) return [];
    
    return userTeams.map((team, index) => {
      // 获取该团队的第一个自定义字段ID，如果没有则使用默认的第一个自定义字段
      const teamCFId = teamFirstCFIds[team.id] || customFields[0]?.id || '';
      
      return {
        ...team,
        id: team.id,
        label: team.name,
        href: `/projects/${projectId}/${team.id}/${teamCFId}`, 
        access: team.access,
        order_index: team.order_index || index
      };
    }).sort((a, b) => a.order_index - b.order_index);
  }, [userTeams, customFields, teamFirstCFIds]);

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
      fetchTeams();
    } catch (error) {
      console.error('更新团队顺序失败:', error);
    }
  }, [menuItems, projectId, dispatch, fetchTeams]);

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
                  style={{ backgroundColor: themeColor || '#E91E63' }}
                >
                  {getProjectInitial(projectName)}
                </div>
                <span className="text-sm font-medium">{projectName}</span>
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
            onClick={() => {
              setDialogOpen(true);
              fetchTeams();
            }} 
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