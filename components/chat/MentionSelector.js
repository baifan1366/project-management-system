'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { User, Briefcase, ListChecks, Calendar } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { supabase } from '@/lib/supabase';
import { 
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator
} from '@/components/ui/command';
import { Avatar } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

/**
 * Debounce function to limit how often a function is called
 * @param {Function} func - The function to debounce
 * @param {number} wait - The debounce delay in milliseconds
 * @return {Function} - The debounced function with a cancel method
 */
const debounce = (func, wait) => {
  let timeout;
  const debounced = function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
  
  // Add cancel method to the debounced function
  debounced.cancel = function() {
    clearTimeout(timeout);
  };
  
  return debounced;
};

/**
 * Format date for display
 */
const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString();
};

/**
 * MentionSelector component
 * Shows a dropdown of users, projects, and tasks when @ is typed
 * @param {Object} props - Component props
 * @param {boolean} props.isOpen - Whether the mention selector is open
 * @param {string} props.searchText - The search text (without the @ symbol)
 * @param {Function} props.onSelect - Callback when a mention is selected
 * @param {Function} props.onClose - Callback to close the mention selector
 * @param {Object} props.position - Position of the selector {top, left}
 * @param {number} props.sessionId - ID of the current chat session
 * @param {string} props.userId - ID of the current user
 */
