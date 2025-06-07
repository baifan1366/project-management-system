'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useDispatch, useSelector } from 'react-redux';
import { fetchCustomFields } from '@/lib/redux/features/customFieldSlice';
import { createTeamCustomField } from '@/lib/redux/features/teamCFSlice';
import * as Icons from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogHeader, DialogDescription } from "@/components/ui/dialog";
import { fetchTeamCustomField } from '@/lib/redux/features/teamCFSlice';
import { updateTagIds, getTags } from '@/lib/redux/features/teamCFSlice';
import { supabase } from '@/lib/supabase';
import { useGetUser } from '@/lib/hooks/useGetUser';
import { fetchCurrentUser } from '@/lib/redux/features/usersSlice';
import { createSelector } from '@reduxjs/toolkit';

// 从Redux获取原始状态
const getUsersSubscription = state => state.users?.subscription;
const getCustomFields = state => state.customFields?.fields;
const getCustomFieldStatus = state => state.customFields?.status;

// 创建记忆化的选择器
const selectSubscription = createSelector(
  [getUsersSubscription],
  (subscription) => {
    // 进行实际的数据转换，而不是简单地返回输入
    return {
      ...subscription,
      isValid: !!subscription && typeof subscription === 'object',
      plan_id: subscription?.plan_id || null
    };
  }
);

const selectAvailableFields = createSelector(
  [getCustomFields],
  (fields) => {
    // 对字段进行处理，例如添加额外的属性或过滤
    return (fields || []).map(field => ({
      ...field,
      isActive: true
    }));
  }
);

const selectCustomFieldStatus = createSelector(
  [getCustomFieldStatus],
  (status) => {
    // 将状态转换为具体的应用状态
    const normalizedStatus = status || 'idle';
    return {
      value: normalizedStatus,
      isLoading: normalizedStatus === 'loading',
      isError: normalizedStatus === 'failed',
      isSuccess: normalizedStatus === 'succeeded'
    };
  }
);

