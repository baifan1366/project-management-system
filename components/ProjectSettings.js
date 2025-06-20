'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter, usePathname } from 'next/navigation'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Archive, ArchiveRestore, Trash2 } from 'lucide-react'
import { useConfirm } from '@/hooks/use-confirm'
import { useGetUser } from '@/lib/hooks/useGetUser'
import { ScrollArea } from '@/components/ui/scroll-area'
import { api } from '@/lib/api'
import { trackSubscriptionUsage } from '@/lib/subscriptionService'

// 归档团队设置对话框组件
export default function ProjectSettings({ isOpen, onClose, projectId }) {
  const t = useTranslations('Projects')
  const router = useRouter()
  const { confirm } = useConfirm()
  const { user } = useGetUser()
  const [activeTab, setActiveTab] = useState('archivedTeams')
  const [archivedTeams, setArchivedTeams] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const pathname = usePathname()
  const locale = pathname.split('/')[1] || 'en'
  
  // 获取项目所有团队
  const fetchProjectTeams = async () => {
    if (!projectId || !isOpen) return
    
    setIsLoading(true)
    try {
      // 获取项目的所有团队
      const teams = await api.teams.listByProject(projectId)
      // 过滤出已归档的团队
      const archived = teams.filter(team => team.archive === true)
      setArchivedTeams(archived)
    } catch (error) {
      console.error('获取团队失败:', error)
    } finally {
      setIsLoading(false)
    }
  }
  
  // 组件挂载或对话框打开时获取团队数据
  useEffect(() => {
    fetchProjectTeams()
  }, [projectId, isOpen])
  
  // 恢复归档的团队
  const handleUnarchiveTeam = async (teamId, teamName) => {
    if (!user) return
    
    confirm({
      title: t('unarchiveTeamConfirmTitle'),
      description: `${t('team')} "${teamName}" ${t('willBeUnarchived')}`,
      variant: 'default',
      onConfirm: async () => {
        setIsLoading(true)
        try {
          // 直接使用API更新团队的归档状态
          await api.teams.update(teamId, { archive: false })
          
          // 重新获取团队列表以更新UI
          await fetchProjectTeams()
          
          // 更新本地已归档团队列表（可选，因为fetchProjectTeams已经更新了状态）
          setArchivedTeams(prev => prev.filter(t => t.id !== teamId))
        } catch (error) {
          console.error('恢复团队失败:', error)
        } finally {
          setIsLoading(false)
        }
      }
    })
  }
  
  // 删除团队
  const handleDeleteTeam = async (teamId, teamName) => {
    confirm({
      title: t('deleteTeamConfirmTitle'),
      description: `${t('team')} "${teamName}" ${t('willBeDeletedPermanently')}`,
      variant: 'error',
      onConfirm: async () => {
        // 实现删除团队的功能 (待实现)
        }
    })
  }
  
  // 删除项目
  const handleDeleteProject = async () => {
    confirm({
      title: t('deleteProjectConfirmTitle'),
      description: t('deleteProjectConfirmDescription'),
      variant: 'error',
      onConfirm: async () => {
        setIsLoading(true)
        try {
          // 实现删除项目的功能
          await api.projects.delete(projectId)
          
          if (user && user.id) {
            await trackSubscriptionUsage({
              userId: user.id,
              actionType: 'createProject',
              entityType: 'projects',
              deltaValue: -1
            });
          }
          
          // 关闭对话框
          onClose()
          
          // 重定向到项目列表页面
          router.replace(`/${locale}/projects`);
        } catch (error) {
          console.error('删除项目失败:', error)
        } finally {
          console.log('Updating subscription usage:', {
            userId, operation, metricToUpdate, currentValue, deltaValue, newValue
          });
          setIsLoading(false)
        }
      }
    })
  }
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{t('projectSettings')}</DialogTitle>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="archivedTeams">
              <Archive className="h-4 w-4 mr-2" />
              {t('archivedTeams')}
            </TabsTrigger>
            <TabsTrigger value="deleteProject">
              <Trash2 className="h-4 w-4 mr-2" />
              {t('deleteProject')}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="archivedTeams" className="mt-4">
            <ScrollArea className="h-[300px] rounded-md border p-4">
              {isLoading ? (
                <div></div>
              ) : archivedTeams.length > 0 ? (
                <div className="space-y-2">
                  {archivedTeams.map(team => (
                    <div 
                      key={team.id} 
                      className="flex items-center justify-between p-2 rounded-md border hover:bg-accent/50"
                    >
                      <div>
                        <p className="font-medium">{team.name}</p>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex items-center gap-1"
                        onClick={() => handleUnarchiveTeam(team.id, team.name)}
                        disabled={isLoading}
                      >
                        <ArchiveRestore className="h-4 w-4" />
                        {t('unarchive')}
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full py-10 pt-10 text-center">
                  <p className="text-muted-foreground">{t('noArchivedTeams')}</p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="deleteProject" className="mt-4">
            <div className="p-4 rounded-md border border-destructive bg-destructive/10">
              <h3 className="font-medium text-red-500 hover:text-red-600 mb-2">{t('dangerZone')}</h3>
              <p className="text-sm mb-4">{t('deleteProjectWarning')}</p>
              <div className="flex justify-end">
                <Button 
                  variant="destructive" 
                  onClick={handleDeleteProject}
                  disabled={isLoading}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t('deleteProject')}
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}