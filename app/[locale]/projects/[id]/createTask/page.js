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
import { useState, useEffect } from "react";
import { useDispatch, useSelector } from 'react-redux';
import { createTask } from '@/lib/redux/features/taskSlice';
import { fetchProjectById } from '@/lib/redux/features/projectSlice';

export default function CreateTaskPage({ projectId }) {
  const t = useTranslations('CreateTask');
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const dispatch = useDispatch();
  const project = useSelector((state) => state.projects.projects.find(p => p.id === projectId));

  useEffect(() => {
    if (projectId) {
      dispatch(fetchProjectById(projectId));
    }
  }, [dispatch, projectId]);

  // useEffect(() => {
  //   console.log(project.project_name)
  // }, [project])

  // Schema definition
  const FormSchema = z.object({
    taskName: z.string().trim().min(2, {
      message: t('taskNameMin'),
    }).max(50, {
      message: t('taskNameMax'),
    })
  })

  const form = useForm({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      taskName: ""
    },
  })
  
  // Submit function
  const onSubmit = async (data) => {
    setIsCreating(true);
    
    try {
      // 解构获取表单数据
      const { taskName } = data;

      toast({
        title: t('creating'),
        description: t('pleaseWait'),
      });

      // 调用 Redux 的 createProject 动作
      const resultAction = await dispatch(createTask({
        task_name: taskName.trim(),
        description: "",
        status: "TODO",
        priority: "HIGH",
        due_date: "",
        project_id: projectId,
        assignee_id: 10,
        created_by: 9,
      }));

      if (createTask.fulfilled.match(resultAction)) {
        toast({
          title: t('createSuccess'),
          description: t('taskCreated'),
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
        <div>
          {/* { project.project_name } */}
        </div>
        <div className="flex items-center mb-6">
          <button
            onClick={() => router.back()}
            className="text-gray-800 mr-4 dark:text-gray-200"
          >
            ←
          </button>
          <h1 className="text-2xl font-bold">{t('createTask')}</h1>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

            <FormField
              control={form.control}
              name="taskName"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel className="block text-sm font-medium mb-1 text-gray-800 dark:text-gray-200">
                    {t('taskName')}
                    <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input 
                      className={`w-full px-3 py-2 border rounded-md ${
                        fieldState.invalid ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder= {t('taskNamePlaceholder')} 
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

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                onClick={() => router.back()}
                className={`px-4 py-2 text-sm border rounded-md transition-colors duration-300`}
              >
                {t('cancel')}
              </Button>
              <Button
                type="submit"
                className={`px-4 py-2 text-sm border rounded-md transition-colors duration-300`}
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