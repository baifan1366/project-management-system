import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getLabelByTeamId, updateLabel } from '@/lib/redux/features/teamLabelSlice';
import { extractSingleSelectOptions } from '@/components/team/list/tagUtils';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Plus, Edit, Trash, Check, X, RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useConfirm } from '@/hooks/use-confirm';
import { useGetUser } from '@/lib/hooks/useGetUser';

/**
 * 状态标签管理器组件 - 专用于敏捷看板状态管理
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
  const t = useTranslations('Agile');
  const { confirm } = useConfirm();
  const { user } = useGetUser();
  const [statusOptions, setStatusOptions] = useState([]);
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
    return state.teamLabels || {};
  });
  
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
      toast.error(t('optionNameRequired'));
      return;
    }
    
    try {
      setLoading(true);
      
      // 生成value值（如未提供）并确保所有字段都是字符串
      const optionToCreate = {
        label: String(newOption.label || ''),
        color: String(newOption.color || '#10b981'),
        value: String(newOption.value || newOption.label.toLowerCase().replace(/\s+/g, '_') || '')
      };
      
      // 准备标签数据，确保使用扁平化的数据结构
      let labelToUpdate = teamLabel || {};
      
      // 如果存在label嵌套，直接取出内部内容
      if (labelToUpdate.label && typeof labelToUpdate.label === 'object') {
        labelToUpdate = labelToUpdate.label;
      }
      
      // 处理SINGLE-SELECT数组
      if (!labelToUpdate["SINGLE-SELECT"]) {
        labelToUpdate["SINGLE-SELECT"] = [];
      }
      
      // 确保是数组
      let singleSelectArray = labelToUpdate["SINGLE-SELECT"];
      if (!Array.isArray(singleSelectArray)) {
        singleSelectArray = [singleSelectArray].filter(Boolean);
      }
      
      // 添加新选项 - 使用JSON.stringify创建一个新的字符串
      const optionJson = JSON.stringify(optionToCreate);
      singleSelectArray.push(optionJson);
      
      // 更新标签对象 - 创建一个全新的对象而不是修改现有对象
      const updatedLabel = {
        ...labelToUpdate,
        "SINGLE-SELECT": [...singleSelectArray]
      };
      
      // 调用Redux更新标签
      await dispatch(updateLabel({ 
        teamId, 
        label: updatedLabel,
        userId: user?.id,
        entityId: teamId
      })).unwrap();
      
      // 重新加载标签数据
      await dispatch(getLabelByTeamId(teamId)).unwrap();
      
      // 成功提示
      toast.success(t('statusOptionCreated'));
      
      // 重置表单
      setNewOption({
        label: '',
        color: '#10b981',
        value: ''
      });
      setIsCreating(false);
      
      // 如果在选择模式下并传入了onSelect回调，自动选择新创建的选项
      if (selectionMode && onSelect) {
        onSelect(optionToCreate);
      }
      
    } catch (error) {
      console.error('创建状态选项失败:', error);
      toast.error(t('createStatusFailed'));
    } finally {
      setLoading(false);
    }
  };
  
  // 处理编辑选项
  const handleUpdateOption = async () => {
    if (!editingOption || !editingOption.label.trim()) {
      toast.error(t('optionNameRequired'));
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
      
      // 确保SINGLE-SELECT是数组
      if (!labelToUpdate["SINGLE-SELECT"] || !Array.isArray(labelToUpdate["SINGLE-SELECT"])) {
        labelToUpdate["SINGLE-SELECT"] = Array.isArray(labelToUpdate["SINGLE-SELECT"]) 
          ? labelToUpdate["SINGLE-SELECT"] 
          : [labelToUpdate["SINGLE-SELECT"]].filter(Boolean);
      }
      
      // 更新特定选项 - 创建新数组
      const updatedOptions = labelToUpdate["SINGLE-SELECT"].map(optionStr => {
        try {
          const option = typeof optionStr === 'string' ? JSON.parse(optionStr) : optionStr;
          
          if (option && option.value === editingOption.value) {
            // 创建一个新的选项对象并序列化
            const updatedOption = {
              ...option,
              label: editingOption.label,
              color: editingOption.color
            };
            return JSON.stringify(updatedOption);
          }
          
          return optionStr;
        } catch (e) {
          return optionStr;
        }
      });
      
      // 创建更新后的标签对象 - 使用全新的对象
      const updatedLabel = {
        ...labelToUpdate,
        "SINGLE-SELECT": [...updatedOptions]
      };
      
      // 调用Redux更新标签
      await dispatch(updateLabel({ 
        teamId, 
        label: updatedLabel,
        userId: user?.id,
        entityId: teamId
      })).unwrap();
      
      // 重新加载标签数据
      await dispatch(getLabelByTeamId(teamId)).unwrap();
      
      // 成功提示
      toast.success(t('statusOptionUpdated'));
      
      // 重置表单
      setEditingOption(null);
      setIsEditing(false);
      
    } catch (error) {
      console.error('更新状态选项失败:', error);
      toast.error(t('updateStatusFailed'));
    } finally {
      setLoading(false);
    }
  };
  
  // 处理删除选项
  const handleDeleteOption = async (optionValue) => {
    try {
      confirm({
        title: t('deleteStatusTitle'),
        description: t('deleteStatusConfirm'),
        variant: "destructive",
        onConfirm: async () => await performDeleteOption(optionValue)
      });
    } catch (error) {
      console.error('删除状态选项失败:', error);
      toast.error(t('deleteStatusFailed'));
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
      
      // 确保SINGLE-SELECT是数组
      if (!labelToUpdate["SINGLE-SELECT"] || !Array.isArray(labelToUpdate["SINGLE-SELECT"])) {
        labelToUpdate["SINGLE-SELECT"] = Array.isArray(labelToUpdate["SINGLE-SELECT"]) 
          ? labelToUpdate["SINGLE-SELECT"] 
          : [labelToUpdate["SINGLE-SELECT"]].filter(Boolean);
      }
      
      // 过滤掉要删除的选项 - 创建新数组
      const filteredOptions = labelToUpdate["SINGLE-SELECT"].filter(optionStr => {
        try {
          const option = typeof optionStr === 'string' ? JSON.parse(optionStr) : optionStr;
          return option && option.value !== optionValue;
        } catch (e) {
          return true; // 如果解析错误，保留选项
        }
      });
      
      // 创建更新后的标签对象 - 使用全新的对象
      const updatedLabel = {
        ...labelToUpdate,
        "SINGLE-SELECT": [...filteredOptions]
      };
      
      // 调用Redux更新标签
      await dispatch(updateLabel({ 
        teamId, 
        label: updatedLabel,
        userId: user?.id,
        entityId: teamId
      })).unwrap();
      
      // 重新加载标签数据
      await dispatch(getLabelByTeamId(teamId)).unwrap();
      
      // 成功提示
      toast.success(t('statusOptionDeleted'));
      
    } catch (error) {
      console.error('删除状态选项失败:', error);
      toast.error(t('deleteStatusFailed'));
    } finally {
      setLoading(false);
    }
  };
  
  // 开始编辑选项
  const startEditOption = (option) => {
    // 确保option是一个新对象
    setEditingOption({...option});
    setIsEditing(true);
    setIsCreating(false);
  };
  
  // 处理选择状态
  const handleSelectOption = (option) => {
    if (!selectionMode || !onSelect || !option) return;
    
    try {
      // 确保创建一个新的对象副本
      const optionCopy = {
        label: String(option.label || ''),
        value: String(option.value || ''),
        color: String(option.color || '#6b7280')
      };
      
      // 调用回调函数
      onSelect(optionCopy);
    } catch (error) {
      console.error('选择状态时出错:', error);
      // 提供一个安全的默认值
      onSelect({
        label: '未命名',
        value: 'unnamed',
        color: '#6b7280'
      });
    }
  };
  
  // 检查选项是否被选中
  const isOptionSelected = (option) => {
    if (!selectedValue || !option) return false;
    
    try {
      // 安全地比较值，处理可能的不同类型
      const selectedValueString = String(selectedValue.value || '');
      const optionValueString = String(option.value || '');
      
      return selectedValueString === optionValueString;
    } catch (e) {
      console.error('比较选项值时出错:', e);
      return false;
    }
  };
  
  // 渲染加载状态
  if (labelStatus === 'loading') {
    return <div className="p-4 text-gray-500 text-center">{t('loading')}</div>;
  }
  
  // 渲染错误状态
  if (labelStatus === 'failed') {
    return (
      <div className="p-4 border rounded">
        <div className="text-red-500 mb-2">{t('loadLabelsFailed')}</div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => dispatch(getLabelByTeamId(teamId))}
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
          <h3 className="font-medium text-sm">{selectionMode ? t('selectStatus') : t('manageStatusOptions')}</h3>
          
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
              {t('addStatus')}
            </Button>
          )}
        </div>
        
        {/* 创建选项表单 */}
        {isCreating && (
          <div className="mb-4 p-3 border rounded-lg bg-background">
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-medium text-sm">{t('addStatus')}</h4>
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
                <label className="block text-sm mb-1 font-medium">{t('statusName')}</label>
                <input
                  type="text"
                  value={newOption.label}
                  onChange={(e) => setNewOption({...newOption, label: e.target.value})}
                  className="w-full p-2 border rounded-md focus:ring-1 focus:outline-none text-sm"
                  placeholder={t('enterStatusName')}
                />
              </div>
              <div>
                <label className="block text-sm mb-1 font-medium">{t('statusColor')}</label>
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
        
        {/* 编辑选项表单 */}
        {isEditing && editingOption && !selectionMode && (
          <div className="mb-4 p-3 border rounded-lg bg-background">
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-medium text-sm">{t('editStatus')}</h4>
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
                <label className="block text-sm mb-1 font-medium">{t('statusName')}</label>
                <input
                  type="text"
                  value={editingOption?.label || ''}
                  onChange={(e) => setEditingOption({...editingOption, label: e.target.value})}
                  className="w-full p-2 border rounded-md focus:ring-1 focus:outline-none text-sm"
                  placeholder={t('enterStatusName')}
                />
              </div>
              <div>
                <label className="block text-sm mb-1 font-medium">{t('statusColor')}</label>
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
                  {t('save')}
                </Button>
              </div>
            </div>
          </div>
        )}
        
        {/* 选项列表 */}
        <div className="grid grid-cols-1 gap-2">
          {statusOptions.length > 0 ? (
            statusOptions.map((option, index) => (
              <div 
                key={`status-option-${index}-${option.value}`}
                className={`flex items-center justify-between p-2 border ${isOptionSelected(option) ? 'border-primary ring-1 ring-primary' : 'border-gray-300 dark:border-gray-700'} rounded-lg transition-all duration-200 ${selectionMode ? 'cursor-pointer hover:bg-accent/10' : ''}`}
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
                    isOptionSelected(option) && (
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
              {t('noStatusOptions')}
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
              {t('addStatus')}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TagLabelManager; 