const MentionSelector = ({ 
  isOpen, 
  searchText, 
  onSelect, 
  onClose, 
  position = { top: 0, left: 0 },
  sessionId,
  userId
}) => {
  const t = useTranslations('Chat');
  const [results, setResults] = useState({
    users: [],
    projects: [],
    tasks: []
  });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const commandRef = useRef(null);
  
  // 添加点击外部关闭逻辑
  useEffect(() => {
    if (!isOpen) return;
    
    // 处理点击外部事件
    const handleClickOutside = (e) => {
      // 如果点击的元素不在mention选择器内，就关闭选择器
      if (commandRef.current && !commandRef.current.contains(e.target)) {
        onClose();
        e.stopPropagation(); // 阻止事件冒泡
      }
    };
    
    // 添加全局点击事件监听
    document.addEventListener('mousedown', handleClickOutside);
    
    // 清理函数
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Create a debounced fetch function
  const debouncedFetch = useCallback(
    debounce(async (query) => {
      if (!query) return;
      
      setLoading(true);
      try {
        // Search for users, projects, and tasks
        const url = `/api/search?query=${encodeURIComponent(query)}&type=mention${sessionId ? `&sessionId=${sessionId}` : ''}${userId ? `&userId=${userId}` : ''}`;
        console.log("MentionSelector - 发送搜索请求:", url);
        
        const response = await fetch(url);
        if (!response.ok) {
          console.error('Search API error:', { status: response.status, statusText: response.statusText });
          // Don't throw, instead set empty results and continue
          setResults({
            users: [],
            projects: [],
            tasks: []
          });
          return;
        }
        
        const data = await response.json();
        
        if (data.error) {
          console.error('Search API returned error:', data.error);
          setResults({
            users: [],
            projects: [],
            tasks: []
          });
          return;
        }
        
        // 添加调试日志
        const tasks = data.results.filter(item => item.type === 'task') || [];
        console.log("MentionSelector - 获取到任务:", tasks.map(t => ({
          id: t.id,
          title: t.title || '无标题',
          tagValues: t.tag_values 
        })));
        
        setResults({
          users: data.results.filter(item => item.type === 'user') || [],
          projects: data.results.filter(item => item.type === 'project') || [],
          tasks: tasks
        });
      } catch (error) {
        console.error('Error fetching mention suggestions:', error);
        // Set empty results on error
        setResults({
          users: [],
          projects: [],
          tasks: []
        });
      } finally {
        setLoading(false);
      }
    }, 300), // 300ms debounce delay
    [sessionId, userId] // Add userId to dependencies
  );

  // Fetch results when searchText changes
  useEffect(() => {
    if (!isOpen || !searchText) return;
    debouncedFetch(searchText);
    
    // Cleanup function to cancel pending debounced calls when component unmounts
    return () => debouncedFetch.cancel();
  }, [isOpen, searchText, debouncedFetch]);


  // Filter displayed results based on active tab
  const getFilteredResults = () => {
    if (activeTab === 'all') {
      return {
        users: results.users,
        projects: results.projects,
        tasks: results.tasks
      };
    }
    
    return {
      users: activeTab === 'users' ? results.users : [],
      projects: activeTab === 'projects' ? results.projects : [],
      tasks: activeTab === 'tasks' ? results.tasks : []
    };
  };

  const filteredResults = getFilteredResults();
  const hasResults = 
    filteredResults.users.length > 0 || 
    filteredResults.projects.length > 0 || 
    filteredResults.tasks.length > 0;

  if (!isOpen) return null;

  // Get status color class based on status value
  const getStatusColorClass = (status) => {
    switch (status?.toUpperCase()) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'ON_HOLD':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  // 处理选择用户的函数
  const handleSelectUser = (user, e) => {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
    }
    if (e && typeof e.stopPropagation === 'function') {
      e.stopPropagation();
    }
    onSelect({
      type: 'user',
      id: user.id,
      name: user.name,
      displayText: `@${user.name}`
    });
  };

  // 处理选择项目的函数
  const handleSelectProject = (project, e) => {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
    }
    if (e && typeof e.stopPropagation === 'function') {
      e.stopPropagation();
    }
    onSelect({
      type: 'project',
      id: project.id,
      name: project.project_name,
      displayText: `#${project.project_name}`
    });
  };

  // 处理选择任务的函数
  const handleSelectTask = (task, e) => {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
    }
    if (e && typeof e.stopPropagation === 'function') {
      e.stopPropagation();
    }
    
    // 添加调试日志
    console.log("MentionSelector - 选择任务:", {
      taskId: task.id,
      tagValues: task.tag_values,
      title: task.title,
      rawTask: task
    });
    
    // 首先尝试从tag_values["1"]获取任务名称，这是存储任务名称的地方
    const taskName = task.tag_values && (task.tag_values["1"] || 
                                         task.tag_values.name || 
                                         task.tag_values.title ||
                                         task.title ||
                                         `Task ${task.id}`);
    
    onSelect({
      type: 'task',
      id: task.id,
      name: taskName,
      projectName: task.project_name,
      displayText: `${taskName} (${task.project_name || "Project"})`
    });
  };

  // 处理标签切换点击事件
  const handleTabClick = (tab, e) => {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
    }
    if (e && typeof e.stopPropagation === 'function') {
      e.stopPropagation();
    }
    setActiveTab(tab);
  };

  return (
    <div 
      className="absolute z-50"
      style={{
            bottom: `55px`, 
            left: `0px`,
            maxWidth: '95vw',
            }}
    >
      <Command ref={commandRef} className="rounded-lg border shadow-md w-72 max-w-full">
        <div className="flex items-center px-1 border-b">
          <div className="flex space-x-1 p-1 flex-wrap">
            <button
              onClick={(e) => handleTabClick('all', e)}
              className={cn(
                "px-2 py-1 text-xs rounded-md",
                activeTab === 'all' 
                  ? "bg-primary text-primary-foreground" 
                  : "text-muted-foreground hover:bg-accent"
              )}
            >
              {t('all')}
            </button>
            <button
              onClick={(e) => handleTabClick('users', e)}
              className={cn(
                "px-2 py-1 text-xs rounded-md flex items-center gap-1",
                activeTab === 'users' 
                  ? "bg-primary text-primary-foreground" 
                  : "text-muted-foreground hover:bg-accent"
              )}
            >
              <User className="h-3 w-3" />
              {t('users')}
            </button>
            <button
              onClick={(e) => handleTabClick('projects', e)}
              className={cn(
                "px-2 py-1 text-xs rounded-md flex items-center gap-1",
                activeTab === 'projects' 
                  ? "bg-primary text-primary-foreground" 
                  : "text-muted-foreground hover:bg-accent"
              )}
            >
              <Briefcase className="h-3 w-3" />
              {t('projects')}
            </button>
            <button
              onClick={(e) => handleTabClick('tasks', e)}
              className={cn(
                "px-2 py-1 text-xs rounded-md flex items-center gap-1",
                activeTab === 'tasks' 
                  ? "bg-primary text-primary-foreground" 
                  : "text-muted-foreground hover:bg-accent"
              )}
            >
              <ListChecks className="h-3 w-3" />
              {t('tasks')}
            </button>
          </div>
        </div>
        
        <CommandList>
          {loading ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              {t('loading')}...
            </div>
          ) : !hasResults ? (
            <CommandEmpty>{t('noResults')}</CommandEmpty>
          ) : (
            <>
              {filteredResults.users.length > 0 && (
                <CommandGroup heading={t('users')}>
                  {filteredResults.users.map(user => (
                    <CommandItem
                      key={`user-${user.id}`}
                      onSelect={(currentValue, selected) => {
                        handleSelectUser(user);
                      }}
                      className="flex items-center gap-2 cursor-pointer p-2 m-1 hover:bg-accent rounded-md"
                      value={`user-${user.id}`}
                    >
                      <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center overflow-hidden">
                        {user.avatar_url ? (
                          <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xs text-blue-600">{user.name.charAt(0)}</span>
                        )}
                      </div>
                      <span>{user.name}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              
              {filteredResults.projects.length > 0 && (
                <>
                  {filteredResults.users.length > 0 && <CommandSeparator />}
                  <CommandGroup heading={t('projects')}>
                    {filteredResults.projects.map(project => (
                      <CommandItem
                        key={`project-${project.id}`}
                        onSelect={(currentValue, selected) => {
                          handleSelectProject(project);
                        }}
                        className="flex items-center gap-2 cursor-pointer p-2 m-1 hover:bg-accent rounded-md"
                        value={`project-${project.id}`}
                      >
                        <div className="flex-shrink-0 w-5 h-5 bg-orange-100 rounded-lg flex items-center justify-center text-orange-600">
                          <Briefcase className="h-3 w-3" />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="truncate font-medium">{project.project_name}</span>
                          <div className="flex items-center gap-2">
                            {project.status && (
                              <span className={`text-[10px] px-1 py-0.5 rounded-full ${getStatusColorClass(project.status)}`}>
                                {project.status}
                              </span>
                            )}
                            {project.created_at && (
                              <span className="text-[10px] text-muted-foreground">
                                {formatDate(project.created_at)}
                              </span>
                            )}
                          </div>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}
              
              {filteredResults.tasks.length > 0 && (
                <>
                  {(filteredResults.users.length > 0 || filteredResults.projects.length > 0) && 
                    <CommandSeparator />
                  }
                  <CommandGroup heading={t('tasks')}>
                    {filteredResults.tasks.map(task => {
                      // 添加调试日志，检查任务数据
                      console.log(`渲染任务选项 ID=${task.id}:`, task);
                      // 获取任务名称
                      const taskName = task.title || 
                                     (task.tag_values && (task.tag_values["1"] || 
                                                         task.tag_values.name || 
                                                         task.tag_values.title)) || 
                                     `Task ${task.id}`;
                      return (
                        <CommandItem
                          key={`task-${task.id}`}
                          onSelect={(currentValue, selected) => {
                            handleSelectTask(task);
                          }}
                          className="flex items-center gap-2 cursor-pointer p-2 m-1 hover:bg-accent rounded-md"
                          value={`task-${task.id}`}
                        >
                          <div className="flex-shrink-0 w-5 h-5 bg-green-100 rounded-lg flex items-center justify-center text-green-600">
                            <ListChecks className="h-3 w-3" />
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="truncate font-medium">
                              {taskName}
                            </span>
                            <div className="flex items-center gap-2">
                              {task.tag_values?.status && (
                                <span className={`text-[10px] px-1 py-0.5 rounded-full ${getStatusColorClass(task.tag_values.status)}`}>
                                  {task.tag_values.status}
                                </span>
                              )}
                              {task.project_name && (
                                <span className="text-[10px] text-muted-foreground truncate">
                                  {task.project_name}
                                </span>
                              )}
                            </div>
                          </div>
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </>
              )}
            </>
          )}
        </CommandList>
      </Command>
    </div>
  );
};

export default MentionSelector; 