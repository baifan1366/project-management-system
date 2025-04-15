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
import { createTag, fetchAllTags } from '@/lib/redux/features/tagSlice'
import { updateTagIds, getTags } from '@/lib/redux/features/teamCFSlice'
import { supabase } from '@/lib/supabase'
import { Plus, Text, Calendar, User, Sigma, Fingerprint, SquareCheck, CircleCheck, Hash, ClipboardList, Clock3, Tag, Pen, Timer } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { fetchProjectById } from '@/lib/redux/features/projectSlice'

export default function CreateTagDialog({ isOpen, onClose, projectId, teamId, teamCFId }) {
    const t = useTranslations('CreateTag')
    const [isLoading, setIsLoading] = useState(false)
    const dispatch = useDispatch()
    const [themeColor, setThemeColor] = useState('#64748b')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [showDescription, setShowDescription] = useState(false)
    const [tagTypes, setTagTypes] = useState(['TEXT', 'NUMBER', 'ID', 'SINGLE-SELECT', 'MULTI-SELECT', 'DATE', 'PEOPLE', 'FORMULA', 'TIME-TRACKING', 'PROJECTS', 'TAGS', 'COMPLETED-ON', 'LAST-MODIFIED-ON', 'CREATED-ON', 'CREATED-BY'])

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
        const loadProjectData = async () => {
            const projectData = await dispatch(fetchProjectById(projectId)).unwrap()
            if (projectData.theme_color) {
                setThemeColor(projectData.theme_color);
            }
        }
        if(isOpen) {
            form.reset()
            form.clearErrors()
            loadProjectData()
        }
    }, [isOpen, dispatch, projectId]);

    useEffect(() => {
        const fetchTagTypes = async () => {
            try {
                const tags = await dispatch(fetchAllTags()).unwrap()
                const uniqueTypes = [...new Set(tags.map(tag => tag.type))]
                if(uniqueTypes.length > 0) {
                    setTagTypes(uniqueTypes)
                }
            } catch(error) {
                console.error('获取标签类型失败:', error)
            }
        }
        
        if(isOpen) {
            fetchTagTypes()
        }
    }, [isOpen, dispatch])

    const getTypeIcon = (type) => {
        const iconMap = {
            'TEXT': <Text className="w-4 h-4 mr-2 text-gray-500" />,
            'NUMBER': <Hash className="w-4 h-4 mr-2 text-gray-500" />,
            'ID': <Fingerprint className="w-4 h-4 mr-2 text-gray-500" />,
            'SINGLE-SELECT': <CircleCheck className="w-4 h-4 mr-2 text-gray-500" />,
            'MULTI-SELECT': <SquareCheck className="w-4 h-4 mr-2 text-gray-500" />,
            'DATE': <Calendar className="w-4 h-4 mr-2 text-gray-500" />,
            'PEOPLE': <User className="w-4 h-4 mr-2 text-gray-500" />,
            'FORMULA': <Sigma className="w-4 h-4 mr-2 text-gray-500" />,
            'TIME-TRACKING': <Timer className="w-4 h-4 mr-2 text-gray-500" />,
            'PROJECTS': <ClipboardList className="w-4 h-4 mr-2 text-gray-500" />,
            'TAGS': <Tag className="w-4 h-4 mr-2 text-gray-500" />,
            'COMPLETED-ON': <Clock3 className="w-4 h-4 mr-2 text-gray-500" />,
            'LAST-MODIFIED-ON': <Pen className="w-4 h-4 mr-2 text-gray-500" />,
            'CREATED-ON': <Clock3 className="w-4 h-4 mr-2 text-gray-500" />,
            'CREATED-BY': <User className="w-4 h-4 mr-2 text-gray-500" />
        }
        return iconMap[type] || null
    }

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
            const existingTagsResponse = await dispatch (getTags({teamId, teamCFId})).unwrap();
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
                                                        {field.value && (
                                                            <div className="flex items-center justify-between w-full">
                                                                {getTypeIcon(field.value)}
                                                                <span>{t(field.value)}</span>
                                                            </div>
                                                        )}
                                                    </SelectValue>
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {tagTypes.map(type => (
                                                    <SelectItem 
                                                        key={type} 
                                                        value={type} 
                                                        className="relative flex items-center py-3 px-3 hover:bg-gray-100 dark:hover:bg-accent"
                                                    >
                                                        <div className="flex items-center w-full">
                                                            {getTypeIcon(type)}
                                                            <div className="flex-1">
                                                                <div>{t(type)}</div>
                                                            </div>
                                                        </div>
                                                    </SelectItem>
                                                ))}
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