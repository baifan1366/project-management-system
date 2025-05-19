'use client'

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { createTaskValidationSchema, taskFormTransforms } from '@/components/validation/taskSchema'
import { createTask } from '@/lib/redux/features/taskSlice';
import { createSection, updateTaskIds, getSectionByTeamId } from '@/lib/redux/features/sectionSlice';
import useGetUser from "@/lib/hooks/useGetUser";
import { useDispatch } from "react-redux";
import { getTagByName } from '@/lib/redux/features/tagSlice';
import { supabase } from '@/lib/supabase';

/**
 * 格式化日期为Gantt图所需的标准格式
 * 
 * @param {string|Date} date - 日期字符串或Date对象
 * @returns {string} - 格式化后的日期字符串，格式为 "YYYY-MM-DD HH:MM"
 */
function formatGanttDate(date) {
  try {
    // 检查输入值是否为有效日期
    if (!date) {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      return `${year}-${month}-${day} 00:00`;
    }
    
    // 处理Date对象
    if (date instanceof Date) {
      if (isNaN(date.getTime())) {
        throw new Error("无效的日期对象");
      }
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day} 00:00`;
    }
    
    // 处理字符串
    if (typeof date === 'string') {
      // 已经是Gantt格式 (YYYY-MM-DD HH:MM)
      if (date.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/)) {
        return date;
      }
      
      // ISO日期格式 (YYYY-MM-DDThh:mm:ss.sssZ)
      if (date.includes('T')) {
        const datePart = date.split('T')[0];
        return `${datePart} 00:00`;
      }
      
      // 只有日期部分 (YYYY-MM-DD)
      if (date.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return `${date} 00:00`;
      }
      
      // 尝试解析其他日期格式
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) {
        throw new Error(`无法解析日期字符串: ${date}`);
      }
      
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getDate()).padStart(2, '0');
      return `${year}-${month}-${day} 00:00`;
    }
    
    throw new Error("无效的日期输入类型");
  } catch (error) {
    console.error("日期格式化错误:", error);
    // 返回当前日期作为后备选项
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day} 00:00`;
  }
}

