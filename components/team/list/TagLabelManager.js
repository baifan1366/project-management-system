import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getLabelByTeamId, updateLabel } from '@/lib/redux/features/teamLabelSlice';
import { extractSingleSelectOptions, createSingleSelectOption, updateSingleSelectOption, deleteSingleSelectOption } from './tagUtils';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Plus, Edit, Trash, Check, X, RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useConfirm } from '@/hooks/use-confirm';
import { useGetUser } from '@/lib/hooks/useGetUser';

/**
 * 标签管理器组件
 * 用于管理SINGLE-SELECT类型的选项
 * 
 * @param {Object} props
 * @param {string} props.teamId - 团队ID
 * @param {boolean} props.selectionMode - 是否为选择模式，如果为true则作为选择器使用
 * @param {Object} props.selectedValue - 当前选中的值
 * @param {Function} props.onSelect - 选择事件回调
 */
const TagLabelManager = ({ 
  teamId, 
  selectionMode = false,
  selectedValue = null,
  onSelect = () => {}
}) => {
  
  
  const dispatch = useDispatch();
  const t = useTranslations('Team');
  const { confirm } = useConfirm();
  const { user } = useGetUser(); // 获取当前用户
  const [singleSelectOptions, setSingleSelectOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // 新增选项状态
  const [isCreating, setIsCreating] = useState(false);
  const [newOption, setNewOption] = useState({
    label: '',
    color: '#10b981',
    value: ''
  });
  
  // 编辑选项状态
  const [isEditing, setIsEditing] = useState(false);
  const [editingOption, setEditingOption] = useState(null);
  
  // 从Redux获取标签数据
  const { label: teamLabel, status: labelStatus } = useSelector(state => {
    
    return state.teamLabels || {}
  });
  
  // 当组件加载时获取团队标签数据
  useEffect(() => {
    
    
    
    if (teamId) {
      
      dispatch(getLabelByTeamId(teamId));
    } else {
      console.warn('%c[TagLabelManager] 缺少teamId，无法获取标签数据', 'color: #f97316; font-weight: bold;');
    }
  }, [dispatch, teamId]);
  
  // 当团队标签数据加载完成后，提取SINGLE-SELECT选项
  useEffect(() => {
    
    if (labelStatus === 'succeeded' && teamLabel) {
      
      const options = extractSingleSelectOptions(teamLabel);
      
      setSingleSelectOptions(options);
    }
  }, [teamLabel, labelStatus]);
  
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
  
  // 处理新建选项
  const handleCreateOption = async () => {
    if (!newOption.label.trim()) {
      toast.error('选项名称不能为空');
      return;
    }
    
    try {
      setLoading(true);
      
      
      // 生成value值（如未提供）
      const optionToCreate = {
        ...newOption,
        value: newOption.value || newOption.label.toLowerCase().replace(/\s+/g, '_')
      };
      
      
      
      // 准备标签数据，确保使用扁平化的数据结构
      let labelToUpdate = teamLabel || {};
      
      
      // 如果存在label嵌套，直接取出内部内容
      if (labelToUpdate.label && typeof labelToUpdate.label === 'object') {
        labelToUpdate = labelToUpdate.label;
        
      }
      
      // 调用tagUtils中的创建函数，确保返回的是扁平结构
      const updatedLabel = createSingleSelectOption(labelToUpdate, optionToCreate);
      
      
      // 确保完全没有label嵌套
      const finalLabel = updatedLabel;
      
      
      // 调用Redux更新标签
      const result = await dispatch(updateLabel({ 
        teamId, 
        label: finalLabel, // 确保传递的是扁平结构
        userId: user?.id, // 添加用户ID
        entityId: teamId // 以团队ID作为实体ID
      })).unwrap();
      
      
      
      // 重新加载标签数据
      await dispatch(getLabelByTeamId(teamId)).unwrap();
      
      // 成功提示
      toast.success('选项已创建');
      
      // 重置表单
      setNewOption({
        label: '',
        color: '#10b981',
        value: ''
      });
      setIsCreating(false);
      
      // 如果在选择模式下并传入了onSelect回调，自动选择新创建的选项
      if (selectionMode && onSelect && typeof onSelect === 'function') {
        onSelect(optionToCreate);
      }
      
    } catch (error) {
      console.error('创建选项失败:', error);
      toast.error(error.message || '创建选项失败');
    } finally {
      setLoading(false);
    }
  };
  
  // 处理编辑选项
  const handleUpdateOption = async () => {
    if (!editingOption || !editingOption.label.trim()) {
      toast.error('选项名称不能为空');
      return;
    }
    
    try {
      setLoading(true);
      
      
      // 准备标签数据，提取嵌套的label（如果存在）
      let labelToUpdate = teamLabel || {};
      
      // 如果存在label嵌套，直接取出内部内容
      if (labelToUpdate.label && typeof labelToUpdate.label === 'object') {
        labelToUpdate = labelToUpdate.label;
        
      }
      
      // 调用tagUtils中的更新函数
      const updatedLabel = updateSingleSelectOption(labelToUpdate, editingOption);
      
      
      // 确保完全没有label嵌套
      const finalLabel = updatedLabel;
      
      
      // 调用Redux更新标签
      const result = await dispatch(updateLabel({ 
        teamId, 
        label: finalLabel, // 确保传递的是扁平结构
        userId: user?.id, // 添加用户ID
        entityId: teamId // 以团队ID作为实体ID
      })).unwrap();
      
      
      
      // 重新加载标签数据
      await dispatch(getLabelByTeamId(teamId)).unwrap();
      
      // 成功提示
      toast.success('选项已更新');
      
      // 重置表单
      setEditingOption(null);
      setIsEditing(false);
      
    } catch (error) {
      console.error('更新选项失败:', error);
      toast.error(error.message || '更新选项失败');
    } finally {
      setLoading(false);
    }
  };
  
  // 处理删除选项
  const handleDeleteOption = async (optionValue) => {
    try {
      confirm({
        title: t('deleteOptionTitle') || '删除选项',
        description: t('deleteOptionWarning') || '确定要删除此选项吗？这可能会影响使用该选项的任务。',
        variant: "destructive",
        onConfirm: async () => await performDeleteOption(optionValue)
      });
    } catch (error) {
      console.error('删除选项失败:', error);
      toast.error(t('deleteOptionFailed') || '删除选项失败');
    }
  };
  
  // 执行删除操作
  const performDeleteOption = async (optionValue) => {
    try {
      setLoading(true);
      
      
      // 准备标签数据，提取嵌套的label（如果存在）
      let labelToUpdate = teamLabel || {};
      
      // 如果存在label嵌套，直接取出内部内容
      if (labelToUpdate.label && typeof labelToUpdate.label === 'object') {
        labelToUpdate = labelToUpdate.label;
        
      }
      
      // 调用tagUtils中的删除函数
      const updatedLabel = deleteSingleSelectOption(labelToUpdate, optionValue);
      
      
      // 确保完全没有label嵌套
      const finalLabel = updatedLabel;
      
      
      // 调用Redux更新标签
      const result = await dispatch(updateLabel({ 
        teamId, 
        label: finalLabel, // 确保传递的是扁平结构
        userId: user?.id, // 添加用户ID
        entityId: teamId // 以团队ID作为实体ID
      })).unwrap();
      
      
      
      // 重新加载标签数据
      await dispatch(getLabelByTeamId(teamId)).unwrap();
      
      // 成功提示
      toast.success('选项已删除');
      
    } catch (error) {
      console.error('删除选项失败:', error);
      toast.error(error.message || '删除选项失败');
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
    return <div className="p-4 text-gray-500 text-center">{t('loading') || '加载中...'}</div>;
  }
  
  // 渲染错误状态
  if (labelStatus === 'failed') {
    return (
      <div className="p-4 border rounded">
        <div className="text-red-500 mb-2">{t('loadLabelsFailed') || '加载标签失败'}</div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            
            if (teamId) {
              dispatch(getLabelByTeamId(teamId));
            }
          }}
        >
          {t('retry')}
        </Button>
      </div>
    );
  }
  
  return (
    <div className="w-full rounded-md border">
      <div className="p-3">
        {/* 标题和创建按钮 */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium text-sm">{selectionMode ? t('selectOption') || '选择选项' : t('manageOptions') || '管理选项'}</h3>
          
          {/* 只在管理模式下显示添加按钮 - 选择模式下在底部显示 */}
          {!selectionMode && !isCreating && !isEditing && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsCreating(true);
                setIsEditing(false);
              }}
              disabled={loading}
              className="h-8"
            >
              <Plus className="w-4 h-4 mr-1" />
              {t('addOption')}
            </Button>
          )}
        </div>
        
        {/* 创建选项表单 - 在选择模式下也显示 */}
        {isCreating && (
          <div className="mb-4 p-3 border rounded-lg bg-background">
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-medium text-sm">{t('addOption')}</h4>
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
            <div className="space-y-3">
              <div>
                <label className="block text-sm mb-1 font-medium">{t('optionName')}</label>
                <input
                  type="text"
                  value={newOption.label}
                  onChange={(e) => setNewOption({...newOption, label: e.target.value})}
                  className="w-full p-2 border rounded-md focus:ring-1 focus:outline-none text-sm"
                  placeholder={t('enterOptionName')}
                />
              </div>
              <div>
                <label className="block text-sm mb-1 font-medium">{t('optionColor')}</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={newOption.color}
                    onChange={(e) => setNewOption({...newOption, color: e.target.value})}
                    className="w-full h-8"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setNewOption({...newOption, color: generateRandomColor()})}
                    className="h-8"
                  >
                    🎲
                  </Button>
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <Button
                  size="sm"
                  onClick={handleCreateOption}
                  disabled={loading || !newOption.label.trim()}
                  className="h-8"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-background border-t-primary rounded-full animate-spin mr-1" />
                  ) : null}
                  {t('create')}
                </Button>
              </div>
            </div>
          </div>
        )}
        
        {/* 编辑选项表单 - 仅在非选择模式下显示 */}
        {isEditing && editingOption && !selectionMode && (
          <div className="mb-4 p-3 border rounded-lg bg-background">
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-medium text-sm">{t('editOption') || '编辑选项'}</h4>
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
            <div className="space-y-3">
              <div>
                <label className="block text-sm mb-1 font-medium">{t('optionName') || '选项名称'}</label>
                <input
                  type="text"
                  value={editingOption?.label || ''}
                  onChange={(e) => setEditingOption({...editingOption, label: e.target.value})}
                  className="w-full p-2 border rounded-md focus:ring-1 focus:outline-none text-sm"
                  placeholder={t('enterOptionName') || '输入选项名称'}
                />
              </div>
              <div>
                <label className="block text-sm mb-1 font-medium">{t('optionColor') || '选项颜色'}</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={editingOption?.color || '#10b981'}
                    onChange={(e) => setEditingOption({...editingOption, color: e.target.value})}
                    className="w-full h-8"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingOption({...editingOption, color: generateRandomColor()})}
                    className="h-8"
                  >
                    🎲
                  </Button>
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <Button
                  size="sm"
                  onClick={handleUpdateOption}
                  disabled={loading || !editingOption?.label?.trim()}
                  className="h-8"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-background border-t-primary rounded-full animate-spin mr-1" />
                  ) : null}
                  {t('save') || '保存'}
                </Button>
              </div>
            </div>
          </div>
        )}
        
        {/* 选项列表 */}
        <div className="grid grid-cols-1 gap-2">
          {singleSelectOptions.length > 0 ? (
            singleSelectOptions.map((option, index) => (
              <div 
                key={index}
                className={`flex items-center justify-between p-2 border ${selectedValue && selectedValue.value === option.value ? 'border-primary ring-1 ring-primary' : 'border-gray-300 dark:border-gray-700'} rounded-lg transition-all duration-200 ${selectionMode ? 'cursor-pointer hover:bg-accent/10' : ''}`}
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
                  <span className="font-medium text-sm">{option.label}</span>
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
                        onClick={(e) => {
                          e.stopPropagation();
                          startEditOption(option);
                        }}
                        disabled={loading}
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 w-7 p-0.5 rounded-full text-destructive hover:text-destructive opacity-70 hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteOption(option.value);
                        }}
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
            <div className="text-center py-4 text-muted-foreground border border-gray-300 dark:border-gray-700 rounded-lg text-sm">
              {t('noOptions')}
            </div>
          )}
        </div>
        
        {/* 在选择模式下显示添加选项按钮 */}
        {selectionMode && !isCreating && !isEditing && (
          <div className="mt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsCreating(true);
                setIsEditing(false);
              }}
              disabled={loading}
              className="w-full h-8"
            >
              <Plus className="w-4 h-4 mr-1" />
              {t('addOption')}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TagLabelManager; 