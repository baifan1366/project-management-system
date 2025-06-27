import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useDispatch, useSelector } from 'react-redux';
import { Button } from '@/components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import TagLabelManager from './TagLabelManager';
import { extractSingleSelectOptions } from '@/components/team/list/tagUtils';
import { getLabelByTeamId } from '@/lib/redux/features/teamLabelSlice';
import { toast } from 'sonner';
import { Plus, X } from 'lucide-react';
import { getContrastColor, getStatusColor } from './colorUtils';

/**
 * 状态选择按钮组件
 * 用于在任务编辑或显示界面中选择自定义状态
 * 集成了TagLabelManager进行状态管理
 * 
 * @param {Object} props
 * @param {string} props.teamId - 团队ID
 * @param {Object|string} props.value - 当前选中的状态值
 * @param {Function} props.onChange - 状态变更回调函数
 * @param {string} props.variant - 按钮变体
 * @param {string} props.size - 按钮大小
 */
const StatusSelectButton = ({
  teamId,
  value,
  onChange,
  variant = "outline",
  size = "sm"
}) => {
  const t = useTranslations('Agile');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState(null);
  
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
            setSelectedStatus({
              label: value,
              value: String(value),
              color: getStatusColor(String(value))
            });
          }
        } catch (e) {
          // 如果无法解析，使用默认标签
          setSelectedStatus({
            label: value,
            value: String(value),
            color: getStatusColor(String(value))
          });
        }
      }
    } catch (error) {
      console.error('处理状态时出错:', error);
      // 如果出错，设置为null防止级联错误
      setSelectedStatus(null);
    }
  }, [value]);
  
  // 处理选择状态
  const handleSelectStatus = (status) => {
    try {
      // 确保我们创建一个新的状态副本
      const statusCopy = status ? {...status} : null;
      setSelectedStatus(statusCopy);
      setIsOpen(false);
      
      if (onChange) {
        if (statusCopy) {
          // 只传递value属性，而不是整个对象
          onChange(statusCopy.value || 'todo');
        } else {
          onChange('todo');
        }
      }
    } catch (error) {
      console.error('处理状态选择时出错:', error);
      // 如果出错，传递一个默认值
      setSelectedStatus(null);
      if (onChange) onChange('todo');
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
          className="flex items-center gap-2"
          style={{ 
            backgroundColor: selectedStatus.color || getStatusColor('todo'),
            color: getContrastColor(selectedStatus.color || getStatusColor('todo'))
          }}
        >
          <span 
            className="w-2 h-2 rounded-full" 
            style={{ backgroundColor: 'currentColor' }}
          ></span>
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
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setIsOpen(true)}
        className="min-w-[100px]"
      >
        {renderStatusBadge()}
      </Button>
      
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('selectStatus')}</DialogTitle>
            <DialogDescription>
              {t('selectStatusDescription')}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <TagLabelManager
              teamId={teamId}
              selectionMode={true}
              // 确保selectedValue值是对象或null，避免传递不正确的值类型
              selectedValue={selectedStatus}
              onSelect={handleSelectStatus}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default StatusSelectButton; 