export default function CustomField({ isDialogOpen, setIsDialogOpen, teamId }) {
  const t = useTranslations('CreateTask');
  const dispatch = useDispatch();
  const dataFetchedRef = useRef(false);
  const { user } = useGetUser();

  // 使用记忆化的选择器
  const availableFields = useSelector(selectAvailableFields);
  const fieldStatus = useSelector(selectCustomFieldStatus);
  const customFieldStatus = fieldStatus.value;
  
  // 使用记忆化的订阅选择器
  const subscriptionData = useSelector(selectSubscription);
  const planId = subscriptionData.plan_id;
  
  // 使用useEffect获取最新的用户数据
  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        const result = await dispatch(fetchCurrentUser()).unwrap();
      } catch (error) {
        console.error('获取用户数据失败:', error);
      }
    };
    
    loadCurrentUser();
  }, [dispatch]);
  
  // 存储计划类型的状态
  const [planType, setPlanType] = useState('FREE'); // 默认为FREE
  
  useEffect(() => {
    // 组件加载时获取计划类型
    const getPlanType = async () => {
      try {
        const type = await fetchPlanType();
        setPlanType(type);
      } catch (error) {
        console.error('获取计划类型失败:', error);
        setPlanType('FREE'); // 出错时默认为FREE
      }
    };
    
    getPlanType();
  }, [planId]); // 当planId变化时重新获取
  
  const fetchPlanType = async () => {
    // 如果没有planId，默认返回FREE
    if (!planId) {
      return 'FREE';
    }
    
    try {
      const {data: plan, error: planError} = await supabase
        .from('subscription_plan')
        .select('*')
        .eq('id', planId)
        .single();
      
      if (planError) {
        console.error('获取计划类型出错:', planError);
        return 'FREE'; // 出错时返回默认值
      }
      
      if (!plan) {
        return 'FREE';
      }
      
      return plan.type || 'FREE';
    } catch (error) {
      console.error('计划类型查询异常:', error);
      return 'FREE';
    }
  }

  // 获取可用的自定义字段模板
  useEffect(() => {
    // 仅在对话框打开且数据未加载且未请求过时获取数据
    if (isDialogOpen && !dataFetchedRef.current && 
        (customFieldStatus === 'idle' || 
         (availableFields.length === 0 && customFieldStatus !== 'loading'))) {
      // 设置标记，避免重复请求
      dataFetchedRef.current = true;
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
    // 移除我们在选择器中添加的isActive属性（如果存在）
    const fieldData = {...field};
    if ('isActive' in fieldData) {
      delete fieldData.isActive;
    }
    
    // 创建团队自定义字段
    const userId = user?.id;
    
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
        custom_field_id: fieldData.id,
        order_index: maxOrderIndex,
        created_by: userId
      })).unwrap();
            
      // 触发重新获取团队自定义字段，确保 TaskTab 能够更新
      dispatch(fetchTeamCustomField(teamId));
      
      // 检查当前字段是否为LIST类型
      // 注意：这里假设availableFields中已经包含了所有字段类型
      const listCustomField = availableFields.find(f => 
        f.name?.toUpperCase().includes('LIST') || 
        f.type?.toUpperCase() === 'LIST'
      );
      
      // 如果当前添加的字段是LIST类型，自动添加默认标签
      if (listCustomField && fieldData.id === listCustomField.id) {
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
    
    // 判断字段是否可用
    let isAvailable = false;
    if(planType === 'FREE'){
      isAvailable = field.type === 'OVERVIEW' || field.type === 'LIST' || field.type === 'CALENDAR' || field.type === 'POSTS' || field.type === 'FILES';
    } else if(planType === 'PRO'){
      isAvailable = field.type === 'OVERVIEW' || field.type === 'LIST' || field.type === 'CALENDAR' || field.type === 'POSTS' || field.type === 'FILES' || field.type === 'TIMELINE' || field.type === 'NOTE' || field.type === 'KANBAN';
    } else if(planType === 'ENTERPRISE'){
      isAvailable = true;
    }

    return (
      <div 
        key={field.id || field.type}
        className={`flex items-start gap-3 p-3 border rounded-md ${isAvailable ? 'cursor-pointer hover:bg-accent' : 'opacity-60 cursor-not-allowed'}`}
        onClick={() => isAvailable && handleFieldClick(field)}
        data-available={isAvailable ? 'true' : 'false'} // 用于排序
      >
        <div className={`flex-shrink-0 w-8 h-8 rounded flex items-center justify-center ${isAvailable ? 'bg-blue-100' : 'bg-gray-100'}`}>
          <IconComponent className={`h-5 w-5 ${isAvailable ? 'text-blue-600' : 'text-gray-400'}`} />
        </div>
        <div>
          <div className="font-medium">{field.name}</div>
          <div className="text-xs text-muted-foreground">{field.description || t(`${field.name.toLowerCase()}_description`)}</div>
          {!isAvailable && <div className="text-xs text-amber-500 mt-1">{t('upgrade_plan_required')}</div>}
        </div>
      </div>
    );
  };

  // 排序字段，将可用的放在前面
  const sortFields = (fields) => {
    if (!Array.isArray(fields)) return [];
    return [...fields].sort((a, b) => {
      const aIsAvailable = planType === 'FREE' 
        ? (a.type === 'CALENDAR' || a.type === 'POSTS' || a.type === 'FILES')
        : planType === 'PRO'
          ? (a.type === 'TIMELINE' || a.type === 'NOTE' || a.type === 'KANBAN')
          : true;
      
      const bIsAvailable = planType === 'FREE'
        ? (b.type === 'CALENDAR' || b.type === 'POSTS' || b.type === 'FILES')
        : planType === 'PRO'
          ? (b.type === 'TIMELINE' || b.type === 'NOTE' || b.type === 'KANBAN')
          : true;
      
      if (aIsAvailable && !bIsAvailable) return -1;
      if (!aIsAvailable && bIsAvailable) return 1;
      return 0;
    });
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      {isDialogOpen && (
        <DialogContent 
          className="sm:max-w-[1000px] p-0"
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
          <div className="px-4 pb-4">
            <div className="grid grid-cols-3 gap-4">
              {Array.isArray(availableFields) && availableFields.length > 0 ? (
                sortFields(availableFields).map(renderFieldItem)
              ) : (
                <div className="text-center text-muted-foreground col-span-3 items-center justify-center">
                  {t('loading')}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      )}
    </Dialog>
  );
}