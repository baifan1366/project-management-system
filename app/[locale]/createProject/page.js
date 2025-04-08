"use client"

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { toast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useState, useEffect } from "react";
import { useDispatch } from 'react-redux';
import { createProject } from '@/lib/redux/features/projectSlice';
import { DialogFooter } from "@/components/ui/dialog"
import { supabase } from '@/lib/supabase';
import { getSubscriptionLimit, getSubscriptionUsage, DELTA_MAP } from '@/lib/subscriptionService';

export default function CreateProjectPage() {
  const t = useTranslations('CreateProject');
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const dispatch = useDispatch();
  const [subscriptionInfo, setSubscriptionInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function checkSubscriptionLimit() {
      setIsLoading(true);
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (userData?.user?.id) {
          // 检查用户的项目创建限制
          const limitInfo = await getSubscriptionLimit(userData.user.id, 'create_project');
          setSubscriptionInfo(limitInfo);
          console.log('Subscription info:', limitInfo);
        }
      } catch (error) {
        console.error('获取订阅信息失败:', error);
      } finally {
        setIsLoading(false);
      }
    }
    checkSubscriptionLimit();
  }, []);

  // Schema definition
  const FormSchema = z.object({
    projectName: z.string().trim().min(2, {
      message: t('projectNameMin'),
    }).max(50, {
      message: t('projectNameMax'),
    }),
    visibility: z.string().min(1, {
      message: t('visibilityRequired'),
    }),
    buttonVariant: z.string().min(1, {
      message: t('themeColorRequired'),
    })
  })

  const form = useForm({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      projectName: "",
      visibility: "",
      buttonVariant: "black",
    },
  })

  const buttonVariants = [
    { value: 'black', label: '黑色' },
    { value: 'red', label: '红色' },
    { value: 'orange', label: '橙色' },
    { value: 'green', label: '绿色' },
    { value: 'blue', label: '蓝色' },
    { value: 'purple', label: '紫色' },
    { value: 'pink', label: '粉色' }
  ];

  // Submit function
  const onSubmit = async (data) => {
    setIsCreating(true);
    
    try {
      // 解构获取表单数据
      const { projectName, visibility, buttonVariant } = data;
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) {
        throw new Error('Failed to get user information');
      }
      if (!userData?.user?.id) {
        throw new Error('User not authenticated');
      }

      // 再次检查用户是否可以创建项目
      const limitCheck = await getSubscriptionLimit(userData.user.id, 'create_project');
      if (!limitCheck.allowed) {
        toast({
          title: '超出订阅限制',
          description: limitCheck.reason || '您已达到项目创建上限，请升级您的订阅计划',
          variant: "destructive",
        });
        return;
      }

      toast({
        title: t('creating'),
        description: t('pleaseWait'),
      });

      // 调用 Redux 的 createProject 动作
      const resultAction = await dispatch(createProject({
        project_name: projectName.trim(),
        visibility,
        theme_color: buttonVariant,
        created_by: userData.user.id,
        status: "PENDING"
      }));

      if (createProject.fulfilled.match(resultAction)) {
        // 获取用户的订阅使用情况
        const usageData = await getSubscriptionUsage(userData.user.id);
        
        if (!usageData) {
          console.error('Failed to fetch subscription usage data');
        } else {
          // 使用 DELTA_MAP 更新用户的项目使用计数
          const deltaValue = DELTA_MAP['create_project'] || 1;
          const currentProjects = usageData.usageData.workspaces.current || 0;
          
          const { error: updateError } = await supabase
            .from('user_subscription_plan')
            .update({ current_projects: currentProjects + deltaValue })
            .eq('user_id', userData.user.id);
          
          if (updateError) {
            console.error('Failed to update subscription usage:', updateError);
          }
        }

        toast({
          title: t('createSuccess'),
          description: t('projectCreated'),
        });
        form.reset();
        router.push('/projects');
      }
    } catch (error) {
      toast({
        title: t('createError'),
        description: t('pleaseTryAgain'),
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  }

  // 如果正在加载订阅信息，显示加载状态
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-2">
        <div className="flex items-center mb-6">
          <button
            onClick={() => router.back()}
            className="text-gray-800 mr-4 dark:text-gray-200"
          >
            ←
          </button>
          <h1 className="text-2xl font-bold">{t('createProject')}</h1>
        </div>
        <div className="flex justify-center items-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-800 dark:border-gray-200 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-300">正在加载...</p>
          </div>
        </div>
      </div>
    );
  }

  // 如果用户超出订阅限制，显示提示信息
  if (subscriptionInfo && !subscriptionInfo.allowed) {
    return (
      <div className="container mx-auto px-4 py-2">
        <div className="flex items-center mb-6">
          <button
            onClick={() => router.back()}
            className="text-gray-800 mr-4 dark:text-gray-200"
          >
            ←
          </button>
          <h1 className="text-2xl font-bold">创建项目受限</h1>
        </div>
        
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-red-700 dark:text-red-400 mb-2">订阅限制</h2>
          <p className="text-red-600 dark:text-red-300 mb-4">{subscriptionInfo.reason}</p>
          
          {subscriptionInfo.currentValue !== undefined && subscriptionInfo.limit !== undefined && (
            <div className="mb-4">
              <p className="text-gray-700 dark:text-gray-300">当前使用: {subscriptionInfo.currentValue} / {subscriptionInfo.limit}</p>
              
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mt-2">
                <div 
                  className="bg-red-600 dark:bg-red-500 h-2.5 rounded-full" 
                  style={{ width: `${Math.min(100, (subscriptionInfo.currentValue / subscriptionInfo.limit) * 100)}%` }}
                ></div>
              </div>
            </div>
          )}
          
          <Button
            onClick={() => router.push('/settings/subscription')}
            variant="destructive"
            className="mt-2"
          >
            升级订阅
          </Button>
        </div>
      </div>
    );
  }

  // 正常的表单渲染
  return (
    <div className="container mx-auto px-4 py-2">
      <div className="flex items-center mb-6">
        <button
          onClick={() => router.back()}
          className="text-gray-800 mr-4 dark:text-gray-200"
        >
          ←
        </button>
        <h1 className="text-2xl font-bold">{t('createProject')}</h1>
      </div>

      {/* 添加订阅使用情况显示 */}
      {subscriptionInfo && subscriptionInfo.allowed && subscriptionInfo.currentValue !== undefined && subscriptionInfo.limit !== undefined && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
          <div className="flex justify-between items-center mb-2">
            <p className="text-sm font-medium text-blue-700 dark:text-blue-400">
              项目使用情况
            </p>
            <p className="text-sm text-blue-700 dark:text-blue-400">
              {subscriptionInfo.currentValue} / {subscriptionInfo.limit}
            </p>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div 
              className="bg-blue-600 dark:bg-blue-500 h-2 rounded-full" 
              style={{ width: `${Math.min(100, (subscriptionInfo.currentValue / subscriptionInfo.limit) * 100)}%` }}
            ></div>
          </div>
        </div>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

          <FormField
            control={form.control}
            name="projectName"
            render={({ field, fieldState }) => (
              <FormItem>
                <FormLabel className="block text-sm font-medium mb-1 text-gray-800 dark:text-gray-200">
                  {t('projectName')}
                  <span className="text-red-500">*</span>
                </FormLabel>
                <FormControl>
                  <Input 
                    className={`w-full px-3 py-2 border rounded-md ${
                      fieldState.invalid ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder= {t('projectNamePlaceholder')} 
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
            name="visibility"
            render={({ field, fieldState }) => (
              <FormItem>
                <FormLabel className="block text-sm font-medium mb-1 text-gray-800 dark:text-gray-200">
                  {t('visibility')}
                  <span className="text-red-500">*</span>
                </FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger 
                      className={`w-full px-3 py-2 border rounded-md ${
                        fieldState.invalid ? 'border-red-500' : 'border-gray-300'
                      }`}
                    >
                      <SelectValue placeholder= {t('visibilityPlaceholder')} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="private">{t('private')}</SelectItem>
                    <SelectItem value="public">{t('public')}</SelectItem>
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

          <FormField
            control={form.control}
            name="buttonVariant"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="block text-sm font-medium mb-1 text-gray-800 dark:text-gray-200">
                  {t('themeColor')}
                  <span className="text-red-500">*</span>
                </FormLabel>

                <div className="flex gap-3 p-4 rounded-lg">
                  {buttonVariants.map((variant) => (
                    <Button
                      key={variant.value}
                      type="button"
                      variant={variant.value}
                      className={`w-8 h-8 p-0 rounded-full ${
                        field.value === variant.value 
                          ? 'ring-2 ring-gray-400 dark:ring-gray-300' 
                          : ''
                      }`}
                      onClick={() => field.onChange(variant.value)}
                    />
                  ))}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
          <DialogFooter className="flex justify-end gap-3">
            <Button
              type="button"
              onClick={() => router.back()}
              variant={form.watch('buttonVariant')}
              disabled={isCreating}
            >
              {t('cancel')}
            </Button>

            <Button
              type="submit"
              variant={form.watch('buttonVariant')}
              disabled={isCreating}
            >
              {isCreating ? t('creating') : t('create')}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </div>
  )
}
