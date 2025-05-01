'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, 
  AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { Pen, Users, Settings2, Trash2, Plus } from "lucide-react";
import { useDispatch } from 'react-redux';
// 假设您已经有团队相关的Redux操作
// import { updateTeam, deleteTeam } from '@/lib/redux/features/teamSlice';

const EditTeamDialog = ({ open, onClose, team, activeTab }) => {
  const t = useTranslations('Team');
  const tConfirm = useTranslations('confirmation');
  const dispatch = useDispatch();
  
  // 状态管理
  const [currentTab, setCurrentTab] = useState(activeTab);
  const [teamName, setTeamName] = useState('');
  const [teamDescription, setTeamDescription] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  
  // 加载团队数据
  useEffect(() => {
    if (team) {
      setTeamName(team.name || '');
      setTeamDescription(team.description || '');
      setCurrentTab(activeTab);
    }
  }, [team, activeTab]);
  
  // 更新团队详情
  const handleUpdateTeam = () => {
    if (!teamName.trim()) return;
    
    // 这里调用更新团队的API
    // dispatch(updateTeam({
    //   id: team.id,
    //   name: teamName,
    //   description: teamDescription
    // }));
    
    onClose();
  };
  
  // 删除团队
  const handleDeleteTeam = () => {
    if (deleteConfirmText !== team?.name) return;
    // 这里调用删除团队的API
    // dispatch(deleteTeam(team.id));
    setConfirmDelete(false);
    onClose();
  };
  
  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent 
            className="sm:max-w-[600px]"
            onPointerDownOutside={(e) => e.preventDefault()}
            onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>{t('editTeam')}</DialogTitle>
            <DialogDescription/>
          </DialogHeader>
          
          <Tabs defaultValue={currentTab} onValueChange={setCurrentTab} className="w-full">
            <TabsList className="grid grid-cols-3 mb-4">
              <TabsTrigger value="details" className="flex items-center">
                <Pen className="h-4 w-4 mr-1" />
                {t('details')}
              </TabsTrigger>
              <TabsTrigger value="members" className="flex items-center">
                <Users className="h-4 w-4 mr-1" />
                {t('members')}
              </TabsTrigger>
              <TabsTrigger value="permissions" className="flex items-center">
                <Settings2 className="h-4 w-4 mr-1" />
                {t('permissions')}
              </TabsTrigger>
            </TabsList>
            
            {/* 团队详情标签内容 */}
            <TabsContent value="details" className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="teamName">{t('teamName')}</Label>
                  <Input 
                    id="teamName" 
                    value={teamName} 
                    onChange={(e) => setTeamName(e.target.value)} 
                    placeholder={t('enterTeamName')}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="teamDescription">{t('teamDescription')}</Label>
                  <Textarea 
                    id="teamDescription" 
                    value={teamDescription} 
                    onChange={(e) => setTeamDescription(e.target.value)} 
                    placeholder={t('enterTeamDescription')}
                    rows={4}
                  />
                </div>
              </div>
            </TabsContent>
            
            {/* 成员管理标签内容 */}
            <TabsContent value="members" className="space-y-4">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">{t('teamMembers')}</h3>
                {/* 这里添加成员列表和管理界面 */}
                <div className="text-sm text-muted-foreground">
                  {t('membersManagementDescription')}
                </div>
                <Button>
                  <Plus className="h-4 w-4 mr-1" />
                </Button>
                {/* 成员列表示例 */}
                <div className="border rounded-md p-4">
                  <p>{t('membersListPlaceholder')}</p>
                </div>
              </div>
            </TabsContent>
            
            {/* 权限管理标签内容 */}
            <TabsContent value="permissions" className="space-y-4">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">{t('teamPermissions')}</h3>
                {/* 这里添加权限设置界面 */}
                <div className="text-sm text-muted-foreground">
                  {t('permissionsManagementDescription')}
                </div>
                
                {/* 权限设置示例 */}
                <div className="border rounded-md p-4">
                  <p>{t('permissionsSettingsPlaceholder')}</p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
          
          <DialogFooter className="flex justify-between w-full pt-4">
            {currentTab === "details" && (
                <Button variant="destructive" onClick={() => setConfirmDelete(true)}>
                    <Trash2 className="h-4 w-4 mr-1" />
                    {t('deleteTeam')}
                </Button>
            )}
            
            <div className="flex-1 flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>
                {t('cancel')}
              </Button>
              <Button variant="green" onClick={handleUpdateTeam}>
                {t('saveChanges')}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* 删除确认对话框 */}
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tConfirm('deleteTeamConfirmation')}</AlertDialogTitle>
            <AlertDialogDescription>
              {tConfirm('deleteTeamWarning')}
              <div className="mt-4">
                <Label htmlFor="confirmDelete" className="text-sm font-medium">
                  {tConfirm('typeTeamNameToConfirm', { teamName: team?.name })}
                </Label>
                <Input 
                  id="confirmDelete"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  className="mt-2"
                  placeholder={team?.name}
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tConfirm('cancel')}</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteTeam} 
              className="bg-red-500 hover:bg-red-600"
              disabled={deleteConfirmText !== team?.name}
            >
              {tConfirm('permanentlyDelete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default EditTeamDialog;
