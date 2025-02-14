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
import { useState } from "react";
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
    themeColor: z.string().min(1, {
      message: t('themeColorRequired'),
    })
  })

  const form = useForm({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      projectName: "",
      visibility: "",
      themeColor: "white",
    },
  })

  // 更新颜色选项，添加黑白色并调整顺序
  const themeColors = [
    { value: 'white', color: '#ffffff' },
    { value: 'lightGreen', color: '#bbf7d0' },
    { value: 'lightYellow', color: '#fefcbf' },
    { value: 'lightCoral', color: '#f08080' },
    { value: 'lightOrange', color: '#ffedd5' },
    { value: 'peach', color: '#ffcccb' },
    { value: 'lightCyan', color: '#e0ffff' },
  ]

  const buttonClass = `px-4 py-2 text-sm border rounded-md transition-colors duration-300 ${
    form.watch('themeColor') === 'white' ? 'bg-black text-white dark:bg-white dark:text-black' :
    form.watch('themeColor') === 'lightGreen' ? 'bg-[#bbf7d0] text-black' :
    form.watch('themeColor') === 'lightYellow' ? 'bg-[#fefcbf] text-black' :
    form.watch('themeColor') === 'lightCoral' ? 'bg-[#f08080] text-white' :
    form.watch('themeColor') === 'lightOrange' ? 'bg-[#ffedd5] text-black' :
    form.watch('themeColor') === 'peach' ? 'bg-[#ffcccb] text-black' :
    form.watch('themeColor') === 'lightCyan' ? 'bg-[#e0ffff] text-black' :
    ''
  }`

  // Submit function
  const onSubmit = async (data) => {
    setIsCreating(true);
    
    try {
      // 解构获取表单数据
      const { projectName, visibility, themeColor } = data;

      toast({
        title: t('creating'),
        description: t('pleaseWait'),
      });

      // 调用 Redux 的 createProject 动作
      const resultAction = await dispatch(createProject({
        project_name: projectName.trim(),
        visibility,
        theme_color: themeColor,
        team_id: 16,
        created_by: 9,
      }));

      if (createProject.fulfilled.match(resultAction)) {
        toast({
          title: t('createSuccess'),
          description: t('projectCreated'),
        });
        form.reset(); //重置表单
        router.push('/projects'); // 创建成功后返回projects页面
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
              name="themeColor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="block text-sm font-medium mb-1 text-gray-800 dark:text-gray-200">
                    {t('themeColor')}
                    <span className="text-red-500">*</span>
                  </FormLabel>

                  {/* 颜色选择器容器 - 背景色会随选中的颜色变化 */}
                  <div className="flex gap-3 p-4 rounded-lg">
                    {themeColors.map((themeColor) => (
                      <div
                        key={themeColor.value}
                        // 外层圆形容器 - 处理选中状态的边框样式
                        className={`relative w-8 h-8 cursor-pointer rounded-full border-2 ${
                          // 当前选中的颜色显示边框
                          field.value === themeColor.value 
                            ? 'border-gray-400 dark:border-gray-300' 
                            : 'border-transparent'
                        } ${
                          //默认边框
                          themeColor.value === 'border-gray-400 dark:border-gray-300'
                        }`}
                        onClick={() => {
                          field.onChange(themeColor.value);
                        }}
                      >
                        {/* 内层颜色显示区域 */}
                        <div
                          className={`absolute inset-1 rounded-full ${
                            // 白色选项添加边框以便于识别
                            themeColor.value === 'white' ? 'border border-gray-200' : ''
                          }`}
                          // 设置实际的颜色值
                          style={{ backgroundColor: themeColor.color }}
                        />
                      </div>
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
                className={buttonClass}
              >
                {t('cancel')}
              </Button>
              <Button
                type="submit"
                className={buttonClass}
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
