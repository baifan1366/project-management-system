'use client';

import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useDispatch, useSelector } from 'react-redux';
import { fetchCustomFields } from '@/lib/redux/features/customFieldSlice';
import { createTeamCustomField } from '@/lib/redux/features/teamCFSlice';
import * as Icons from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogHeader, DialogDescription } from "@/components/ui/dialog";
import { fetchTeamCustomField } from '@/lib/redux/features/teamCFSlice';
import { supabase } from '@/lib/supabase';

export default function CustomField({ isDialogOpen, setIsDialogOpen, teamId }) {
  const t = useTranslations('CreateTask');
  const dispatch = useDispatch();
  const dataFetchedRef = useRef(false);
  
  // 从 Redux store 获取自定义字段模板
  const availableFields = useSelector(state => state.customFields?.fields || []);
  const customFieldStatus = useSelector(state => state.customFields?.status || 'idle');
  
  // 获取可用的自定义字段模板
  useEffect(() => {
    // 仅在对话框打开且数据未加载且未请求过时获取数据
    if (isDialogOpen && !dataFetchedRef.current && 
        (customFieldStatus === 'idle' || 
         (availableFields.length === 0 && customFieldStatus !== 'loading'))) {
      // 设置标记，避免重复请求
      dataFetchedRef.current = true;
      console.log('正在获取自定义字段模板...');
      dispatch(fetchCustomFields());
    }
    
    // 当对话框关闭时，不要立即重置ref，而是在下次打开前重置
    return () => {
      if (!isDialogOpen) {
        dataFetchedRef.current = false;
      }
    };
  }, [isDialogOpen, customFieldStatus, availableFields.length, dispatch]);

  // 处理字段点击事件
  const handleFieldClick = async (field) => {
    // 创建团队自定义字段
    const { data: userData, error: userError } = await supabase.auth.getUser();
    const userId = userData?.user?.id;
    try {
      // 先关闭对话框，避免重复触发
      setIsDialogOpen(false);
      
      dispatch(createTeamCustomField({
        team_id: teamId,
        custom_field_id: field.id,
        order_index: 100,
        created_by: userId
      }))
      .then((result) => {
        console.log('自定义字段创建成功:', result);
        
        // 如果创建成功，触发重新获取团队自定义字段，确保 TaskTab 能够更新
        if (createTeamCustomField.fulfilled.match(result)) {
          dispatch(fetchTeamCustomField(teamId));
        }
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
    return Icons.Ban;
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
      {isDialogOpen && (
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
      )}
    </Dialog>
  );
}