'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useSelector } from 'react-redux';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarIcon, EyeIcon, CheckCircleIcon, PlusCircleIcon, MessageSquareIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export default function ProjectsPage() {
  const { locale } = useParams();
  const router = useRouter();
  const { projects, status } = useSelector(( state) => state.projects);
  const t = useTranslations('Projects');
  const [formattedProjects, setFormattedProjects] = useState([]);

  useEffect(() => {
    if (projects.length > 0) {
      const formatted = projects.map(project => ({
        ...project,
        created_at: new Date(project.created_at).toLocaleDateString('en-US', { timeZone: 'UTC' }),
      }));
      setFormattedProjects(formatted);
    }
  }, [projects]);

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
        <h1 className="text-3xl font-bold tracking-tight">{t('projects')}</h1>

          <Link
            href={`/${locale}/createProject`}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 shadow-md hover:shadow-lg"
          >
            {t('createNewProject')}
          </Link>

      </div>
      <ScrollArea className="h-[calc(100vh-10rem)]">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {formattedProjects.length === 0 ? (
            <div className="col-span-full text-center text-muted-foreground">
              {t('noProjects')}
            </div>
          ) : (
            formattedProjects.map((project) => (
              <Card 
                key={project.id}
                suppressHydrationWarning={true} 
                onClick={() => handleCardClick(project.id)}
                className="relative overflow-hidden border border-transparent transition-all duration-300 
                bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-sm
                hover:bg-gradient-to-br hover:from-card/95 hover:to-card/70
                hover:border-primary/20 hover:shadow-[0_0_15px_rgba(var(--primary-rgb),0.15)]
                cursor-pointer group"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/0 to-primary/0 opacity-0 group-hover:opacity-100 group-hover:via-primary/10 transition-opacity duration-700 pointer-events-none"></div>
                
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-xl group-hover:text-primary transition-colors duration-300">
                    {project.project_name}
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
                  </TooltipProvider>

                  <TooltipProvider>
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
                  </TooltipProvider>
                </CardFooter>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}