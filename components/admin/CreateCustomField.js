'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useDispatch } from 'react-redux';
import { useForm } from 'react-hook-form';
import { createCustomField } from '@/lib/redux/features/customFieldSlice';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { createCustomFieldSchema, customFieldFormTransforms } from '@/components/validation/customFieldSchema';
import { supabase } from '@/lib/supabase';
import { useGetUser } from '@/lib/hooks/useGetUser';

export default function CreateCustomField({ isOpen, onClose, field, setField }) {
    const t = useTranslations('CustomField');
    const tValidation = useTranslations('validationRules');
    const dispatch = useDispatch();
    const [isSaving, setIsSaving] = useState(false);
    const validTypes = ['LIST', 'OVERVIEW', 'TIMELINE', 'NOTE', 'GANTT', 'CALENDAR', 'AGILE', 'WORKFLOW', 'KANBAN', 'FILES'];
    const { user } = useGetUser();
    
    // 设置自定义验证器
    const validateField = (name, value) => {
        const schema = createCustomFieldSchema(tValidation);
        // 应用转换
        const transformedValue = customFieldFormTransforms[name] ? 
            customFieldFormTransforms[name](value) : value;
        
        const validation = schema.validateField(name, transformedValue);
        return validation.isValid ? true : validation.message;
    };
    
    // 设置表单
    const form = useForm({
        defaultValues: {
            name: '',
            type: '',
            description: '',
            icon: '',
        },
    });
    
    // 当 field 或 isOpen 改变时重置表单
    useEffect(() => {
        if (field) {
            form.reset({
                name: field.name || '',
                type: field.type || '',
                description: field.description || '',
                icon: field.icon || '',
            });
        } else {
            form.reset({
                name: '',
                type: '',
                description: '',
                icon: '',
            });
        }
    }, [field, isOpen, form]);

    const onSubmit = async (data) => {
        setIsSaving(true);
        
        try {
            if (!user?.id) {
                throw new Error('User not authenticated');
            }
            
            // 应用转换
            const transformedData = {
                name: customFieldFormTransforms.name(data.name),
                type: customFieldFormTransforms.type(data.type),
                description: customFieldFormTransforms.description(data.description),
                icon: customFieldFormTransforms.icon(data.icon),
            };
            
            // 验证所有字段
            const schema = createCustomFieldSchema(tValidation);
            const validation = schema.validate(transformedData);
            
            if (!validation.isValid) {
                // 设置表单错误
                Object.entries(validation.errors).forEach(([field, message]) => {
                    form.setError(field, {
                        type: 'manual',
                        message
                    });
                });
                setIsSaving(false);
                return;
            }
            
            const fieldData = {
                name: transformedData.name,
                type: transformedData.type,
                description: transformedData.description,
                icon: transformedData.icon,
                created_by: user.id,
            };
            
            // 如果编辑现有字段，传递其 ID
            if (field?.id) {
                fieldData.id = field.id;
            }
            
            const resultAction = await dispatch(createCustomField(fieldData));
            
            if(createCustomField.fulfilled.match(resultAction)) {
                console.log('Custom field created successfully');
                onClose();
            }
        } catch (error) {
            console.error('Error creating custom field:', error);
        } finally {
            setIsSaving(false);
        }
    };
    
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent
                className="sm:max-w-[800px] w-[95vw] p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg"
                onPointerDownOutside={(e) => e.preventDefault()}
                onEscapeKeyDown={(e) => e.preventDefault()}
            >
                <DialogHeader className="mb-6">
                    <DialogTitle className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                        {t('create_custom_field')}
                    </DialogTitle>
                    <DialogDescription className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                        {t('create_custom_field_description')}
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <div className="grid grid-cols-2 gap-6">
                            {/* 左列 */}
                            <div className="space-y-6">
                                <FormField
                                    control={form.control}
                                    name="name"
                                    rules={{
                                        validate: (value) => validateField('name', value)
                                    }}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="block text-sm font-medium mb-1 text-gray-800 dark:text-gray-200">
                                                {t('Name')}
                                                <span className="text-red-500">*</span>
                                            </FormLabel>
                                            <FormControl>
                                                <Input 
                                                    className="w-full px-3 py-2 border rounded-md"
                                                    placeholder={t('namePlaceholder')} 
                                                    {...field}
                                                />
                                            </FormControl>
                                            <div className="flex justify-between mt-1 min-h-[20px]">
                                                <div className="flex-1">
                                                    <FormMessage className="text-xs text-red-500" />
                                                </div>
                                                <span className="text-xs text-gray-500 ml-2">{field.value?.trim()?.length || 0}/50</span>
                                            </div>
                                        </FormItem>
                                    )}
                                />
                                
                                <FormField
                                    control={form.control}
                                    name="type"
                                    rules={{
                                        validate: (value) => validateField('type', value)
                                    }}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="block text-sm font-medium mb-1 text-gray-800 dark:text-gray-200">
                                                {t('Type')}
                                                <span className="text-red-500">*</span>
                                            </FormLabel>
                                            <Select 
                                                onValueChange={field.onChange} 
                                                defaultValue={field.value}
                                            >
                                                <FormControl>
                                                    <SelectTrigger className="w-full px-3 py-2 border rounded-md">
                                                        <SelectValue placeholder={t('typePlaceholder')} />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {validTypes.map((type) => (
                                                        <SelectItem key={type} value={type}>{t(type)}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage className="text-xs text-red-500 mt-1" />
                                        </FormItem>
                                    )}
                                />
                                
                                <FormField
                                    control={form.control}
                                    name="icon"
                                    rules={{
                                        validate: (value) => validateField('icon', value)
                                    }}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="block text-sm font-medium mb-1 text-gray-800 dark:text-gray-200">
                                                {t('Icon')}
                                                <span className="text-red-500">*</span>
                                            </FormLabel>
                                            <FormControl>
                                                <Input 
                                                    className="w-full px-3 py-2 border rounded-md"
                                                    placeholder={t('iconPlaceholder')} 
                                                    {...field}
                                                />
                                            </FormControl>
                                            <div className="flex justify-between mt-1 min-h-[20px]">
                                                <div className="flex-1">
                                                    <FormMessage className="text-xs text-red-500" />
                                                </div>
                                                <span className="text-xs text-gray-500 ml-2">{field.value?.trim()?.length || 0}/50</span>
                                            </div>
                                        </FormItem>
                                    )}
                                />
                            </div>
                            
                            {/* 右列 */}
                            <div className="space-y-6">
                                <FormField
                                    control={form.control}
                                    name="description"
                                    rules={{
                                        validate: (value) => validateField('description', value)
                                    }}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="block text-sm font-medium mb-1 text-gray-800 dark:text-gray-200">
                                                {t('Description')}
                                                <span className="text-red-500">*</span>
                                            </FormLabel>
                                            <FormControl>
                                                <Textarea 
                                                    className="w-full px-3 py-2 border rounded-md"
                                                    placeholder={t('descriptionPlaceholder')} 
                                                    {...field}
                                                />
                                            </FormControl>
                                            <div className="flex justify-between mt-1 min-h-[20px]">
                                                <div className="flex-1">
                                                    <FormMessage className="text-xs text-red-500" />
                                                </div>
                                                <span className="text-xs text-gray-500 ml-2">{field.value?.trim()?.length || 0}/100</span>
                                            </div>
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>

                        <DialogFooter className="mt-8 flex justify-end gap-3">
                            <Button
                                type="button"
                                onClick={onClose}
                                disabled={isSaving}
                            >
                                {t('cancel')}
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSaving}
                            >
                                {isSaving ? t('adding') : t('add_field')}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>   
        </Dialog>
    )
}
