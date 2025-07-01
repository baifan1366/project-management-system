'use client'

import { useState, useEffect } from "react";
import { Button } from '../../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { createTaskValidationSchema, taskFormTransforms } from '@/components/validation/taskSchema'
import { updateTask, fetchTaskById } from '@/lib/redux/features/taskSlice';
import { getTagByName } from '@/lib/redux/features/tagSlice';
import { getSectionByTeamId, updateTaskIds } from '@/lib/redux/features/sectionSlice'; 
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
  handleDeleteTask,
  teamId
}) {
  const t = useTranslations('EditTask');
  const tValidation = useTranslations('validationRules');
  const [validationSchema, setValidationSchema] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [sections, setSections] = useState([]);
  const [selectedSection, setSelectedSection] = useState(null);
  const dispatch = useDispatch();
  const [isPastTask, setIsPastTask] = useState(false);

  // 初始化表单
  const form = useForm({
    defaultValues: {
      taskName: editTask.text || '',
      startDate: editTask.start_date || new Date(),
      duration: editTask.duration || 1,
      progress: editTask.progress || 0,
      section: ''
    },
    mode: 'onChange'
  });

  // 获取部分数据
  useEffect(() => {
    async function fetchSections() {
      if (teamId && showEditForm) {
        try {
          const sectionsData = await dispatch(getSectionByTeamId(teamId)).unwrap();
          setSections(sectionsData || []);
          
          // 找出当前任务所在的部分
          if (sectionsData && editTask.id) {
            const taskId = parseInt(editTask.id);
            for (const section of sectionsData) {
              if (section.task_ids && section.task_ids.includes(taskId)) {
                form.setValue('section', section.id.toString());
                setSelectedSection(section.id);
                break;
              }
            }
          }
        } catch (error) {
          console.error("获取部分数据失败:", error);
        }
      }
    }
    
    fetchSections();
  }, [dispatch, teamId, showEditForm, editTask.id, form]);

  // 自定义表单验证
  const isFormValid = () => {
    const taskName = form.getValues('taskName') || '';
    const startDate = form.getValues('startDate');
    const duration = form.getValues('duration');
    const section = form.getValues('section');
    
    // 任务名称检查 (2-100字符)
    const isTaskNameValid = taskName.trim().length >= 2 && taskName.trim().length <= 50;
    
    // 开始日期检查 (不能早于当前日期)
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
    
    const isSectionValid = !!section;

    return isTaskNameValid && isStartDateValid && isDurationValid && isSectionValid;
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

      // 首先处理部分更新
      if (data.section) {
        const newSectionId = parseInt(data.section);
        const taskId = parseInt(editTask.id);
        let needsUpdate = false;
        
        // 查找任务当前所在的部分
        let currentSectionId = null;
        for (const section of sections) {
          if (section.task_ids && section.task_ids.includes(taskId)) {
            currentSectionId = section.id;
            break;
          }
        }
        
        // 只有当部分发生变化时才进行处理
        if (currentSectionId !== newSectionId) {
          needsUpdate = true;
          
          // 如果找到当前部分，将任务从该部分移除
          if (currentSectionId !== null) {
            const currentSection = sections.find(section => section.id === currentSectionId);
            if (currentSection && Array.isArray(currentSection.task_ids)) {
              const updatedTaskIds = currentSection.task_ids.filter(id => id !== taskId);
              await dispatch(updateTaskIds({
                sectionId: currentSectionId,
                teamId: teamId,
                newTaskIds: updatedTaskIds
              }));
            }
          }
          
          // 将任务添加到新部分
          const targetSection = sections.find(section => section.id === newSectionId);
          if (targetSection) {
            const existingTaskIds = Array.isArray(targetSection.task_ids) ? [...targetSection.task_ids] : [];
            if (!existingTaskIds.includes(taskId)) {
              const updatedTaskIds = [...existingTaskIds, taskId];
              await dispatch(updateTaskIds({
                sectionId: newSectionId,
                teamId: teamId,
                newTaskIds: updatedTaskIds
              }));
            }
          }
        }
      }

      // 然后更新任务数据
      await dispatch(updateTask({ 
        taskId: editTask.id,
        taskData: {
          tag_values: updatedTaskData
        },
        oldTask: {
          previousTaskData
        }
      })).unwrap();

      setEditTask(updatedTask);
      handleUpdateTask();
      setShowEditForm(false);
    } catch (error) {
      console.error(`更新任务出错`, error);
    } finally {
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
        progress: editTask.progress || 0,
        section: selectedSection ? selectedSection.toString() : ''
      });
      // 检查是否为过去的任务
      const isPast = checkIsPastTask(editTask.start_date);
      setIsPastTask(isPast);
      setFormErrors({});
    }
  }, [showEditForm, editTask, form, selectedSection]);
  
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
        className="sm:max-w-[600px]"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{t('editTask')}</DialogTitle>
          <DialogDescription>
            {isPastTask 
              ? t('onlyProgressAndDurationEditable') || '此任务的开始日期已过，只能修改完成进度和持续时间'
              : t('modifyTaskInformationOrAdjustCompletionProgress')}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="section"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t('section')}
                    <span className="text-red-500">*</span>
                  </FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    value={field.value}
                    disabled={isPastTask}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('selectSection')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {sections.map(section => (
                        <SelectItem 
                          key={section.id} 
                          value={section.id.toString()}
                        >
                          {section.name || `部分 ${section.id}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="taskName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
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
                      maxLength={50}
                      onChange={(e) => {
                        field.onChange(e);
                      }}
                      disabled={isPastTask}
                    />
                  </FormControl>
                  <FormMessage className="flex justify-end">
                    <span className="text-gray-500 text-xs ml-2">
                      {field.value ? `${field.value.trim().length}/50` : "0/50"}
                    </span>
                  </FormMessage>
                </FormItem>
              )}
            />
            <div className="flex items-end gap-x-2">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem className="w-38">
                    <FormLabel>{t('startDate')}</FormLabel>
                    <FormControl>
                    <Input 
                        type="date" 
                        className="w-38"
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
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="duration"
                render={({ field }) => (
                  <FormItem className="flex-1 w-full">
                    <FormLabel>{t('duration')}</FormLabel>
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
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="progress"
              className="mb-10"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center mb-4">
                    <span className="justify-end flex-1">
                    {t('progress')}
                    </span>
                    <span>
                      {Math.round(field.value * 100)}%
                    </span>
                  </FormLabel>
                  <FormControl className="mb-10">
                    <Slider
                      defaultValue={[field.value]}
                      max={1}
                      step={0.01}                      
                      onValueChange={(value) => field.onChange(value[0])}
                    />
                  </FormControl>
                  <FormMessage className="min-h-[50px]"/>
                </FormItem>
              )}
            />
            
            
          </form>
        </Form>
        <DialogFooter className="flex justify-between mt-2">
        {!isPastTask && (
          <div className="flex-1 ">
            <Button 
              type="button" 
              variant="destructive" 
              onClick={handleDeleteTask}
            >
              {t('delete')}
            </Button>
          </div>
        )}
        {isPastTask && <div></div>} {/* 占位元素以保持布局 */}
          <div className="flex gap-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleCancel}
              disabled={isLoading}
            >
              {t('cancel')}
            </Button>
            <Button 
              onClick={form.handleSubmit(onSubmit)}
              type="button" 
              variant={taskColor}
              disabled={isLoading || !isFormValid()}
            >
              {isLoading ? t('saving') : t('save')}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
