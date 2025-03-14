'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useDispatch, useSelector } from 'react-redux';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { fetchProjects } from '@/lib/redux/features/projectSlice';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from '@/lib/supabase';

export default function ProjectsPage() {
  const dispatch = useDispatch();
  const router = useRouter();
  const { locale } = useParams();
  const { projects, status, error } = useSelector((state) => state.projects);
  const t = useTranslations('Projects');
  const [formattedProjects, setFormattedProjects] = useState([]);

  const clearCredentialsAndLogout = async () => {
    try {
      await supabase.auth.signOut();
      
      localStorage.clear();
      
      router.push(`/${locale}/login`);
    } catch (err) {
      console.error('Error clearing credentials:', err);
    }
  };

  useEffect(() => {
    if (projects.length > 0) {
      const formatted = projects.map(project => ({
        ...project,
        created_at: new Date(project.created_at).toLocaleDateString('en-US', { timeZone: 'UTC' }),
      }));
      setFormattedProjects(formatted);
    }
  }, [projects]);

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
        <h1 className="text-3xl font-bold tracking-tight">{t('projects')}</h1>
        <div className="flex items-center gap-4">
          <button
            onClick={clearCredentialsAndLogout}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-destructive text-destructive-foreground hover:bg-destructive/90 h-10 px-4 py-2"
          >
            Clear Credentials & Logout
          </button>
          
          <Link
            href={`/${locale}/createProject`}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
          >
            {t('createNewProject')}
          </Link>
        </div>
      </div>
      <ScrollArea className="h-[calc(100vh-10rem)]">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {formattedProjects.length === 0 ? (
            <div className="col-span-full text-center text-muted-foreground">
              {t('noProjects')}
            </div>
          ) : (
            formattedProjects.map((project) => (
              <Link 
                key={project.id} 
                href={`/${locale}/projects/${project.id}`}
                className="block"
              >
                <Card suppressHydrationWarning={true}>
                  <CardHeader>
                    <CardTitle>{project.project_name}</CardTitle>
                    <CardDescription>{project.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                      <div className="flex items-center justify-between">
                        <span>{t('created_at')}:</span>
                        <span>{project.created_at}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>{t('visibility')}:</span>
                        <span>
                          {t(`${project.visibility ? project.visibility.toLowerCase() : ''}`)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>{t('statusTitle')}:</span>
                        <span>
                          {t(`status.${project.status ? project.status.toLowerCase() : ''}`)}
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