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
import { createTeam } from '@/lib/redux/features/teamSlice'
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase'
import { Lock, Users, Eye, ClipboardCheck, Pencil, Unlock } from 'lucide-react'
import { buttonVariants } from "@/components/ui/button"

export default function CreateTeamDialog({ isOpen, onClose, projectId }) {
  const t = useTranslations('CreateTeam')
  const [isLoading, setIsLoading] = useState(false)
  const dispatch = useDispatch()
  const router = useRouter()
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
      form.clearErrors(); // 清除错误状态
    }
  }, [isOpen]); // 监测 isOpen 状态

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      // 解构获取表单数据
      const { teamName, teamAccess } = data;

      // 获取当前用户信息
      const { data: userData, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        throw new Error('Failed to get user information');
      }

      if (!userData?.user?.id) {
        throw new Error('User not authenticated');
      }

      // 调用 Redux 的 createTeam 动作
      const resultAction = await dispatch(createTeam({
        name: teamName.trim(),
        access: teamAccess,
        created_by: userData.user.id,
        project_id: projectId,
        order_index: 0, // 新创建的团队默认放在最前面
        star: false
      }));

      if (createTeam.fulfilled.match(resultAction)) {
        onClose();
        router.refresh(); 
      } else if (createTeam.rejected.match(resultAction)) {
        throw new Error(resultAction.error?.message || 'Failed to create team');
      }
    } catch (error) {
      console.error('Error creating team:', error);
      // 这里可以添加错误提示UI
    } finally {
      setIsLoading(false);
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
