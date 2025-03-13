'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useDispatch, useSelector } from 'react-redux';
import { fetchCustomFields } from '@/lib/redux/features/customFieldSlice';
import { createTeamCustomField } from '@/lib/redux/features/teamCFSlice';
import * as Icons from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogHeader, DialogDescription } from "@/components/ui/dialog";
import { fetchTeamCustomField } from '@/lib/redux/features/teamCFSlice';
import { shallowEqual } from 'react-redux';

export default function CustomField({ isDialogOpen, setIsDialogOpen, teamId }) {
  const t = useTranslations('CreateTask');
  const dispatch = useDispatch();
  
  // 从 Redux store 获取自定义字段模板 - 修正路径
  const availableFields = useSelector(state => state.customFields?.fields || []);
  
  // 使用 shallowEqual 作为相等性函数
  const teamCustomFields = useSelector(
    state => {
      const allFields = state.teamCustomFields?.fields || [];
      return allFields.filter(f => f.team_id === teamId);
    },
    shallowEqual
  );
  
  // 获取可用的自定义字段模板
  useEffect(() => {
    // 确保获取所有字段
    dispatch(fetchCustomFields());
  }, [dispatch]);

  // 处理字段点击事件
  const handleFieldClick = (field) => {
    // 创建团队自定义字段
    try {
      dispatch(createTeamCustomField({
        team_id: teamId,
        custom_field_id: field.id,
        order_index: 100
      }))
      .then((result) => {
        console.log('自定义字段创建成功:', result);
        // 关闭对话框
        setIsDialogOpen(false);
        
        // 触发重新获取团队自定义字段，确保 TaskTab 能够更新
        dispatch(fetchTeamCustomField(teamId));
      })
      .catch((error) => {
        console.error('创建自定义字段失败:', error);
        // 这里可以添加错误处理逻辑，比如显示错误提示
      });
    } catch (error) {
      console.error('调度 createTeamCustomField 时出错:', error);
    }
  };

  // 简化的图标获取函数
  const getIconComponent = (iconName) => {
    // 尝试直接从 Icons 对象获取组件
    if (iconName && Icons[iconName]) {
      return Icons[iconName];
    }    
    // 默认图标
    return Icons.File;
  };

  // 渲染单个字段项
  const renderFieldItem = (field) => {    
    // 获取对应的图标组件
    const IconComponent = getIconComponent(field.icon);
    
    return (
      <div 
        key={field.id || field.type}
        className="flex items-start gap-3 p-3 border rounded-md cursor-pointer hover:bg-accent"
        onClick={() => handleFieldClick(field)}
      >
        <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
          <IconComponent className="h-5 w-5 text-blue-600" />
        </div>
        <div>
          <div className="font-medium">{field.name}</div>
          <div className="text-xs text-muted-foreground">{field.description || t(`${field.name.toLowerCase()}_description`)}</div>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogContent 
        className="sm:max-w-[500px] p-0"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <div className="p-4 border-b">
            <DialogHeader>
                <DialogTitle>{t('add_view')}</DialogTitle>
                <DialogDescription className="sr-only">
                    {t('select_view_type')}
                </DialogDescription>
            </DialogHeader>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-2 gap-4">
            {Array.isArray(availableFields) && availableFields.length > 0 ? (
              availableFields.map(renderFieldItem)
            ) : (
              <div className="col-span-2 text-center py-4 text-muted-foreground">
                {t('no_available_fields')}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}