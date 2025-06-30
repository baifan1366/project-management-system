'use client';

import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useGetUser } from '@/lib/hooks/useGetUser';
import { getSectionByTeamId } from '@/lib/redux/features/sectionSlice';
import { getTagByName } from '@/lib/redux/features/tagSlice';
import { createTask } from '@/lib/redux/features/taskSlice';
import { getPagesByTeamId } from '@/lib/redux/features/pageSlice';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

export default function CreatePageButton({ teamId }) {
  const t = useTranslations('Notion');
  const { user } = useGetUser();
  const dispatch = useDispatch();
  
  // 从Redux获取section数据
  const { sections, status: sectionsStatus } = useSelector(state => state.sections);
  
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  
  // 当组件加载时获取团队的sections
  useEffect(() => {
    if (teamId) {
      dispatch(getSectionByTeamId(teamId));
    }
  }, [teamId, dispatch]);
  
  const handleCreate = async () => {
    if (!title.trim()) {
      toast.error(t('titleRequired'));
      return;
    }
    
    if (!user) {
      toast.error(t('userNotLoggedIn'));
      return;
    }
    
    setIsLoading(true);
    
    try {
      // 1. 检查是否有可用的部分
      let targetSectionId;
      
      if (sections && sections.length > 0) {
        // 使用第一个部分
        targetSectionId = sections[0].id;
      } else {
        // 如果没有部分，创建一个新的
        const { data } = await supabase
          .from('section')
          .insert({
            team_id: teamId,
            name: "New Section",
            created_by: user.id
          })
          .select()
          .single();
          
        targetSectionId = data.id;
      }
      
      // 2. 获取Name和Content的标签ID
      const nameTagId = await dispatch(getTagByName("Name")).unwrap();
      const contentTagId = await dispatch(getTagByName("Content")).unwrap();
      
      if (!nameTagId) {
        throw new Error('无法获取Name标签ID');
      }
      
      // 3. 创建一个新任务，将标题和内容存储在tag_values中
      const taskData = {
        tag_values: {
          [nameTagId]: title,
        },
        created_by: user.id
      };
      
      // 如果找到Content标签ID，也添加内容
      if (contentTagId) {
        taskData.tag_values[contentTagId] = content;
      }
      
      const result = await dispatch(createTask(taskData)).unwrap();
      
      // 4. 创建一个新的Notion页面，但不包含标题和内容
      const { data: notionPageData, error: notionPageError } = await supabase
        .from('notion_page')
        .insert({
          created_by: user.id,
          last_edited_by: user.id
        })
        .select()
        .single();
        
      if (notionPageError) throw notionPageError;
      
      // 5. 更新任务的page_id字段，建立任务和页面的关联
      const { data: taskUpdateData, error: taskUpdateError } = await supabase
        .from('task')
        .update({
          page_id: notionPageData.id
        })
        .eq('id', result.id);
        
      if (taskUpdateError) throw taskUpdateError;
      
      // 6. 更新section的task_ids，将新任务添加到部分中
      const section = sections.find(s => s.id === targetSectionId);
      if (section) {
        const taskIds = [...(section.task_ids || []), result.id];
        
        const { error: sectionUpdateError } = await supabase
          .from('section')
          .update({
            task_ids: taskIds
          })
          .eq('id', targetSectionId);
          
        if (sectionUpdateError) throw sectionUpdateError;
      }
      
      // 7. 刷新页面列表
      dispatch(getPagesByTeamId(teamId));
      
      toast.success(t('pageCreated'));
      setIsOpen(false);
      setTitle('');
      setContent('');
    } catch (error) {
      console.error('Error creating page:', error);
      toast.error(t('errorCreatingPage'));
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <>
      <Button onClick={() => setIsOpen(true)} className="w-full mt-2">
        {t('createPage')}
      </Button>
      
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('createNewPage')}</DialogTitle>
            <DialogDescription>
              {t('createPageDescription')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Input
                placeholder={t('pageTitle')}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={50}
              />
            </div>
            
            <div className="space-y-2">
              <Textarea
                placeholder={t('pageContent')}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={6}
                maxLength={100}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsOpen(false)}
              disabled={isLoading}
            >
              {t('cancel')}
            </Button>
            <Button 
              onClick={handleCreate}
              disabled={isLoading || !title.trim()}
            >
              {isLoading ? t('creating') : t('create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
} 