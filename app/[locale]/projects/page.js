'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useDispatch, useSelector } from 'react-redux';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { fetchProjects } from '@/lib/redux/features/projectSlice';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProjectsPage() {
  const dispatch = useDispatch();
  const { locale } = useParams();
  const { projects, status, error } = useSelector((state) => state.projects);
  const t = useTranslations();

  useEffect(() => {
    dispatch(fetchProjects());
  }, [dispatch]);

  if (status === 'loading') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
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
    <div className="h-full">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold tracking-tight">{t('Projects.projects')}</h1>
      </div>
      <ScrollArea className="h-[calc(100vh-10rem)]">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.length === 0 ? (
            <div className="col-span-full text-center text-muted-foreground">
              {t('Projects.noProjects')}
            </div>
          ) : (
            projects.map((project) => (
              <Link 
                key={project.id} 
                href={`/${locale}/projects/${project.id}`}
                className="block"
              >
                <Card>
                  <CardHeader>
                    <CardTitle>{project.project_name}</CardTitle>
                    <CardDescription>{project.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                      <div className="flex items-center justify-between">
                        <span>{t('Projects.created_at')}:</span>
                        <span>
                          {new Date(project.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>{t('Projects.visibility')}:</span>
                        <span>
                          {t(`Projects.${project.visibility.toLowerCase()}`)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>{t('projects.statusTitle')}:</span>
                        <span>
                          {t(`projects.status.${project.status.toLowerCase()}`)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}