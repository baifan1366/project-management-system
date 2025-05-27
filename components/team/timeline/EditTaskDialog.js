'use client'

import { useState, useEffect } from "react";
import { Button } from '../../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { createTaskValidationSchema, taskFormTransforms } from '@/components/validation/taskSchema'
import { updateTask, fetchTaskById } from '@/lib/redux/features/taskSlice';
import { getTagByName } from '@/lib/redux/features/tagSlice';
import { useDispatch } from "react-redux";

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

export default function EditTaskDialog({ 
  taskColor,
  showEditForm,
  setShowEditForm,
  editTask,
  setEditTask,
  handleUpdateTask,
  handleDeleteTask
}) {
  const t = useTranslations('EditTask');
  const tValidation = useTranslations('validationRules');
  const [validationSchema, setValidationSchema] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isPastTask, setIsPastTask] = useState(false);
  const dispatch = useDispatch();
  // 初始化表单
  const form = useForm({
    defaultValues: {
      taskName: editTask.text || '',
      startDate: editTask.start_date || new Date(),
      duration: editTask.duration || 1,
      progress: editTask.progress || 0
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
    
    // 开始日期检查 (如果是过去的任务，跳过此验证)
    let isStartDateValid = true;
    if (startDate && !isPastTask) {
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

  // 检查任务开始日期是否早于当前日期
  const checkIsPastTask = (startDate) => {
    if (!startDate) return false;
    
    const taskDate = new Date(startDate);
    taskDate.setHours(0, 0, 0, 0);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return taskDate < today;
  };

  // 表单验证
  const validateForm = (data) => {
    if (!validationSchema) return { isValid: true, errors: {} };
    const transformedData = {
      taskName: taskFormTransforms.taskName(data.taskName),
      startDate: taskFormTransforms.startDate(data.startDate),
      duration: taskFormTransforms.duration(data.duration)
    };
    return validationSchema.validate(transformedData);
  };

  // 提交表单
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
      const formattedStartDate = formatGanttDate(data.startDate);
      const updatedTask = {
        "Name": data.taskName.trim(),
        "Start Date": formattedStartDate,
        "Duration": data.duration,
        "Progress": data.progress
      };
      const tagIdName = await dispatch(getTagByName("Name")).unwrap();
      const tagIdStartDate = await dispatch(getTagByName("Start Date")).unwrap();
      const tagIdDuration = await dispatch(getTagByName("Duration")).unwrap();
      const tagIdProgress = await dispatch(getTagByName("Progress")).unwrap();

      const updatedTaskData = {
          // 使用tagId作为对象键映射相应的值
          [tagIdName]: data.taskName.trim(),
          [tagIdStartDate]: formattedStartDate,
          [tagIdDuration]: parseInt(data.duration),
          [tagIdProgress]: data.progress
      }
      const previousTaskData = await dispatch(fetchTaskById(editTask.id)).unwrap();

      await dispatch(updateTask({ 
        taskId: editTask.id,
        taskData: {
          tag_values: updatedTaskData
        },
        oldTask: {
          //get previous task data
          previousTaskData
        }
      })).unwrap();

      setEditTask(updatedTask);
      handleUpdateTask();
      setIsLoading(false);
      setIsSubmitting(false);
    } catch (error) {
      console.error(`更新任务出错`, error);
      setIsLoading(false);
      setIsSubmitting(false);
    }
  }

  // 处理取消编辑
  const handleCancel = () => {
    // 重置表单状态
    form.reset();
    setEditTask({
      id: null,
      text: '',
      start_date: new Date(),
      duration: 1,
      progress: 0
    });
    // 关闭对话框
    setShowEditForm(false);
  }

  // 加载验证架构
  useEffect(() => {
    setValidationSchema(createTaskValidationSchema(tValidation));
  }, [tValidation]);

  // 当编辑任务数据改变时，更新表单
  useEffect(() => {
    if(showEditForm) {
      form.reset({
        taskName: editTask.text || '',
        startDate: editTask.start_date || new Date(),
        duration: editTask.duration || 1,
        progress: editTask.progress || 0
      });
      
      // 检查是否为过去的任务
      const isPast = checkIsPastTask(editTask.start_date);
      setIsPastTask(isPast);
      
      setFormErrors({});
    }
  }, [showEditForm, editTask, form]);
  
  // 监听表单变化以验证表单
  useEffect(() => {
    const subscription = form.watch(() => {
      form.trigger();
    });
    return () => subscription.unsubscribe();
  }, [form]);
  
  return (
    <Dialog open={showEditForm} onOpenChange={setShowEditForm}>
      <DialogContent 
        className="max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">{t('editTask')}</DialogTitle>
          <DialogDescription>
            {isPastTask 
              ? t('onlyProgressAndDurationEditable') || '此任务的开始日期已过，只能修改完成进度和持续时间'
              : t('modifyTaskInformationOrAdjustCompletionProgress')}
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
                      disabled={isPastTask}
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
                        disabled={isPastTask}
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
            
            <FormField
              control={form.control}
              name="progress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="block text-sm font-medium mb-1 text-gray-800 dark:text-gray-200">
                    {t('completionProgress')}
                  </FormLabel>
                  <div className="flex items-center gap-2">
                    <FormControl>
                      <Slider
                        defaultValue={[field.value * 100]}
                        max={100}
                        step={10}
                        onValueChange={(values) => field.onChange(values[0] / 100)}
                        className="w-full"
                      />
                    </FormControl>
                    <span className="min-w-[40px]">{Math.round(field.value * 100)}%</span>
                  </div>
                </FormItem>
              )}
            />
          
            <DialogFooter className="flex justify-between pt-4">
              {!isPastTask && (
                <Button 
                  type="button"
                  variant="destructive"
                  onClick={handleDeleteTask}
                  className="bg-red-600 hover:bg-red-700"
                  disabled={isLoading}
                >
                  {t('delete')}
                </Button>
              )}
              {isPastTask && <div></div>} {/* 占位元素以保持布局 */}
              <div className="flex-1 flex justify-end gap-2">
                <Button 
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isLoading}
                >
                  {t('cancel')}
                </Button>
                <Button 
                  type="submit"
                  variant={taskColor}
                  disabled={isLoading || !isFormValid()}
                >
                  {isLoading ? t('saving') : t('save')}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
