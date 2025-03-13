'use client';

import { useTranslations } from 'next-intl';
import * as Icons from 'lucide-react';
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { createSelector } from '@reduxjs/toolkit';
import { fetchTeamCustomField, updateTeamCustomFieldOrder } from '@/lib/redux/features/teamCFSlice';
import { fetchTeamCustomFieldValue } from '@/lib/redux/features/teamCFValueSlice';
import { debounce } from 'lodash';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import CustomField from '@/components/CustomField';

// 修复记忆化的 selectors - 确保返回新的引用
const selectTeamCFItems = state => state?.teamCF?.items ?? [];
const selectTeamCustomFields = createSelector(
  [selectTeamCFItems],
  (items) => {
    // 返回一个新的数组，而不是直接返回输入
    return [...items];
  }
);

// 修复新的selector - 确保返回新的引用
const selectTeamCFValueItems = state => state?.teamCustomFieldValues?.items ?? {};
const selectTeamCustomFieldValues = createSelector(
  [selectTeamCFValueItems],
  (items) => {
    // 返回一个新的对象，而不是直接返回输入
    return {...items};
  }
);

export default function TaskTab({ onViewChange, teamId }) {
  const t = useTranslations('CreateTask');
  const [activeTab, setActiveTab] = useState("list");
  const dispatch = useDispatch();
  
  const customFields = useSelector(selectTeamCustomFields);
  const customFieldValues = useSelector(selectTeamCustomFieldValues);
  const [orderedFields, setOrderedFields] = useState([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // 将 fetchData 移到 useEffect 外部，使用 useCallback 来记忆化
  const fetchData = useMemo(
    () =>
      debounce(async (tid) => {
        if (!tid) return;
        
        try {
          const fields = await dispatch(fetchTeamCustomField(tid)).unwrap();
          // 添加数据验证
          if (Array.isArray(fields) && fields.length > 0) {
            await Promise.all(
              fields.map(field =>
                dispatch(fetchTeamCustomFieldValue({
                  teamId: tid,
                  teamCustomFieldId: field.id
                })).unwrap()
              )
            );
          }
        } catch (error) {
          console.error('Error fetching data:', error);
          // 可以在这里添加错误处理逻辑，比如显示错误提示
        }
      }, 500),
    [dispatch]
  );

  useEffect(() => {
    if (teamId) {
      fetchData(teamId);
    }
    return () => {
      fetchData.cancel();
    };
  }, [teamId, fetchData]);

  useEffect(() => {
    if (Array.isArray(customFields) && customFields.length > 0) {
      setOrderedFields([...customFields]);
      
      // 自动选择第一个自定义字段作为默认标签页
      if (customFields.length > 0) {
        const firstTabValue = `cf-${customFields[0].id}`;
        setActiveTab(firstTabValue);
        onViewChange?.(firstTabValue);
      }
    }
  }, [customFields, activeTab, onViewChange]);

  const handleTabChange = (value) => {
    setActiveTab(value);
    onViewChange?.(value);
  };

  const onDragEnd = (result) => {
    const { destination, source } = result;

    // 如果没有目标位置或者拖拽到相同位置，则不做任何操作
    if (!destination || 
        (destination.droppableId === source.droppableId && 
         destination.index === source.index)) {
      return;
    }

    const newOrderedFields = Array.from(orderedFields);
    const [removed] = newOrderedFields.splice(source.index, 1);
    newOrderedFields.splice(destination.index, 0, removed);

    // 更新本地状态
    setOrderedFields(newOrderedFields);
    
    // 调用Redux action保存到服务器
    dispatch(updateTeamCustomFieldOrder({
      teamId: teamId, // 确保您有teamId变量
      orderedFields: newOrderedFields
    }));
  };

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange}>
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="tabs" direction="horizontal">
          {(provided) => (
            <TabsList 
              className="border-b-0" 
              ref={provided.innerRef}
              {...provided.droppableProps}
            >
              {Array.isArray(orderedFields) && orderedFields.map((field, index) => {
                const fieldValue = customFieldValues[field.id]?.data?.[0];
                
                return (
                  <Draggable key={field.id} draggableId={`field-${field.id}`} index={index}>
                    {(provided) => (
                      <TabsTrigger 
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        value={`cf-${field.id}`}
                        className="flex items-center gap-1"
                        title={fieldValue?.value || field.custom_field?.default_value || ''}
                      >
                        {(() => {
                          let iconName = field.custom_field?.icon;
                          const IconComponent = iconName ? Icons[iconName] : null;
                          return IconComponent ? <IconComponent className="h-4 w-4" /> : null;
                        })()}
                        
                        {fieldValue?.name ? 
                          fieldValue.name :
                          (field.custom_field ? t(field.custom_field.name.toLowerCase()) : '')
                        }
                      </TabsTrigger>
                    )}
                  </Draggable>
                );
              })}
              {provided.placeholder}
              <Button 
                variant="ghost" 
                size="icon" 
                className="ml-1 hover:bg-accent hover:text-accent-foreground"
                onClick={() => setIsDialogOpen(true)}
              >
                <Icons.Plus className="h-4 w-4" />
              </Button>
              <CustomField isDialogOpen={isDialogOpen} setIsDialogOpen={setIsDialogOpen} teamId={teamId} />
            </TabsList>
          )}
        </Droppable>
      </DragDropContext>
    </Tabs>
  );
}

