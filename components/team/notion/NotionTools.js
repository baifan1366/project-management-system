'use client'

import { useState, useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { 
  FileText, 
  Image, 
  Smile,
  Loader2
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { useGetUser } from '@/lib/hooks/useGetUser'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { format } from 'date-fns'

export default function NotionTools({ 
  isOpen, 
  setIsOpen, 
  teamId, 
  editingPage = null, 
  parentPage = null,
  onPageCreated,
  onPageUpdated,
  selectedSectionId = null,
  projectThemeColor
}) {
  const t = useTranslations('Notion')
  const { user: currentUser } = useGetUser()
  
  // State variables
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [icon, setIcon] = useState('')
  const [coverImage, setCoverImage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [pages, setPages] = useState([])
  const [selectedParentId, setSelectedParentId] = useState(null)
  
  // Reset form when dialog opens/closes or editing page changes
  useEffect(() => {
    if (isOpen) {
      if (editingPage) {
        // Editing existing page
        setTitle(editingPage.title || '')
        setContent(editingPage.content ? JSON.stringify(editingPage.content) : '')
        setIcon(editingPage.icon || '')
        setCoverImage(editingPage.cover_image || '')
        setSelectedParentId(editingPage.parent_id || null)
      } else {
        // Creating new page
        setTitle('')
        setContent('')
        setIcon('')
        setCoverImage('')
        setSelectedParentId(parentPage?.id || null)
      }
      
      // Fetch pages for parent selection
      fetchPages()
    }
  }, [isOpen, editingPage, parentPage])
  
  // Fetch pages for parent selection dropdown
  const fetchPages = async () => {
    if (!teamId) return
    
    try {
      // 如果指定了section，则只获取该section中的页面
      if (selectedSectionId) {
        // 1. 获取指定section的任务ID
        const { data: section, error: sectionError } = await supabase
          .from('section')
          .select('task_ids')
          .eq('id', selectedSectionId)
          .single();
          
        if (sectionError) throw sectionError;
        
        if (!section || !section.task_ids || section.task_ids.length === 0) {
          setPages([]);
          return;
        }
        
        // 2. 获取这些任务的page_id
        const { data: tasks, error: tasksError } = await supabase
          .from('task')
          .select('page_id')
          .in('id', section.task_ids)
          .not('page_id', 'is', null);
          
        if (tasksError) throw tasksError;
        
        if (!tasks || tasks.length === 0) {
          setPages([]);
          return;
        }
        
        // 3. 获取Name标签ID
        const { data: nameTag, error: nameTagError } = await supabase
          .from('tag')
          .select('id')
          .eq('name', 'Name')
          .single();
          
        if (nameTagError) throw nameTagError;
        
        const nameTagId = nameTag?.id;
        
        // 4. 获取这些页面的详细信息
        const pageIds = tasks.map(task => task.page_id).filter(id => id != null);
        
        const { data: pages, error: pagesError } = await supabase
          .from('notion_page')
          .select('id, parent_id')
          .in('id', pageIds)
          .eq('is_archived', false);
          
        if (pagesError) throw pagesError;
        
        // 5. 获取与页面相关联的任务，以获取标题
        const { data: pagesWithTasks, error: pagesWithTasksError } = await supabase
          .from('task')
          .select('id, page_id, tag_values')
          .in('page_id', pages.map(p => p.id));
          
        if (pagesWithTasksError) throw pagesWithTasksError;
        
        // 6. 组合页面数据与任务中的标题
        const pagesWithTitles = pages.map(page => {
          const relatedTask = pagesWithTasks.find(task => task.page_id === page.id);
          let title = "无标题";
          
          if (relatedTask && relatedTask.tag_values && nameTagId && relatedTask.tag_values[nameTagId]) {
            title = relatedTask.tag_values[nameTagId];
          }
          
          return {
            ...page,
            title
          };
        }).sort((a, b) => a.title.localeCompare(b.title));
        
        // Don't allow selecting the current page or its descendants as parent
        let filteredPages = pagesWithTitles;
        if (editingPage) {
          // Function to get all descendant IDs of a page
          const getDescendantIds = (pageId) => {
            const directChildren = pagesWithTitles.filter(p => p.parent_id === pageId).map(p => p.id)
            let allDescendants = [...directChildren]
            
            directChildren.forEach(childId => {
              allDescendants = [...allDescendants, ...getDescendantIds(childId)]
            })
            
            return allDescendants
          }
          
          const excludeIds = [editingPage.id, ...getDescendantIds(editingPage.id)]
          filteredPages = pagesWithTitles.filter(p => !excludeIds.includes(p.id))
        }
        
        setPages(filteredPages)
        return;
      }
      
      // 如果没有选定section，则获取所有页面（原有逻辑）
      // 1. 获取团队所有部分(section)
      const { data: sections, error: sectionsError } = await supabase
        .from('section')
        .select('*')
        .eq('team_id', teamId);
        
      if (sectionsError) throw sectionsError;
      
      if (!sections || sections.length === 0) {
        setPages([]);
        return;
      }
      
      // 2. 收集所有部分的任务ID
      let allTaskIds = [];
      sections.forEach(section => {
        if (section.task_ids && Array.isArray(section.task_ids)) {
          allTaskIds = [...allTaskIds, ...section.task_ids];
        }
      });
      
      if (allTaskIds.length === 0) {
        setPages([]);
        return;
      }
      
      // 3. 获取所有任务的page_id
      const { data: tasks, error: tasksError } = await supabase
        .from('task')
        .select('page_id')
        .in('id', allTaskIds)
        .not('page_id', 'is', null);
        
      if (tasksError) throw tasksError;
      
      if (!tasks || tasks.length === 0) {
        setPages([]);
        return;
      }
      
      // 4. 获取所有页面ID
      const pageIds = tasks.map(task => task.page_id).filter(id => id != null);
      
      if (pageIds.length === 0) {
        setPages([]);
        return;
      }
      
      // 5. 获取Name标签ID
      const { data: nameTag, error: nameTagError } = await supabase
        .from('tag')
        .select('id')
        .eq('name', 'Name')
        .single();
        
      if (nameTagError) throw nameTagError;
      
      const nameTagId = nameTag?.id;
      
      // 6. 获取所有页面，并获取它们的标题
      const { data: pages, error: pagesError } = await supabase
        .from('notion_page')
        .select('id, parent_id')
        .in('id', pageIds)
        .eq('is_archived', false);
        
      if (pagesError) throw pagesError;
      
      // 7. 获取与页面相关联的任务，以获取标题
      const { data: pagesWithTasks, error: pagesWithTasksError } = await supabase
        .from('task')
        .select('id, page_id, tag_values')
        .in('page_id', pages.map(p => p.id));
        
      if (pagesWithTasksError) throw pagesWithTasksError;
      
      // 8. 组合页面数据与任务中的标题
      const pagesWithTitles = pages.map(page => {
        const relatedTask = pagesWithTasks.find(task => task.page_id === page.id);
        let title = "无标题";
        
        if (relatedTask && relatedTask.tag_values && nameTagId && relatedTask.tag_values[nameTagId]) {
          title = relatedTask.tag_values[nameTagId];
        }
        
        return {
          ...page,
          title
        };
      }).sort((a, b) => a.title.localeCompare(b.title));
      
      // Don't allow selecting the current page or its descendants as parent
      let filteredPages = pagesWithTitles;
      if (editingPage) {
        // Function to get all descendant IDs of a page
        const getDescendantIds = (pageId) => {
          const directChildren = pagesWithTitles.filter(p => p.parent_id === pageId).map(p => p.id)
          let allDescendants = [...directChildren]
          
          directChildren.forEach(childId => {
            allDescendants = [...allDescendants, ...getDescendantIds(childId)]
          })
          
          return allDescendants
        }
        
        const excludeIds = [editingPage.id, ...getDescendantIds(editingPage.id)]
        filteredPages = pagesWithTitles.filter(p => !excludeIds.includes(p.id))
      }
      
      setPages(filteredPages)
    } catch (error) {
      console.error('Error fetching pages:', error)
      toast.error(t('errorFetchingPages'))
    }
  }
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!title.trim()) {
      toast.error(t('titleRequired'))
      return
    }
    
    if (!currentUser) {
      toast.error(t('userNotLoggedIn'))
      return
    }
    
    setIsSubmitting(true)
    
    try {
      // 解析内容，如果是字符串则转换为JSON
      let contentText = content;
      if (content && typeof content === 'string') {
        try {
          const parsedContent = JSON.parse(content);
          if (parsedContent.text) {
            contentText = parsedContent.text;
          }
        } catch (error) {
          // 如果解析失败，使用原始文本
          contentText = content;
        }
      }
      
      if (editingPage) {
        // 1. 获取与页面相关联的任务ID
        const { data: taskData, error: taskError } = await supabase
          .from('task')
          .select('id, tag_values')
          .eq('page_id', editingPage.id)
          .single();
          
        if (taskError) {
          console.warn('获取关联任务数据失败:', taskError);
        }
        
        // 2. 获取Name和Content标签的ID
        const { data: nameTag } = await supabase
          .from('tag')
          .select('id')
          .eq('name', 'Name')
          .single();
          
        const nameTagId = nameTag?.id;
        
        const { data: contentTag } = await supabase
          .from('tag')
          .select('id')
          .eq('name', 'Content')
          .single();
          
        const contentTagId = contentTag?.id;
        
        // 3. 更新页面基本信息（除了标题和内容）
        const { error: pageError } = await supabase
          .from('notion_page')
          .update({
            parent_id: selectedParentId,
            icon,
            cover_image: coverImage,
            updated_at: new Date().toISOString(),
            last_edited_by: currentUser.id
          })
          .eq('id', editingPage.id);
          
        if (pageError) throw pageError;
        
        // 4. 如果找到关联的任务，更新任务的tag_values
        if (taskData && nameTagId) {
          const updatedTagValues = { ...taskData.tag_values };
          
          // 更新标题
          if (nameTagId) {
            updatedTagValues[nameTagId] = title;
          }
          
          // 更新内容
          if (contentTagId) {
            updatedTagValues[contentTagId] = contentText;
          }
          
          const { error: taskUpdateError } = await supabase
            .from('task')
            .update({
              tag_values: updatedTagValues
            })
            .eq('id', taskData.id);
            
          if (taskUpdateError) {
            console.error('更新任务数据失败:', taskUpdateError);
          }
        }
        
        toast.success(t('pageUpdated'));
        
        if (onPageUpdated) {
          onPageUpdated();
        }
      } else {
        // 创建新页面流程
        
        // 1. 获取Name和Content标签的ID
        const { data: nameTag } = await supabase
          .from('tag')
          .select('id')
          .eq('name', 'Name')
          .single();
          
        const nameTagId = nameTag?.id;
        
        const { data: contentTag } = await supabase
          .from('tag')
          .select('id')
          .eq('name', 'Content')
          .single();
          
        const contentTagId = contentTag?.id;
        
        if (!nameTagId) {
          throw new Error('无法获取Name标签ID');
        }
        
        // 2. 创建notion_page记录，不包含标题和内容
        const { data: pageData, error: pageError } = await supabase
          .from('notion_page')
          .insert({
            parent_id: selectedParentId,
            icon,
            cover_image: coverImage,
            created_by: currentUser.id,
            last_edited_by: currentUser.id
          })
          .select()
          .single();
          
        if (pageError) throw pageError;
        
        // 3. 创建任务，将标题和内容存储在tag_values中
        const tagValues = {
          [nameTagId]: title
        };
        
        if (contentTagId) {
          tagValues[contentTagId] = contentText;
        }
        
        const { data: taskData, error: taskError } = await supabase
          .from('task')
          .insert({
            page_id: pageData.id,
            tag_values: tagValues,
            created_by: currentUser.id
          })
          .select()
          .single();
          
        if (taskError) throw taskError;
        
        // 4. 找到可用的section并更新task_ids
        if (selectedSectionId) {
          // 如果有指定的sectionId，直接使用它
          const { data: sectionData, error: sectionError } = await supabase
            .from('section')
            .select('task_ids')
            .eq('id', selectedSectionId)
            .single();
            
          if (!sectionError && sectionData) {
            const taskIds = [...(sectionData.task_ids || []), taskData.id];
            
            await supabase
              .from('section')
              .update({
                task_ids: taskIds
              })
              .eq('id', selectedSectionId);
          }
        } else {
          // 如果没有指定sectionId，使用旧的逻辑选择第一个section
          const { data: sectionData, error: sectionError } = await supabase
            .from('section')
            .select('id, task_ids')
            .eq('team_id', teamId)
            .limit(1);
            
          if (!sectionError && sectionData && sectionData.length > 0) {
            const section = sectionData[0];
            const taskIds = [...(section.task_ids || []), taskData.id];
            
            await supabase
              .from('section')
              .update({
                task_ids: taskIds
              })
              .eq('id', section.id);
          }
        }
        
        toast.success(t('pageCreated'));
        
        if (onPageCreated) {
          // 手动添加title属性以便UI显示
          onPageCreated({
            ...pageData,
            title,
            task_id: taskData.id
          });
        }
      }
      
      setIsOpen(false);
    } catch (error) {
      console.error('Error saving page:', error);
      toast.error(editingPage ? t('errorUpdatingPage') : t('errorCreatingPage'));
    } finally {
      setIsSubmitting(false);
    }
  }
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {editingPage ? t('editPage') : t('createPage')}
          </DialogTitle>
          <DialogDescription>
            {editingPage ? t('editPageDescription') : t('createPageDescription')}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="title" className="text-right">
                {t('title')} *
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t('pageTitlePlaceholder')}
                className="col-span-3"
                required
                autoFocus
                maxLength={50}
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="parent" className="text-right">
                {t('parent')}
              </Label>
              <Select 
                value={selectedParentId?.toString() || ''} 
                onValueChange={(value) => setSelectedParentId(value ? parseInt(value) : null)}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder={t('noParent')} />
                </SelectTrigger>
                <SelectContent>
                  {/* <SelectItem value="">{t('noParent')}</SelectItem> */}
                  {pages.map((page) => (
                    <SelectItem key={page.id} value={page.id.toString()}>
                      {page.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="content" className="text-right pt-2">
                {t('content')}
              </Label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={t('contentPlaceholder')}
                className="col-span-3 min-h-40"
                maxLength={10000}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsOpen(false)}
              disabled={isSubmitting}
            >
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting} variant={projectThemeColor}>
              {isSubmitting ? (
                <>
                  {editingPage ? t('updating') : t('creating')}
                </>
              ) : (
                editingPage ? t('update') : t('create')
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
