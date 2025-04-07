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
import { createTeam, fetchProjectTeams } from '@/lib/redux/features/teamSlice'
import { createTeamUser, fetchTeamUsers } from '@/lib/redux/features/teamUserSlice'
import { createTeamCustomField, getTags, updateTagIds } from '@/lib/redux/features/teamCFSlice'
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
      const userId = userData?.user?.id;
      console.log('userId', userId)
      // 创建团队
      const team = await dispatch(createTeam({
        name: data.teamName,
        access: data.teamAccess,
        project_id: projectId,
        star: false,
        order_index: 0,
        created_by: userId
      })).unwrap();

      // 创建团队用户关系
      await dispatch(createTeamUser({
        team_id: team.id,
        user_id: userId,
        role: 'OWNER',
        created_by: userId
      })).unwrap();

      // 创建团队自定义字段
      // 获取所有默认自定义字段
      const { data: defaultCustomFields, error: cfError } = await supabase
        .from('custom_field')
        .select('*')
        .order('id');
      
      if (cfError) {
        console.error('获取默认自定义字段失败:', cfError);
        throw cfError;
      }

      // 获取默认字段数量
      const { data: defaultSettings, error: defaultError } = await supabase
        .from('default')
        .select('*')
        .eq('name', 'custom_field')
        .single();
      
      if (defaultError && defaultError.code !== 'PGRST116') {
        console.error('获取默认设置失败:', defaultError);
      }

      // 默认字段数量，如果没有设置则使用 2
      const defaultCount = defaultSettings?.qty || 2;
      
      // 查找类型为LIST的自定义字段
      const listCustomField = defaultCustomFields.find(field => 
        field.name.toUpperCase().includes('LIST') || 
        field.type.toUpperCase() === 'LIST'
      );
      
      let listTeamCustomFieldId = null;
      
      // 只为默认数量的字段创建团队自定义字段配置
      for (let i = 0; i < Math.min(defaultCount, defaultCustomFields.length); i++) {
        const field = defaultCustomFields[i];
        const teamCF = await dispatch(createTeamCustomField({
          team_id: team.id,
          custom_field_id: field.id,
          config: {},
          order_index: 100,
          created_by: userId
        })).unwrap();
        
        // 如果当前字段是LIST类型字段，保存其team_custom_field_id
        if (listCustomField && field.id === listCustomField.id) {
          listTeamCustomFieldId = teamCF.id;
        }
      }

      // 获取所有默认标签
      const { data: defaultTags, error: tagError } = await supabase
        .from('tag')
        .select('*')
        .order('id');
      
      if (tagError) {
        console.error('获取默认标签失败:', tagError);
        throw tagError;
      }

      // 获取默认字段数量
      const { data: defaultTagSettings, error: defaultTagError } = await supabase
        .from('default')
        .select('*')
        .eq('name', 'tag')
        .single();
      
      if (defaultTagError && defaultTagError.code !== 'PGRST116') {
        console.error('获取默认设置失败:', defaultTagError);
      }

      // 默认字段数量，如果没有设置则使用 2
      const defaultTagCount = defaultTagSettings?.qty || 2;
      
      // 只有在找到LIST类型字段的情况下才更新标签
      if (listTeamCustomFieldId) {
        const existingTagsResponse = await getTags(team.id, listTeamCustomFieldId);
        const existingTagIds = existingTagsResponse.tag_ids || [];
        
        // 从默认标签中获取ID
        const defaultTagIdsToAdd = defaultTags.slice(0, defaultTagCount).map(tag => tag.id);
        const updatedTagIds = [...existingTagIds, ...defaultTagIdsToAdd];
        
        // 只为默认数量的字段创建团队自定义字段配置
        for (let i = 0; i < Math.min(defaultTagCount, defaultTags.length); i++) {
          await dispatch(updateTagIds({
            teamId: team.id,
            teamCFId: listTeamCustomFieldId,
            tagIds: updatedTagIds,
            userId: userId
          })).unwrap();
        }
      } else {
        console.log('未找到LIST类型的自定义字段，跳过更新标签');
      }

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
      <DialogContent 
        className="sm:max-w-[600px] w-full"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
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
                disabled={isLoading}
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