export default function AddTaskDialog({ teamId, taskColor, showTaskForm, setShowTaskForm, onTaskAdd }) {
  const t = useTranslations('CreateTask');
  const tValidation = useTranslations('validationRules');
  const [newTask, setNewTask] = useState({
    text: '',
    start_date: new Date().toISOString().split('T')[0] + ' 00:00',
    duration: 1
  });
  const [validationSchema, setValidationSchema] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useGetUser();
  const dispatch = useDispatch();
  
  const validateForm = (data) => {
    if (!validationSchema) return { isValid: true, errors: {} };
    const transformedData = {
      taskName: taskFormTransforms.taskName(data.taskName),
      startDate: taskFormTransforms.startDate(data.startDate),
      duration: taskFormTransforms.duration(data.duration)
    };
    return validationSchema.validate(transformedData);
  };

  const form = useForm({
    defaultValues: {
      taskName: newTask.text || '',
      startDate: newTask.start_date || new Date(),
      duration: newTask.duration || 1
    },
    mode: 'onChange'
  });  

  // 自定义表单验证
  const isFormValid = () => {
    const taskName = form.getValues('taskName') || '';
    const startDate = form.getValues('startDate');
    const duration = form.getValues('duration');
    
    // 任务名称检查 (2-100字符)
    const isTaskNameValid = taskName.trim().length >= 2 && taskName.trim().length <= 100;
    
    // 开始日期检查 (不能早于当前日期)
    let isStartDateValid = true;
    if (startDate) {
      const selectedDate = new Date(startDate);
      selectedDate.setHours(0, 0, 0, 0);
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      isStartDateValid = selectedDate >= today;
    }
    
    // 持续时间检查 (1-999)
    const durationValue = parseInt(duration);
    const isDurationValid = !isNaN(durationValue) && durationValue >= 1 && durationValue <= 999;
    
    return isTaskNameValid && isStartDateValid && isDurationValid;
  };

  const onSubmit = async (data) => {
    if (isSubmitting || !isFormValid()) return;
    
    const { isValid, errors } = validateForm(data);
    
    if (!isValid) {
      setFormErrors(errors);
      return;
    }
    
    setIsLoading(true);
    setIsSubmitting(true);
    
    try {
      const userId = user?.id;
      
      // 确保日期格式正确
      const formattedStartDate = formatGanttDate(data.startDate);
      
      const updatedTask = {
        "Name": data.taskName.trim(),
        "Start Date": formattedStartDate,
        "Duration": data.duration,
        "Progress": 0
      };
      //compare the name, startDate and duration with the tag table's name
      //by getting the tag.name, get the tag.id at the same time
      const tagIdName = await dispatch(getTagByName("Name")).unwrap();
      const tagIdStartDate = await dispatch(getTagByName("Start Date")).unwrap();
      const tagIdDuration = await dispatch(getTagByName("Duration")).unwrap();
      const tagIdProgress = await dispatch(getTagByName("Progress")).unwrap();

      const taskData = {
        tag_values: {
          // 使用tagId作为对象键映射相应的值
          [tagIdName]: data.taskName.trim(),
          [tagIdStartDate]: formattedStartDate,
          [tagIdDuration]: parseInt(data.duration),
          [tagIdProgress]: 0
        },
        created_by: userId
      }
      const result = await dispatch(createTask(taskData)).unwrap();
      //it may also create a notion_page, then update the notion_page id into the task table, page_id column
      const { data: notionPageData, error: notionPageError } = await supabase
        .from('notion_page')
        .insert({
          created_by: userId,
          last_edited_by: userId
        })
        .select()
        .single();
      console.log(notionPageData);
      //update the notion_page id into the task table, page_id column
      const { data: newTaskData, error: taskError } = await supabase
        .from('task')
        .update({
          page_id: notionPageData.id
        })
        .eq('id', result.id);
      console.log(newTaskData);

      //updateTaskIds
      //check whether this team has section or not
      //if has, update the task_ids at the first section.id table detected
      //if not, create a new section and update the task_ids at the new section.id table
      const sectionId = await dispatch(getSectionByTeamId(teamId)).unwrap();
      if (sectionId != null && sectionId.length > 0) {
        //select the first section.id
        const firstSectionId = sectionId[0].id;
        // 获取当前的task_ids列表，然后将新任务ID追加到现有列表中
        const currentSection = sectionId[0];
        const existingTaskIds = currentSection.task_ids || [];
        const updatedTaskIds = [...existingTaskIds, result.id];
        
        await dispatch(updateTaskIds({
          sectionId: firstSectionId,
          teamId: teamId,
          newTaskIds: updatedTaskIds // 使用包含所有任务ID的更新列表
        })).unwrap();
      } else {
        //create a new section
        const sectionData = {
          teamId,
          sectionName: "New Section",
          createdBy: userId
        };
        const newSection = await dispatch(createSection({teamId, sectionData})).unwrap();
        await dispatch(updateTaskIds({
          sectionId: newSection.id,
          teamId: teamId,
          newTaskIds: [result.id]
        })).unwrap();
      }

      setNewTask(updatedTask);
      handleAddTask(updatedTask);
      form.reset();
      setIsLoading(false);
      setIsSubmitting(false);
      setShowTaskForm(false);

    } catch (error) {
      console.error(`taskDialog出错`, error);
      setIsLoading(false);
      setIsSubmitting(false);
    }
  }  

  const handleAddTask = (task) => {
    try {
      onTaskAdd(task);
      
      setNewTask({
        text: '',
        start_date: formatGanttDate(new Date()),
        duration: 1
      });
    } catch (error) {
      console.error("添加任务时出错:", error);
    }
  }

  useEffect(() => {
    setValidationSchema(createTaskValidationSchema(tValidation));
  }, [tValidation]);

  useEffect(() => {
    if(showTaskForm) {
      form.reset({
        taskName: newTask.text || '',
        startDate: newTask.start_date || new Date(),
        duration: newTask.duration || 1
      });
      setFormErrors({});
    }
  }, [showTaskForm]);

  // 监听表单变化以验证表单
  useEffect(() => {
    const subscription = form.watch(() => {
      form.trigger();
    });
    return () => subscription.unsubscribe();
  }, [form]);


  return (
    <Dialog open={showTaskForm} onOpenChange={setShowTaskForm}>
      <DialogContent 
        className="max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">{t('addNewTask')}</DialogTitle>
          <DialogDescription>
            {t('pleaseFillInTheFollowingInformationToCreateANewTask')}
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <FormField
              control={form.control}
              name="taskName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="block text-sm font-medium mb-1 text-gray-800 dark:text-gray-200">
                    {t('taskName')}
                    <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      placeholder={t('enterTaskName')} 
                      aria-label={t('taskName')}
                      className="border-gray-300"
                      minLength={2}
                      maxLength={100}
                      onChange={(e) => {
                        field.onChange(e);
                      }}
                    />                    
                  </FormControl>  
                  <FormMessage className="flex justify-end">
                    <span className="text-gray-500 text-xs ml-2">
                      {field.value ? `${field.value.trim().length}/100` : "0/100"}
                    </span>
                  </FormMessage>                
                </FormItem>
              )}
            />
            
            <div className="flex space-x-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem className="flex-[2]">
                    <FormLabel className="block text-sm font-medium mb-1 text-gray-800 dark:text-gray-200">
                      {t('startDate')}
                    </FormLabel>
                    <FormControl>
                      <Input 
                        type="date" 
                        aria-label={t('startDate')}
                        min={new Date().toISOString().split('T')[0]}
                        value={field.value instanceof Date 
                          ? field.value.toISOString().split('T')[0] 
                          : typeof field.value === 'string' 
                            ? field.value.split(' ')[0]
                            : field.value}
                        onChange={(e) => {
                          field.onChange(e);
                        }}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="duration"
                render={({ field }) => (
                  <FormItem className="flex-[3]">
                    <FormLabel className="block text-sm font-medium mb-1 text-gray-800 dark:text-gray-200">
                      {t('duration')}
                    </FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="1"
                        max="999"
                        placeholder="1"
                        aria-label={t('duration')}
                        className="w-full"
                        {...field}
                        onChange={(e) => {
                          const value = parseInt(e.target.value, 10);
                          if (isNaN(value)) {
                            field.onChange(1);
                          } else if (value < 1) {
                            field.onChange(1);
                          } else if (value > 999) {
                            field.onChange(999);
                          } else {
                            field.onChange(value);
                          }
                        }}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            
            <DialogFooter className="flex justify-end gap-2 pt-4">
              <Button 
                type="button"
                variant="outline"
                onClick={() => setShowTaskForm(false)}
                disabled={isLoading}
              >
                {t('cancel')}
              </Button>
              <Button 
                type="submit"
                variant={taskColor}
                disabled={isLoading || !isFormValid()}
              >
                {isLoading ? t('adding') : t('add')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
