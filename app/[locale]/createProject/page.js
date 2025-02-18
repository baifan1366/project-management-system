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

export default function CreateProjectPage() {
  const t = useTranslations('CreateProject');
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const dispatch = useDispatch();

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

      toast({
        title: t('creating'),
        description: t('pleaseWait'),
      });

      // 调用 Redux 的 createProject 动作
      const resultAction = await dispatch(createProject({
        project_name: projectName.trim(),
        visibility,
        theme_color: buttonVariant,
        team_id: 16,
        created_by: 9,
      }));

      if (createProject.fulfilled.match(resultAction)) {
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
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                onClick={() => router.back()}
                variant={form.watch('buttonVariant')}
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
            </div>
          </form>
        </Form>
      </div>
  )
}
