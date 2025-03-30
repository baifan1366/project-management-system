'use client'

import { useState, useEffect } from 'react'
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useTranslations } from 'next-intl'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { useDispatch, useSelector } from 'react-redux'
import { createTag } from '@/lib/redux/features/tagSlice'
import { updateTagIds } from '@/lib/redux/features/teamCFSlice'
import { supabase } from '@/lib/supabase'
import { Lock, Eye, Pencil, Check, Plus } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { api } from '@/lib/api'

export default function CreateTagDialog({ isOpen, onClose, projectId, teamId, teamCFId }) {
    const t = useTranslations('CreateTag')
    const [isLoading, setIsLoading] = useState(false)
    const dispatch = useDispatch()
    const [themeColor, setThemeColor] = useState('#64748b')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const { projects } = useSelector((state) => state.projects)
    const [showDescription, setShowDescription] = useState(false)

    const FormSchema = z.object({
        name: z.string().trim().min(2, {
            message: t('nameMin'),
        }).max(50, {
            message: t('nameMax'),
        }),
        type: z.string().min(1, {
            message: t('typeRequired'),
        }),
        description: z.string().trim().optional()
            .refine(val => !val || val.length >= 10, {
                message: t('descriptionMin'),
            })
            .refine(val => !val || val.length <= 100, {
                message: t('descriptionMax'),
            })
    })

    const form = useForm({
        resolver: zodResolver(FormSchema),
        defaultValues: {
          name: "",
          type: "TEXT",
          description: "",
        },
      })

    useEffect(() => {
        const project = projects.find(p => String(p.id) === String(projectId));
        if (project?.theme_color) {
            setThemeColor(project.theme_color);
        }
        if(isOpen) {
            form.reset()
            form.clearErrors()
        }
    }, [isOpen]);

    const onSubmit = async (data) => {
        if(isSubmitting) return;
        setIsLoading(true);
        setIsSubmitting(true)
        try{
            const {data: userData} = await supabase.auth.getUser()
            const userId = userData?.user?.id
            const newTag = await dispatch(createTag({
                name: data.name,
                type: data.type,
                description: data.description,
                created_by: userId
            })).unwrap()
            
            // 先获取现有的标签IDs
            const existingTagsResponse = await api.teams.teamCustomFields.getTags(teamId, teamCFId);
            const existingTagIds = existingTagsResponse.tag_ids || [];
            
            // 将新标签添加到现有标签列表
            const updatedTagIds = [...existingTagIds, newTag.id];
            
            await dispatch(updateTagIds({
                teamId: teamId,
                teamCFId: teamCFId,
                tagIds: updatedTagIds,
                userId: userId
            })).unwrap()
            form.reset()
            setIsLoading(false)
            setIsSubmitting(false)
            onClose()
        } catch(error) {
            console.error(error)
            setIsLoading(false)
            setIsSubmitting(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent
                onPointerDownOutside={(e) => e.preventDefault()}
                onEscapeKeyDown={(e) => e.preventDefault()}
                className="sm:max-w-[600px] w-full"
            >
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold text-gray-800 dark:text-gray-200">
                        {t('createTag')}
                    </DialogTitle>
                    <DialogDescription className="text-sm text-gray-600 dark:text-gray-400">
                        {t('createTagDescription')}
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
                        <div className="flex items-start gap-4">
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field, fieldState }) => (
                                    <FormItem className="flex-1">
                                        <FormLabel className="block text-sm font-medium mb-1 text-gray-800 dark:text-gray-200">
                                            {t('tagName')}
                                            <span className="text-red-500">*</span>
                                        </FormLabel>
                                        <FormControl>
                                            <Input 
                                                className={`w-full px-3 py-2 h-10 border rounded-md ${
                                                    fieldState.invalid ? 'border-red-500' : 'border-gray-300'
                                                }`}
                                                placeholder={t('tagPlaceholder')} 
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
                                    <FormItem className="w-[200px]">
                                        <FormLabel className="block text-sm font-medium mb-1 text-gray-800 dark:text-gray-200">
                                            {t('tagType')}
                                            <span className="text-red-500">*</span>
                                        </FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value} defaultValue="TEXT">
                                            <FormControl>
                                                <SelectTrigger 
                                                    className={`w-full px-3 py-2 h-10 border rounded-md ${
                                                    fieldState.invalid ? 'border-red-500' : 'border-gray-300'
                                                    }`}
                                                >
                                                    <SelectValue placeholder={t('typePlaceholder')}>
                                                        {field.value ? (
                                                            <div className="flex items-center justify-between w-full">
                                                                {field.value === 'TEXT' && <Lock className="w-4 h-4 mr-2 text-gray-500" />}
                                                                {field.value === 'NUMBER' && <Pencil className="w-4 h-4 mr-2 text-gray-500" />}
                                                                {field.value === 'ID' && <Eye className="w-4 h-4 mr-2 text-gray-500" />}
                                                                <span>
                                                                    {field.value === 'TEXT' && t('TEXT')}
                                                                    {field.value === 'NUMBER' && t('NUMBER')}
                                                                    {field.value === 'ID' && t('ID')}
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            ''
                                                        )}
                                                    </SelectValue>
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="TEXT" className="relative flex items-center py-3 px-3 hover:bg-gray-100 dark:hover:bg-accent">
                                                    <div className="flex items-center w-full">
                                                        <Lock className="w-4 h-4 mr-2 text-gray-500" />
                                                        <div className="flex-1">
                                                            <div>{t('TEXT')}</div>
                                                        </div>
                                                    </div>
                                                </SelectItem>
                                                <SelectItem value="NUMBER" className="relative flex items-center py-3 px-3 hover:bg-gray-100 dark:hover:bg-accent">
                                                    <div className="flex items-center w-full">
                                                        <Pencil className="w-4 h-4 mr-2 text-gray-500" />
                                                        <div className="flex-1">
                                                            <div>{t('NUMBER')}</div>
                                                        </div>
                                                    </div>
                                                </SelectItem>
                                                <SelectItem value="ID" className="relative flex items-center py-3 px-3 hover:bg-gray-100 dark:hover:bg-accent">
                                                    <div className="flex items-center w-full">
                                                        <Eye className="w-4 h-4 mr-2 text-gray-500" />
                                                        <div className="flex-1">
                                                            <div>{t('ID')}</div>
                                                        </div>
                                                    </div>
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </FormItem>
                                )}
                            />
                        </div>
                        {!showDescription ? (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setShowDescription(true)}
                                className="mt-4"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                {t('addDescription')}
                            </Button>
                        ) : (
                            <FormField
                                control={form.control}
                                name="description"
                                render={({ field, fieldState }) => (
                                    <FormItem>
                                        <FormLabel className="block text-sm font-medium mb-1 text-gray-800 dark:text-gray-200">
                                            {t('description')}
                                        </FormLabel>
                                        <FormControl>  
                                            <Textarea 
                                                className={`w-full px-3 py-2 border rounded-md ${
                                                    fieldState.invalid ? 'border-red-500' : 'border-gray-300'
                                                }`}
                                                placeholder={t('descriptionPlaceholder')} 
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
                        )}
                    </form>
                </Form>
                <DialogFooter className="mt-8 flex justify-end gap-3">
                    <Button
                        type="button"
                        onClick={onClose}
                        disabled={isSubmitting}
                        variant={themeColor}
                    >
                        {t('cancel')}
                    </Button>
                    <Button
                        type="submit"
                        disabled={isSubmitting}
                        variant={themeColor}
                        onClick={form.handleSubmit(onSubmit)}
                    >
                        {isSubmitting ? t('adding') : t('addTag')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}