import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { useGetUser } from '@/lib/hooks/useGetUser';
import { useTranslations } from 'next-intl'; 

/**
 * 敏捷角色表单组件
 * 用于创建和编辑敏捷角色
 */
const RoleForm = ({ initialValues, onSubmit, loading, teamId }) => {
  const isEdit = !!initialValues?.id;
  const {user} = useGetUser();
  const userId = user?.id;
  const [errors, setErrors] = useState({});
  const t = useTranslations('Agile');
  // 如果有初始值，使用初始值，否则使用默认值
  const defaultValues = initialValues || { 
    team_id: teamId,
    created_by: userId
  };
  
  // 使用react-hook-form
  const form = useForm({
    defaultValues,
  });
  
  // 自定义验证
  const validateForm = (values) => {
    const newErrors = {};
    
    if (!values.name || values.name.trim() === '') {
      newErrors.name = '请输入角色名称';
    }
    
    return newErrors;
  };
  
  // 提交处理函数
  const handleSubmit = (values) => {
    const formErrors = validateForm(values);
    
    if (Object.keys(formErrors).length === 0) {
      // 确保包含created_by字段
      const submitData = {
        ...values,
        created_by: userId // 确保总是包含创建者ID
      };
      onSubmit(submitData);
    } else {
      setErrors(formErrors);
    }
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* 团队ID (隐藏) */}
        <FormField
          control={form.control}
          name="team_id"
          render={({ field }) => (
            <Input type="hidden" {...field} />
          )}
        />
        
        {/* 创建者ID (隐藏) */}
        <FormField
          control={form.control}
          name="created_by"
          render={({ field }) => (
            <Input type="hidden" {...field} />
          )}
        />
        
        {/* 角色名称 */}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('roleName')}</FormLabel>
              <FormControl>
                <Input placeholder={t('roleNamePlaceholder')} {...field} />
              </FormControl>
              {errors.name && <FormMessage>{errors.name}</FormMessage>}
            </FormItem>
          )}
        />
        
        {/* 角色描述 */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('roleDescription')}</FormLabel>
              <FormControl>
                <Textarea rows={4} placeholder={t('roleDescriptionPlaceholder')} {...field} />
              </FormControl>
            </FormItem>
          )}
        />
        
        {/* 提交按钮 */}
        <div className="w-full flex justify-end">
          <Button type="submit" disabled={loading} className="">
            {isEdit ? t('updateRole') : t('createRole')}
          </Button>
        </div>
        
      </form>
    </Form>
  );
};

export default RoleForm; 