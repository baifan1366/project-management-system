'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useDispatch } from 'react-redux';
import { createCustomField } from '@/lib/redux/features/customFieldSlice';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { supabase } from '@/lib/supabase';

export default function CreateCustomField({ isOpen, onClose, field, setField }) {
    const t = useTranslations('CustomField');
    const dispatch = useDispatch();
    const [isSaving, setIsSaving] = useState(false);
    const validTypes = ['LIST', 'OVERVIEW', 'TIMELINE', 'DASHBOARD', 'NOTE', 'GANTT', 'CALENDAR', 'BOARD', 'FILES'];
    const handleSave = async (formData) => {
        setIsSaving(true);
        try {
            const { data: userData, error: userError } = await supabase.auth.getUser();
            if (!userData?.user?.id) {
                throw new Error('User not authenticated');
            }
            
            const resultAction = await dispatch(createCustomField({
                name: formData.name,
                type: formData.type,
                description: formData.description,
                icon: formData.icon,
                created_by: userData.user.id,
            }));
            
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

    const FormSchema = z.object({
        name: z.string().min(2, {
            message: t('nameMin'),
        }).max(50, {
            message: t('nameMax'),
        }),
        type: z.enum(validTypes, {
            message: t('typeRequired'),
        }),
        description: z.string().min(1, {
            message: t('descriptionRequired'),
        }).max(100, {
            message: t('descriptionMax'),
        }),
        icon: z.string().min(1, {
            message: t('iconRequired'),
        }).max(50, {
            message: t('iconMax'),
        })
    });

    const form = useForm({
        resolver: zodResolver(FormSchema),
        defaultValues: {
            name: '',
            type: '',
            description: '',
            icon: '',
        },
    });
    
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
                    <form onSubmit={form.handleSubmit(handleSave)} className="space-y-6">
                        <div className="grid grid-cols-2 gap-6">
                            {/* 左列 */}
                            <div className="space-y-6">
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field, fieldState }) => (
                                        <FormItem>
                                            <FormLabel className="block text-sm font-medium mb-1 text-gray-800 dark:text-gray-200">
                                                {t('Name')}
                                                <span className="text-red-500">*</span>
                                            </FormLabel>
                                            <FormControl>
                                                <Input 
                                                    className={`w-full px-3 py-2 border rounded-md ${
                                                        fieldState.invalid ? 'border-red-500' : 'border-gray-300'
                                                    }`}
                                                    placeholder= {t('namePlaceholder')} 
                                                    {...field} 
                                                />
                                            </FormControl>
                                            <div className="flex justify-end mt-1 min-h-[20px]">
                                                <div className="flex-1">
                                                    <FormMessage className="text-xs" />
                                                </div>
                                                <span className="text-xs text-gray-500 ml-2">{field.value.trim().length}/50</span>
                                            </div>
                                        </FormItem>
                                    )}
                                />  
                                <FormField
                                    control={form.control}
                                    name="type"
                                    render={({ field, fieldState }) => (
                                        <FormItem>
                                            <FormLabel className="block text-sm font-medium mb-1 text-gray-800 dark:text-gray-200">
                                                {t('Type')}
                                                <span className="text-red-500">*</span>
                                            </FormLabel>
                                            <FormControl>
                                                <Select 
                                                    onValueChange={field.onChange} 
                                                    value={field.value}
                                                    defaultValue={field.value}
                                                >
                                                    <SelectTrigger 
                                                        className={`w-full px-3 py-2 border rounded-md ${
                                                            fieldState.invalid ? 'border-red-500' : 'border-gray-300'
                                                        }`}
                                                    >
                                                        <SelectValue placeholder={t('typePlaceholder')} />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {validTypes.map((type) => (
                                                            <SelectItem key={type} value={type}>{t(type)}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </FormControl>
                                            <FormMessage className="text-xs" />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="icon"
                                    render={({ field, fieldState }) => (
                                        <FormItem>
                                            <FormLabel className="block text-sm font-medium mb-1 text-gray-800 dark:text-gray-200">
                                                {t('Icon')}
                                                <span className="text-red-500">*</span>
                                            </FormLabel>
                                            <FormControl>
                                                <Input 
                                                    className={`w-full px-3 py-2 border rounded-md ${
                                                        fieldState.invalid ? 'border-red-500' : 'border-gray-300'
                                                    }`}
                                                    placeholder= {t('iconPlaceholder')} 
                                                    {...field} 
                                                />
                                            </FormControl>
                                            <div className="flex justify-end mt-1 min-h-[20px]">
                                                <div className="flex-1">
                                                    <FormMessage className="text-xs" />
                                                </div>
                                                <span className="text-xs text-gray-500 ml-2">{field.value.trim().length}/50</span>
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
                                    render={({ field, fieldState }) => (
                                        <FormItem>
                                            <FormLabel className="block text-sm font-medium mb-1 text-gray-800 dark:text-gray-200">
                                                {t('Description')}
                                                <span className="text-red-500">*</span>
                                            </FormLabel>
                                            <FormControl>  
                                                <Textarea 
                                                    className={`w-full px-3 py-2 border rounded-md ${
                                                        fieldState.invalid ? 'border-red-500' : 'border-gray-300'
                                                    }`}
                                                    placeholder= {t('descriptionPlaceholder')} 
                                                    {...field} 
                                                />
                                            </FormControl>
                                            <div className="flex justify-end mt-1 min-h-[20px]">
                                                <div className="flex-1">
                                                    <FormMessage className="text-xs" />
                                                </div>
                                                <span className="text-xs text-gray-500 ml-2">{field.value.trim().length}/100</span>
                                            </div>
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>
                    </form>
                </Form>

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
                        onClick={form.handleSubmit(handleSave)}
                    >
                        {isSaving ? t('adding') : t('add_field')}
                    </Button>
                </DialogFooter>
            </DialogContent>   
        </Dialog>
    )
}
