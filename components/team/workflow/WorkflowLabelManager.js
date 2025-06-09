import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getLabelByTeamId, updateLabel } from '@/lib/redux/features/teamLabelSlice';
import { extractSingleSelectOptions, getTaskStatusById, integrateLabelsWithTasks, createStatusOption, updateStatusOption, deleteStatusOption } from './labelUtils';
import { renderStatusBadge } from './helpers';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Plus, Edit, Trash, Check, X, RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useConfirm } from '@/hooks/use-confirm';

/**
 * 工作流标签管理器组件
 * 演示如何使用labelUtils中的函数处理团队标签和任务数据
 */
const WorkflowLabelManager = ({ teamId, tasks = [], projectThemeColor }) => {
  const dispatch = useDispatch();
  const t = useTranslations('CreateTask');
  const { confirm } = useConfirm();
  const [statusOptions, setStatusOptions] = useState([]);
  const [statusTagId, setStatusTagId] = useState('3'); // 默认假设Status标签ID为3
  const [processedTasks, setProcessedTasks] = useState([]);
  const [tasksByStatus, setTasksByStatus] = useState({});
  const [loading, setLoading] = useState(false);
  
  // 新增标签状态
  const [isCreating, setIsCreating] = useState(false);
  const [newOption, setNewOption] = useState({
    label: '',
    color: '#10b981',
    value: ''
  });
  
  // 编辑标签状态
  const [isEditing, setIsEditing] = useState(false);
  const [editingOption, setEditingOption] = useState(null);
  
  // 从Redux获取标签数据
  const { label: teamLabel, status: labelStatus } = useSelector(state => state.teamLabels || {});
  
  // 当组件加载时获取团队标签数据
  useEffect(() => {
    if (teamId) {
      dispatch(getLabelByTeamId(teamId));
    }
  }, [dispatch, teamId]);
  
  // 当团队标签数据加载完成后，提取SINGLE-SELECT选项
  useEffect(() => {
    if (labelStatus === 'succeeded' && teamLabel) {
      const options = extractSingleSelectOptions(teamLabel);
      setStatusOptions(options);
      
      // 如果有任务数据，处理任务和标签的集成
      if (tasks.length > 0) {
        const { tasksWithStatus, tasksByStatus: groupedTasks } = integrateLabelsWithTasks(
          teamLabel, 
          tasks, 
          statusTagId
        );
        
        setProcessedTasks(tasksWithStatus);
        setTasksByStatus(groupedTasks);
      }
    }
  }, [teamLabel, labelStatus, tasks, statusTagId]);
  
  // 生成随机颜色
  const generateRandomColor = () => {
    const colors = [
      '#ef4444', '#f97316', '#f59e0b', '#84cc16', 
      '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6', 
      '#d946ef', '#ec4899'
    ];
    const index = Math.floor(Math.random() * colors.length);
    return colors[index];
  };
  
  // 处理新建标签
  const handleCreateOption = async () => {
    if (!newOption.label.trim()) {
      toast.error(t('optionNameRequired'));
      return;
    }
    
    try {
      setLoading(true);
      
      // 生成value值（如未提供）
      if (!newOption.value) {
        setNewOption(prev => ({
          ...prev,
          value: prev.label.toLowerCase().replace(/\s+/g, '_')
        }));
      }
      
      // 调用labelUtils中的创建函数
      const updatedLabel = createStatusOption(teamLabel, newOption);
      
      // 调用Redux更新标签
      await dispatch(updateLabel({ teamId, label: updatedLabel })).unwrap();
      
      // 重新加载标签数据
      await dispatch(getLabelByTeamId(teamId)).unwrap();
      
      // 成功提示
      toast.success(t('optionCreated'));
      
      // 重置表单
      setNewOption({
        label: '',
        color: '#10b981',
        value: ''
      });
      setIsCreating(false);
      
    } catch (error) {
      console.error('创建选项失败:', error);
      toast.error(t('createOptionFailed'));
    } finally {
      setLoading(false);
    }
  };
  
  // 处理编辑标签
  const handleUpdateOption = async () => {
    if (!editingOption || !editingOption.label.trim()) {
      toast.error(t('optionNameRequired'));
      return;
    }
    
    try {
      setLoading(true);
      
      // 调用labelUtils中的更新函数
      const updatedLabel = updateStatusOption(teamLabel, editingOption);
      
      // 调用Redux更新标签
      await dispatch(updateLabel({ teamId, label: updatedLabel })).unwrap();
      
      // 重新加载标签数据
      await dispatch(getLabelByTeamId(teamId)).unwrap();
      
      // 成功提示
      toast.success(t('optionUpdated'));
      
      // 重置表单
      setEditingOption(null);
      setIsEditing(false);
      
    } catch (error) {
      console.error('更新选项失败:', error);
      toast.error(t('updateOptionFailed'));
    } finally {
      setLoading(false);
    }
  };
  
  // 处理删除标签
  const handleDeleteOption = async (optionValue) => {
    try {
      // 检查是否有任务正在使用此选项
      const tasksUsingOption = processedTasks.filter(task => 
        task.statusData && task.statusData.value === optionValue
      );
      
      if (tasksUsingOption.length > 0) {
        confirm({
          title: t('deleteOptionTitle'),
          description: t('deleteOptionWarning', { count: tasksUsingOption.length }),
          variant: "destructive",
          onConfirm: async () => await performDeleteOption(optionValue)
        });
      } else {
        await performDeleteOption(optionValue);
      }
    } catch (error) {
      console.error('删除选项失败:', error);
      toast.error(t('deleteOptionFailed'));
    }
  };
  
  // 执行删除操作
  const performDeleteOption = async (optionValue) => {
    try {
      setLoading(true);
      
      // 调用labelUtils中的删除函数
      const updatedLabel = deleteStatusOption(teamLabel, optionValue);
      
      // 调用Redux更新标签
      await dispatch(updateLabel({ teamId, label: updatedLabel })).unwrap();
      
      // 重新加载标签数据
      await dispatch(getLabelByTeamId(teamId)).unwrap();
      
      // 成功提示
      toast.success(t('optionDeleted'));
      
    } catch (error) {
      console.error('删除选项失败:', error);
      toast.error(t('deleteOptionFailed'));
    } finally {
      setLoading(false);
    }
  };
  
  // 开始编辑选项
  const startEditOption = (option) => {
    setIsEditing(true);
    setIsCreating(false);
    setEditingOption(option);
  };
  
  // 渲染加载状态
  if (labelStatus === 'loading') {
    return <div className="p-4 text-gray-500 text-center">{t('loading')}</div>;
  }
  
  // 渲染错误状态
  if (labelStatus === 'failed') {
    return <div className="p-4 text-red-500">{t('loadLabelsFailed')}</div>;
  }
  
  return (
    <div className="p-4">      
      {/* 状态选项管理 */}
        <div className="flex justify-end items-center mb-4">
          {!isCreating && !isEditing && (
            <Button 
              variant={projectThemeColor} 
              size="sm"
              className="flex items-center text-sm" 
              onClick={() => {
                setIsCreating(true);
                setIsEditing(false);
                setEditingOption(null);
              }}
              disabled={loading}
            >
              <Plus className="w-4 h-4 mr-1" />
            </Button>
          )}
        </div>
        
        {/* 创建新选项表单 */}
        {isCreating && (
          <div className="mb-4 p-3 border rounded">
            <h4 className="font-medium mb-2">{t('newOption')}</h4>
            <div className="space-y-3">
              <div>
                <label className="block text-sm mb-1">{t('optionName')}</label>
                <input
                  type="text"
                  value={newOption.label}
                  onChange={(e) => setNewOption({...newOption, label: e.target.value})}
                  className="w-full p-2 border rounded"
                  placeholder={t('enterOptionName')}
                />
              </div>
              <div>
                <label className="block text-sm mb-1">{t('optionColor')}</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <input
                      type="color"
                      value={newOption.color}
                      onChange={(e) => setNewOption({...newOption, color: e.target.value})}
                      className="w-full h-8"
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setNewOption({...newOption, color: generateRandomColor()})}
                    className="h-8"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsCreating(false);
                    setNewOption({
                      label: '',
                      color: '#10b981',
                      value: ''
                    });
                  }}
                  disabled={loading}
                >
                  <X className="w-4 h-4 mr-1" />
                  {t('cancel')}
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleCreateOption}
                  disabled={loading || !newOption.label.trim()}
                >
                  <Check className="w-4 h-4 mr-1" />
                  {t('create')}
                </Button>
              </div>
            </div>
          </div>
        )}
        
        {/* 编辑选项表单 */}
        {isEditing && editingOption && (
          <div className="mb-4 p-3 border rounded">
            <h4 className="font-medium mb-2">{t('editOption')}</h4>
            <div className="space-y-3">
              <div>
                <label className="block text-sm mb-1">{t('optionName')}</label>
                <input
                  type="text"
                  value={editingOption.label}
                  onChange={(e) => setEditingOption({...editingOption, label: e.target.value})}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm mb-1">{t('optionColor')}</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <input
                      type="color"
                      value={editingOption.color}
                      onChange={(e) => setEditingOption({...editingOption, color: e.target.value})}
                      className="w-full h-8"
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingOption({...editingOption, color: generateRandomColor()})}
                    className="h-8"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsEditing(false);
                    setEditingOption(null);
                  }}
                  disabled={loading}
                >
                  <X className="w-4 h-4 mr-1" />
                  {t('cancel')}
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleUpdateOption}
                  disabled={loading || !editingOption.label.trim()}
                >
                  <Check className="w-4 h-4 mr-1" />
                  {t('save')}
                </Button>
              </div>
            </div>
          </div>
        )}
        
        {/* 显示所有选项 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {statusOptions.length > 0 ? (
            statusOptions.map((option, index) => (
              <div 
                key={index}
                className="flex items-center justify-between p-3 border rounded hover:bg-accent/20"
              >
                <div className="flex items-center gap-2">
                  <div 
                    className="w-4 h-4 rounded-full" 
                    style={{ backgroundColor: option.color || '#e5e5e5' }}
                  ></div>
                  <span>{option.label}</span>
                </div>
                {!isCreating && !isEditing && (
                  <div className="flex gap-1">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 w-8 p-1"
                      onClick={() => startEditOption(option)}
                      disabled={loading}
                    >
                      <Edit className="w-4 h-4 text-muted-foreground" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 w-8 p-1 text-destructive hover:text-destructive/80"
                      onClick={() => handleDeleteOption(option.value)}
                      disabled={loading}
                    >
                      <Trash className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="col-span-3 text-center py-4 text-muted-foreground">
              {t('noStatusOptions')}
            </div>
          )}
        </div>
    </div>
  );
};

export default WorkflowLabelManager; 