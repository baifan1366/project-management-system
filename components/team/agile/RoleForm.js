import React, { useState, useEffect } from 'react';
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
import { useDispatch, useSelector } from 'react-redux';
import { fetchAgileRoles } from '@/lib/redux/features/agileSlice';

/**
 * 敏捷角色表单组件
 * 用于创建和编辑敏捷角色
 */
const RoleForm = ({ initialValues, onSubmit, loading, teamId, isOpen, themeColor }) => {
  const isEdit = !!initialValues?.id;
  const {user} = useGetUser();
  const userId = user?.id;
  const [errors, setErrors] = useState({});
  const t = useTranslations('Agile');
  const dispatch = useDispatch();
  
  // 从Redux获取当前团队的角色列表
  const agileRoles = useSelector(state => state.agiles.agileRoles);
  
  // 创建默认值函数，确保每次使用都是最新的值
  const getDefaultValues = () => ({
    team_id: teamId,
    created_by: userId,
    name: '',
    description: '',
    ...(initialValues || {})
  });
  
  // 使用react-hook-form
  const form = useForm({
    defaultValues: getDefaultValues(),
  });
  
  // 监听表单打开或关闭状态，重置表单
  useEffect(() => {
    if (isOpen) {
      form.reset(getDefaultValues());
      setErrors({});
      
      // 获取团队当前角色列表
      if (teamId) {
        dispatch(fetchAgileRoles(teamId));
      }
    }
  }, [isOpen, teamId, userId, initialValues, dispatch]);
  
  // 自定义验证
  const validateForm = (values) => {
    const newErrors = {};
    
    // 验证角色名称
    if (!values.name || values.name.trim() === '') {
      newErrors.name = t('roleNameRequired') || '请输入角色名称';
    } else if (values.name.trim().length < 2) {
      newErrors.name = t('roleNameMinLength') || '角色名称最少需要2个字符';
    } else if (values.name.trim().length > 50) {
      newErrors.name = t('roleNameMaxLength') || '角色名称最多允许50个字符';
    }
    
    // 验证角色描述
    if (!values.description || values.description.trim() === '') {
      newErrors.description = t('roleDescriptionRequired') || '请输入角色描述';
    } else if (values.description.trim().length < 10) {
      newErrors.description = t('roleDescriptionMinLength') || '角色描述最少需要10个字符';
    } else if (values.description.trim().length > 100) {
      newErrors.description = t('roleDescriptionMaxLength') || '角色描述最多允许100个字符';
    }
    
    return newErrors;
  };
  
  // 检查角色名称是否已存在
  const checkRoleNameExists = (name, currentRoleId = null) => {
    if (!agileRoles || !Array.isArray(agileRoles)) return false;
    
    return agileRoles.some(role => 
      role && 
      role.name && 
      role.name.trim().toLowerCase() === name.trim().toLowerCase() && 
      (!currentRoleId || role.id !== currentRoleId)
    );
  };
  
  // 修改角色名称，如果存在重复则添加后缀
  const getUniqueRoleName = (name) => {
    if (!checkRoleNameExists(name)) return name;
    
    return `${name} (1)`;
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
      
      // 检查名称是否已存在
      // 如果是新建角色，检查名称是否存在
      // 如果是编辑角色，检查除当前角色外是否有重名
      if (!isEdit && checkRoleNameExists(submitData.name)) {
        // 创建新角色时发现重名，添加后缀
        submitData.name = getUniqueRoleName(submitData.name);
      } else if (isEdit && checkRoleNameExists(submitData.name, initialValues.id)) {
        // 编辑角色时发现重名，添加后缀
        submitData.name = getUniqueRoleName(submitData.name);
      }
      
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
              <div className='flex justify-between'>
                <div>{errors.name && <FormMessage>{errors.name}</FormMessage>}</div>
                <div className='text-xs text-muted-foreground'>{field.value ? String(field.value).trim().length : 0}/50</div>
              </div>
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
              <div className='flex justify-between'>
                <div>{errors.description && <FormMessage>{errors.description}</FormMessage>}</div>
                <div className='text-xs text-muted-foreground'>{field.value ? String(field.value).trim().length : 0}/100</div>
              </div>
            </FormItem>
          )}
        />
        
        {/* 提交按钮 */}
        <div className="w-full flex justify-end">
          <Button type="submit" variant={themeColor} disabled={loading}>
            {isEdit ? t('updateRole') : t('createRole')}
          </Button>
        </div>
        
      </form>
    </Form>
  );
};

export default RoleForm; 