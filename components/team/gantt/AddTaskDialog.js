'use client'

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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

export default function AddTaskDialog({ teamId, taskColor, showTaskForm, setShowTaskForm, onTaskAdd, setShowCreateSection }) {
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
  const [sections, setSections] = useState([]);
  const [selectedSection, setSelectedSection] = useState(null);
  const { user } = useGetUser();
  const dispatch = useDispatch();
  
  // 获取部分数据
  useEffect(() => {
    async function fetchSections() {
      if (teamId && showTaskForm) {
        try {
          const sectionsData = await dispatch(getSectionByTeamId(teamId)).unwrap();
          setSections(sectionsData || []);
          
          // 如果有部分，默认选择第一个
          if (sectionsData && sectionsData.length > 0) {
            setSelectedSection(sectionsData[0].id);
            form.setValue('section', sectionsData[0].id.toString());
          }
        } catch (error) {
          console.error("获取部分数据失败:", error);
        }
      }
    }
    
    fetchSections();
  }, [dispatch, teamId, showTaskForm]);
  
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
      duration: newTask.duration || 1,
      section: ''
    },
    mode: 'onChange'
  });  

  // 自定义表单验证
  const isFormValid = () => {
    const taskName = form.getValues('taskName') || '';
    const startDate = form.getValues('startDate');
    const duration = form.getValues('duration');
    const section = form.getValues('section');
    
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
    
    // 部分检查
    const isSectionValid = !!section;
    
    return isTaskNameValid && isStartDateValid && isDurationValid && isSectionValid;
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

      // 更新任务所属的部分
      if (data.section) {
        const sectionId = parseInt(data.section);
        const targetSection = sections.find(section => section.id === sectionId);
        
        if (targetSection) {
          const existingTaskIds = targetSection.task_ids || [];
          const updatedTaskIds = [...existingTaskIds, result.id];
          
          await dispatch(updateTaskIds({
            sectionId: sectionId,
            teamId: teamId,
            newTaskIds: updatedTaskIds
          })).unwrap();
        }
      } else {
        // 如果没有选择部分，但有部分存在，使用第一个部分
        if (sections.length > 0) {
          const firstSectionId = sections[0].id;
          const currentSection = sections[0];
          const existingTaskIds = currentSection.task_ids || [];
          const updatedTaskIds = [...existingTaskIds, result.id];
          
          await dispatch(updateTaskIds({
            sectionId: firstSectionId,
            teamId: teamId,
            newTaskIds: updatedTaskIds
          })).unwrap();
        } else {
          // 如果没有部分，创建一个新部分
          const sectionData = {
            teamId,
            sectionName: "新部分",
            createdBy: userId
          };
          const newSection = await dispatch(createSection({teamId, sectionData})).unwrap();
          await dispatch(updateTaskIds({
            sectionId: newSection.id,
            teamId: teamId,
            newTaskIds: [result.id]
          })).unwrap();
        }
      }

      setNewTask(updatedTask);
      handleAddTask(updatedTask);
      form.reset({
        taskName: '',
        startDate: new Date(),
        duration: 1,
        section: sections.length > 0 ? sections[0].id.toString() : ''
      });
      setIsLoading(false);
      setIsSubmitting(false);
      setShowTaskForm(false);
    } catch (error) {
      console.error(`创建任务出错`, error);
      setIsLoading(false);
      setIsSubmitting(false);
    }
  }

  const handleCancel = () => {
    form.reset();
    setNewTask({
      text: '',
      start_date: new Date().toISOString().split('T')[0] + ' 00:00',
      duration: 1
    });
    setShowTaskForm(false);
  }

  const handleAddTask = (task) => {
    if (onTaskAdd) {
      onTaskAdd({ 
        taskName: task.Name, 
        startDate: task["Start Date"], 
        duration: task.Duration 
      });
    }
  }
  
  // 加载验证架构
  useEffect(() => {
    setValidationSchema(createTaskValidationSchema(tValidation));
  }, [tValidation]);

  // 当对话框打开时，重置表单状态
  useEffect(() => {
    if (showTaskForm) {
      form.reset({
        taskName: '',
        startDate: new Date(),
        duration: 1,
        section: selectedSection ? selectedSection.toString() : ''
      });
      setFormErrors({});
    }
  }, [showTaskForm, form, selectedSection]);

  // 处理"创建新部分"选项点击
  const handleCreateSectionClick = () => {
    // 先关闭选择器
    form.setValue('section', '');
    // 打开创建部分对话框
    setShowCreateSection(true);
  };
  
  // 在创建新部分后刷新部分列表
  const handleSectionCreated = (newSection) => {
    // 重新获取部分列表
    dispatch(getSectionByTeamId(teamId)).unwrap()
      .then(sectionsData => {
        setSections(sectionsData || []);
        // 选择新创建的部分
        if (newSection && newSection.id) {
          form.setValue('section', newSection.id.toString());
          setSelectedSection(newSection.id);
        }
      })
      .catch(error => {
        console.error("获取部分数据失败:", error);
      });
  };

  return (
    <Dialog open={showTaskForm} onOpenChange={setShowTaskForm}>
      <DialogContent 
        className="sm:max-w-[600px]"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{t('createTask')}</DialogTitle>
          <DialogDescription>
            {t('pleaseFillInTheFollowingInformationToCreateANewTask')}
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
                    onValueChange={(value) => {
                      if (value === "create-new") {
                        // 打开创建部分对话框
                        setShowCreateSection(true);
                        // 不更新字段值，保持当前选择
                      } else {
                        // 正常更新字段值
                        field.onChange(value);
                      }
                    }}
                    defaultValue={field.value}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue 
                          className="truncate whitespace-nowrap max-w-xs overflow-hidden"
                          placeholder={t('selectSection')} 
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent
                      className="w-full truncate"
                    >
                      {sections.map(section => (
                        <SelectItem 
                          key={section.id} 
                          value={section.id.toString()}
                          className="truncate whitespace-nowrap overflow-hidden"
                        >
                          {section.name || `部分 ${section.id}`}
                        </SelectItem>
                      ))}
                      <SelectItem 
                        key="create-new" 
                        value="create-new"
                        className="items-center w-full justify-center text-center border-t mt-1 pt-1"
                      >
                        +  {t('createNewSection')}
                      </SelectItem>
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
            <div className="flex items-end gap-x-2">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem className="w-38">
                    <FormLabel>{t('startDate')}</FormLabel>
                    <FormControl>
                    <Input 
                        className="w-38"
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
            
            <DialogFooter className="flex justify-end gap-2">
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
