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
import { useGetUser } from '@/lib/hooks/useGetUser';

/**
 * 工作流标签管理器组件
 * 演示如何使用labelUtils中的函数处理团队标签和任务数据
 * 
 * @param {Object} props
 * @param {string} props.teamId - 团队ID
 * @param {Array} props.tasks - 任务数组
 * @param {string} props.projectThemeColor - 项目主题颜色
 * @param {boolean} props.selectionMode - 是否为选择模式，如果为true则作为选择器使用
 * @param {Object} props.selectedValue - 当前选中的值
 * @param {Function} props.onSelect - 选择事件回调
 */
const WorkflowLabelManager = ({ 
  teamId, 
  tasks = [], 
  projectThemeColor,
  selectionMode = false,
  selectedValue = null,
  onSelect = () => {}
}) => {
  const dispatch = useDispatch();
  const t = useTranslations('CreateTask');
  const { confirm } = useConfirm();
  const { user } = useGetUser(); // 获取当前用户
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
      await dispatch(updateLabel({ 
        teamId, 
        label: updatedLabel, 
        userId: user?.id, // 添加用户ID
        entityId: teamId // 以团队ID作为实体ID
      })).unwrap();
      
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
      await dispatch(updateLabel({ 
        teamId, 
        label: updatedLabel,
        userId: user?.id, // 添加用户ID
        entityId: teamId // 以团队ID作为实体ID
      })).unwrap();
      
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
      await dispatch(updateLabel({ 
        teamId, 
        label: updatedLabel,
        userId: user?.id, // 添加用户ID
        entityId: teamId // 以团队ID作为实体ID
      })).unwrap();
      
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
  
  // 处理选择状态
  const handleSelectOption = (option) => {
    if (selectionMode && onSelect) {
      onSelect(option);
    }
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
    <div className="relative w-full">
      {/* 主容器 */}
      <div className={`p-4 bg-background rounded-lg border border-gray-200 overflow-hidden relative ${selectionMode ? 'focus-within:ring-1 focus-within:ring-gray-400' : ''}`}>
        {/* 添加按钮 - 在非选择模式时显示 */}
        {!isCreating && !isEditing && !selectionMode && (
          <div className="absolute top-3 right-3 z-10">
            <Button 
              variant={projectThemeColor} 
              size="icon"
              className="w-7 h-7 rounded-full shadow-md"
              onClick={() => {
                setIsCreating(true);
                setIsEditing(false);
                setEditingOption(null);
              }}
              disabled={loading}
            >
              <Plus className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}
        
        {/* 创建新选项表单 - 在非选择模式时显示 */}
        {isCreating && !selectionMode && (
          <div className="mb-4 p-3 border border-gray-200 rounded-lg bg-background backdrop-blur-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-medium">{t('addStatus')}</h3>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 rounded-full"
                onClick={() => {
                  setIsCreating(false);
                  setNewOption({
                    label: '',
                    color: '#10b981',
                    value: ''
                  });
                }}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm mb-2 font-medium">{t('optionName')}</label>
                <input
                  type="text"
                  value={newOption.label}
                  onChange={(e) => setNewOption({...newOption, label: e.target.value})}
                  className="w-full p-2 border border-gray-700 rounded-md focus:ring-1 focus:ring-offset-0 focus:outline-none"
                  placeholder={t('enterOptionName')}
                  maxLength={15}
                />
              </div>
              <div>
                <label className="block text-sm mb-2 font-medium">{t('optionColor')}</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <input
                        type="color"
                        value={newOption.color}
                        onChange={(e) => setNewOption({...newOption, color: e.target.value})}
                        className="w-8 h-8 rounded border border-gray-700"
                      />
                      <div 
                        className="flex-1 h-8 rounded-md" 
                        style={{ backgroundColor: newOption.color }}
                      ></div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setNewOption({...newOption, color: generateRandomColor()})}
                    className="h-8 px-3 rounded-md border-gray-700"
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    {t('random')}
                  </Button>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3">
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
                  className="rounded-md border-gray-700"
                >
                  <X className="w-4 h-4 mr-1" />
                  {t('cancel')}
                </Button>
                <Button
                  variant={projectThemeColor}
                  size="sm"
                  onClick={handleCreateOption}
                  disabled={loading || !newOption.label.trim()}
                  className="rounded-md"
                >
                  <Check className="w-4 h-4 mr-1" />
                  {t('create')}
                </Button>
              </div>
            </div>
          </div>
        )}
        
        {/* 编辑选项表单 - 在非选择模式时显示 */}
        {isEditing && editingOption && !selectionMode && (
          <div className="mb-6 p-4 border border-gray-700 rounded-lg bg-background backdrop-blur-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-medium">{t('editOption')}</h3>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 rounded-full"
                onClick={() => {
                  setIsEditing(false);
                  setEditingOption(null);
                }}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm mb-2 font-medium">{t('optionName')}</label>
                <input
                  type="text"
                  value={editingOption.label}
                  onChange={(e) => setEditingOption({...editingOption, label: e.target.value})}
                  className="w-full p-2 border border-gray-700 rounded-md focus:ring-1 focus:ring-offset-0 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm mb-2 font-medium">{t('optionColor')}</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <input
                        type="color"
                        value={editingOption.color}
                        onChange={(e) => setEditingOption({...editingOption, color: e.target.value})}
                        className="w-8 h-8 rounded border border-gray-700"
                      />
                      <div 
                        className="flex-1 h-8 rounded-md" 
                        style={{ backgroundColor: editingOption.color }}
                      ></div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingOption({...editingOption, color: generateRandomColor()})}
                    className="h-8 px-3 rounded-md border-gray-700"
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    {t('random')}
                  </Button>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsEditing(false);
                    setEditingOption(null);
                  }}
                  disabled={loading}
                  className="rounded-md border-gray-700"
                >
                  <X className="w-4 h-4 mr-1" />
                  {t('cancel')}
                </Button>
                <Button
                  variant={projectThemeColor}
                  size="sm"
                  onClick={handleUpdateOption}
                  disabled={loading || !editingOption.label.trim()}
                  className="rounded-md"
                >
                  <Check className="w-4 h-4 mr-1" />
                  {t('save')}
                </Button>
              </div>
            </div>
          </div>
        )}
        
        {/* 状态选项卡片网格 */}
        <div className="grid grid-cols-1 gap-2 pt-3 pb-1">
          {statusOptions.length > 0 ? (
            statusOptions.map((option, index) => (
              <div 
                key={index}
                className={`flex items-center justify-between p-3 border ${selectedValue && selectedValue.value === option.value ? 'border-primary ring-1 ring-primary' : 'border-gray-800'} rounded-lg transition-all duration-200 ${selectionMode ? 'cursor-pointer hover:bg-accent/10' : ''}`}
                style={{ borderLeft: `3px solid ${option.color}` }}
                onClick={selectionMode ? () => handleSelectOption(option) : undefined}
                tabIndex={selectionMode ? 0 : undefined}
                role={selectionMode ? "button" : undefined}
              >
                <div className="flex items-center gap-2">
                  <div 
                    className="w-4 h-4 rounded-full" 
                    style={{ backgroundColor: option.color || '#e5e5e5' }}
                  ></div>
                  <span className="font-medium truncate max-w-[80%]">{option.label}</span>
                </div>
                {/* 在选择模式下显示选中标记，在管理模式下显示编辑删除按钮 */}
                {!isCreating && !isEditing && (
                  selectionMode ? (
                    selectedValue && selectedValue.value === option.value && (
                      <Check className="w-4 h-4 text-primary" />
                    )
                  ) : (
                    <div className="flex gap-1">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 w-7 p-0.5 rounded-full opacity-70 hover:opacity-100"
                        onClick={() => startEditOption(option)}
                        disabled={loading}
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 w-7 p-0.5 rounded-full text-red-500 hover:text-red-600 opacity-70 hover:opacity-100"
                        onClick={() => handleDeleteOption(option.value)}
                        disabled={loading}
                      >
                        <Trash className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )
                )}
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-6 text-gray-500 border border-gray-800 rounded-lg text-sm">
              {selectionMode ? t('noOptions') : t('noStatusOptions')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WorkflowLabelManager; 