'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useGetUser } from '@/lib/hooks/useGetUser';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction } from '@/components/ui/alert-dialog';
import { useSelector } from 'react-redux';

export default function Team() {
  const { id: projectId, teamId, locale } = useParams();
  const { user } = useGetUser();
  const router = useRouter();
  const t = useTranslations('Projects');
  const [hasPermission, setHasPermission] = useState(false);
  const [permissionChecked, setPermissionChecked] = useState(false);
  const [showPermissionDialog, setShowPermissionDialog] = useState(false);
  const [showArchivedDialog, setShowArchivedDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [teamExists, setTeamExists] = useState(true);
  
  // 从Redux获取项目数据
  const project = useSelector(state => 
    state.projects.projects ? state.projects.projects.find(p => p && String(p.id) === String(projectId)) : null
  );

  // 检查用户是否有权限访问此项目，并且验证团队是否存在
  useEffect(() => {
    async function checkProjectPermission() {
      try {
        if (!user?.id || !projectId) return;

        // 检查项目是否已归档
        if (project && project.archived) {
          setShowArchivedDialog(true);
          setPermissionChecked(true);
          setIsLoading(false);
          return;
        }

        // 先检查团队是否存在
        try {
          const teamResponse = await fetch(`/api/teams?id=${teamId}`);
          const teamData = await teamResponse.json();
          
          if (!teamData || (Array.isArray(teamData) && teamData.length === 0)) {
            setTeamExists(false);
            // 短暂延迟确保状态更新
            setTimeout(() => {
              router.replace(`/${locale}/projects/${projectId}`);
            }, 100);
            return;
          }
        } catch (error) {
          console.error('Error checking team existence:', error);
          setTeamExists(false);
          setTimeout(() => {
            router.replace(`/${locale}/projects/${projectId}`);
          }, 100);
          return;
        }

        // 如果团队存在，再检查用户权限
        // 先检查用户是否是团队成员
        try {
          const teamUserResponse = await fetch(`/api/teams/teamUsers?id=${teamId}`);
          if (teamUserResponse.ok) {
            const teamUsers = await teamUserResponse.json();
            if (Array.isArray(teamUsers) && teamUsers.some(tu => String(tu.user_id) === String(user?.id))) {
              // 是团队成员，直接设置为有权限
              setHasPermission(true);
              setPermissionChecked(true);
              setIsLoading(false);
              return;
            }
          }
        } catch (error) {
          console.error('Error checking team membership:', error);
          // 继续检查其他权限
        }

        // 检查项目是否是项目创建者
        const projectResponse = await fetch(`/api/projects?projectId=${projectId}`);
        const projectData = await projectResponse.json();
        
        // 再次检查项目是否已归档（通过API获取的项目数据）
        if (projectData.length > 0 && projectData[0].archived) {
          setShowArchivedDialog(true);
          setPermissionChecked(true);
          setIsLoading(false);
          return;
        }
        
        if (projectData.length > 0 && projectData[0].created_by === user.id) {
          setHasPermission(true);
          setPermissionChecked(true);
          setIsLoading(false);
          return;
        }

        // 检查用户是否是项目团队成员
        const response = await fetch(`/api/projects/${projectId}/team?userId=${user.id}`);
        const data = await response.json();

        if (data && data.length > 0) {
          setHasPermission(true);
        } else {
          setHasPermission(false);
          setShowPermissionDialog(true);
        }
        
        setPermissionChecked(true);
        setIsLoading(false);
      } catch (err) {
        console.error('Error checking project permission:', err);
        setHasPermission(false);
        setShowPermissionDialog(true);
        setPermissionChecked(true);
        setIsLoading(false);
      }
    }
    
    checkProjectPermission();
  }, [user, projectId, teamId, locale, router, project]);

  // 处理权限对话框关闭
  const handlePermissionDialogClose = () => {
    setShowPermissionDialog(false);
    router.push(`/${locale}/projects`);
  };
  
  // 处理归档项目对话框关闭
  const handleArchivedDialogClose = () => {
    setShowArchivedDialog(false);
    router.push(`/${locale}/projects`);
  };

  // 如果权限检查未完成，显示骨架屏加载UI
  if (isLoading) {
    return (
      <div className="container px-4 py-6">
        {/* Skeleton header */}
        <div className="flex items-center mb-6">
          <div className="h-12 w-12 rounded-full bg-gray-200 animate-pulse mr-4"></div>
          <div>
            <div className="h-5 w-48 bg-gray-200 animate-pulse mb-2 rounded"></div>
            <div className="h-4 w-32 bg-gray-200 animate-pulse rounded"></div>
          </div>
        </div>
        
        {/* Skeleton tabs/navigation */}
        <div className="flex border-b mb-6">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="h-10 w-24 bg-gray-200 animate-pulse mr-4 rounded"></div>
          ))}
        </div>
        
        {/* Skeleton content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {[1, 2, 3, 4, 5, 6].map((item) => (
            <div key={item} className="border rounded-lg p-4">
              <div className="h-5 w-3/4 bg-gray-200 animate-pulse mb-4 rounded"></div>
              <div className="h-4 w-full bg-gray-200 animate-pulse mb-2 rounded"></div>
              <div className="h-4 w-5/6 bg-gray-200 animate-pulse mb-4 rounded"></div>
              <div className="flex items-center">
                <div className="h-8 w-8 rounded-full bg-gray-200 animate-pulse mr-2"></div>
                <div className="h-4 w-24 bg-gray-200 animate-pulse rounded"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  
  // 如果项目已归档，显示归档警告对话框
  if (showArchivedDialog) {
    return (
      <AlertDialog open={showArchivedDialog} onOpenChange={setShowArchivedDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('projectArchived')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('projectArchivedDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={handleArchivedDialogClose}>{t('close')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  // 如果没有权限，显示权限对话框
  if (!hasPermission) {
    return (
      <AlertDialog open={showPermissionDialog} onOpenChange={setShowPermissionDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('projectNotFound')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('noAccessToProject')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={handlePermissionDialogClose}>{t('close')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  // 返回加载中状态，实际上团队不存在的情况会被重定向
  return (
    <div className="w-full px-4 py-2 flex justify-center items-center h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900 mx-auto mb-4"></div>
        <p>{t('loading')}</p>
      </div>
    </div>
  )
}

