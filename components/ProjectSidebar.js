'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useTranslations } from 'use-intl'
import CreateTeamDialog from './team/TeamDialog'
import { updateTeamOrder, fetchUserTeams, fetchTeamCustomFieldForTeam } from '@/lib/redux/features/teamSlice'
import { useDispatch, useSelector } from 'react-redux'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { Home, Search, Lock, Unlock, Eye, Pencil, Plus, Settings, Users, Bell, Archive, Zap, Edit, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useGetUser } from '@/lib/hooks/useGetUser';
import { createSelector } from '@reduxjs/toolkit';
import { fetchProjectById } from '@/lib/redux/features/projectSlice'

// 获取团队自定义字段
const selectTeamCustomFields = state => state?.teams?.teamCustomFields ?? [];

// 获取团队自定义字段ID
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
  const dropdownRef = useRef(null);
  
  const customFields = useSelector(selectTeamCustomFields);
  const teamFirstCFIds = useSelector(selectTeamFirstCFIds);
  const userTeams = useSelector(state => state.teams.userTeams); 
  const teamDeletedStatus = useSelector(state => state.teams.teamDeletedStatus);
  const teamUpdatedStatus = useSelector(state => state.teams.teamUpdatedStatus);
  const [projectName, setProjectName] = useState('');
  const [themeColor, setThemeColor] = useState('');
  const { user } = useGetUser();

  // 项目名称下拉菜单
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
  const fetchTeams = useCallback(async () => {
    try {
      if (!user) return;

      // 使用Redux action获取用户团队
      const teams = await dispatch(fetchUserTeams({ userId: user.id, projectId })).unwrap();
      // 对每个团队都获取自定义字段
      if (teams && teams.length > 0) {
        // 并行等待所有自定义字段获取完成
        const customFieldPromises = teams.map(team => 
          dispatch(fetchTeamCustomFieldForTeam(team.id)).unwrap()
        );
        
        // 等待所有自定义字段加载完成
        await Promise.all(customFieldPromises);
      }
    } catch (error) {
      console.error('获取用户团队失败:', error);
    }
  }, [user]);

  const getProjectData = useCallback(async () => {
    if (projectId) {
      const project = await dispatch(fetchProjectById(projectId)).unwrap();
      setThemeColor(project?.theme_color || '#64748b');
      setProjectName(project?.project_name || 'Project');
    }
  }, [projectId, dispatch]);

  // 然后在useEffect中添加真正的依赖项
  useEffect(() => {
    if (dispatch && projectId) {
      fetchTeams();
      getProjectData();
    } 
  }, [dispatch, projectId, fetchTeams, getProjectData]);

  // 监听团队删除状态，当团队被删除时刷新团队列表
  useEffect(() => {
    if (teamDeletedStatus === 'succeeded') {
      fetchTeams();
    }
  }, [teamDeletedStatus, fetchTeams]);

  // 监听团队更新状态，当团队被更新时刷新团队列表
  useEffect(() => {
    if (teamUpdatedStatus === 'succeeded') {
      fetchTeams();
    }
  }, [teamUpdatedStatus, fetchTeams]);

  // 确保有自定义字段数据后再生成菜单项
  const menuItems = useMemo(() => {
    if (!customFields || customFields.length === 0) return [];
    
    // 只显示未归档的团队
    const activeTeams = userTeams.filter(team => team.archive === false);

    return activeTeams.map((team, index) => {
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
  }, [userTeams, customFields, teamFirstCFIds, userTeams.length]);

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

  // 根据颜色值获取对应的Tailwind类
  const getColorClass = (color) => {
    if (!color) return "bg-gray-500 text-white"; // 默认颜色

    // 颜色名称到Tailwind类的映射
    const colorClassMap = {
      "black": "bg-black text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90",
      "red": "bg-[#c72c41] text-white hover:bg-[#c72c41]/90 dark:bg-[#c72c41] dark:text-white dark:hover:bg-[#c72c41]/90",
      "orange": "bg-[#d76d2b] text-white hover:bg-[#d76d2b]/90 dark:bg-[#d76d2b] dark:text-white dark:hover:bg-[#d76d2b]/90",
      "green": "bg-[#008000] text-white hover:bg-[#008000]/90 dark:bg-[#008000] dark:text-white dark:hover:bg-[#008000]/90",
      "blue": "bg-[#3b6dbf] text-white hover:bg-[#3b6dbf]/90 dark:bg-[#3b6dbf] dark:text-white dark:hover:bg-[#3b6dbf]/90",
      "purple": "bg-[#5c4b8a] text-white hover:bg-[#5c4b8a]/90 dark:bg-[#5c4b8a] dark:text-white dark:hover:bg-[#5c4b8a]/90",
      "pink": "bg-[#d83c5e] text-white hover:bg-[#d83c5e]/90 dark:bg-[#d83c5e] dark:text-white dark:hover:bg-[#d83c5e]/90",
      "white": "bg-white text-black border border-gray-200 hover:bg-gray-50",
      "lightGreen": "bg-[#bbf7d0] text-black hover:bg-[#bbf7d0]/90",
      "lightYellow": "bg-[#fefcbf] text-black hover:bg-[#fefcbf]/90",
      "lightCoral": "bg-[#f08080] text-white hover:bg-[#f08080]/90",
      "lightOrange": "bg-[#ffedd5] text-black hover:bg-[#ffedd5]/90",
      "peach": "bg-[#ffcccb] text-black hover:bg-[#ffcccb]/90",
      "lightCyan": "bg-[#e0ffff] text-black hover:bg-[#e0ffff]/90",
    };

    // 尝试直接匹配颜色名称（不区分大小写）
    const normalizedColor = color.toLowerCase();
    
    // 先检查是否是已知的颜色名
    for (const [colorName, className] of Object.entries(colorClassMap)) {
      if (colorName.toLowerCase() === normalizedColor) {
        return className;
      }
    }
    
    // 如果没有找到匹配的颜色名，使用默认的深色/浅色判断
    return shouldUseDarkText(color) 
      ? "bg-white text-black border border-gray-200 hover:bg-gray-50" 
      : "bg-black text-white hover:bg-black/90";
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
              className="flex items-center justify-between w-full px-4 py-2.5 text-foreground hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-center gap-2 flex-wrap">
                <div 
                  className={cn(
                    "w-6 h-6 rounded-md flex items-center justify-center text-sm font-medium",
                    getColorClass(themeColor)
                  )}
                >
                  {getProjectInitial(projectName)}
                </div>
                <span className="text-sm font-medium break-all overflow-wrap w-[130px] text-left">{projectName}</span>
              </div>
              <ChevronDown className="h-4 w-4"/>           
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
              <Link href="#" className="flex items-center px-4 py-2 hover:bg-accent text-sm gap-2 text-red-500 hover:text-red-600 transition-colors">
                <Archive size={16} className="text-red-500 hover:text-red-600" />
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
                  >
                    {menuItems.map((item, index) => {
                      // 修改检查逻辑：检查路径名是否包含团队ID部分
                      const isActive = pathname.includes(`/projects/${projectId}/${item.id}/`);
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
                                <div className="flex items-center w-full justify-between flex-wrap">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <div 
                                      className={cn(
                                        "w-4 h-4 rounded-md flex items-center justify-center text-xs font-medium transition-all",
                                        getColorClass(themeColor),
                                        "ring-offset-background",
                                        isActive
                                          ? ""
                                          : ""
                                      )}
                                    >
                                      {getProjectInitial(item.label)}
                                    </div>
                                    <span className="text-sm break-all w-[130px]">{item.label}</span>
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
            }} 
            className="flex items-center w-full px-4 py-2 text-foreground hover:bg-accent/50 transition-colors"
          >
            <Plus size={16} className="text-muted-foreground" />
            <span className="ml-2 text-sm">{t('new_team')}</span>
          </button>
        </div>

        <CreateTeamDialog 
          isOpen={isDialogOpen} 
          onClose={() => {
            setDialogOpen(false);
            fetchTeams();
          }} 
          projectId={projectId}
        />
      </div>
    </TooltipProvider>
  )
} 