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

export default function CreateTeamDialog({ isOpen, onClose, projectId }) {
  const t = useTranslations('CreateTeam')
  const [isLoading, setIsLoading] = useState(false)
  const dispatch = useDispatch()
  const router = useRouter()
  const { projects } = useSelector((state) => state.projects)
  const project = projects.find(p => String(p.id) === String(projectId))
  const [themeColor, setThemeColor] = useState('');

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
      setThemeColor(project.theme_color || '#64748b');
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
        order_index: 0 // 新创建的团队默认放在最前面
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
      <DialogContent className="sm:max-w-[425px]">
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
                  <Select onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger 
                        className={`w-full px-3 py-2 border rounded-md ${
                          fieldState.invalid ? 'border-red-500' : 'border-gray-300'
                        }`}
                      >
                        <SelectValue placeholder={t('teamAccessPlaceholder')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="invite_only">{t('inviteOnly')}</SelectItem>
                      <SelectItem value="can_edit">{t('everyoneCanEdit')}</SelectItem>
                      <SelectItem value="can_check">{t('everyoneCanCheck')}</SelectItem>
                      <SelectItem value="can_view">{t('everyoneCanView')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex justify-end mt-1 min-h-[20px]">
                    <div className="flex-1">
                      <FormMessage className="text-xs" />
                    </div>
                  </div>
                </FormItem>
              )}
            />

            <DialogFooter className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                style={{ backgroundColor: themeColor }}
              >
                {t('cancel')}
              </Button>
              <Button
                type="submit"
                variant="outline"
                disabled={isLoading}
                style={{ backgroundColor: themeColor }}
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
