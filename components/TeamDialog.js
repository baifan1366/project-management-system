'use client'

import { useState, useEffect } from 'react'
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useTranslations } from 'next-intl'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { useDispatch, useSelector } from 'react-redux'
import { createTeam, createTeamUser, fetchProjectTeams, fetchTeamUsers } from '@/lib/redux/features/teamSlice'
import { Lock, Eye, Pencil, Unlock } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function CreateTeamDialog({ isOpen, onClose, projectId }) {
  const t = useTranslations('CreateTeam')
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const dispatch = useDispatch()
  const { projects } = useSelector((state) => state.projects)
  const project = projects.find(p => String(p.id) === String(projectId))
  const [themeColor, setThemeColor] = useState('#64748b');

  const buttonVariants = [
    { value: 'black', label: '黑色' },
    { value: 'red', label: '红色' },
    { value: 'orange', label: '橙色' },
    { value: 'green', label: '绿色' },
    { value: 'blue', label: '蓝色' },
    { value: 'purple', label: '紫色' },
    { value: 'pink', label: '粉色' }
  ];

  const FormSchema = z.object({
    teamName: z.string().trim().min(2, {
      message: t('teamNameMin'),
    }).max(50, {
      message: t('teamNameMax'),
    }),
    teamAccess: z.string().min(1, {
      message: t('teamAccessRequired'),
    }).transform((val) => val.toLowerCase()),
  })

  const form = useForm({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      teamName: "",
      teamAccess: "",
    },
  })

  useEffect(() => {
    if (project) {
      const matchingVariant = buttonVariants.find(variant => variant.value === project.theme_color);
      setThemeColor(matchingVariant ? matchingVariant.value : '#64748b');
    }
  }, [project]);

  useEffect(() => {
    if (isOpen) {
      form.reset({
        teamName: "",
        teamAccess: "",
      });
      form.clearErrors();
    }
  }, [isOpen]);

  const onSubmit = async (data) => {
    if (isSubmitting) return;
    setIsLoading(true);
    setIsSubmitting(true);
    
    try {
      // 获取当前用户信息
      const { data: userData, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        throw new Error('获取用户信息失败');
      }

      if (!userData?.user?.id) {
        throw new Error('用户未认证');
      }

      console.log('TeamDialog: 开始创建团队');
      // 创建团队
      const team = await dispatch(createTeam({
        name: data.teamName,
        access: data.teamAccess,
        project_id: projectId,
        star: false,
        order_index: 0,
        created_by: userData.user.id
      })).unwrap();
      console.log('Team created successfully:', team);

      // 创建团队用户关系
      const teamUser = await dispatch(createTeamUser({
        team_id: team.id,
        user_id: userData.user.id,
        role: 'OWNER'
      })).unwrap();
      console.log('Team user relationship created successfully:', teamUser);
      console.log('Data refreshed successfully');

      // 重置状态并关闭对话框
      form.reset();
      setIsLoading(false);
      setIsSubmitting(false);
      onClose();

      // 在对话框关闭后再刷新数据，避免UI卡顿
      setTimeout(async () => {
        try {
          // 分开执行刷新操作，避免一个失败影响另一个
          try {
            await dispatch(fetchTeamUsers(team.id)).unwrap();
          } catch (error) {
            console.error(`TeamDialog: 刷新团队用户失败:`, error);
          }

          try {
            await dispatch(fetchProjectTeams(projectId)).unwrap();
          } catch (error) {
            console.error(`TeamDialog: 刷新项目团队失败:`, error);
          }

          console.log(`TeamDialog: 刷新数据完成`);
        } catch (error) {
          console.error(`TeamDialog: 刷新数据时出错:`, error);
        }
      }, 100);

    } catch (error) {
      console.error(`TeamDialog: 提交表单时出错`, error);
      setIsLoading(false);
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] w-full">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-gray-800 dark:text-gray-200">
            {t('createTeam')}
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-600 dark:text-gray-400">
            {t('createTeamDescription')}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="teamName"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel className="block text-sm font-medium mb-1 text-gray-800 dark:text-gray-200">
                    {t('teamName')}
                    <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input 
                      className={`w-full px-3 py-2 border rounded-md ${
                        fieldState.invalid ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder={t('teamNameRequired')} 
                      {...field} 
                    />
                  </FormControl>
                  <div className="flex justify-end mt-1 min-h-[20px]">
                    <div className="flex-1">
                      <FormMessage className="text-xs" />
                    </div>
                    <span className="text-xs text-gray-500 ml-2">{field.value.trim().length}/50</span>
                  </div>
                </FormItem>
              )} 
            />

            <FormField
              control={form.control}
              name="teamAccess"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel className="block text-sm font-medium mb-1 text-gray-800 dark:text-gray-200">
                    {t('teamAccess')}
                    <span className="text-red-500">*</span>
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger 
                        className={`w-full px-3 py-2 border rounded-md ${
                          fieldState.invalid ? 'border-red-500' : 'border-gray-300'
                        }`}
                      >
                        <SelectValue placeholder={t('teamAccessPlaceholder')}>
                          {field.value ? (
                            <div className="flex items-center justify-between w-full">
                              <div className="flex items-center">
                                {field.value === 'invite_only' && <Lock className="w-4 h-4 mr-2 text-gray-500" />}
                                {field.value === 'can_edit' && <Pencil className="w-4 h-4 mr-2 text-gray-500" />}
                                {field.value === 'can_check' && <Eye className="w-4 h-4 mr-2 text-gray-500" />}
                                {field.value === 'can_view' && <Unlock className="w-4 h-4 mr-2 text-gray-500" />}
                                <span>
                                  {field.value === 'invite_only' && t('inviteOnly')}
                                  {field.value === 'can_edit' && t('everyoneCanEdit')}
                                  {field.value === 'can_check' && t('everyoneCanCheck')}
                                  {field.value === 'can_view' && t('everyoneCanView')}
                                </span>
                              </div>
                            </div>
                          ) : (
                            ''
                          )}
                        </SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="invite_only" className="relative flex items-center py-3 px-3 hover:bg-gray-100 dark:hover:bg-accent">
                        <div className="flex items-center w-full">
                          <Lock className="w-5 h-5 mr-3 text-gray-500" />
                          <div className="flex-1">
                            <div className="font-medium">{t('inviteOnly')}</div>
                            <div className="text-xs text-gray-500 mt-0.5">
                              {t('inviteOnlyDescription')}
                            </div>
                          </div>
                        </div>
                      </SelectItem>
                      <SelectItem value="can_edit" className="relative flex items-center py-3 px-3 hover:bg-gray-100 dark:hover:bg-accent">
                        <div className="flex items-center w-full">
                          <Pencil className="w-5 h-5 mr-3 text-gray-500" />
                          <div className="flex-1">
                            <div className="font-medium">{t('everyoneCanEdit')}</div>
                            <div className="text-xs text-gray-500 mt-0.5">
                              {t('everyoneCanEditDescription')}
                            </div>
                          </div>
                        </div>
                      </SelectItem>
                      <SelectItem value="can_check" className="relative flex items-center py-3 px-3 hover:bg-gray-100 dark:hover:bg-accent">
                        <div className="flex items-center w-full">
                          <Eye className="w-5 h-5 mr-3 text-gray-500" />
                          <div className="flex-1">
                            <div className="font-medium">{t('everyoneCanCheck')}</div>
                            <div className="text-xs text-gray-500 mt-0.5">
                              {t('everyoneCanCheckDescription')}
                            </div>
                          </div>
                        </div>
                      </SelectItem>
                      <SelectItem value="can_view" className="relative flex items-center py-3 px-3 hover:bg-gray-100 dark:hover:bg-accent">
                        <div className="flex items-center w-full">
                          <Unlock className="w-5 h-5 mr-3 text-gray-500" />
                          <div className="flex-1">
                            <div className="font-medium">{t('everyoneCanView')}</div>
                            <div className="text-xs text-gray-500 mt-0.5">
                              {t('everyoneCanViewDescription')}
                            </div>
                          </div>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex justify-end mt-1 min-h-[20px]">
                    <div className="flex-1">
                      <FormMessage className="text-xs text-red-500" />
                    </div>
                  </div>
                </FormItem>
              )}
            />

            <DialogFooter className="flex justify-end gap-3">
              <Button
                type="button"
                variant={themeColor}
                onClick={onClose}
              >
                {t('cancel')}
              </Button>
              <Button
                type="submit"
                variant={themeColor}
                disabled={isLoading}
              >
                {isLoading ? t('creating') : t('create')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
