'use client'

import { useTranslations } from 'next-intl';
import { useEffect, useState, useRef, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Plus } from 'lucide-react';
import CreateTagDialog from './TagDialog';
import { getTags, resetTagsStatus } from '@/lib/redux/features/teamCFSlice';
import { getSectionByTeamId } from '@/lib/redux/features/sectionSlice';
import { fetchTasksBySectionId, fetchTaskById } from '@/lib/redux/features/taskSlice';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell
} from '@/components/ui/table';

export default function TaskList({ projectId, teamId, teamCFId }) {
  const t = useTranslations('CreateTask');
  const dispatch = useDispatch();
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const isTagRequestInProgress = useRef(false);
  const isSectionRequestInProgress = useRef(false);
  const isTaskRequestInProgress = useRef(false);
  const hasLoadedTags = useRef(false);
  const hasLoadedSections = useRef(false);
  const hasLoadedTasks = useRef(false);

  // 从Redux状态中获取标签数据
  const { tags: tagsData, tagsStatus, tagsError } = useSelector((state) => state.teamCF);
  // 从Redux状态中获取部门数据
  const { sections, status: sectionsStatus } = useSelector((state) => state.sections);
  // 从Redux状态中获取任务数据
  const { tasks, status: tasksStatus } = useSelector((state) => state.tasks);
  
  // 处理标签数据
  const tagInfo = useMemo(() => {
    // 如果API直接返回标签数组而不是{tags:[...]}形式
    if (!tagsData) return [];
    // 检查tagsData本身是否是数组
    if (Array.isArray(tagsData)) {
      return tagsData.map(tag => tag.name || '');
    }
    // 兼容原来的结构
    return (tagsData.tags || []).map(tag => tag.name || '');
  }, [tagsData]);
  
  // 处理部门数据
  const sectionInfo = useMemo(() => {
    if (!sections || !sections.length) return [];
    return sections.map(section => section.name || '');
  }, [sections]);
  
  // 处理任务数据
  const taskInfo = useMemo(() => {
    if (!tasks || !tasks.length) return [];
    return tasks.map(task => task.name || '');
  }, [tasks]);
  
  // 加载标签数据
  const loadTag = async () => {
    if (!teamId || !teamCFId || isTagRequestInProgress.current) return;
    
    try {
      isTagRequestInProgress.current = true;
      setIsLoading(true);
      
      await dispatch(getTags({ teamId, teamCFId })).unwrap();
      hasLoadedTags.current = true;
    } catch (error) {
      console.error('加载标签失败:', error);
      hasLoadedTags.current = false;
    } finally {
      setIsLoading(false);
      isTagRequestInProgress.current = false;
    }
  };

  // 加载部门数据
  const loadSections = async () => {
    if (!teamId || isSectionRequestInProgress.current) return;
    
    try {
      isSectionRequestInProgress.current = true;
      setIsLoading(true);
      
      await dispatch(getSectionByTeamId(teamId)).unwrap();
      
      hasLoadedSections.current = true;
    } catch (error) {
      console.error('Error loading sections:', error);
      hasLoadedSections.current = false;
    } finally {
      setIsLoading(false);
      isSectionRequestInProgress.current = false;
    }
  };

  // 加载所有部门的任务
  const loadAllSectionTasks = async () => {
    if (!teamId || isTaskRequestInProgress.current || !sections || !sections.length) return;
    
    try {
      isTaskRequestInProgress.current = true;
      setIsLoading(true);
      
      // 为每个部门加载任务
      for (let i = 0; i < sections.length; i++) {
        const section = sections[i];
        if (section && section.id) {
          await dispatch(fetchTasksBySectionId(section.id)).unwrap();
        }
      }
      
      hasLoadedTasks.current = true;
    } catch (error) {
      console.error('加载所有任务失败:', error);
      hasLoadedTasks.current = false;
    } finally {
      setIsLoading(false);
      isTaskRequestInProgress.current = false;
    }
  };

  // 参数变化时重置加载状态
  useEffect(() => {
    if (teamId && teamCFId) {
      // 重置标签请求状态
      hasLoadedTags.current = false; 
    }
    if (teamId) {
      // 重置部门请求状态
      hasLoadedSections.current = false;
      hasLoadedTasks.current = false;
    }
  }, [teamId, teamCFId]);

  // 处理标签加载
  useEffect(() => {
    if (teamId && teamCFId && !hasLoadedTags.current && tagsStatus !== 'loading') {
      // 使用setTimeout避免在渲染过程中请求
      setTimeout(loadTag, 0);
    }
    
    return () => {
      // 组件卸载时重置状态
      dispatch(resetTagsStatus());
    };
  }, [dispatch, teamId, teamCFId, tagsStatus]);
  
  // 处理部门加载 - 单独的useEffect
  useEffect(() => {
    if (teamId && !hasLoadedSections.current && sectionsStatus !== 'loading') {
      setTimeout(loadSections, 0);
    }
  }, [teamId, sectionsStatus]);
  
  // 处理任务加载 - 在sections加载完成后
  useEffect(() => {
    if (teamId && sections && sections.length > 0 && !hasLoadedTasks.current && tasksStatus !== 'loading') {
      setTimeout(() => loadAllSectionTasks(), 0);
    }
  }, [teamId, sections, tasksStatus]);

  const handleCloseDialog = () => {
    setDialogOpen(false);
    // 在对话框关闭后强制重新加载数据
    setTimeout(() => {
      hasLoadedTags.current = false;
      hasLoadedSections.current = false;
      isTagRequestInProgress.current = false;
      isSectionRequestInProgress.current = false;
      loadTag();
      loadSections();
    }, 100);
  };

  // 计算总列数（标签列 + 操作列）
  const totalColumns = (Array.isArray(tagInfo) ? tagInfo.length : 0) + 1;

  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow>            
            {Array.isArray(tagInfo) && tagInfo.map((tag, index) => (
              <TableHead key={`tag-${index}`}>{tag}</TableHead>
            ))}
            
            <TableHead className="text-right">
              <button 
                onClick={() => setDialogOpen(true)} 
                className="text-foreground hover:bg-accent/50 transition-colors"
              >
                <Plus size={16} className="text-muted-foreground" />
              </button>
            </TableHead>
          </TableRow>
        </TableHeader>
        
        <TableBody>
          {/* 部门数据展示 */}
          {sectionInfo && sectionInfo.length > 0 && (
            sectionInfo.map((sectionName, index) => (
              <TableRow key={`section-${index}`}>
                <TableCell colSpan={totalColumns}>
                  {sectionName}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      
      <CreateTagDialog 
        isOpen={isDialogOpen} 
        onClose={handleCloseDialog} 
        projectId={projectId}
        teamId={teamId}
        teamCFId={teamCFId}
      />
    </div>
  );
}