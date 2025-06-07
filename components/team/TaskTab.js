'use client';

import { useTranslations } from 'next-intl';
import * as Icons from 'lucide-react';
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useState, useEffect, useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { createSelector } from '@reduxjs/toolkit';
import { fetchTeamCustomField, updateTeamCustomFieldOrder, deleteTeamCustomField } from '@/lib/redux/features/teamCFSlice';
import { fetchTeamCustomFieldValue, createTeamCustomFieldValue, updateTeamCustomFieldValue } from '@/lib/redux/features/teamCFValueSlice';
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
import { fetchDefaultByName } from '@/lib/redux/features/defaultSlice';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Input
} from "@/components/ui/input"
import { useForm } from "react-hook-form";
import { store } from '@/lib/redux/store';

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

// 添加新的selector来获取default设置
const selectDefaultSettings = state => state?.defaults?.data || [];

export default function TaskTab({ onViewChange, teamId, projectId, handleRefreshContent }) {
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
  const defaultSettings = useSelector(selectDefaultSettings);
  const [orderedFields, setOrderedFields] = useState([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const dataFetchedRef = useRef(false);
  const [protectedTabCount, setProtectedTabCount] = useState(2); // 默认保护2个标签页
  const [sortedFieldsByCreation, setSortedFieldsByCreation] = useState([]);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [currentEditField, setCurrentEditField] = useState(null);

  // 获取custom_field的默认数量
  const getDefaultFieldCount = useCallback(() => {
    if (!defaultSettings || defaultSettings.length === 0) return 2;
    
    // 检查数组嵌套结构
    let customFieldDefault = null;
    
    // 尝试在不同层级查找custom_field
    for (const setting of defaultSettings) {
      if (setting.name === 'custom_field') {
        customFieldDefault = setting;
        break;
      }
      
      // 如果是嵌套数组，尝试在第一层嵌套中查找
      if (Array.isArray(setting) && setting.length > 0) {
        const nestedSetting = setting.find(s => s.name === 'custom_field');
        if (nestedSetting) {
          customFieldDefault = nestedSetting;
          break;
        }
        
        // 如果是二层嵌套，尝试在第二层嵌套中查找
        for (const subSetting of setting) {
          if (Array.isArray(subSetting) && subSetting.length > 0) {
            const deepNestedSetting = subSetting.find(s => s.name === 'custom_field');
            if (deepNestedSetting) {
              customFieldDefault = deepNestedSetting;
              break;
            }
          }
        }
      }
    }
    
    // 检查是否找到了自定义字段设置
    if (!customFieldDefault) return 2;
    
    // 返回数量
    return customFieldDefault.qty || 2;
  }, [defaultSettings]);

  // 将 fetchData 移到 useEffect 外部，使用 useCallback 来记忆化
  const fetchData = useCallback(async (tid) => {
    if (!tid) return;
    
    try {
      // 先检查Redux状态中是否已经有数据
      const reduxState = customFields || [];
      
      // 获取默认设置
      dispatch(fetchDefaultByName('custom_field'));
      
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
        
        // 按照created_at排序，并按照created_by分组
        if (latestFields.length > 0) {
          const sortedByCreation = [...latestFields].sort((a, b) => {
            // 首先按照created_at排序
            const dateA = new Date(a.created_at);
            const dateB = new Date(b.created_at);
            return dateA - dateB;
          });
          
          setSortedFieldsByCreation(sortedByCreation);
        }
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

  // 更新受保护标签数量
  useEffect(() => {
    const qty = getDefaultFieldCount();
    setProtectedTabCount(qty);
  }, [defaultSettings, getDefaultFieldCount]);

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

  // 检查标签是否受保护（即是否是最早创建的N个标签，N由default表中的custom_field.qty确定）
  const isProtectedTab = (fieldId) => {
    if (!sortedFieldsByCreation || sortedFieldsByCreation.length === 0) {
      return false;
    }
    
    // 查找最早创建的标签的ID列表
    const earliestTabs = sortedFieldsByCreation.slice(0, protectedTabCount).map(field => field.id);
    
    // 检查当前字段ID是否在保护列表中
    return earliestTabs.includes(fieldId);
  };

  // 添加自定义表单验证函数
  const validateName = (name) => {
    if (!name) return t('nameRequired');
    if (name.length < 2) return t('nameMinLength');
    if (name.length > 20) return t('nameMaxLength');
    return null;
  };

  // 编辑标签名称的处理函数
  const handleEditTabName = async (fieldId, newName) => {
    if (!teamId || !fieldId || !newName) {
      console.error('缺少必要参数:', { teamId, fieldId, newName });
      return Promise.reject(new Error('缺少必要参数'));
    }
    
    const userId = user?.id;
    
    if (!userId) {
      console.error('无法编辑标签名：用户未登录');
      return Promise.reject(new Error('用户未登录'));
    }
        
    // 使用正确的参数名：teamCustomFieldId
    const teamCustomFieldId = fieldId;
    
    // 确保Redux状态中的customFieldValues存在
    if (!customFieldValues) {
      console.error('customFieldValues为空，尝试加载数据');
      try {
        await dispatch(fetchTeamCustomFieldValue({ teamId, teamCustomFieldId })).unwrap();
      } catch (error) {
        console.error('加载字段值失败:', error);
        return Promise.reject(error);
      }
    }
    
    // 获取当前字段值对象，添加防御性编程
    const fieldValues = customFieldValues?.[teamCustomFieldId] || { data: [] };
    const currentFieldValue = fieldValues.data?.[0] || null;
        
    // 构建当前URL用于刷新
    const locale = params?.locale || 'en';
    const currentUrl = `/${locale}/projects/${projectId}/${teamId}/${activeTab}`;
        
    // 定义安全刷新函数，添加延时确保状态更新完成
    const safeRefresh = () => {      
      // 先重新获取最新的状态数据
      dispatch(fetchTeamCustomField(teamId)).then(() => {
        // 确保所有自定义字段值也刷新
        Promise.all(
          customFields.map(field => 
            dispatch(fetchTeamCustomFieldValue({teamId, teamCustomFieldId: field.id}))
          )
        ).then(() => {          
          // 使用多重刷新策略
          setTimeout(() => {
            try {
              // 策略1: 强制路由刷新
              if (typeof router.refresh === 'function') {
                router.refresh();
              }
              
              // 策略2: 路由替换
              router.replace(currentUrl);
              
              // 策略3: 延迟后检查并使用window.location刷新
              setTimeout(() => {
                window.location.href = currentUrl;
              }, 500);
            } catch (e) {
              console.error('所有刷新方法失败，使用最终方案:', e);
              window.location.reload(); // 最终方案：强制页面刷新
            }
          }, 300);
        }).catch(err => {
          console.error('获取自定义字段值失败，强制刷新:', err);
          window.location.reload();
        });
      }).catch(err => {
        console.error('获取自定义字段失败，强制刷新:', err);
        window.location.reload();
      });
    };
    
    try {      
      // 设置Redux的loading状态
      dispatch({ 
        type: 'teamCFValue/setLoadingState', 
        payload: { teamCustomFieldId, loading: true } 
      });
      
      let result;
      
      // 检查是否已有记录
      if (currentFieldValue && currentFieldValue.id) {        
        // 准备更新数据
        const updateData = {
          name: newName,
          description: currentFieldValue.description || '',
          icon: currentFieldValue.icon || '',
          value: currentFieldValue.value || '',
          created_by: userId,
          updated_at: new Date().toISOString()
        };
        
        // 使用await等待请求完成
        result = await dispatch(updateTeamCustomFieldValue({
          teamId,
          teamCustomFieldId,
          valueId: currentFieldValue.id,
          data: updateData
        })).unwrap(); // 使用unwrap()来确保Promise完成
        
      } else {
        // 准备创建数据
        const createData = {
          name: newName,
          created_by: userId,
          description: '', // 新建时设置默认值
          icon: '',
          value: ''
        };
        
        // 使用await等待请求完成
        result = await dispatch(createTeamCustomFieldValue({
          teamId,
          teamCustomFieldId,
          data: createData
        })).unwrap(); // 使用unwrap()来确保Promise完成
      }
      
      // 重置Redux的loading状态
      dispatch({ 
        type: 'teamCFValue/setLoadingState', 
        payload: { teamCustomFieldId, loading: false } 
      });
      
      // 强制刷新整个字段数据
      await dispatch(fetchTeamCustomField(teamId)).unwrap();
      await dispatch(fetchTeamCustomFieldValue({ teamId, teamCustomFieldId })).unwrap();
      
      // 请求成功后刷新页面
      safeRefresh();
      
      return result;
    } catch (error) {
      console.error('API请求失败:', error);
      
      // 重置Redux的loading状态
      dispatch({ 
        type: 'teamCFValue/setLoadingState', 
        payload: { teamCustomFieldId, loading: false } 
      });
      
      // 即使失败也尝试刷新页面
      safeRefresh();
      
      return Promise.reject(error);
    }
  };

  // 打开编辑对话框
  const openEditDialog = (field) => {
    setCurrentEditField(field);
    setIsEditDialogOpen(true);
  };

  // 删除标签页功能
  const handleDeleteTab = (fieldId) => {
    // 检查是否是受保护的标签页
    if (isProtectedTab(fieldId)) {
      // 如果是受保护的标签页，显示不能删除的提示
      confirm({
        title: t('cannotDeleteTab'),
        description: t('protectedTabMessage'),
        variant: "info",
        confirmText: t('understand'),
        cancelText: null, // 不显示取消按钮
        onConfirm: () => {} // 空函数，只是确认用户已读信息
      });
      return;
    }
    
    // 如果不是受保护的标签页，显示正常的删除确认
    confirm({
      title: t('deleteTabTitle'),
      description: t('deleteTabConfirm'),
      variant: "error",
      onConfirm: () => {
        // 获取用户ID
        const userId = user?.id;
        
        // 获取当前locale
        const locale = params?.locale || 'en';
        
        // 执行删除操作前先检查是否还有其他标签
        // 从Redux获取最新状态而不是依赖本地状态
        const availableFields = store.getState().teamCF.items;
        
        // 安全地过滤掉将被删除的字段
        const remainingFields = Array.isArray(availableFields) 
          ? availableFields.filter(field => field.id !== fieldId)
          : [];

        // 安全地处理目标URL，避免使用可能已被删除的字段
        let targetUrl;
        
        // 如果删除的是当前激活的标签页
        if (activeTab === `${fieldId}`) {
          if (remainingFields.length > 0) {
            // 确保remainingFields有有效数据，避免空引用
            // 按照order_index排序，确保导航到正确的第一个标签
            const sortedFields = [...remainingFields].sort((a, b) => 
              (a.order_index || 0) - (b.order_index || 0)
            );
            const firstTabValue = `${sortedFields[0].id}`;
            targetUrl = `/${locale}/projects/${projectId}/${teamId}/${firstTabValue}`;
          } else {
            // 如果没有剩余标签页了，目标URL为项目页面
            targetUrl = `/${locale}/projects/${projectId}`;
          }
        } else {
          // 如果删除的不是当前激活的标签页，保持当前URL
          targetUrl = window.location.pathname;
        }
                
        // 无论如何，先执行删除操作
        if (userId && teamId) {
          dispatch(deleteTeamCustomField({ 
            teamId, 
            teamCustomFieldId: fieldId,
            userId
          })).then(() => {
            // 删除成功后，再次获取最新状态以确保导航URL有效
            const latestFields = store.getState().teamCF.items;
            
            // 重新验证目标URL
            if (activeTab === `${fieldId}`) {
              // 如果删除的是当前标签，需要重新计算目标URL
              if (Array.isArray(latestFields) && latestFields.length > 0) {
                // 按照order_index排序，确保导航到正确的第一个标签
                const sortedFields = [...latestFields].sort((a, b) => 
                  (a.order_index || 0) - (b.order_index || 0)
                );
                const firstTabValue = `${sortedFields[0].id}`;
                targetUrl = `/${locale}/projects/${projectId}/${teamId}/${firstTabValue}`;
              } else {
                // 如果没有剩余标签页了，目标URL为项目页面
                targetUrl = `/${locale}/projects/${projectId}`;
              }
            }
            
            // 删除成功后强制刷新页面
            router.push(targetUrl);
          }).catch(error => {
            console.error('删除标签页失败:', error);
            // 即使出错也强制刷新
            router.push(targetUrl);
          });
        } else {
          console.error('删除标签页失败: 缺少用户ID或团队ID');
          // 即使出错也强制刷新
          router.push(targetUrl);
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
    
    // 调用Redux action保存到服务器
    dispatch(updateTeamCustomFieldOrder({
      teamId: teamId, // 确保您有teamId变量
      orderedFields: newOrderedFields
    })).then(() => {      
      // 使用父组件提供的 refreshContent 函数刷新组件
      if (typeof handleRefreshContent === 'function') {        
        // 正确处理异步函数调用
        Promise.resolve().then(async () => {
          try {
            await handleRefreshContent();
          } catch (error) {
            console.error('调用 refreshContent 函数时出错:', error);            
            // 如果 refreshContent 调用失败，使用备选方案
            setTimeout(() => {
              const locale = params?.locale || 'en';
              const currentTab = activeTab || (orderedFields.length > 0 ? `${orderedFields[0].id}` : '');
              const pageUrl = `/${locale}/projects/${projectId}/${teamId}/${currentTab}`;
              router.replace(pageUrl);
            }, 100);
          }
        });
      } else {
        // 如果没有提供 refreshContent，则使用备选方案        
        // 从 params 中获取 locale，默认为 'en'
        const locale = params?.locale || 'en';
        
        // 构建当前完整 URL
        const currentTab = activeTab || (orderedFields.length > 0 ? `${orderedFields[0].id}` : '');
        const fullUrl = `/${locale}/projects/${projectId}/${teamId}/${currentTab}`;
                
        // 使用 router.replace 刷新页面
        router.replace(fullUrl);
      }
    }).catch(error => {
      console.error('更新标签页顺序失败:', error);
      // 如果更新失败，尝试刷新页面
      setTimeout(() => {
        const locale = params?.locale || 'en';
        const currentTab = activeTab || (orderedFields.length > 0 ? `${orderedFields[0].id}` : '');
        const pageUrl = `/${locale}/projects/${projectId}/${teamId}/${currentTab}`;
        router.replace(pageUrl);
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

  // 添加函数检查当前用户是否为团队创建者
  const isCurrentUserCreator = () => {
    const team = useSelector(state => state.teams.teams.find(t => String(t.id) === String(teamId)));
    if (!team || !user?.id) return false;
    return String(team.created_by) === String(user.id);
  };

  return (
    <>
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
                  const isProtected = isProtectedTab(field.id);
                  
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
                                <ContextMenuItem onClick={() => openEditDialog(field)}>
                                  <Icons.Pen className="mr-2 h-4 w-4 text-sm text-foreground" />
                                  <span className="text-sm text-foreground">{t('edit')}</span>
                                </ContextMenuItem>
                                {!isProtected ? (
                                  <ContextMenuItem onClick={() => handleDeleteTab(field.id)}>
                                    <Icons.Trash className="mr-2 h-4 w-4 text-red-500 hover:text-red-600" />
                                    <span className="text-red-500 hover:text-red-600">{t('delete')}</span>
                                  </ContextMenuItem>
                                ) : (
                                  <div>
                                  </div>
                                )}
                              </>
                            ) : (
                              <>
                                <div className="flex items-center px-3 py-2 text-sm cursor-not-allowed">
                                  <Icons.Pen className="mr-2 h-4 w-4 text-foreground" />
                                  <span className="text-foreground">{t('edit')}</span>
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
                {isCurrentUserCreator() && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="ml-1 flex-shrink-0 hover:bg-accent hover:text-accent-foreground h-8 w-8"
                    onClick={() => setIsDialogOpen(true)}
                  >
                    <Icons.Plus className="h-4 w-4" />
                  </Button>
                )}
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

      {/* 编辑视图名称对话框 */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t('editTabName')}</DialogTitle>
          </DialogHeader>
          <EditViewNameForm 
            currentField={currentEditField} 
            customFieldValues={customFieldValues}
            onSave={handleEditTabName}
            validateName={validateName}
            t={t}
            setIsOpen={setIsEditDialogOpen}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

// 添加编辑视图名称表单组件
function EditViewNameForm({ currentField, customFieldValues, onSave, validateName, t, setIsOpen }) {
  const [error, setError] = useState('');
  const [charCount, setCharCount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const MAX_LENGTH = 20;
  
  const form = useForm({
    defaultValues: {
      name: '',
    },
  });

  // 当currentField改变时更新表单默认值
  useEffect(() => {
    if (currentField) {
      const fieldValue = customFieldValues[currentField.id]?.data?.[0];
      let currentName = fieldValue?.name || '';
      if (!currentName && currentField.custom_field) {
        currentName = t(currentField.custom_field.name.toLowerCase());
      }
      
      form.reset({
        name: currentName
      });
      setCharCount(currentName.trim().length);
      setError('');
    }
  }, [currentField, customFieldValues, form, t]);

  const handleInputChange = (e) => {
    const value = e.target.value;
    setCharCount(value.trim().length);
    form.setValue('name', value);
  };

  const onSubmit = async (data) => {
    if (!currentField) return;
    
    const trimmedName = data.name.trim();
    const validationError = validateName(trimmedName);
    if (validationError) {
      setError(validationError);
      return;
    }
    
    // 设置提交状态以禁用按钮
    setIsSubmitting(true);
    
    try {
      // 先关闭对话框
      setIsOpen(false);
      
      // 调用保存函数
      await onSave(currentField.id, trimmedName);
      
      // 重置表单状态
      form.reset();
      setError('');
    } catch (err) {
      console.error('保存视图名称失败:', err);
      // 如果保存失败，显示错误并重新打开对话框
      setError('保存失败，请重试');
      setIsOpen(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('name')}</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input 
                    {...field} 
                    maxLength={MAX_LENGTH}
                    onChange={handleInputChange} 
                    disabled={isSubmitting}
                  />
                  <div className="absolute right-2 bottom-1 text-xs text-muted-foreground">
                    {charCount}/{MAX_LENGTH}
                  </div>
                </div>
              </FormControl>
              {error && <div className="text-sm font-medium text-destructive">{error}</div>}
            </FormItem>
          )}
        />
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isSubmitting}>
            {t('cancel')}
          </Button>
          <Button type="submit" disabled={isSubmitting || charCount === 0 || charCount > MAX_LENGTH}>
            {isSubmitting ? t('saving') + '...' : t('save')}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}


