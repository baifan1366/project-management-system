'use client';

import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useDispatch, useSelector } from 'react-redux';
import { fetchCustomFields } from '@/lib/redux/features/customFieldSlice';
import { createTeamCustomField } from '@/lib/redux/features/teamCFSlice';
import * as Icons from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogHeader, DialogDescription } from "@/components/ui/dialog";
import { fetchTeamCustomField } from '@/lib/redux/features/teamCFSlice';
import { updateTagIds, getTags } from '@/lib/redux/features/teamCFSlice';
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
      
      // 获取当前团队所有自定义字段来确定最大的order_index
      const teamFields = await dispatch(fetchTeamCustomField(teamId)).unwrap();
      const maxOrderIndex = teamFields && teamFields.length > 0
        ? Math.max(...teamFields.map(field => field.order_index || 0)) + 1
        : 0;
      
      // 创建团队自定义字段
      const teamCF = await dispatch(createTeamCustomField({
        team_id: teamId,
        custom_field_id: field.id,
        order_index: maxOrderIndex,
        created_by: userId
      })).unwrap();
      
      console.log('自定义字段创建成功:', teamCF);
      
      // 触发重新获取团队自定义字段，确保 TaskTab 能够更新
      dispatch(fetchTeamCustomField(teamId));
      
      // 检查当前字段是否为LIST类型
      // 注意：这里假设availableFields中已经包含了所有字段类型
      const listCustomField = availableFields.find(f => 
        f.name?.toUpperCase().includes('LIST') || 
        f.type?.toUpperCase() === 'LIST'
      );
      
      // 如果当前添加的字段是LIST类型，自动添加默认标签
      if (listCustomField && field.id === listCustomField.id) {
        try {
          // 获取所有可用的标签
          const {data: defaultTags, error: tagError} = await supabase
            .from('tag')
            .select('*')
            .order('id');
          
          if (tagError) {
            console.error('获取默认标签失败:', tagError);
            throw tagError;
          }
          
          // 获取默认标签数量设置
          const {data: defaultTagSettings, error: defaultTagError} = await supabase
            .from('default')
            .select('*')
            .eq('name', 'tag')
            .single();
            
          if (defaultTagError && defaultTagError.code !== 'PGRST116') {
            console.error('获取默认设置失败:', defaultTagError);
          }
          
          // 设置要添加的默认标签数量
          const defaultTagCount = defaultTagSettings?.qty || 2;
          
          // 获取字段现有标签
          const existingTagsResponse = await dispatch(getTags({
            teamId: teamId, 
            teamCFId: teamCF.id
          })).unwrap();
          
          const existingTagIds = existingTagsResponse.tag_ids || [];
          
          // 将默认标签添加到现有标签中
          const defaultTagIdsToAdd = defaultTags
            .slice(0, defaultTagCount)
            .map(tag => tag.id);
          
          const updatedTagIds = [...existingTagIds, ...defaultTagIdsToAdd];
          
          // 更新标签关联
          await dispatch(updateTagIds({
            teamId: teamId,
            teamCFId: teamCF.id,
            tagIds: updatedTagIds,
            userId: userId
          })).unwrap();
          
          console.log('默认标签添加完成');
        } catch (error) {
          console.error('添加默认标签失败:', error);
        }
      }
    } catch (error) {
      console.error('创建自定义字段失败:', error);
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