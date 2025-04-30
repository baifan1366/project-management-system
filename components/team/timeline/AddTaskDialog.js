'use client'

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { createTaskValidationSchema, taskFormTransforms } from '@/components/validation/taskSchema'

export default function AddTaskDialog({ taskColor, showTaskForm, setShowTaskForm, onTaskAdd }) {
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
    }
  });  

  const onSubmit = async (data) => {
    if (isSubmitting) return;
    
    const { isValid, errors } = validateForm(data);
    
    if (!isValid) {
      setFormErrors(errors);
      return;
    }
    
    setIsLoading(true);
    setIsSubmitting(true);
    
    try {
      const updatedTask = {
        text: data.taskName,
        start_date: data.startDate,
        duration: data.duration
      };
      
      setNewTask(updatedTask);
      
      handleAddTask(updatedTask);
      console.log('addTask', updatedTask);
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
    if (task.text.trim() === '') return;
    
    try {
      onTaskAdd(task);
      
      setNewTask({
        text: '',
        start_date: new Date().toISOString().split('T')[0] + ' 00:00',
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
                      className={formErrors.taskName ? 'border-red-500' : 'border-gray-300'}
                      onChange={(e) => {
                        field.onChange(e);
                        if (formErrors.taskName) {
                          setFormErrors({...formErrors, taskName: undefined});
                        }
                      }}
                    />
                  </FormControl>
                  {formErrors.taskName && (
                    <FormMessage className="text-xs">{formErrors.taskName}</FormMessage>
                  )}
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
                        className={`${formErrors.startDate ? 'border-red-500' : ''}`}
                        value={field.value instanceof Date 
                          ? field.value.toISOString().split('T')[0] 
                          : typeof field.value === 'string' 
                            ? field.value.split(' ')[0]
                            : field.value}
                        onChange={(e) => {
                          field.onChange(e);
                          if (formErrors.startDate) {
                            setFormErrors({...formErrors, startDate: undefined});
                          }
                        }}
                      />
                    </FormControl>
                    {formErrors.startDate && (
                      <FormMessage className="text-xs">{formErrors.startDate}</FormMessage>
                    )}
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
                        placeholder="1"
                        aria-label={t('duration')}
                        className={`w-full ${formErrors.duration ? 'border-red-500' : ''}`}
                        {...field}
                      />
                    </FormControl>
                    {formErrors.duration && (
                      <FormMessage className="text-xs">{formErrors.duration}</FormMessage>
                    )}
                  </FormItem>
                )}
              />
            </div>
            
            <DialogFooter className="flex justify-end gap-2 pt-4">
              <Button 
                type="button"
                variant={taskColor}
                onClick={() => setShowTaskForm(false)}
                disabled={isLoading}
              >
                {t('cancel')}
              </Button>
              <Button 
                type="submit"
                variant={taskColor}
                disabled={isLoading}
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
