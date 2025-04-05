'use client'

import { useTranslations } from 'next-intl';
import { useEffect, useState, useRef, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Plus } from 'lucide-react';
import CreateTagDialog from './TagDialog';
import { getTags, resetTagsStatus } from '@/lib/redux/features/teamCFSlice';

export default function TaskList({ projectId, teamId, teamCFId }) {
  const t = useTranslations('CreateTask');
  const dispatch = useDispatch();
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const isRequestInProgress = useRef(false);
  const hasLoadedInitialData = useRef(false);
  
  // 从Redux状态中获取标签数据
  const { tags: tagsData, tagsStatus, tagsError } = useSelector((state) => state.teamCF);
  
  // 处理标签数据
  const tags = useMemo(() => {
    if (!tagsData || !tagsData.tags) return [];
    return tagsData.tags.map(tag => tag.name || '');
  }, [tagsData]);
  
  // 加载标签数据
  const loadTag = async () => {
    if (!teamId || !teamCFId || isRequestInProgress.current) return;
    
    try {
      isRequestInProgress.current = true;
      setIsLoading(true);
      
      // 确保在开始新请求前重置状态
      dispatch(resetTagsStatus());
      
      const result = await dispatch(getTags({ 
        teamId, 
        teamCFId 
      })).unwrap();
      
      hasLoadedInitialData.current = true;
    } catch (error) {
      console.error('Error loading tags:', error);
      // 如果加载失败，允许下次重试
      hasLoadedInitialData.current = false;
    } finally {
      setIsLoading(false);
      isRequestInProgress.current = false;
    }
  };

  // 仅在组件挂载和参数变化时加载一次数据
  useEffect(() => {
    if (teamId && teamCFId) {
      // 重置请求状态，以允许在参数变化时重新加载
      hasLoadedInitialData.current = false; 
    }
  }, [teamId, teamCFId]);

  // 处理加载逻辑的effect
  useEffect(() => {
    if (teamId && teamCFId && !hasLoadedInitialData.current && tagsStatus !== 'loading') {
      // 使用setTimeout避免在渲染过程中请求
      setTimeout(loadTag, 0);
    }
    
    return () => {
      // 组件卸载时重置状态
      dispatch(resetTagsStatus());
    };
  }, [dispatch, teamId, teamCFId, tagsStatus]);

  const handleCloseDialog = () => {
    setDialogOpen(false);
    // 在对话框关闭后强制重新加载数据
    setTimeout(() => {
      hasLoadedInitialData.current = false;
      isRequestInProgress.current = false;
      loadTag();
    }, 100);
  };

  return (
    <div className="p-4">
      <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
        <div className="flex justify-between items-center">
          <button 
            onClick={() => setDialogOpen(true)} 
            className="flex items-center px-4 py-2 text-foreground hover:bg-accent/50 transition-colors"
          >
            <Plus size={16} className="text-muted-foreground mr-2" />
          </button>
        </div>
        
        <div className="mt-4">
          <div className="space-y-3">
            {tagsStatus === 'loading' || isLoading ? (
              <div className="p-4 text-center text-muted-foreground">
                {t('loadingTags')}
              </div>
            ) : Array.isArray(tags) && tags.length > 0 ? (
              tags.map((tag, index) => (
                <div 
                  key={index} 
                  className="p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-base mb-1">{tag}</h4>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-muted-foreground">
                {t('noTagsFound')}
              </div>
            )}
          </div>
        </div>
        
        <CreateTagDialog 
          isOpen={isDialogOpen} 
          onClose={handleCloseDialog} 
          projectId={projectId}
          teamId={teamId}
          teamCFId={teamCFId}
        />
      </div>
    </div>
  );
}