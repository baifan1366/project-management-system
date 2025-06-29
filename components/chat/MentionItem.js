'use client';

import { useState, useEffect, useRef } from 'react';
import { User, Briefcase, ListChecks, Mail, Phone, Calendar, Clock, Tag, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useDispatch, useSelector } from 'react-redux';
import { fetchUserById } from '@/lib/redux/features/usersSlice';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/lib/supabase';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import UserProfileDialog from '@/components/chat/UserProfileDialog';

/**
 * MentionItem component
 * Displays a mention in a message with the appropriate styling
 * Shows a popover with details on hover for mentions
 */
const MentionItem = ({ 
  type, 
  id, 
  name,
  projectName = null,
  showIcon = true,
  className
}) => {
  const t = useTranslations('Chat');
  const dispatch = useDispatch();
  const [isHovering, setIsHovering] = useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [userData, setUserData] = useState(null);
  const [projectData, setProjectData] = useState(null);
  const [taskData, setTaskData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isUserProfileOpen, setIsUserProfileOpen] = useState(false);
  const popoverTimeoutRef = useRef(null);
  
  // Get users from Redux store
  const users = useSelector(state => state.users.users);
  const user = users.find(u => u.id === id);
  
  // 将处理鼠标事件的逻辑修改为点击事件
  const handleClick = (e) => {
    e.preventDefault(); // 阻止默认链接行为
    e.stopPropagation(); // 阻止事件冒泡
    setIsPopoverOpen(!isPopoverOpen); // 切换popover显示状态
  };
  
  // 点击其他地方关闭popover
  useEffect(() => {
    if (!isPopoverOpen) return;
    
    const handleClickOutside = (e) => {
      // 检查点击是否在popover内部或触发器上
      const popoverElement = document.querySelector('[data-popover-content]');
      const triggerElement = document.querySelector('[data-popover-trigger]');
      
      if (popoverElement && !popoverElement.contains(e.target) && 
          triggerElement && !triggerElement.contains(e.target)) {
        setIsPopoverOpen(false);
      }
    };
    
    // 添加全局点击事件监听
    document.addEventListener('mousedown', handleClickOutside);
    
    // 清理函数
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isPopoverOpen]);
  
  // Fetch data when hovering over a mention
  useEffect(() => {
    if (!isPopoverOpen || loading) return;
    
    const fetchData = async () => {
      setLoading(true);
      try {
        if (type === 'user' && !user && id) {
          dispatch(fetchUserById(id));
        } else if (type === 'project' && !projectData && id) {
          const { data, error } = await supabase
            .from('project')
            .select('*')
            .eq('id', id)
            .single();
          
          if (error) throw error;
          setProjectData(data);
        } else if (type === 'task' && !taskData && id) {
          const { data, error } = await supabase
            .from('task')
            .select(`
              id,
              tag_values,
              created_at,
              updated_at,
              created_by,
              user:created_by (name, avatar_url)
            `)
            .eq('id', id)
            .single();
          
          if (error) throw error;
          setTaskData(data);
        }
      } catch (error) {
        console.error(`Error fetching ${type} data:`, error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [type, id, isPopoverOpen, user, projectData, taskData, dispatch, loading]);
  
  // Update local state when user data is available in Redux
  useEffect(() => {
    if (user) {
      setUserData(user);
    }
  }, [user]);
  
  // Determine the styling based on mention type
  const getTypeStyles = () => {
    switch (type) {
      case 'user':
        return "bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-800/70 dark:text-blue-100 dark:hover:bg-blue-700/90";
      case 'project':
        return "bg-orange-100 text-orange-800 hover:bg-orange-200 dark:bg-orange-800/70 dark:text-orange-100 dark:hover:bg-orange-700/90";
      case 'task':
        return "bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-800/70 dark:text-green-100 dark:hover:bg-green-700/90";
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600";
    }
  };

  // Get the appropriate icon
  const getIcon = () => {
    switch (type) {
      case 'user':
        return <User className="h-3 w-3" />;
      case 'project':
        return <Briefcase className="h-3 w-3" />;
      case 'task':
        return <ListChecks className="h-3 w-3" />;
      default:
        return null;
    }
  };

  // Determine the link URL
  const getLinkUrl = () => {
    switch (type) {
      case 'user':
        return `/profile/${id}`;
      case 'project':
        return `/projects/${id}`;
      case 'task':
        return `/tasks/${id}`;
      default:
        return '#';
    }
  };

  // Format the display text
  const getDisplayText = () => {
    switch (type) {
      case 'user':
        return `@${name}`;
      case 'project':
        return `#${name}`;
      case 'task':
        return projectName ? `${name} (${projectName})` : name;
      default:
        return name;
    }
  };
  
  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Render user popover content
  const renderUserPopover = () => {
    return (
      <PopoverContent 
        className="w-64 p-3 relative" 
        side="top"
        sideOffset={0}
      >
        <div 
          className="absolute bottom-0 left-0 right-0 h-8 -mb-8 bg-transparent z-10" 
        />
        
        {userData ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              {userData.avatar_url ? (
                <img 
                  src={userData.avatar_url} 
                  alt={userData.name} 
                  className="w-10 h-10 rounded-full"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                  <User className="w-6 h-6 text-gray-500" />
                </div>
              )}
              <div>
                <h4 className="font-medium">{userData.name}</h4>
              </div>
            </div>
            
            {userData.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4" />
                <span>{userData.email}</span>
              </div>
            )}
            
            {userData.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4" />
                <span>{userData.phone}</span>
              </div>
            )}
            
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-2 w-full text-primary hover:text-primary-foreground hover:bg-primary"
              onClick={handleViewDetails}
            >
              <Info className="h-4 w-4 mr-1" />
              {t('viewDetails')}
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-center py-2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
          </div>
        )}
      </PopoverContent>
    );
  };
  
  // Render project popover content
  const renderProjectPopover = () => {
    return (
      <PopoverContent 
        className="w-64 p-3 relative" 
        side="top"
        sideOffset={0}
      >
        <div 
          className="absolute bottom-0 left-0 right-0 h-8 -mb-8 bg-transparent z-10" 
        />
        
        {projectData ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-300`}>
                <Briefcase className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-medium">{projectData.project_name}</h4>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  projectData.status === 'COMPLETED' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
                  projectData.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' :
                  'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                }`}>
                  {projectData.status}
                </span>
              </div>
            </div>
            
            {projectData.description && (
              <div className="mt-1 text-sm">
                <p className="line-clamp-2">{projectData.description}</p>
              </div>
            )}
            
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span>{t('created')}: {formatDate(projectData.created_at)}</span>
            </div>
            
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>{t('updated')}: {formatDate(projectData.updated_at)}</span>
            </div>
            
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-2 w-full text-primary hover:text-primary-foreground hover:bg-primary"
              onClick={handleViewDetails}
            >
              <Info className="h-4 w-4 mr-1" />
              {t('viewDetails')}
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-center py-2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
          </div>
        )}
      </PopoverContent>
    );
  };
  
  // Render task popover content
  const renderTaskPopover = () => {
    // 添加调试日志
    console.log("MentionItem - 渲染任务气泡:", { 
      taskId: id, 
      taskName: name, 
      projectName, 
      taskData: taskData ? {
        id: taskData.id,
        tag_values: taskData.tag_values,
        taskName: taskData.tag_values?.["1"] || taskData.tag_values?.name || taskData.tag_values?.title || `Task ${taskData.id}`
      } : null 
    });

    return (
      <PopoverContent 
        className="w-64 p-3 relative" 
        side="top"
        sideOffset={0}
      >
        <div 
          className="absolute bottom-0 left-0 right-0 h-8 -mb-8 bg-transparent z-10" 
        />
        
        {taskData ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300`}>
                <ListChecks className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-medium">{name}</h4>
                {projectName && (
                  <span className="text-xs text-muted-foreground">{projectName}</span>
                )}
              </div>
            </div>
            
            {taskData.tag_values && taskData.tag_values["1"] && (
              <div className="mt-1 text-sm">
                <p className="line-clamp-2">{taskData.tag_values["1"]}</p>
              </div>
            )}
            
            {!taskData.tag_values?.["1"] && taskData.tag_values?.title && (
              <div className="mt-1 text-sm">
                <p className="line-clamp-2">{taskData.tag_values.title}</p>
              </div>
            )}
            
            {!taskData.tag_values?.["1"] && !taskData.tag_values?.title && taskData.tag_values?.name && (
              <div className="mt-1 text-sm">
                <p className="line-clamp-2">{taskData.tag_values.name}</p>
              </div>
            )}
            
            {taskData.tag_values?.description && (
              <div className="mt-1 text-sm">
                <p className="line-clamp-2">{taskData.tag_values.description}</p>
              </div>
            )}
            
            {taskData.tag_values?.status && (
              <div className="flex items-center gap-2 text-xs">
                <Tag className="h-3 w-3" />
                <span className={`px-2 py-0.5 rounded-full ${
                  taskData.tag_values.status === 'COMPLETED' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
                  taskData.tag_values.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' :
                  'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                }`}>
                  {taskData.tag_values.status}
                </span>
              </div>
            )}
            
            {taskData.user && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <User className="h-3 w-3" />
                <span>{t('createdBy')}: {taskData.user.name}</span>
              </div>
            )}
            
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span>{t('created')}: {formatDate(taskData.created_at)}</span>
            </div>
            
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-2 w-full text-primary hover:text-primary-foreground hover:bg-primary"
              onClick={handleViewDetails}
            >
              <Info className="h-4 w-4 mr-1" />
              {t('viewDetails')}
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-center py-2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
          </div>
        )}
      </PopoverContent>
    );
  };

  // Return the appropriate popover based on type
  const renderPopover = () => {
    switch (type) {
      case 'user':
        return renderUserPopover();
      case 'project':
        return renderProjectPopover();
      case 'task':
        return renderTaskPopover();
      default:
        return null;
    }
  };
  
  // 渲染详情对话框
  const renderDetailsDialog = () => {
    let dialogContent = null;
    let dialogTitle = '';
    
    switch (type) {
      case 'user':
        if (!userData) return null;
        dialogTitle = userData.name || t('userDetails');
        dialogContent = (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              {userData.avatar_url ? (
                <img 
                  src={userData.avatar_url} 
                  alt={userData.name} 
                  className="w-16 h-16 rounded-full"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
                  <User className="w-10 h-10 text-gray-500" />
                </div>
              )}
              <div>
                <h2 className="text-xl font-bold">{userData.name}</h2>
                {userData.email && (
                  <p className="text-muted-foreground">{userData.email}</p>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {userData.phone && (
                <div className="space-y-1">
                  <h3 className="text-sm font-medium text-muted-foreground">Phone</h3>
                  <p>{userData.phone}</p>
                </div>
              )}
              
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-muted-foreground">Last Seen</h3>
                <p>{userData.last_seen_at ? formatDate(userData.last_seen_at) : t('unknown')}</p>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end">
              <Button 
                variant="outline" 
                onClick={() => setIsDetailsDialogOpen(false)}
              >
                {t('close')}
              </Button>
              <Button 
                className="ml-2"
                onClick={() => {
                  window.open(getLinkUrl(), '_blank');
                }}
              >
                {t('viewProfile')}
              </Button>
            </div>
          </div>
        );
        break;
      
      case 'project':
        if (!projectData) return null;
        dialogTitle = projectData.project_name || t('projectDetails');
        dialogContent = (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className={`w-16 h-16 rounded-lg flex items-center justify-center bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-300`}>
                <Briefcase className="w-10 h-10" />
              </div>
              <div>
                <h2 className="text-xl font-bold">{projectData.project_name}</h2>
                <div className="flex items-center mt-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    projectData.status === 'COMPLETED' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
                    projectData.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' :
                    'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                  }`}>
                    {projectData.status}
                  </span>
                </div>
              </div>
            </div>
            
            {projectData.description && (
              <div className="mt-4">
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Description</h3>
                <p className="text-sm">{projectData.description}</p>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-muted-foreground">Created</h3>
                <p>{formatDate(projectData.created_at)}</p>
              </div>
              
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-muted-foreground">Last Updated</h3>
                <p>{formatDate(projectData.updated_at)}</p>
              </div>
              
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-muted-foreground">Visibility</h3>
                <p className="capitalize">{projectData.visibility?.toLowerCase()}</p>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end">
              <Button 
                variant="outline" 
                onClick={() => setIsDetailsDialogOpen(false)}
              >
                {t('close')}
              </Button>
              <Button 
                className="ml-2"
                onClick={() => {
                  window.open(getLinkUrl(), '_blank');
                }}
              >
                {t('viewProject')}
              </Button>
            </div>
          </div>
        );
        break;
      
      case 'task':
        if (!taskData) return null;
        const taskTitle = taskData.tag_values?.["1"] || 
                          taskData.tag_values?.name || 
                          taskData.tag_values?.title || 
                          `Task ${taskData.id}`;
        dialogTitle = taskTitle || t('taskDetails');
        dialogContent = (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className={`w-16 h-16 rounded-lg flex items-center justify-center bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300`}>
                <ListChecks className="w-10 h-10" />
              </div>
              <div>
                <h2 className="text-xl font-bold">{taskTitle}</h2>
                {projectName && (
                  <p className="text-muted-foreground">{projectName}</p>
                )}
                {taskData.tag_values?.status && (
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    taskData.tag_values.status === 'COMPLETED' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
                    taskData.tag_values.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' :
                    'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                  }`}>
                    {taskData.tag_values.status}
                  </span>
                )}
              </div>
            </div>
            
            {taskData.tag_values?.description && (
              <div className="mt-4">
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Description</h3>
                <p className="text-sm">{taskData.tag_values.description}</p>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {taskData.user && (
                <div className="space-y-1">
                  <h3 className="text-sm font-medium text-muted-foreground">Created By</h3>
                  <div className="flex items-center gap-2">
                    {taskData.user.avatar_url ? (
                      <img 
                        src={taskData.user.avatar_url} 
                        alt={taskData.user.name} 
                        className="w-6 h-6 rounded-full"
                      />
                    ) : (
                      <User className="w-4 h-4" />
                    )}
                    <span>{taskData.user.name}</span>
                  </div>
                </div>
              )}
              
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-muted-foreground">Created</h3>
                <p>{formatDate(taskData.created_at)}</p>
              </div>
              
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-muted-foreground">Last Updated</h3>
                <p>{formatDate(taskData.updated_at)}</p>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end">
              <Button 
                variant="outline" 
                onClick={() => setIsDetailsDialogOpen(false)}
              >
                {t('close')}
              </Button>
              <Button 
                className="ml-2"
                onClick={() => {
                  window.open(getLinkUrl(), '_blank');
                }}
              >
                {t('viewTask')}
              </Button>
            </div>
          </div>
        );
        break;
    }
    
    return (
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
          </DialogHeader>
          {dialogContent}
        </DialogContent>
      </Dialog>
    );
  };

  // 处理查看详情按钮点击
  const handleViewDetails = () => {
    if (type === 'user' && userData) {
      // For users, use the UserProfileDialog
      setIsUserProfileOpen(true);
    } else {
      // For projects and tasks, use the custom dialog
      setIsDetailsDialogOpen(true);
    }
    setIsPopoverOpen(false);
  };

  // Use popover for all mention types
  return (
    <>
      <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
        <PopoverTrigger asChild>
          <span 
            className={cn(
              "inline-flex items-center gap-1 py-0.5 px-1.5 rounded text-xs font-medium cursor-pointer",
              getTypeStyles(),
              className
            )}
            onClick={handleClick}
            data-popover-trigger="true"
          >
            {showIcon && getIcon()}
            <span>{getDisplayText()}</span>
          </span>
        </PopoverTrigger>
        <PopoverContent 
          className="w-64 p-3" 
          side="top"
          align="start"
          data-popover-content="true"
        >
          {type === 'user' ? (
            userData ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3">
                {userData.avatar_url ? (
                  <img 
                    src={userData.avatar_url} 
                    alt={userData.name} 
                    className="w-10 h-10 rounded-full"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                    <User className="w-6 h-6 text-gray-500" />
                  </div>
                )}
                <div>
                  <h4 className="font-medium">{userData.name}</h4>
                </div>
              </div>
              
              {userData.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4" />
                  <span>{userData.email}</span>
                </div>
              )}
              
              {userData.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4" />
                  <span>{userData.phone}</span>
                </div>
              )}
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-2 w-full text-primary hover:text-primary-foreground hover:bg-primary"
                  onClick={handleViewDetails}
                >
                  <Info className="h-4 w-4 mr-1" />
                  {t('viewDetails')}
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-center py-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
              </div>
            )
          ) : type === 'project' ? (
            projectData ? (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-300`}>
                    <Briefcase className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-medium">{projectData.project_name}</h4>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      projectData.status === 'COMPLETED' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
                      projectData.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' :
                      'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                    }`}>
                      {projectData.status}
                    </span>
                  </div>
                </div>
                
                {projectData.description && (
                  <div className="mt-1 text-sm">
                    <p className="line-clamp-2">{projectData.description}</p>
                  </div>
                )}
                
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  <span>{t('created')}: {formatDate(projectData.created_at)}</span>
                </div>
                
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>{t('updated')}: {formatDate(projectData.updated_at)}</span>
                </div>
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-2 w-full text-primary hover:text-primary-foreground hover:bg-primary"
                  onClick={handleViewDetails}
                >
                  <Info className="h-4 w-4 mr-1" />
                  {t('viewDetails')}
                </Button>
            </div>
          ) : (
            <div className="flex items-center justify-center py-2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
            </div>
            )
          ) : (
            taskData ? (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300`}>
                    <ListChecks className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-medium">{name}</h4>
                    {projectName && (
                      <span className="text-xs text-muted-foreground">{projectName}</span>
                    )}
                  </div>
                </div>
                
                {taskData.tag_values && taskData.tag_values["1"] && (
                  <div className="mt-1 text-sm">
                    <p className="line-clamp-2">{taskData.tag_values["1"]}</p>
                  </div>
                )}
                
                {!taskData.tag_values?.["1"] && taskData.tag_values?.title && (
                  <div className="mt-1 text-sm">
                    <p className="line-clamp-2">{taskData.tag_values.title}</p>
                  </div>
                )}
                
                {!taskData.tag_values?.["1"] && !taskData.tag_values?.title && taskData.tag_values?.name && (
                  <div className="mt-1 text-sm">
                    <p className="line-clamp-2">{taskData.tag_values.name}</p>
                  </div>
                )}
                
                {taskData.tag_values?.description && (
                  <div className="mt-1 text-sm">
                    <p className="line-clamp-2">{taskData.tag_values.description}</p>
                  </div>
                )}
                
                {taskData.tag_values?.status && (
                  <div className="flex items-center gap-2 text-xs">
                    <Tag className="h-3 w-3" />
                    <span className={`px-2 py-0.5 rounded-full ${
                      taskData.tag_values.status === 'COMPLETED' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
                      taskData.tag_values.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' :
                      'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                    }`}>
                      {taskData.tag_values.status}
                    </span>
                  </div>
                )}
                
                {taskData.user && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <User className="h-3 w-3" />
                    <span>{t('createdBy')}: {taskData.user.name}</span>
                  </div>
                )}
                
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  <span>{t('created')}: {formatDate(taskData.created_at)}</span>
                </div>
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-2 w-full text-primary hover:text-primary-foreground hover:bg-primary"
                  onClick={handleViewDetails}
                >
                  <Info className="h-4 w-4 mr-1" />
                  {t('viewDetails')}
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-center py-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
              </div>
            )
          )}
        </PopoverContent>
      </Popover>
      
      {/* User Profile Dialog */}
      <UserProfileDialog
        open={isUserProfileOpen}
        onOpenChange={setIsUserProfileOpen}
        user={userData}
      />
      
      {/* Custom dialog for projects and tasks */}
      {isDetailsDialogOpen && renderDetailsDialog()}
    </>
  );
};

export default MentionItem; 