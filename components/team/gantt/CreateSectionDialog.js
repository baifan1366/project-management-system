'use client'

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { createSection } from '@/lib/redux/features/sectionSlice';
import { useDispatch } from "react-redux";
import { useGetUser } from "@/lib/hooks/useGetUser";

export default function CreateSectionDialog({ taskColor, teamId, showCreateSection, setShowCreateSection, onSectionCreated }) {
  const t = useTranslations('CreateTask');
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useGetUser();
  const dispatch = useDispatch();
  
  const form = useForm({
    defaultValues: {
      sectionName: '',
    },
    mode: 'onChange'
  });  

  // 每次对话框打开时重置表单
  useEffect(() => {
    if (showCreateSection) {
      form.reset({
        sectionName: '',
      });
    }
  }, [showCreateSection, form]);

  // 自定义表单验证
  const isFormValid = () => {
    const sectionName = form.getValues('sectionName') || '';
    // 部分名称检查 (2-50字符)
    return sectionName.trim().length >= 2 && sectionName.trim().length <= 50;
  };

  // 监听表单值变化以正确触发验证
  useEffect(() => {
    const subscription = form.watch(() => form.trigger('sectionName'));
    return () => subscription.unsubscribe();
  }, [form]);

  const onSubmit = async (data) => {
    if (!isFormValid()) return;
    
    setIsLoading(true);
    
    try {
      const userId = user?.id;
      
      const sectionData = {
        teamId,
        sectionName: data.sectionName.trim(),
        createdBy: userId
      };
      
      const result = await dispatch(createSection({teamId, sectionData})).unwrap();
      
      form.reset({
        sectionName: '',
      });
      
      if (onSectionCreated) {
        onSectionCreated(result);
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error(`创建部分出错`, error);
      setIsLoading(false);
    }
  }

  const handleCancel = () => {
    form.reset();
    setShowCreateSection(false);
  }

  return (
    <Dialog open={showCreateSection} onOpenChange={setShowCreateSection}>
      <DialogContent 
        className="sm:max-w-[400px]"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{t('createSection')}</DialogTitle>
          <DialogDescription>
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="sectionName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t('sectionName')}
                    <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                  <Input 
                      {...field} 
                      placeholder={t('enterSectionName')} 
                      aria-label={t('sectionName')}
                      className="border-gray-300"
                      minLength={2}
                      maxLength={50}
                      onChange={(e) => {
                        field.onChange(e.target.value);
                        form.trigger('sectionName');
                      }}
                    /> 
                  </FormControl>
                  <FormMessage className="flex justify-end">
                    <span className="text-gray-500 text-xs ml-2">
                      {field.value ? `${(field.value.toString() || '').trim().length}/50` : "0/50"}
                    </span>
                  </FormMessage>
                </FormItem>
              )}
            />
            
            <DialogFooter className="flex justify-end gap-2">
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
                disabled={!isFormValid() || isLoading} 
                variant={taskColor}
              >
                {isLoading ? t('creating') : t('create')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
} 