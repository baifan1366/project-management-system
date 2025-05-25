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
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useForm } from 'react-hook-form';
import moment from 'moment';
import { useGetUser } from '@/lib/hooks/useGetUser';

/**
 * 冲刺表单组件
 * 用于创建和编辑冲刺信息
 */
const SprintForm = ({ initialValues, onSubmit, loading, teamId }) => {
  const isEdit = !!initialValues?.id;
  const {user} = useGetUser();
  const userId = user?.id;
  const [errors, setErrors] = useState({});
  
  // 处理初始值，特别是日期格式
  const prepareInitialValues = () => {
    if (initialValues) {
      return {
        ...initialValues,
        start_date: initialValues.start_date ? new Date(initialValues.start_date) : undefined,
        created_by: user?.id
      };
    } else {
      return {
        team_id: teamId,
        created_by: userId,
        status: 'PLANNING' // 默认状态
      };
    }
  };
  
  // 使用react-hook-form
  const form = useForm({
    defaultValues: prepareInitialValues(),
  });
  
  // 自定义验证
  const validateForm = (values) => {
    const newErrors = {};
    
    if (!values.name || values.name.trim() === '') {
      newErrors.name = '请输入冲刺名称';
    }
    
    if (!values.start_date) {
      newErrors.start_date = '请选择开始日期';
    }
    
    if (!values.duration) {
      newErrors.duration = '请输入持续时间';
    } else if (values.duration < 1) {
      newErrors.duration = '最小持续时间为1天';
    } else if (values.duration > 30) {
      newErrors.duration = '最大持续时间为30天';
    }
    
    if (!values.goal || values.goal.trim() === '') {
      newErrors.goal = '请输入冲刺目标';
    }
    
    return newErrors;
  };
  
  // 表单提交
  const handleSubmit = (values) => {
    const formErrors = validateForm(values);
    
    if (Object.keys(formErrors).length === 0) {
      // 转换日期格式为ISO字符串，并确保包含created_by
      const submitData = {
        ...values,
        created_by: userId, // 确保总是包含创建者ID
        start_date: values.start_date ? format(values.start_date, 'yyyy-MM-dd HH:mm:ss') : null,
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
        
        {/* 冲刺名称 */}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>冲刺名称</FormLabel>
              <FormControl>
                <Input placeholder="例如：2021-Q1-Sprint1" {...field} />
              </FormControl>
              {errors.name && <FormMessage>{errors.name}</FormMessage>}
            </FormItem>
          )}
        />
        
        {/* 开始日期 */}
        <FormField
          control={form.control}
          name="start_date"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>开始日期</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value ? (
                        format(field.value, "yyyy-MM-dd")
                      ) : (
                        <span>选择开始日期</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {errors.start_date && <FormMessage>{errors.start_date}</FormMessage>}
            </FormItem>
          )}
        />
        
        {/* 持续时间（天） */}
        <FormField
          control={form.control}
          name="duration"
          render={({ field }) => (
            <FormItem>
              <FormLabel>持续时间（天）</FormLabel>
              <FormControl>
                <Input type="number" min={1} max={30} {...field} />
              </FormControl>
              {errors.duration && <FormMessage>{errors.duration}</FormMessage>}
            </FormItem>
          )}
        />
        
        {/* 冲刺目标 */}
        <FormField
          control={form.control}
          name="goal"
          render={({ field }) => (
            <FormItem>
              <FormLabel>冲刺目标</FormLabel>
              <FormControl>
                <Textarea rows={4} placeholder="描述这个冲刺的目标..." {...field} />
              </FormControl>
              {errors.goal && <FormMessage>{errors.goal}</FormMessage>}
            </FormItem>
          )}
        />
        
        {/* 状态 - 编辑模式下可修改 */}
        {isEdit && (
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>状态</FormLabel>
                <Select 
                  onValueChange={field.onChange} 
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="选择状态" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="PLANNING">计划中</SelectItem>
                    <SelectItem value="PENDING">待开始</SelectItem>
                    <SelectItem value="ACTIVE">进行中</SelectItem>
                    <SelectItem value="RETROSPECTIVE">回顾中</SelectItem>
                    <SelectItem value="COMPLETED">已完成</SelectItem>
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />
        )}
        
        {/* 提交按钮 */}
        <Button type="submit" disabled={loading}>
          {isEdit ? '更新冲刺' : '创建冲刺'}
        </Button>
      </form>
    </Form>
  );
};

export default SprintForm; 