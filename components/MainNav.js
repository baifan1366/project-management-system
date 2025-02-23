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
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchProjects } from '@/lib/redux/features/projectSlice';

export function MainNav() {
  const pathname = usePathname();
  const t = useTranslations();
  const locale = useLocale();
  const dispatch = useDispatch();
  const { projects, status } = useSelector((state) => state.projects);

  useEffect(() => {
    if (status === 'idle') {
      dispatch(fetchProjects());
    }
  }, [dispatch, status]);

  const routes = [
    {
      href: `/${locale}/search`,
      label: t('nav.search'),
      icon: Search,
      active: pathname === `/${locale}/search`,
    },
    {
      href: `/${locale}/mytasks`,
      label: t('nav.mytasks'),
      icon: CheckSquare,
      active: pathname === `/${locale}/mytasks`,
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
                {projects.map((project) => (
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
                            shouldUseDarkText(project.theme_color) ? "text-gray-900" : "text-white",
                            "ring-offset-background",
                            pathname === `/${locale}/projects/${project.id}`
                              ? "ring-2 ring-white ring-offset-2"
                              : "hover:ring-2 hover:ring-white/50 hover:ring-offset-2"
                          )}
                          style={{ backgroundColor: project.theme_color }}
                        >
                          {getProjectInitial(project.project_name)}
                        </div>
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      {t('Projects.viewProject')}
                    </TooltipContent>
                  </Tooltip>
                ))}
                <Tooltip key="create-project-button">
                  <TooltipTrigger asChild>
                    <Link
                      href={`/${locale}/createProject`}
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
                    </Link>
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
    </TooltipProvider>
  );
}
