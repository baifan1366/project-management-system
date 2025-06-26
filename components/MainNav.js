'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { cn } from "@/lib/utils";
import { FolderKanban, CheckSquare, Search, Loader, Calendar, MessageSquare, Plus, X } from 'lucide-react';
import { useLocale } from 'next-intl';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useEffect, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchUserProjects, clearProjects } from '@/lib/redux/features/projectSlice';
import { supabase } from '@/lib/supabase';
import useGetUser from '@/lib/hooks/useGetUser';
import CreateProjectDialog from '@/components/CreateProject';
import UserProfileDialog from '@/components/chat/UserProfileDialog';

// Quick Search component
function QuickSearch({ open, onOpenChange }) {
  const t = useTranslations();
  const inputRef = useRef(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const router = useRouter();
  const locale = useLocale();
  const { user } = useGetUser();

  // Focus input when popover opens
  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  // Handle search
  const handleSearch = async () => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const userIdParam = user?.id ? `&userId=${user.id}` : '';
      const response = await fetch(`/api/search?query=${encodeURIComponent(query)}${userIdParam}`);
      const data = await response.json();
      
      if (response.ok) {
        setResults(data.results?.slice(0, 5) || []);
      } else {
        console.error('Search failed:', data.error);
      }
    } catch (error) {
      console.error('Search request failed:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get item link
  function getItemLink(item) {
    switch (item.type) {
      case 'project': return `/${locale}/projects/${item.id}`;
      case 'task': return `/${locale}/tasks/${item.id}`;
      case 'user': return `/${locale}/users/${item.id}`;
      case 'team': return `/${locale}/projects/${item.project_id || item.id}`;
      case 'calendar': return `/${locale}/calendar/${item.id}`;
      case 'message': return `/${locale}/chat?session=${item.chat_id || item.session_id}`;
      default: return '#';
    }
  }

  // Get item icon
  function getItemIcon(type) {
    switch (type) {
      case 'project': return <FolderKanban className="h-3 w-3" />;
      case 'task': return <CheckSquare className="h-3 w-3" />;
      case 'calendar': return <Calendar className="h-3 w-3" />;
      case 'message': return <MessageSquare className="h-3 w-3" />;
      default: return <div className="h-3 w-3" />;
    }
  }

  // Handle result click
  const handleResultClick = (item) => {
    if (item.type === 'user') {
      // For user type, open the UserProfileDialog
      setSelectedUser(item);
      setShowUserProfile(true);
    } else {
      // For other types, navigate to the corresponding page
      router.push(getItemLink(item));
      onOpenChange(false);
    }
  };
  
  // Handle key press for navigation
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    } else if (e.key === 'Escape') {
      onOpenChange(false);
    }
  };

  // Skeleton loader for search results
  const ResultSkeleton = () => (
    <div className="space-y-1">
      {[1, 2, 3].map((item) => (
        <div key={item} className="p-2 rounded flex items-center gap-2">
          <div className="w-3 h-3 bg-gray-600 rounded-full"></div>
          <div className="flex-1">
            <div className="h-3 w-3/4 bg-gray-600 rounded mb-1"></div>
            <div className="h-2 w-1/2 bg-gray-600 rounded"></div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="w-72 text-white">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-medium text-white">{t('search.quickSearch')}</h3>
        <button 
          onClick={() => onOpenChange(false)}
          className="text-gray-400 hover:text-white"
        >
          <X size={14} />
        </button>
      </div>
      <div className="relative mb-2">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t('search.placeholder')}
          className="w-full p-1.5 pl-7 pr-10 text-xs rounded-md border border-gray-600 bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
        />
        <div className="absolute inset-y-0 left-0 flex items-center pl-2 pointer-events-none">
          <Search className="h-3.5 w-3.5 text-gray-400" />
        </div>
        <button
          onClick={handleSearch}
          className="absolute inset-y-0 right-0 flex items-center pr-2 text-primary hover:text-primary-dark text-xs"
        >
          {loading ? <Loader className="h-3.5 w-3.5 animate-spin" /> : t('search.button')}
        </button>
      </div>
      
      <div className="max-h-56 overflow-y-auto">
        {results.length > 0 ? (
          <div className="space-y-1">
            {results.map((item) => (
              <div 
                key={`${item.type}-${item.id}`}
                onClick={() => handleResultClick(item)}
                className="p-1.5 hover:bg-gray-700 rounded cursor-pointer flex items-center gap-2"
              >
                <div className="text-gray-300">
                  {getItemIcon(item.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate text-white">
                    {item.type === 'message' 
                      ? (item.content || t('search.untitled')) 
                      : (item.title || item.name || item.project_name || t('search.untitled'))}
                  </p>
                  <p className="text-[10px] text-gray-400">
                    {t(`search.types.${item.type}`)}
                  </p>
                </div>
              </div>
            ))}
            
            <div className="mt-1.5 pt-1.5 border-t border-gray-600">
              <Link 
                href={`/${locale}/search?q=${encodeURIComponent(query)}`}
                className="text-[10px] text-primary hover:text-primary-dark flex justify-center py-1"
                onClick={() => {
                  onOpenChange(false);
                }}
              >
                {t('search.viewAllResults')}
              </Link>
            </div>
          </div>
        ) : query && !loading ? (
          <div className="p-3 text-center text-xs text-gray-300">
            {t('search.noResults')}
          </div>
        ) : loading ? (
          <ResultSkeleton />
        ) : null}
      </div>
      
      {/* User Profile Dialog */}
      <UserProfileDialog 
        open={showUserProfile} 
        onOpenChange={(open) => {
          setShowUserProfile(open);
          if (!open) {
            setSelectedUser(null);
            // Also close the search popup if the profile dialog is closed
            onOpenChange(false);
          }
        }} 
        user={selectedUser} 
      />
    </div>
  );
}

export function MainNav() {
  const pathname = usePathname();
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const dispatch = useDispatch();
  const { projects, status } = useSelector((state) => state.projects);
  const { user , error } = useGetUser();
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [openQuickSearch, setOpenQuickSearch] = useState(false);
  const searchButtonRef = useRef(null);
  
  // 调试函数
  const handleSearchClick = (e) => {
    if (e.shiftKey) {
      e.preventDefault();
      console.log('Shift+Click detected');
      setOpenQuickSearch(true);
    }
  };

  // 关闭搜索弹窗的点击外部事件处理
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (openQuickSearch && 
          searchButtonRef.current && 
          !searchButtonRef.current.contains(event.target) && 
          !event.target.closest('.quick-search-popup')) {
        setOpenQuickSearch(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openQuickSearch]);

  // 过滤未归档的项目
  const activeProjects = projects.filter(project => project && !project.archived);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        if (user) {
          // 3. 获取用户的projects
          dispatch(fetchUserProjects(user.id));
        }
      } catch (error) {
        console.error('获取项目失败:', error);
      }
    };

    fetchProjects();
  }, [user]);

  const routes = [
    {
      href: `/${locale}/search`,
      label: t('nav.search'),
      icon: Search,
      active: pathname === `/${locale}/search`,
    },
    {
      href: `/${locale}/myTasks`,
      label: t('nav.mytasks'),
      icon: CheckSquare,
      active: pathname === `/${locale}/myTasks`,
    },
    {
      href: `/${locale}/calendar`,
      label: t('nav.calendar'),
      icon: Calendar,
      active: pathname === `/${locale}/calendar`,
    },
    {
      href: `/${locale}/chat`,
      label: t('nav.chat'),
      icon: MessageSquare,
      active: pathname === `/${locale}/chat`,
    },
    {
      href: `/${locale}/projects`,
      label: t('nav.projects'),
      icon: FolderKanban,
      active: pathname === `/${locale}/projects`,
    },
  ];

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

  // 处理项目导航点击
  const handleProjectClick = (e, projectId) => {
    // 检查项目是否存在于Redux存储中
    const projectExists = projects.some(p => String(p.id) === String(projectId));
    
    if (!projectExists) {
      e.preventDefault();
      // 立即重定向到项目列表页面
      router.replace(`/${locale}/projects`);
    }
  };

  return (
    <TooltipProvider>
      <div className="flex flex-col h-full">
        <nav className="px-2 py-4">
          {routes.map((route) => {
            const Icon = route.icon;
            return (
              route.icon === Search ? (
                <div className="relative" key={route.href}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Link
                        href={route.href}
                        ref={searchButtonRef}
                        className={cn(
                          "flex items-center justify-center w-10 h-10 rounded-lg transition-colors mb-2",
                          route.active 
                            ? "bg-accent text-accent-foreground" 
                            : "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground"
                        )}
                        onClick={handleSearchClick}
                      >
                        <Icon size={20} />
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      {`${route.label} (${t('search.shiftClickToQuickSearch')})`}
                    </TooltipContent>
                  </Tooltip>
                  
                  {/* 自定义弹出搜索框，不使用Popover组件 */}
                  {openQuickSearch && (
                    <div 
                      className="absolute left-12 top-0 z-50 p-3 rounded-md border border-gray-700 shadow-lg quick-search-popup bg-black text-white"
                      style={{ width: '20rem' }}
                    >
                      <QuickSearch open={openQuickSearch} onOpenChange={setOpenQuickSearch} />
                    </div>
                  )}
                </div>
              ) : (
                <Tooltip key={route.href || route.label}>
                  <TooltipTrigger asChild>
                    <Link
                      href={route.href}
                      className={cn(
                        "flex items-center justify-center w-10 h-10 rounded-lg transition-colors mb-2",
                        route.active 
                          ? "bg-accent text-accent-foreground" 
                          : "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground"
                      )}
                    >
                      <Icon size={20} />
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    {route.label}
                  </TooltipContent>
                </Tooltip>
              )
            );
          })}
        </nav>
        <div className="mt-4 px-2">
          <div className="space-y-1">
            {status === 'loading' ? (
              <div className="flex items-center justify-center p-2">
                <Loader className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : status === "failed" ? (
              <div className="text-sm text-red-500 px-2">error...</div>
            ): (
              <>
                {activeProjects.filter(project => project.id && project.project_name)
                  .slice(0, 3)
                  .map((project) => (
                  <Tooltip key={`project-${project.id}`}>
                    <TooltipTrigger asChild>
                      <Link
                        href={`/${locale}/projects/${project.id}`}
                        className={cn(
                          "flex items-center space-x-2 px-2 py-2 rounded-lg transition-colors",
                          pathname === `/${locale}/projects/${project.id}`
                            ? "bg-accent text-accent-foreground"
                            : "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground"
                        )}
                        onClick={(e) => handleProjectClick(e, project.id)}
                      >
                        <div 
                          className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center text-sm font-medium transition-all",
                            getColorClass(project.theme_color),
                            "ring-offset-background",
                            pathname === `/${locale}/projects/${project.id}`
                              ? "ring-2 ring-white ring-offset-2"
                              : "hover:ring-2 hover:ring-white/50 hover:ring-offset-2"
                          )}
                        >
                          {getProjectInitial(project.project_name)}
                        </div>
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      {project.project_name}
                    </TooltipContent>
                  </Tooltip>
                ))}
                <Tooltip key="create-project-button">
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setOpenCreateDialog(true)}
                      className="flex items-center space-x-2 px-2 py-2 mt-2 rounded-lg transition-colors text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground group w-full"
                    >
                      <div 
                        className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center transition-all",
                          "ring-offset-background group-hover:ring-2 group-hover:ring-white/50 group-hover:ring-offset-2",
                          "border-2 border-dashed border-muted-foreground/50 group-hover:border-accent-foreground/50"
                        )}
                      >
                        <Plus size={20} className="transition-transform group-hover:scale-110" />
                      </div>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    {t('Projects.createNewProject')}
                  </TooltipContent>
                </Tooltip>
              </>
            )}
          </div>
        </div>
      </div>
      <CreateProjectDialog open={openCreateDialog} onOpenChange={setOpenCreateDialog} />
    </TooltipProvider>
  );
}
