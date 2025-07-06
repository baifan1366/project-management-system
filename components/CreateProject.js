"use client"

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useForm } from "react-hook-form"
import { toast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
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
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog"
import { supabase } from '@/lib/supabase';
import { getSubscriptionLimit, getSubscriptionUsage, DELTA_MAP } from '@/lib/subscriptionService';
import useGetUser from '@/lib/hooks/useGetUser';
import { createProjectValidationSchema, projectFormTransforms } from '@/components/validation/projectSchema';
import { trackSubscriptionUsage } from '@/lib/subscriptionService';
import { limitExceeded } from '@/lib/redux/features/subscriptionSlice';

export default function CreateProjectDialog({ open, onOpenChange }) {
  const t = useTranslations('CreateProject');
  const tValidation = useTranslations('validationRules');
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const dispatch = useDispatch();
  const [subscriptionInfo, setSubscriptionInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const { user, error } = useGetUser();
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    if (open) {
      form.reset({
        projectName: "",
        visibility: "",
        buttonVariant: "black",
      });
      setFormErrors({});
    }
  }, [open]);

  useEffect(() => {
    async function checkSubscriptionLimit() {
      setIsLoading(true);
      try {
        if (user?.id) {
          const limitInfo = await getSubscriptionLimit(user.id, 'create_project');
          setSubscriptionInfo(limitInfo);
          
          // 检查是否已达到限制
          if (!limitInfo.allowed) {
            console.warn('用户已达到项目创建限制:', {
              currentValue: limitInfo.currentValue,
              limit: limitInfo.limit,
              reason: limitInfo.reason
            });
          }
        }
      } catch (error) {
        console.error('获取订阅信息失败:', error);
      } finally {
        setIsLoading(false);
      }
    }
    
    if (open) {
      checkSubscriptionLimit();
    }
  }, [open, user]);

  const validationSchema = createProjectValidationSchema(tValidation);

  const form = useForm({
    defaultValues: {
      projectName: "",
      visibility: "",
      buttonVariant: "black",
    },
  });

  const validateForm = (data) => {
    const transformedData = {
      projectName: projectFormTransforms.projectName(data.projectName),
      visibility: projectFormTransforms.visibility(data.visibility),
      buttonVariant: projectFormTransforms.buttonVariant(data.buttonVariant),
    };

    const { isValid, errors } = validationSchema.validate(transformedData);
    setFormErrors(errors);
    return { isValid, transformedData };
  };

  const buttonVariants = [
    { value: 'black', label: '黑色' },
    { value: 'orange', label: '橙色' },
    { value: 'green', label: '绿色' },
    { value: 'blue', label: '蓝色' },
    { value: 'purple', label: '紫色' },
    { value: 'pink', label: '粉色' }
  ];

  const onSubmit = async (data) => {
    const { isValid, transformedData } = validateForm(data);
    if (!isValid) return;

    setIsCreating(true);
    
    try {
      if (error) {
        throw new Error('Failed to get user information');
      }
      if (!user.id) {
        throw new Error('User not authenticated');
      }

      // 再次检查用户是否可以创建项目
      const limitCheck = await getSubscriptionLimit(user.id, 'create_project');
      if (!limitCheck.allowed) {
        dispatch(limitExceeded({
          actionType: 'create_project',
          limitInfo: limitCheck
        }));
        onOpenChange(false);
        return;
      }

      toast({
        title: t('creating'),
        description: t('pleaseWait'),
      });

      // 调用 Redux 的 createProject 动作
      const resultAction = await dispatch(createProject({
        project_name: transformedData.projectName,
        visibility: transformedData.visibility,
        theme_color: transformedData.buttonVariant,
        created_by: user.id,
        status: "PENDING"
      }));

      if (createProject.fulfilled.match(resultAction)) {
        // Use the subscription service to increment current_projects for the active plan only
        await trackSubscriptionUsage({
          userId: user.id,
          actionType: 'createProject',
          entityType: 'projects'
        });

        toast({
          title: t('createSuccess'),
          description: t('projectCreated'),
        });
        form.reset();
        onOpenChange(false);
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

  const renderDialogContent = () => {
    // 如果正在加载订阅信息，显示加载状态
    if (isLoading) {
      return (
        <div className="space-y-6 p-2">
          <div className="space-y-2">
            <Skeleton className="h-5 w-1/4" />
            <Skeleton className="h-10 w-full" />
          </div>
          
          <div className="space-y-2">
            <Skeleton className="h-5 w-1/4" />
            <Skeleton className="h-10 w-full" />
          </div>
          
          <div className="space-y-2">
            <Skeleton className="h-5 w-1/4" />
            <div className="flex gap-3">
              {Array(6).fill(0).map((_, i) => (
                <Skeleton key={i} className="h-8 w-8 rounded-full" />
              ))}
            </div>
          </div>
          
          <div className="flex justify-end gap-3 mt-6">
            <Skeleton className="h-10 w-20" />
            <Skeleton className="h-10 w-20" />
          </div>
        </div>
      );
    }

    if (subscriptionInfo && !subscriptionInfo.allowed) {
      return (
        <div className="py-2">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-red-700 dark:text-red-400 mb-2">{t('subscriptionLimit')}</h2>
            <p className="text-red-600 dark:text-red-300 mb-4">{subscriptionInfo.reason}</p>
            
            {subscriptionInfo.currentValue !== undefined && subscriptionInfo.limit !== undefined && (
              <div className="mb-4">
                <p className="text-gray-700 dark:text-gray-300">{t('subscriptionLimitDescription')}: {subscriptionInfo.currentValue} / {subscriptionInfo.limit}</p>
                
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mt-2">
                  <div 
                    className="bg-red-600 dark:bg-red-500 h-2.5 rounded-full" 
                    style={{ width: `${Math.min(100, (subscriptionInfo.currentValue / subscriptionInfo.limit) * 100)}%` }}
                  ></div>
                </div>
              </div>
            )}
            
            <Button
              onClick={() => {
                onOpenChange(false);  
                window.open('/settings/subscription', '_blank');
              }}
              variant="destructive"
              className="mt-2 mr-2"
            >
              {t('upgrade')}
            </Button>
            <Button
              onClick={() => {
                onOpenChange(false);
                window.open('/pricing', '_blank');
              }}
              variant="outline"
              className="mt-2"
            >
              {t('goToPricing')}
            </Button>
          </div>
        </div>
      );
    }

    // 正常的表单渲染
    return (
      <div className="py-2">
        {/* 添加订阅使用情况显示 */}
        {subscriptionInfo && subscriptionInfo.allowed && subscriptionInfo.currentValue !== undefined && subscriptionInfo.limit !== undefined && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
            <div className="flex justify-between items-center mb-2">
              <p className="text-sm font-medium text-blue-700 dark:text-blue-400">
                {t('projectUsage')}
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-400">
                {subscriptionInfo.currentValue} / {subscriptionInfo.limit}
              </p>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className={`h-2 rounded-full ${
                  subscriptionInfo.currentValue >= subscriptionInfo.limit 
                    ? 'bg-red-600 dark:bg-red-500' 
                    : subscriptionInfo.currentValue >= subscriptionInfo.limit * 0.8
                      ? 'bg-yellow-600 dark:bg-yellow-500'
                      : 'bg-blue-600 dark:bg-blue-500'
                }`}
                style={{ width: `${Math.min(100, (subscriptionInfo.currentValue / subscriptionInfo.limit) * 100)}%` }}
              ></div>
            </div>
            {subscriptionInfo.currentValue >= subscriptionInfo.limit * 0.8 && (
              <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-2">
                {subscriptionInfo.currentValue >= subscriptionInfo.limit 
                  ? t('subscriptionLimitReached') 
                  : t('subscriptionLimitWarning')}
              </p>
            )}
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="projectName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="block text-sm font-medium mb-1 text-gray-800 dark:text-gray-200">
                    {t('projectName')}
                    <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input 
                      className={`w-full px-3 py-2 border rounded-md ${
                        formErrors.projectName ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder={t('projectNamePlaceholder')} 
                      {...field} 
                      onChange={(e) => {
                        field.onChange(e);
                        if (formErrors.projectName) {
                          setFormErrors({...formErrors, projectName: undefined});
                        }
                      }}
                    />
                  </FormControl>
                  <div className="flex justify-end mt-1 min-h-[20px]">
                    <div className="flex-1">
                      {formErrors.projectName && (
                        <p className="text-xs text-red-500">{formErrors.projectName}</p>
                      )}
                    </div>
                    <span className="text-xs text-gray-500 ml-2">{field.value.trim().length}/50</span>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="visibility"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="block text-sm font-medium mb-1 text-gray-800 dark:text-gray-200">
                    {t('visibility')}
                    <span className="text-red-500">*</span>
                  </FormLabel>
                  <Select 
                    onValueChange={(value) => {
                      field.onChange(value);
                      if (formErrors.visibility) {
                        setFormErrors({...formErrors, visibility: undefined});
                      }
                    }} 
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger 
                        className={`w-full px-3 py-2 border rounded-md ${
                          formErrors.visibility ? 'border-red-500' : 'border-gray-300'
                        }`}
                      >
                        <SelectValue placeholder={t('visibilityPlaceholder')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="private">{t('private')}</SelectItem>
                      <SelectItem value="public">{t('public')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex justify-end mt-1 min-h-[20px]">
                    <div className="flex-1">
                      {formErrors.visibility && (
                        <p className="text-xs text-red-500">{formErrors.visibility}</p>
                      )}
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
                        onClick={() => {
                          field.onChange(variant.value);
                          if (formErrors.buttonVariant) {
                            setFormErrors({...formErrors, buttonVariant: undefined});
                          }
                        }}
                      />
                    ))}
                  </div>
                  {formErrors.buttonVariant && (
                    <p className="text-xs text-red-500">{formErrors.buttonVariant}</p>
                  )}
                </FormItem>
              )}
            />
            <DialogFooter className="flex justify-end gap-3">
              <Button
                type="button"
                onClick={() => onOpenChange(false)}
                variant="outline"
                disabled={isCreating}
              >
                {t('cancel')}
              </Button>

              <Button
                type="submit"
                variant={form.watch('buttonVariant')}
                disabled={isCreating || (subscriptionInfo && !subscriptionInfo.allowed) || (subscriptionInfo && subscriptionInfo.currentValue >= subscriptionInfo.limit)}
              >
                {isCreating ? t('creating') : t('create')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]" onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{t('createProject')}</DialogTitle>
          <DialogDescription />
        </DialogHeader>
        {renderDialogContent()}
      </DialogContent>
    </Dialog>
  );
}
