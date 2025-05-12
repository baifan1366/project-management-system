'use client';

import { useTranslations } from 'next-intl';
import * as Icons from 'lucide-react';
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useState, useEffect, useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { createSelector } from '@reduxjs/toolkit';
import { fetchTeamCustomField, updateTeamCustomFieldOrder, deleteTeamCustomField } from '@/lib/redux/features/teamCFSlice';
import { fetchTeamCustomFieldValue } from '@/lib/redux/features/teamCFValueSlice';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import CustomField from '@/components/team/CustomField';
import { useRouter, useParams } from 'next/navigation';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { useGetUser } from '@/lib/hooks/useGetUser';
import { useConfirm } from "@/hooks/use-confirm";

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

export default function TaskTab({ onViewChange, teamId, projectId, refreshContent }) {
  const t = useTranslations('CreateTask');
  const router = useRouter();
  const params = useParams();
  const { confirm } = useConfirm();
  const { user } = useGetUser();

  // 从 URL 参数中获取当前的 teamCFId
  const currentTeamCFId = params?.teamCFId;
  
  // 修改初始状态，如果 URL 中有 teamCFId 就使用它
  const [activeTab, setActiveTab] = useState(currentTeamCFId || "list");
  const dispatch = useDispatch();
  
  const customFields = useSelector(selectTeamCustomFields);
  const customFieldValues = useSelector(selectTeamCustomFieldValues);
  const [orderedFields, setOrderedFields] = useState([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const dataFetchedRef = useRef(false);

  // 将 fetchData 移到 useEffect 外部，使用 useCallback 来记忆化
  const fetchData = useCallback(async (tid) => {
    if (!tid) return;
    
    try {
      // 先检查Redux状态中是否已经有数据
      const reduxState = customFields || [];
      
      // 如果还没有数据，先进行请求
      if (!Array.isArray(reduxState) || reduxState.length === 0) {
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
      } else {
        // 如果已经有数据，也需要获取对应的值
        await Promise.all(
          reduxState.map(field =>
            dispatch(fetchTeamCustomFieldValue({
              teamId: tid,
              teamCustomFieldId: field.id
            })).unwrap()
          )
        );
      }
      
      // 不管当前状态如何，都要再发送一次请求确保数据最新
      console.log('发送最终请求确保数据最新...');
      const latestFields = await dispatch(fetchTeamCustomField(tid)).unwrap();
      if (Array.isArray(latestFields) && latestFields.length > 0) {
        await Promise.all(
          latestFields.map(field =>
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
  }, [dispatch, customFields]);

  // 监听Redux状态中teamCustomFields是否已加载
  const teamCustomFieldsFromRedux = useSelector(state => state.teams?.teamCustomFields);
  const teamsStatus = useSelector(state => state.teams?.status);
  const isTeamCustomFieldsLoaded = Array.isArray(teamCustomFieldsFromRedux) && teamCustomFieldsFromRedux.length > 0;

  useEffect(() => {
    if (teamId && !dataFetchedRef.current && isTeamCustomFieldsLoaded && teamsStatus === 'succeeded') {
      console.log('ProjectSidebar加载自定义字段完成，TaskTab开始加载...');
      dataFetchedRef.current = true;
      fetchData(teamId);
    }
    
    return () => {
      // 当组件卸载或 teamId 变化时重置状态
      if (!teamId) {
        dataFetchedRef.current = false;
      }
    };
  }, [teamId, fetchData, isTeamCustomFieldsLoaded, teamsStatus]);

  // 合并处理 customFields 和 URL 参数的 useEffect
  useEffect(() => {
    if (Array.isArray(customFields) && customFields.length > 0) {
      // 按order_index排序
      const sortedFields = [...customFields].sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
      setOrderedFields(sortedFields);
      
      if (currentTeamCFId) {
        // 如果 URL 中有 teamCFId，使用它
        if (currentTeamCFId !== activeTab) {
          setActiveTab(currentTeamCFId);
          onViewChange?.(currentTeamCFId);
        }
      } else {
        // 没有 teamCFId 时设置默认标签页
        const firstTabValue = `${sortedFields[0].id}`;
        setActiveTab(firstTabValue);
        onViewChange?.(firstTabValue);
        router.push(`/projects/${projectId}/${teamId}/${firstTabValue}`);
      }
    }
  }, [customFields, currentTeamCFId, activeTab, onViewChange, projectId, teamId, router]);

  const handleTabChange = (value) => {
    setActiveTab(value);
    onViewChange?.(value);
    // 使用 replace 而不是 push 来避免在历史记录中创建过多条目
    router.replace(`/projects/${projectId}/${teamId}/${value}`);
  };

  // 删除标签页功能
  const handleDeleteTab = (fieldId) => {
    confirm({
      title: t('deleteTabTitle'),
      description: t('deleteTabConfirm'),
      variant: "error",
      onConfirm: () => {
        // 从排序列表中移除该字段
        const newOrderedFields = orderedFields.filter(field => field.id !== fieldId);
        setOrderedFields(newOrderedFields);
        
        // 如果删除的是当前激活的标签页，则切换到第一个标签页
        if (activeTab === `${fieldId}` && newOrderedFields.length > 0) {
          const firstTabValue = `${newOrderedFields[0].id}`;
          setActiveTab(firstTabValue);
          onViewChange?.(firstTabValue);
          router.replace(`/projects/${projectId}/${teamId}/${firstTabValue}`);
        }
        
        // 从useGetUser获取当前用户ID
        const userId = user?.id;
        
        if (userId && teamId) {
          // 调用API删除数据库中的记录
          dispatch(deleteTeamCustomField({ 
            teamId, 
            teamCustomFieldId: fieldId,
            userId // 传递userId用于日志记录
          }));
          
          console.log(`删除标签页: ${fieldId}, 由用户: ${userId}`);
        } else {
          console.error('删除标签页失败: 缺少用户ID或团队ID');
        }
      }
    });
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
    
    // 在控制台显示加载信息
    console.log('正在更新标签页顺序，页面将在更新完成后刷新...');
    
    // 调用Redux action保存到服务器
    dispatch(updateTeamCustomFieldOrder({
      teamId: teamId, // 确保您有teamId变量
      orderedFields: newOrderedFields
    })).then(() => {
      console.log('标签页顺序更新成功，正在刷新组件...');
      
      // 使用父组件提供的 refreshContent 函数刷新组件
      if (typeof refreshContent === 'function') {
        console.log('调用 refreshContent 函数刷新 TaskTab 和 customFieldContent...');
        
        // 正确处理异步函数调用
        Promise.resolve().then(async () => {
          try {
            await refreshContent();
            console.log('refreshContent 调用成功');
          } catch (error) {
            console.error('调用 refreshContent 函数时出错:', error);
            console.log('尝试使用备选方案...');
            
            // 如果 refreshContent 调用失败，使用备选方案
            setTimeout(() => {
              console.log('使用备选方案刷新页面...');
              window.location.reload();
            }, 100);
          }
        });
      } else {
        // 如果没有提供 refreshContent，则使用备选方案
        console.log('未提供 refreshContent 函数，使用备选方案...');
        
        // 从 params 中获取 locale，默认为 'en'
        const locale = params?.locale || 'en';
        
        // 构建当前完整 URL
        const currentTab = activeTab || (orderedFields.length > 0 ? `${orderedFields[0].id}` : '');
        const fullUrl = `${window.location.origin}/${locale}/projects/${projectId}/${teamId}/${currentTab}`;
        
        console.log(`强制刷新页面到: ${fullUrl}`);
        
        // 直接设置 window.location.href 强制完全刷新
        window.location.href = fullUrl;
      }
    }).catch(error => {
      console.error('更新标签页顺序失败:', error);
      // 如果更新失败，尝试刷新页面
      setTimeout(() => {
        console.log('更新失败，刷新页面...');
        window.location.reload();
      }, 100);
    });
  };

  // 添加一个函数检查当前用户是否为团队所有者
  const isCurrentUserOwner = () => {
    const teamUsers = useSelector(state => state.teamUsers.teamUsers[teamId] || []);
    if (!teamUsers || !user?.id) return false;
    const currentUserTeamMember = teamUsers.find(tu => String(tu.user.id) === String(user.id));
    return currentUserTeamMember?.role === 'OWNER';
  };

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full shadow-sm rounded-md bg-background">
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="tabs" direction="horizontal">
          {(provided) => (
            <TabsList 
              className="border-b-0 w-full flex-wrap overflow-x-auto min-h-10 max-h-16 p-1 gap-1 items-center" 
              ref={provided.innerRef}
              {...provided.droppableProps}
            >
              {Array.isArray(orderedFields) && orderedFields.map((field, index) => {
                const fieldValue = customFieldValues[field.id]?.data?.[0];
                
                return (
                  <Draggable key={field.id} draggableId={`field-${field.id}`} index={index}>
                    {(provided) => (
                      <ContextMenu>
                        <ContextMenuTrigger>
                          <TabsTrigger 
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            value={`${field.id}`}
                            className="flex items-center gap-1 hover:text-accent-foreground whitespace-nowrap h-8 px-3"
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
                        </ContextMenuTrigger>
                        <ContextMenuContent>
                          {isCurrentUserOwner() ? (
                            <>
                              <ContextMenuItem>
                                <Icons.Pen className="mr-2 h-4 w-4 text-gray-800 hover:text-black" />
                                <span className="text-gray-800 hover:text-black">{t('edit')}</span>
                              </ContextMenuItem>
                              <ContextMenuItem onClick={() => handleDeleteTab(field.id)} className="text-red-500 hover:text-red-600">
                                <Icons.Trash className="mr-2 h-4 w-4 text-red-500 hover:text-red-600" />
                                <span className="text-red-500 hover:text-red-600">{t('delete')}</span>
                              </ContextMenuItem>
                            </>
                          ) : (
                            <>
                              <div className="flex items-center px-3 py-2 text-sm cursor-not-allowed">
                                <Icons.Pen className="mr-2 h-4 w-4 text-gray-800" />
                                <span className="text-gray-800">{t('edit')}</span>
                              </div>
                              <div className="flex items-center px-3 py-2 text-sm cursor-not-allowed">
                                <Icons.Trash className="mr-2 h-4 w-4 text-red-500" />
                                <span className="text-red-500">{t('delete')}</span>
                              </div>
                            </>
                          )}
                        </ContextMenuContent>
                      </ContextMenu>
                    )}
                  </Draggable>
                );
              })}
              {provided.placeholder}
              <Button 
                variant="ghost" 
                size="icon" 
                className="ml-1 flex-shrink-0 hover:bg-accent hover:text-accent-foreground h-8 w-8"
                onClick={() => setIsDialogOpen(true)}
              >
                <Icons.Plus className="h-4 w-4" />
              </Button>
              <CustomField 
                key="custom-field-dialog"
                isDialogOpen={isDialogOpen} 
                setIsDialogOpen={setIsDialogOpen} 
                teamId={teamId} 
              />
            </TabsList>
          )}
        </Droppable>
      </DragDropContext>
    </Tabs>
  );
}


