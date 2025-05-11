'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { cn } from "@/lib/utils";
import { FolderKanban, CheckSquare, Search, Loader, Calendar, MessageSquare, Plus } from 'lucide-react';
import { useLocale } from 'next-intl';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchUserProjects, clearProjects } from '@/lib/redux/features/projectSlice';
import { supabase } from '@/lib/supabase';
import useGetUser from '@/lib/hooks/useGetUser';
import CreateProjectDialog from '@/components/CreateProject';

export function MainNav() {
  const pathname = usePathname();
  const t = useTranslations();
  const locale = useLocale();
  const dispatch = useDispatch();
  const { projects, status } = useSelector((state) => state.projects);
  const { user , error } = useGetUser();
  const [openCreateDialog, setOpenCreateDialog] = useState(false);

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

  return (
    <TooltipProvider>
      <div className="flex flex-col h-full">
        <nav className="px-2 py-4">
          {routes.map((route) => {
            const Icon = route.icon;
            return (
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
            );
          })}
        </nav>
        <div className="mt-4 px-2">
          <div className="space-y-1">
            {status === 'loading' ?(
              <div className="flex items-center justify-center p-2">
                <Loader className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : status === "failed" ? (
              <div className="text-sm text-red-500 px-2">error...</div>
            ): (
              <>
                {projects.filter(project => project.id && project.project_name)
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
