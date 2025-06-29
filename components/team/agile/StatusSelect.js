import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useDispatch, useSelector } from 'react-redux';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { getLabelByTeamId, updateLabel } from '@/lib/redux/features/teamLabelSlice';
import { extractSingleSelectOptions } from '@/components/team/list/tagUtils';
import useGetUser from '@/lib/hooks/useGetUser';
import { getContrastColor } from './colorUtils';

/**
 * 状态选择组件 - 用于SprintBoard内部
 */
const StatusSelect = ({ teamId, value, onChange }) => {
  const t = useTranslations('Agile');
  const dispatch = useDispatch();
  const { user } = useGetUser();
  const [isCreating, setIsCreating] = useState(false);
  const [statusOptions, setStatusOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState(null);
  const [newOption, setNewOption] = useState({
    label: '',
    color: '#10b981',
    value: ''
  });
  
  // 从Redux获取标签数据
  const { label: teamLabel, status: labelStatus } = useSelector(state => {
    return state.teamLabels || {};
  });
  
  // 初始化选中状态
  useEffect(() => {
    if (!value) {
      setSelectedStatus(null);
      return;
    }
    
    try {
      // 确保我们有一个干净的状态对象
      if (typeof value === 'object' && value !== null) {
        // 创建对象的安全副本
        setSelectedStatus({...value});
      } else if (typeof value === 'string') {
        // 尝试解析JSON字符串
        try {
          const parsedValue = JSON.parse(value);
          if (typeof parsedValue === 'object' && parsedValue !== null) {
            setSelectedStatus({...parsedValue});
          } else {
            // 如果解析的不是对象，创建新的状态对象
            const defaultOption = statusOptions.find(opt => opt.value === value);
            if (defaultOption) {
              setSelectedStatus({...defaultOption});
            } else {
              setSelectedStatus({
                label: value,
                value: String(value),
                color: '#6b7280'
              });
            }
          }
        } catch (e) {
          // 如果无法解析，检查是否与已有选项匹配
          const defaultOption = statusOptions.find(opt => opt.value === value);
          if (defaultOption) {
            setSelectedStatus({...defaultOption});
          } else {
            setSelectedStatus({
              label: value,
              value: String(value),
              color: '#6b7280'
            });
          }
        }
      }
    } catch (error) {
      console.error('处理状态时出错:', error);
      setSelectedStatus(null);
    }
  }, [value, statusOptions]);
  
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
      
      // 准备标签数据
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
      
      // 添加新选项
      const optionJson = JSON.stringify(optionToCreate);
      singleSelectArray.push(optionJson);
      
      // 更新标签对象
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
      
      // 选择新创建的选项
      onChange(optionToCreate.value);
      
    } catch (error) {
      console.error('创建状态选项失败:', error);
      toast.error(t('createStatusFailed'));
    } finally {
      setLoading(false);
    }
  };
  
  // 处理选择状态
  const handleSelectStatus = (statusValue) => {
    const status = statusOptions.find(opt => opt.value === statusValue);
    if (status) {
      setSelectedStatus(status);
      if (onChange) {
        onChange(status.value);
      }
    } else if (statusValue === 'create_new') {
      setIsCreating(true);
    } else {
      if (onChange) {
        onChange(statusValue);
      }
    }
  };
  
  // 渲染状态标签
  const renderStatusBadge = () => {
    if (!selectedStatus) {
      return (
        <Badge variant="outline">
          {t('selectStatus')}
        </Badge>
      );
    }
    
    try {
      return (
        <Badge 
          className="flex items-center gap-2 w-full"
          style={{ 
            backgroundColor: selectedStatus.color || '#6b7280',
            color: getContrastColor(selectedStatus.color || '#6b7280')
          }}
        >
          {selectedStatus.label || t('selectStatus')}
        </Badge>
      );
    } catch (error) {
      console.error('渲染状态标签时出错:', error);
      return (
        <Badge variant="outline">
          {t('selectStatus')}
        </Badge>
      );
    }
  };
  
  return (
    <div className="relative">
      <Select value={value} onValueChange={handleSelectStatus}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder={t('selectStatus')}>
            {renderStatusBadge()}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {statusOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: option.color || '#6b7280' }}
                ></div>
                <span>{option.label}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      {isCreating && (
        <Popover open={isCreating} onOpenChange={setIsCreating}>
          <PopoverContent className="w-80" side="right" align="start">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
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
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
};

export default StatusSelect; 