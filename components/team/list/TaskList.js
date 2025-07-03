'use client'

import { useTranslations } from 'next-intl';
import { useEffect, useRef } from 'react';
import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { DragDropContext } from '@hello-pangea/dnd';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useGetUser } from '@/lib/hooks/useGetUser';
import { createSection } from '@/lib/redux/features/sectionSlice';

import TableProvider, { useTableContext } from './TableProvider';
import { useLoadTag } from './LoadTag';
import { useBodyContent } from './BodyContent';
import { useDndTools } from './DndTools';
import HandleTask from './HandleTask';

function TaskListContent({ projectThemeColor }) {
  const t = useTranslations('CreateTask');
  const dispatch = useDispatch();
  const { user } = useGetUser();

  // 获取上下文中的状态和函数
  const {
    teamId,
    isCreatingSection,
    setIsCreatingSection,
    newSectionName,
    setNewSectionName,
    sectionInputRef,
    localTasks,
    setLocalTasks,
    taskInputRef,
    editingTaskValues,
    setEditingTaskValues
  } = useTableContext();
  
  // 从Redux状态中获取部门数据
  const { sections } = useSelector((state) => state.sections);
  
  // 标签加载和渲染相关功能
  const { 
    totalColumns,
    renderTagHeaders,
    renderTagPopover,
    loadTag
  } = useLoadTag();
  
  // 获取任务处理相关功能
  const {
    editingTask,
    isAddingTask,
    isLoading: isTaskLoading,
    handleAddTask,
    handleTaskValueChange,
    handleTaskEditComplete,
    handleKeyDown,
    handleClickOutside,
    setEditingTask,
    validationErrors,
    handleDeleteTask
  } = HandleTask({ 
    teamId, 
    localTasks, 
    setLocalTasks, 
    taskInputRef 
  });
  
  // 部门和任务内容区域相关功能
  const {
    loadSections,
    loadAllSectionTasks,
    renderBodyContent
  } = useBodyContent(
    handleAddTask,
    handleTaskValueChange,
    handleTaskEditComplete,
    handleKeyDown,
    editingTask,
    editingTaskValues,
    isTaskLoading,
    validationErrors,
    handleDeleteTask,
    projectThemeColor
  );
  
  // 拖拽相关功能
  const {
    handleDragStart,
    handleDragEnd
  } = useDndTools();

  // 初始化数据加载
  useEffect(() => {
    if (teamId) {
      loadTag();
      loadSections();
    }
  }, [teamId]);

  // 在部门数据加载后加载任务
  useEffect(() => {
    if (teamId && sections && sections.length > 0) {
      loadAllSectionTasks();
    }
  }, [teamId, sections]);

  // 添加点击外部关闭编辑的事件监听
  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [handleClickOutside]);

  // 处理点击输入框外部关闭部门创建
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isCreatingSection && sectionInputRef.current && !sectionInputRef.current.contains(event.target)) {
        setIsCreatingSection(false);
        setNewSectionName('');
      }
    };

    // 添加点击事件监听器
    document.addEventListener("mousedown", handleClickOutside);
    
    // 清理函数
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isCreatingSection]);

  // 处理部门创建提交
  const handleCreateSection = async (e) => {
    if (e.key === 'Enter' && newSectionName.trim()) {
      try {
        // 开始创建，显示加载状态
        const userId = user?.id
        // 准备创建部门的数据
        const sectionData = {
          teamId,
          sectionName: newSectionName.trim(),
          createdBy: userId
        };
        
        // 调用Redux Action创建部门
        await dispatch(createSection({teamId, sectionData})).unwrap();
        
        // 重新加载部门列表
        await loadSections();
        
        // 重置创建状态
        setIsCreatingSection(false);
        setNewSectionName('');
      } catch (error) {
        console.error('创建部门失败:', error);
        setIsCreatingSection(false);
      }
    }
  };

  // 处理部门名称输入变化
  const handleSectionNameChange = (e) => {
    setNewSectionName(e.target.value);
  };
  
  // 处理添加部门
  const handleAddSection = () => {
    setIsCreatingSection(true);
    setNewSectionName('');
  };

  return (
    <div className="w-full h-full">
      <DragDropContext onDragEnd={handleDragEnd} onDragStart={handleDragStart}>
        <Table className="w-full">
          <TableHeader>
            <TableRow>
              <TableCell colSpan={totalColumns} className="p-0">
                {/* 标签标题行 */}
                {renderTagHeaders()}
              </TableCell>
              {/* 添加标签按钮 */}
              <TableCell className="text-right" >
                {renderTagPopover()}
              </TableCell>
            </TableRow>
          </TableHeader>
          
          <TableBody>
            <TableRow>
              <TableCell colSpan={totalColumns+1} className="p-0">
                {renderBodyContent()}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell colSpan={totalColumns+1} className="p-2 border-t">
                {isCreatingSection ? (
                  <div className="flex items-center space-x-2 p-1">
                    <Input
                      ref={sectionInputRef}
                      autoFocus
                      placeholder={t('enterSectionName')}
                      value={newSectionName}
                      onChange={handleSectionNameChange}
                      onKeyDown={handleCreateSection}
                      className="h-8 border-transparent"
                      maxLength={50}
                    />
                  </div>
                ) : (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full text-left text-muted-foreground hover:text-foreground"
                    onClick={handleAddSection}
                  >
                    {t('addNewSection')}
                  </Button>
                )}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </DragDropContext>
    </div>
  );
}

export default function TaskList({ projectId, teamId, teamCFId }) {
  const [projectThemeColor, setProjectThemeColor] = useState('#ffffff');
  const project = useSelector(state => 
    state.projects.projects.find(p => String(p.id) === String(projectId))
  );
  
  useEffect(() => {
    if (project?.theme_color) {
      setProjectThemeColor(project.theme_color);
    }
  }, [project]);
  
  return (
    <TableProvider 
      teamId={teamId} 
      projectId={projectId} 
      teamCFId={teamCFId}
    >
      <TaskListContent 
        projectThemeColor={projectThemeColor}
      />
    </TableProvider>
  );
}