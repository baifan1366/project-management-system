"use client";

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useDispatch, useSelector } from 'react-redux';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Clock, ArrowRight, CheckCircle, AlertCircle, ClipboardList, Plus, Pen, Check, X } from 'lucide-react';
import React from 'react';
import { 
  fetchSelectedTeamAgileById, 
  fetchTaskById, 
  fetchAllTags,
  clearSprintTasks
} from '@/lib/redux/features/agileSlice';
import { getSectionByTeamId, getSectionById } from '@/lib/redux/features/sectionSlice';
import { fetchTasksBySectionId } from '@/lib/redux/features/taskSlice';
import { getTagByName } from '@/lib/redux/features/tagSlice';
import { fetchUserById } from '@/lib/redux/features/usersSlice';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import useGetUser from '@/lib/hooks/useGetUser';
import { updateTask } from '@/lib/redux/features/taskSlice';
import { updateSprint } from '@/lib/redux/features/agileSlice';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { getLabelByTeamId, updateLabel } from '@/lib/redux/features/teamLabelSlice';
import { extractSingleSelectOptions } from '@/components/team/list/tagUtils';
import TagLabelManager from '@/components/team/agile/TagLabelManager';
import StatusSelectButton from '@/components/team/agile/StatusSelectButton';
import { getContrastColor, getStatusColor } from '@/components/team/agile/colorUtils';
import StatusSelect from '@/components/team/agile/StatusSelect';

const TASK_STATUS = {
  'todo': '-',
  'in_progress': '-',
  'done': '-'
};

const SprintBoard = ({ sprint, tasks, teamId, themeColor, agileMembers = [], selectedType }) => {
  const t = useTranslations('Agile');
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [tasksByStatus, setTasksByStatus] = useState({
    todo: [],
    in_progress: [],
    done: []
  });
  const [nameTagId, setNameTagId] = useState(null);
  const [statusTagId, setStatusTagId] = useState(null);
  const [startDateTagId, setStartDateTagId] = useState(null);
  const [descriptionTagId, setDescriptionTagId] = useState(null);
  const [isAllTasksOpen, setIsAllTasksOpen] = useState(false);
  const [teamTasks, setTeamTasks] = useState([]);
  const [allSections, setAllSections] = useState([]);
  const [loadingAllTasks, setLoadingAllTasks] = useState(false);
  const [userCache, setUserCache] = useState({});
  const [statusOptions, setStatusOptions] = useState([]);
  
  // 新增编辑任务相关状态
  const [isEditTaskDialogOpen, setIsEditTaskDialogOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState(null);
  const [editFormErrors, setEditFormErrors] = useState({});
  const [editTaskData, setEditTaskData] = useState({
    name: '',
    description: '',
    status: '',
    assignee: ''
  });
  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: 'asc'
  });
  
  // 从Redux获取状态
  const { 
    selectedAgile, 
    selectedAgileDetail, 
    selectedAgileDetailStatus, 
    sprintTasks, 
    sprintTasksStatus,
    allTags,
    tagsStatus
  } = useSelector(state => state.agiles);
  
  const { users } = useSelector(state => state.users);
  
  // 获取团队信息
  const team = useSelector(state => state.teams.teams.find(t => t.id.toString() === teamId?.toString()));
  
  // 获取当前用户信息
  const { user: currentUser } = useGetUser();
  
  // 检查当前用户是否是团队创建者
  const isTeamCreator = currentUser?.id && team?.created_by && 
    currentUser.id.toString() === team.created_by.toString();
  
  // 修改获取agile详情的useEffect
  useEffect(() => {
    // 从URL参数或props中获取teamId和type
    const searchParams = new URLSearchParams(window.location.search);
    const teamId = searchParams.get('teamId') || sprint?.team_id;
    const type = searchParams.get('type');
    
    setHasError(false); // 重置错误状态
        
    if (teamId) {
      // 如果有teamId，优先获取对应团队的agile
      if ((!selectedAgile || selectedAgile.team_id !== Number(teamId))) {
        // 使用teamId获取agile
        dispatch({ 
          type: 'agiles/setSelectedAgile', 
          payload: { 
            id: sprint?.id, 
            team_id: Number(teamId) 
          } 
        });
        
        if (sprint?.id) {
          dispatch(fetchSelectedTeamAgileById(sprint.id))
            .unwrap()
            .catch(error => {
              console.error('获取冲刺详情失败:', error);
              setHasError(true);
            });
        }
      }
    }
  }, [sprint, dispatch, selectedAgile]);
  
  // 首先修改获取所有标签的逻辑，确保标签已加载
  useEffect(() => {    
    // 始终尝试加载标签数据
    if ((!allTags || allTags.length === 0) && tagsStatus !== 'loading') {
      dispatch(fetchAllTags())
        .unwrap()
        .catch(error => {
          console.error('获取标签数据失败:', error);
          setHasError(true);
        });
    }
  }, [allTags, tagsStatus, dispatch]);
  
  // 新增：当标签列表加载完成后，找到Name标签的ID
  useEffect(() => {
    if (allTags && allTags.length > 0) {
      // 查找名称为"Name"或"名称"的标签
      const nameTag = allTags.find(tag => 
        tag && (tag.name === 'Name' || tag.name === '名称')
      );
      
      if (nameTag) {
        setNameTagId(nameTag.id);
      } else {
        // 尝试寻找名称中包含"name"的标签
        const nameRelatedTag = allTags.find(tag => 
          tag && tag.name && tag.name.toLowerCase().includes('name')
        );
        
        if (nameRelatedTag) {
          setNameTagId(nameRelatedTag.id);
        }
      }

      // 查找"Status"或"状态"标签
      const statusTag = allTags.find(tag => 
        tag && (tag.name === 'Status' || tag.name === '状态')
      );
      if (statusTag) {
        setStatusTagId(statusTag.id);
      }

      // 查找"Start Date"或"开始日期"标签
      const startDateTag = allTags.find(tag => 
        tag && (tag.name === 'Start Date' || tag.name === '开始日期' || tag.name.toLowerCase().includes('start'))
      );
      if (startDateTag) {
        setStartDateTagId(startDateTag.id);
      }

      const descriptionTag = allTags.find(tag => 
        tag && (tag.name === 'Description' || tag.name === '描述')
      );
      if (descriptionTag) {
        setDescriptionTagId(descriptionTag.id);
      }
    }
  }, [allTags]);
  
  // 修改获取任务ID的逻辑，使其在sprint和selectedAgileDetail都可用时工作
  useEffect(() => {
    // 优先从sprint对象获取task_ids
    const taskIdsObj = sprint?.task_ids || selectedAgileDetail?.task_ids;
    
    
    
    if (taskIdsObj && Object.keys(taskIdsObj).length > 0) {
      const allTaskIds = [];
      
      // 处理新的状态键名
      const statusKeys = ['ToDo', 'InProgress', 'Done'];
      
      statusKeys.forEach(status => {
        if (taskIdsObj[status]) {
          try {
            // 处理任务ID字符串，兼容多种格式："173, 174, 175" 或 ["173", "174", "175"]
            let idsArray = [];
            if (typeof taskIdsObj[status] === 'string') {
              idsArray = taskIdsObj[status].split(',').map(id => id.trim());
            } else if (Array.isArray(taskIdsObj[status])) {
              idsArray = taskIdsObj[status].map(id => id.toString().trim());
            }
            
            allTaskIds.push(...idsArray);
          } catch (error) {
            console.error(`解析${status}任务ID出错:`, error);
          }
        }
      });
      
      // 去重并过滤空值
      const uniqueTaskIds = [...new Set(allTaskIds)].filter(id => id && id !== '');
      
      
      // 获取每个任务的详情
      uniqueTaskIds.forEach(taskId => {
        if (taskId && !sprintTasks.some(task => task.id === Number(taskId))) {
          
          dispatch(fetchTaskById(taskId))
            .unwrap()
            .then(task => {
              
            })
            .catch(error => {
              console.error(`获取任务 ${taskId} 详情失败:`, error);
              // 不设置全局错误状态，以免影响整体显示
            });
        }
      });
    }
  }, [sprint, selectedAgileDetail, sprintTasks, dispatch]);
  
  // 获取任务名称
  const getTaskName = (task) => {
    if (!task) return '未命名任务';
        
    // 检查是否有标签数据
    if (!allTags || !Array.isArray(allTags) || allTags.length === 0) {
      return task.title || '未命名任务';
    }
    
    // 检查任务是否有tag_values
    if (!task.tag_values) {
      return task.title || '未命名任务';
    }
        
    try {
      // 查找名为"Name"或"名称"的标签
      const nameTag = allTags.find(tag => 
        tag && (tag.name === 'Name' || tag.name === '名称')
      );
      
      if (nameTag && nameTag.id && task.tag_values[nameTag.id]) {
        const nameValue = task.tag_values[nameTag.id];
        return nameValue;
      }
      
      // 查找名称中包含"name"的任何标签
      for (let tag of allTags) {
        if (tag && tag.name && tag.name.toLowerCase().includes('name')) {
          if (task.tag_values[tag.id]) {
            const nameValue = task.tag_values[tag.id];
            return nameValue;
          }
        }
      }
      
      // 直接查找tag_values中的值
      for (const tagId in task.tag_values) {
        const value = task.tag_values[tagId];
        if (value && typeof value === 'string') {
          const tag = allTags.find(t => t && t.id && t.id.toString() === tagId.toString());
          const tagName = tag ? tag.name : '未知标签';
          return value;
        }
      }
      
      return task.title || '未命名任务';
    } catch (error) {
      console.error(`获取任务 ${task.id} 名称时发生错误:`, error);
      return task.title || '未命名任务';
    }
  };

  const getTaskDescription = (task) => {
    if (!task.tag_values) {
      return task.description || '-';
    }

    const descriptionTag = allTags.find(tag => 
      tag && (tag.name === 'Description' || tag.name === '描述')
    );

    if (descriptionTag && descriptionTag.id && task.tag_values[descriptionTag.id]) {
      const descriptionValue = task.tag_values[descriptionTag.id];
      return descriptionValue;
    }

    return task.description || '-';
  }
  
  // 修改按状态分类任务的逻辑
  useEffect(() => {
    // 优先从sprint对象获取task_ids
    const taskIds = sprint?.task_ids || selectedAgileDetail?.task_ids;
    
    
    
    
    if (taskIds) {
      
      const newTasksByStatus = {
        todo: [],
        in_progress: [],
        done: []
      };
      
      // 解析任务ID的通用函数
      const parseTaskIds = (idString) => {
        try {
          if (typeof idString === 'string') {
            return idString.split(',').map(id => Number(id.trim()));
          } else if (Array.isArray(idString)) {
            return idString.map(id => Number(id.toString().trim()));
          }
          return [];
        } catch (e) {
          console.error("解析任务ID出错:", e);
          return [];
        }
      };
      
      // 对于每个状态，找到对应的任务并创建副本
      if (taskIds['ToDo']) {
        const todoIds = parseTaskIds(taskIds['ToDo']);
        
        
        // 直接基于ID创建任务
        newTasksByStatus.todo = todoIds.map(id => {
          // 找到匹配的任务
          const task = sprintTasks.find(t => t.id == id || t.id == Number(id) || t.id.toString() == id.toString());
          
          if (task) {
            // 创建任务副本
            return {...task, status: 'todo'};
          } else {
            // 创建临时任务对象
            return {id: id, status: 'todo', title: `Task ${id}`, description: 'Loading...'};
          }
        });
      }
      
      if (taskIds['InProgress']) {
        const inProgressIds = parseTaskIds(taskIds['InProgress']);
        
        
        // 直接基于ID创建任务
        newTasksByStatus.in_progress = inProgressIds.map(id => {
          // 找到匹配的任务
          const task = sprintTasks.find(t => t.id == id || t.id == Number(id) || t.id.toString() == id.toString());
          
          if (task) {
            // 创建任务副本
            return {...task, status: 'in_progress'};
          } else {
            // 创建临时任务对象
            return {id: id, status: 'in_progress', title: `Task ${id}`, description: 'Loading...'};
          }
        });
      }
      
      if (taskIds['Done']) {
        const doneIds = parseTaskIds(taskIds['Done']);
        
        
        // 直接基于ID创建任务
        newTasksByStatus.done = doneIds.map(id => {
          // 找到匹配的任务
          const task = sprintTasks.find(t => t.id == id || t.id == Number(id) || t.id.toString() == id.toString());
          
          if (task) {
            // 创建任务副本
            return {...task, status: 'done'};
          } else {
            // 创建临时任务对象
            return {id: id, status: 'done', title: `Task ${id}`, description: 'Loading...'};
          }
        });
      }
      
      
      setTasksByStatus(newTasksByStatus);
    }
  }, [sprintTasks, selectedAgileDetail, sprint]);
  
  // 修改获取状态颜色的逻辑，直接从标签数据中提取
  const parseStatusFromLabel = (status, teamLabel) => {
    if (!status || !teamLabel) return { label: status, value: status, color: status };
    
    try {
      // 尝试解析JSON字符串
      if (typeof status === 'string') {
        try {
          const parsedStatus = JSON.parse(status);
          if (parsedStatus && parsedStatus.label && parsedStatus.color) {
            return parsedStatus;
          }
        } catch (e) {
          // 解析失败，继续检查是否在标签中存在
        }
      }
      
      // 从标签数据中查找状态
      let labelData = teamLabel;
      if (labelData.label && typeof labelData.label === 'object') {
        labelData = labelData.label;
      }
      
      if (labelData["SINGLE-SELECT"] && Array.isArray(labelData["SINGLE-SELECT"])) {
        for (const optionStr of labelData["SINGLE-SELECT"]) {
          try {
            if (!optionStr) continue;
            
            const option = typeof optionStr === 'string' ? JSON.parse(optionStr) : optionStr;
            if (option && option.value === status) {
              return {
                label: option.label,
                value: option.value,
                color: option.color
              };
            }
          } catch (e) {
            continue;
          }
        }
      }
      
      // 如果找不到匹配项，返回默认值
      return {
        label: status,
        value: status,
        color: status
      };
    } catch (error) {
      console.error('解析状态标签错误:', error);
      return {
        label: status,
        value: status,
        color: status
      };
    }
  };

  // 添加缺少的排序函数
  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // 添加缺少的获取排序后的任务函数
  const getSortedTasks = (tasks) => {
    if (!sortConfig.key) return tasks;
    
    return [...tasks].sort((a, b) => {
      let aValue, bValue;
      
      // 根据不同的列获取对应的值
      switch (sortConfig.key) {
        case 'name':
          aValue = getTaskName(a) || '';
          bValue = getTaskName(b) || '';
          break;
        case 'startDate':
          aValue = getTaskStartDate(a) || '';
          bValue = getTaskStartDate(b) || '';
          break;
        case 'status':
          // 获取状态显示值
          aValue = getTaskTagValue(a, statusTagId) || TASK_STATUS[a.status] || a.status || '';
          bValue = getTaskTagValue(b, statusTagId) || TASK_STATUS[b.status] || b.status || '';
          break;
        case 'description':
          aValue = getTaskDescription(a) || '';
          bValue = getTaskDescription(b) || '';
          break;
        case 'assignee':
          aValue = getUserDisplayName(a) || '';
          bValue = getUserDisplayName(b) || '';
          break;
        default:
          aValue = a[sortConfig.key] || '';
          bValue = b[sortConfig.key] || '';
      }
      
      // 字符串比较
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        if (sortConfig.direction === 'asc') {
          return aValue.localeCompare(bValue);
        }
        return bValue.localeCompare(aValue);
      }
      
      // 数字比较
      if (sortConfig.direction === 'asc') {
        return aValue - bValue;
      }
      return bValue - aValue;
    });
  };

  // 添加获取任务特定标签值函数
  const getTaskTagValue = (task, tagId) => {
    if (!task || !task.tag_values || !tagId) return '-';
    
    const value = task.tag_values[tagId];
    if (!value) return '-';
    
    // 检查是否是JSON格式的状态值
    if (typeof value === 'string' && value.includes('"label"') && value.includes('"color"')) {
      try {
        const statusObj = JSON.parse(value);
        if (statusObj && statusObj.label) {
          return statusObj.label;
        }
      } catch (e) {
        // JSON解析失败，返回原始值
      }
    }
    
    return value;
  };

  // 获取并格式化任务的开始日期
  const getTaskStartDate = (task) => {
    if (!task) return '-';
    
    // 首先检查任务是否有直接的start_date字段
    if (task.start_date) {
      try {
        const date = new Date(task.start_date);
        if (!isNaN(date.getTime())) {
          return date.toLocaleDateString();
        }
        return task.start_date;
      } catch (e) {
        return task.start_date;
      }
    }
    
    // 然后检查tag_values中是否有startDateTagId对应的值
    if (task.tag_values && startDateTagId && task.tag_values[startDateTagId]) {
      const dateValue = task.tag_values[startDateTagId];
      // 尝试格式化日期
      try {
        const date = new Date(dateValue);
        // 检查是否为有效日期
        if (!isNaN(date.getTime())) {
          return date.toLocaleDateString();
        }
        return dateValue;
      } catch (e) {
        return dateValue;
      }
    }
    
    // 检查是否有其他可能的日期标签
    // 日期相关标签的常见ID或名称
    const possibleDateTagIds = [
      // 可能的标准日期标签ID
      startDateTagId,
      // 如果有其他已知的日期相关标签ID，可以添加在这里
      // 例如，allTags.find(tag => tag.name === 'Due Date')?.id
    ];
    
    if (task.tag_values) {
      for (const tagId in task.tag_values) {
        // 跳过已检查的标签
        if (tagId === startDateTagId) continue;
        
        const value = task.tag_values[tagId];
        if (value && typeof value === 'string') {
          // 尝试查找已知的日期标签
          const tag = allTags?.find(t => t && t.id && t.id.toString() === tagId.toString());
          const tagName = tag ? tag.name : '';
          
          // 检查标签名称是否包含日期相关关键字
          if (tagName && (
            tagName.toLowerCase().includes('date') || 
            tagName.toLowerCase().includes('开始') || 
            tagName.toLowerCase().includes('start') ||
            tagName.toLowerCase().includes('日期')
          )) {
            try {
              const date = new Date(value);
              if (!isNaN(date.getTime())) {
                return date.toLocaleDateString();
              }
            } catch (e) {
              // 忽略错误，继续检查其他标签
            }
          }
          
          // 尝试解析值，看是否是有效的日期格式
          if (value.match(/^\d{4}[-/]\d{1,2}[-/]\d{1,2}/) || 
              value.match(/^\d{1,2}[-/]\d{1,2}[-/]\d{4}/)) {
            try {
              const date = new Date(value);
              if (!isNaN(date.getTime())) {
                return date.toLocaleDateString();
              }
            } catch (e) {
              // 忽略错误，继续检查下一个标签
            }
          }
        }
      }
    }
    
    // 最后尝试查找任何可能包含日期的字段
    const dateFields = ['created_at', 'updated_at', 'date', 'begin_date', 'begin_at'];
    for (const field of dateFields) {
      if (task[field]) {
        try {
          const date = new Date(task[field]);
          if (!isNaN(date.getTime())) {
            return date.toLocaleDateString();
          }
        } catch (e) {
          // 忽略错误，继续尝试其他字段
        }
      }
    }
    
    return '-';
  };

  // 获取团队所有任务
  const fetchAllTeamTasks = async () => {
    try {
      setLoadingAllTasks(true);
      
      // 使用Redux函数获取当前团队的所有sections
      dispatch(getSectionByTeamId(teamId)).then(sectionsAction => {
        const sections = sectionsAction.payload || [];
        setAllSections(sections);
        
        // 对每个section获取任务
        let allTasks = [];
        const fetchPromises = sections.map(section => {
          return dispatch(fetchTasksBySectionId(section.id)).then(tasksAction => {
            if (tasksAction.payload) {
              // 为每个任务添加所属section信息
              const sectionTasks = tasksAction.payload.map(task => ({
                ...task,
                section_name: section.name
              }));
              allTasks = [...allTasks, ...sectionTasks];
            }
          }).catch(error => {
            console.error(t('errorFetchTasksFailed'), error);
          });
        });
        
        // 等待所有任务获取完成
        Promise.all(fetchPromises).then(() => {
          setTeamTasks(allTasks);
          setLoadingAllTasks(false);
        });
      }).catch(error => {
        console.error(t('errorFetchSectionsFailed'), error);
        toast.error(t('errorFetchSectionsFailed'));
        setLoadingAllTasks(false);
      });
    } catch (error) {
      console.error(t('errorFetchTasksFailed'), error);
      toast.error(t('errorFailedToLoadAllTasks'));
      setLoadingAllTasks(false);
    }
  };

  // 处理"查看所有任务"按钮点击
  const handleViewAllTasks = () => {
    setIsAllTasksOpen(true);
    if (teamTasks.length === 0) {
      fetchAllTeamTasks();
    }
  };

  // 修改编辑任务对话框渲染函数
  const renderEditTaskDialog = () => {
    if (!taskToEdit) return null;
    
    return (
      <Dialog open={isEditTaskDialogOpen} onOpenChange={setIsEditTaskDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('editTask')}</DialogTitle>
            <DialogDescription>{t('editTaskDescription')}</DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            {/* 任务名称 */}
            <div className="space-y-2">
              <Label htmlFor="taskName">{t('taskName')}</Label>
              <Input
                id="taskName"
                value={editTaskData.name}
                onChange={(e) => handleEditFormChange('name', e.target.value)}
                placeholder={t('enterTaskName')}
                maxLength={50}
              />
              <div className="flex justify-end">
                <span className="text-xs text-muted-foreground">
                  {editTaskData.name ? editTaskData.name.trim().length : 0}/50
                </span>
              </div>
              {editFormErrors.name && (
                <p className="text-destructive text-sm">{editFormErrors.name}</p>
              )}
            </div>
            
            {/* 任务描述 */}
            <div className="space-y-2">
              <Label htmlFor="taskDescription">{t('description')}</Label>
              <Textarea
                id="taskDescription"
                value={editTaskData.description}
                onChange={(e) => handleEditFormChange('description', e.target.value)}
                placeholder={t('enterTaskDescription')}
                rows={3}
                maxLength={100}
              />
              <div className="flex justify-end">
                <span className="text-xs text-muted-foreground">
                  {editTaskData.description ? editTaskData.description.trim().length : 0}/100
                </span>
              </div>
              {editFormErrors.description && (
                <p className="text-destructive text-sm">{editFormErrors.description}</p>
              )}
            </div>
            
            {/* 状态和分配人 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="taskStatus">{t('status')}</Label>
                {/* 使用StatusSelect组件，传递当前值 */}
                <StatusSelect
                  teamId={teamId}
                  value={editTaskData.status}
                  onChange={(value) => handleEditFormChange('status', value)}
                  trigger={true} // 显式启用触发器
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="taskAssignee">{t('assignTo')}</Label>
                <Select
                  value={editTaskData.assignee || 'none'}
                  onValueChange={(value) => handleEditFormChange('assignee', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('selectAssignee')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t('unassigned')}</SelectItem>
                    {agileMembers.map(member => (
                      <SelectItem key={member.user_id} value={member.user_id}>
                        {member.name || (member.user_id && getMemberInfo(member.user_id)?.name) || t('unnamed')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsEditTaskDialogOpen(false)}
              disabled={loading}
            >
              {t('cancel')}
            </Button>
            <Button 
              onClick={handleUpdateTask}
              disabled={loading}
              variant={themeColor}
            >
              {loading ? t('updating') : t('update')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  // 修改提交任务更新函数，使用parseStatusFromLabel
  const handleUpdateTask = async () => {
    // 表单验证
    if (!validateEditForm()) {
      return;
    }
    
    try {
      setLoading(true);
      
      const taskId = taskToEdit.id;
      
      // 获取当前任务以作为oldTask传递给Redux
      const previousTaskData = await dispatch(fetchTaskById(taskId)).unwrap();
      
      // 获取标签IDs
      const statusTagId = allTags.find(tag => 
        tag && (tag.name === 'Status' || tag.name === '状态')
      )?.id;
      
      // 准备更新数据 - 仅更新tag_values
      const updatedTagValues = { ...(taskToEdit.tag_values || {}) };
      
      // 更新名称
      if (nameTagId) {
        updatedTagValues[nameTagId] = editTaskData.name;
      }
      
      // 更新描述
      if (descriptionTagId) {
        updatedTagValues[descriptionTagId] = editTaskData.description;
      }
      
      // 更新状态
      if (statusTagId) {
        const statusValue = editTaskData.status;
        
        // 根据状态的类型进行不同处理
        if (typeof statusValue === 'object' && statusValue !== null) {
          // 如果已经是对象，直接转为JSON字符串
          updatedTagValues[statusTagId] = JSON.stringify(statusValue);
        } else if (typeof statusValue === 'string' && statusValue.includes('"value"')) {
          // 已经是JSON字符串格式
          updatedTagValues[statusTagId] = statusValue;
        } else if (typeof statusValue === 'string') {
          // 从状态选项中查找对应的状态对象以获取正确的颜色
          const statusOption = statusOptions.find(opt => opt.value === statusValue);
          if (statusOption) {
            // 使用找到的状态选项，包括其颜色
            updatedTagValues[statusTagId] = JSON.stringify(statusOption);
          } else {
            // 如果找不到匹配的选项，使用默认颜色
            const defaultColor = '#6b7280';
            const statusObject = {
              label: statusValue,
              value: statusValue,
              color: defaultColor
            };
            updatedTagValues[statusTagId] = JSON.stringify(statusObject);
          }
        }
      }
      
      // 更新分配人
      if (editTaskData.assignee !== taskToEdit.tag_values?.['2']) {
        const assigneeValue = editTaskData.assignee === 'none' ? [] : [editTaskData.assignee];
        updatedTagValues['2'] = assigneeValue;
      }
      
      // 构建最终更新数据
      const updatedTaskData = {
        tag_values: updatedTagValues
      };
      
      // 如果没有nameTagId，则更新title字段
      if (!nameTagId) {
        updatedTaskData.title = editTaskData.name;
      }
      
      // 如果没有descriptionTagId，则更新description字段
      if (!descriptionTagId) {
        updatedTaskData.description = editTaskData.description;
      }
      
      // 使用Redux action更新任务
      await dispatch(updateTask({
        taskId: taskId,
        taskData: updatedTaskData,
        oldTask: {
          previousTaskData
        }
      })).unwrap();
      
      // 更新本地任务列表 - 需要更新tag_values和状态
      const updatedTaskObj = {
        ...taskToEdit,
        tag_values: updatedTagValues
      };
      
      if (!nameTagId) {
        updatedTaskObj.title = editTaskData.name;
      }
      
      if (!descriptionTagId) {
        updatedTaskObj.description = editTaskData.description;
      }
      
      const updatedTasks = sprintTasks.map(t => 
        t.id === taskId ? updatedTaskObj : t
      );
      
      // 按状态分组 - 保持原有的sprint board状态
      const newTasksByStatus = { ...tasksByStatus };
      
      // 更新状态
      setTasksByStatus(newTasksByStatus);
      
      // 更新团队任务列表
      if (teamTasks.length > 0) {
        const updatedTeamTasks = teamTasks.map(t => 
          t.id === taskId ? updatedTaskObj : t
        );
        setTeamTasks(updatedTeamTasks);
      }
      
      // 关闭对话框
      setIsEditTaskDialogOpen(false);
      setTaskToEdit(null);
      
      // 显示成功消息
      toast.success(t('taskUpdatedSuccessfully'));
      
    } catch (error) {
      console.error('更新任务失败:', error);
      toast.error(error.message || t('taskUpdateFailed'));
    } finally {
      setLoading(false);
    }
  };

  // 监听sprintTasks变化并更新页面
  useEffect(() => {
    if (sprintTasks.length > 0) {
      // 检查有没有新任务需要加入到tasksByStatus中
      const currentTaskIds = [
        ...tasksByStatus.todo.map(t => t.id),
        ...tasksByStatus.in_progress.map(t => t.id),
        ...tasksByStatus.done.map(t => t.id)
      ];
      
      const newTasks = sprintTasks.filter(task => !currentTaskIds.includes(task.id));
      
      if (newTasks.length > 0) {
        
        // 将新任务加入到对应的状态分组
        const updatedTasksByStatus = { ...tasksByStatus };
        
        newTasks.forEach(task => {
          if (task.status === 'todo') {
            updatedTasksByStatus.todo.push(task);
          } else if (task.status === 'in_progress') {
            updatedTasksByStatus.in_progress.push(task);
          } else if (task.status === 'done') {
            updatedTasksByStatus.done.push(task);
          }
        });
        
        setTasksByStatus(updatedTasksByStatus);
      }
    }
  }, [sprintTasks]);

  // 更新任务分配
  const updateTaskAssignee = async (taskId, userId) => {
    try {
      setLoading(true);
      
      // 如果值是"none"，将其转换为空数组
      const assigneeValue = userId === 'none' ? [] : [userId];
      
      // 查找要更新的任务
      const task = sprintTasks.find(t => t.id === taskId);
      if (!task) {
        throw new Error('任务未找到');
      }
      
      // 获取当前任务以作为oldTask传递给Redux
      const previousTaskData = await dispatch(fetchTaskById(taskId)).unwrap();
      
      // 准备要更新的数据 - 仅更新tag_values
      const updatedTaskData = {
        tag_values: {
          ...(task.tag_values || {}),
          '2': assigneeValue // 使用数组格式保存assignee值
        }
      };
      
      // 使用Redux action更新任务
      await dispatch(updateTask({
        taskId: taskId,
        taskData: updatedTaskData,
        oldTask: {
          previousTaskData
        }
      })).unwrap();
      
      // 更新本地状态
      // 查找任务当前所在的状态组
      let currentStatusGroup = null;
      if (tasksByStatus.todo.some(t => t.id === taskId)) {
        currentStatusGroup = 'todo';
      } else if (tasksByStatus.in_progress.some(t => t.id === taskId)) {
        currentStatusGroup = 'in_progress';
      } else if (tasksByStatus.done.some(t => t.id === taskId)) {
        currentStatusGroup = 'done';
      }
      
      if (!currentStatusGroup) {
        console.warn(`任务 ${taskId} 不在任何状态组中`);
        return;
      }
      
      // 更新任务而不改变其状态组
      setTasksByStatus(prevState => {
        // 创建深拷贝以避免直接修改状态
        const updatedState = {
          todo: [...prevState.todo],
          in_progress: [...prevState.in_progress],
          done: [...prevState.done]
        };
        
        // 查找并更新特定状态组中的任务
        updatedState[currentStatusGroup] = updatedState[currentStatusGroup].map(t => {
          if (t.id === taskId) {
            // 只更新tag_values，保持其他属性不变
            return {
              ...t,
              tag_values: {
                ...(t.tag_values || {}),
                '2': assigneeValue
              }
            };
          }
          return t;
        });
        
        return updatedState;
      });
      
      toast.success(t('taskAssigneeUpdated'));
      
      // 如果设置了新的用户ID，触发获取用户信息
      if (assigneeValue.length > 0) {
        setTimeout(() => {
          fetchMemberInfo(assigneeValue[0]);
        }, 0);
      }
    } catch (error) {
      console.error('更新任务分配失败:', error);
      toast.error(t('taskAssigneeUpdateError'));
    } finally {
      setLoading(false);
    }
  };

  // 获取成员信息 - 修改为优先使用redux中的user信息
  const getMemberInfo = (userId) => {
    if (!userId) return null;
    
    // 检查是否为数组格式
    if (Array.isArray(userId)) {
      if (userId.length === 0) return null;
      
      // 对于数组格式，获取每个用户的信息并组合
      const usersList = userId.map(id => {
        // 为每个ID获取用户信息
        const userInfo = users?.find(u => u.id === id.toString()) || 
                    userCache[id.toString()] || 
                    agileMembers.find(member => member.user_id === id.toString());
        return userInfo || { id: id.toString(), name: 'Loading...' };
      });
      
      return {
        id: userId.join(','),
        users: usersList,
        isMultiple: true,
        count: usersList.length
      };
    }
    
    // 检查是否为多个ID（逗号分隔）- 兼容旧格式
    if (typeof userId === 'string' && userId.includes(',')) {
      // 对于多个ID，获取每个用户的信息并组合
      const userIds = userId.split(',').filter(id => id.trim());
      const usersList = userIds.map(id => {
        // 为每个ID获取用户信息
        const userInfo = users?.find(u => u.id === id.trim()) || 
                    userCache[id.trim()] || 
                    agileMembers.find(member => member.user_id === id.trim());
        return userInfo || { id: id.trim(), name: 'Loading...' };
      });
      
      return {
        id: userId,
        users: usersList,
        isMultiple: true,
        count: usersList.length
      };
    }
    
    // 检查是否已经在Redux store中有此用户
    const userFromStore = users?.find(user => user.id === userId);
    if (userFromStore) {
      return userFromStore;
    }
    
    // 检查是否在本地缓存中
    if (userCache[userId]) {
      return userCache[userId];
    }
    
    // 如果都没有，从agileMembers尝试获取
    const memberInfo = agileMembers.find(member => member.user_id === userId);
    if (memberInfo) {
      return memberInfo;
    }
    
    // 返回一个简单对象，不在渲染期间调用setState
    return { id: userId, name: 'Loading...' };
  };

  // 单独的函数用于请求用户数据，避免在渲染时调用
  const fetchMemberInfo = (userId) => {
    if (!userId) return;
    
    // 处理数组格式
    if (Array.isArray(userId)) {
      userId.forEach(id => {
        if (id && id.toString().trim()) {
          // 递归调用但传入单个ID
          fetchMemberInfo(id.toString().trim());
        }
      });
      return;
    }
    
    // 确保userId是字符串类型
    const id = String(userId);
    
    // 如果ID包含逗号，说明是多个ID，这里应处理为单个ID
    if (id.includes(',')) {
      console.warn('检测到多个用户ID，获取每个用户数据:', id);
      // 拆分ID并分别获取
      const ids = id.split(',');
      ids.forEach(singleId => {
        if (singleId && singleId.trim()) {
          // 递归调用但传入单个ID
          fetchMemberInfo(singleId.trim());
        }
      });
      return;
    }
    
    // 如果用户既不在Redux也不在缓存中，则通过API获取
    if (!users?.find(user => user.id === id) && !userCache[id]) {
      try {
        dispatch(fetchUserById(id));
      } catch (err) {
        console.error(`获取用户信息失败: ${id}`, err);
      }
    }
  };

  // 在useEffect中触发用户数据获取
  useEffect(() => {
    // 收集所有需要获取的用户ID
    const userIdsToFetch = new Set();
    
    // 从任务中收集所需获取的用户ID
    if (sprintTasks && Array.isArray(sprintTasks)) {
      sprintTasks.forEach(task => {
        // 从assignee获取
        if (task.assignee) {
          userIdsToFetch.add(String(task.assignee));
        }
        
        // 从tag_values['2']获取
        if (task.tag_values && task.tag_values['2']) {
          // 检查是否是逗号分隔的多个ID
          const assigneeValue = String(task.tag_values['2']);
          if (assigneeValue.includes(',')) {
            // 分割并添加每个ID
            assigneeValue.split(',').forEach(id => {
              if (id && id.trim()) {
                userIdsToFetch.add(id.trim());
              }
            });
          } else {
            userIdsToFetch.add(assigneeValue);
          }
        }
      });
    }
    
    // 从团队成员中收集
    if (agileMembers && Array.isArray(agileMembers)) {
      agileMembers.forEach(member => {
        if (member.user_id) {
          userIdsToFetch.add(String(member.user_id));
        }
      });
    }
    
    // 从teamTasks中收集
    if (teamTasks && Array.isArray(teamTasks)) {
      teamTasks.forEach(task => {
        if (task.assignee) {
          userIdsToFetch.add(String(task.assignee));
        }
        if (task.tag_values && task.tag_values['2']) {
          // 检查是否是逗号分隔的多个ID
          const assigneeValue = String(task.tag_values['2']);
          if (assigneeValue.includes(',')) {
            // 分割并添加每个ID
            assigneeValue.split(',').forEach(id => {
              if (id && id.trim()) {
                userIdsToFetch.add(id.trim());
              }
            });
          } else {
            userIdsToFetch.add(assigneeValue);
          }
        }
      });
    }
    
    
    
    // 过滤已经在Redux store或本地缓存中的用户
    const userIdsToActuallyFetch = Array.from(userIdsToFetch).filter(userId => {
      // 已在Redux store中
      if (users?.find(user => user.id.toString() === userId)) {
        return false;
      }
      
      // 已在本地缓存中
      if (userCache[userId]) {
        return false;
      }
      
      return true;
    });
    
    
    
    // 一次性批量获取用户信息，而不是一个个获取
    if (userIdsToActuallyFetch.length > 0) {
      // 一次最多获取10个用户，避免请求过大
      const batchSize = 10;
      for (let i = 0; i < userIdsToActuallyFetch.length; i += batchSize) {
        const batch = userIdsToActuallyFetch.slice(i, i + batchSize);
        
        
        // 获取这一批用户
        batch.forEach(userId => {
          if (userId) {
            try {
              dispatch(fetchUserById(userId));
            } catch (err) {
              console.error(`获取用户信息失败: ${userId}`, err);
            }
          }
        });
      }
    }
  }, [sprintTasks, teamTasks, agileMembers, users, userCache, dispatch]);

  // 获取用户显示名称的辅助函数
  const getUserDisplayName = (task) => {
    if (!task) return t('unassigned');
    
    // 优先使用tag_values['2']，如果存在
    const userId = task.tag_values && task.tag_values['2'] ? task.tag_values['2'] : task.assignee;
    if (!userId) return t('unassigned');
    
    // 将userId转换为字符串以确保一致性
    const id = String(userId);
    const user = getMemberInfo(id);
    
    // 如果是多个用户，显示最多2个用户的实际名称
    if (user?.isMultiple && user.users) {
      const names = user.users.map(u => u.name || '未知用户');
      if (names.length === 0) return t('unassigned');
      
      if (names.length === 1) return names[0];
      
      if (names.length === 2) return `${names[0]}, ${names[1]}`;
      
      // 如果超过2个，显示前2个加"等N人"
      return `${names[0]}, ${names[1]}${names.length > 2 ? ` +${names.length - 2}` : ''}`;
    }
    
    // 返回用户名称，如果没有则返回默认值
    return user?.name || t('unassigned');
  };

  // 获取用户名称首字母的辅助函数
  const getUserInitial = (task) => {
    if (!task) return 'U';
    
    // 优先使用tag_values['2']，如果存在
    const userId = task.tag_values && task.tag_values['2'] ? task.tag_values['2'] : task.assignee;
    if (!userId) return 'U';
    
    // 将userId转换为字符串以确保一致性
    const id = String(userId);
    const user = getMemberInfo(id);
    
    // 如果是多个用户，返回前两个用户的首字母组合
    if (user?.isMultiple && user.users) {
      if (user.users.length === 0) return 'U';
      
      if (user.users.length === 1) {
        return user.users[0]?.name?.charAt(0) || 'U';
      }
      
      // 如果有两个或更多用户，返回前两个用户的首字母
      const firstInitial = user.users[0]?.name?.charAt(0) || '';
      const secondInitial = user.users[1]?.name?.charAt(0) || '';
      
      if (user.users.length > 2) {
        return `${firstInitial}${secondInitial}`;
      }
      
      return `${firstInitial}${secondInitial}`;
    }
    
    // 安全地获取首字母
    return user?.name?.charAt(0) || 'U';
  };

  // 优先级标签颜色
  const priorityColor = (priority) => {
    switch(priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // 打开编辑任务对话框
  const openEditTaskDialog = (task) => {
    // 获取任务数据
    const taskName = getTaskName(task);
    const taskDescription = getTaskDescription(task);
    
    // 获取任务分配人 - 从tag_values['2']获取，支持数组格式
    let assigneeValue = 'none';
    if (task.tag_values && task.tag_values['2']) {
      if (Array.isArray(task.tag_values['2']) && task.tag_values['2'].length > 0) {
        // 从数组中获取第一个值
        assigneeValue = task.tag_values['2'][0];
      } else {
        // 兼容旧格式
        assigneeValue = task.tag_values['2'];
      }
    } else if (task.assignee) {
      assigneeValue = task.assignee;
    }
    
    // 获取任务状态 - 从标签系统获取
    let taskStatus = ''; // 默认状态为空
    
    // 从任务的tag_values中获取状态
    if (task.tag_values && statusTagId && task.tag_values[statusTagId]) {
      try {
        const statusValue = task.tag_values[statusTagId];
        if (typeof statusValue === 'string') {
          if (statusValue.includes('"value"')) {
            // 尝试解析JSON
            const statusObj = JSON.parse(statusValue);
            if (statusObj && statusObj.value) {
              taskStatus = statusObj;  // 保存完整的状态对象，而不仅仅是值
            }
          } else {
            // 纯文本状态
            taskStatus = statusValue;
          }
        } else if (typeof statusValue === 'object') {
          // 已经是对象了
          taskStatus = statusValue;
        }
      } catch (e) {
        console.error('解析状态值出错:', e);
      }
    }
    
    // 初始化编辑表单数据
    setEditTaskData({
      id: task.id,
      name: taskName || '',
      description: taskDescription !== '-' ? taskDescription : '',
      status: taskStatus,
      assignee: assigneeValue
    });
    
    setTaskToEdit(task);
    
    // 如果所有任务对话框是打开的，则先关闭它
    if (isAllTasksOpen) {
      setIsAllTasksOpen(false);
    }
    
    // 打开编辑对话框
    setIsEditTaskDialogOpen(true);
  };

  // 验证表单数据
  const validateEditForm = () => {
    const errors = {};
    
    // 验证任务名称
    if (!editTaskData.name || editTaskData.name.trim() === '') {
      errors.name = t('taskNameRequired');
    } else if (editTaskData.name.trim().length > 50) {
      errors.name = t('taskNameTooLong');
    }
    
    // 验证任务描述
    if (editTaskData.description && editTaskData.description.trim().length > 100) {
      errors.description = t('descriptionTooLong');
    }
    
    // 验证工时估计
    if (editTaskData.estimate && !/^(\d+(\.\d+)?|\.\d+)$/.test(editTaskData.estimate)) {
      errors.estimate = t('estimateInvalid');
    }
    
    setEditFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // 处理表单字段变化
  const handleEditFormChange = (field, value) => {
    // 特殊处理status字段
    if (field === 'status') {
      // 检查value是否是对象，可能是状态选项中的一个
      const statusOption = statusOptions.find(opt => opt.value === value);
      if (statusOption) {
        // 如果找到对应的状态选项，使用完整对象
        setEditTaskData(prev => ({
          ...prev,
          [field]: statusOption
        }));
      } else {
        // 如果未找到，直接存储值
        setEditTaskData(prev => ({
          ...prev,
          [field]: value
        }));
      }
    } else {
      // 其他字段正常处理
      setEditTaskData(prev => ({
        ...prev,
        [field]: value
      }));
    }
    
    // 当字段变化时清除该字段的错误
    if (editFormErrors[field]) {
      setEditFormErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
  };

  // 任务状态选项渲染函数
  const renderStatusOptions = (task) => {
    const statusOptions = [
      { value: 'todo', label: t('todo') },
      { value: 'in_progress', label: t('inProgress') },
      { value: 'done', label: t('done') }
    ];
    
    // 尝试获取自定义状态
    const customStatus = task?.tag_values?.[statusTagId];
    if (customStatus && typeof customStatus === 'string') {
      try {
        const statusObj = JSON.parse(customStatus);
        if (statusObj && statusObj.label) {
          // 使用Badge组件渲染，确保使用状态对象中的颜色
          return (
            <Badge 
              className="flex items-center"
              style={{ 
                backgroundColor: statusObj.color || '#e5e7eb', 
                color: getContrastColor(statusObj.color || '#e5e7eb') 
              }}
            >
              {statusObj.label}
            </Badge>
          );
        }
      } catch (e) {
        console.error('解析状态JSON失败:', e, customStatus);
        // JSON解析失败，使用Badge显示文本
        return <Badge variant="outline">{customStatus}</Badge>;
      }
    }
    
    // 如果没有自定义状态，使用默认状态颜色
    const statusValue = task?.status || 'todo';
    const statusVariant = getStatusVariant(statusValue);
    const statusLabel = TASK_STATUS[statusValue] || statusValue;
    
    return <Badge variant={statusVariant}>{statusLabel}</Badge>;
  };

  // 根据状态获取Badge变体
  const getStatusVariant = (status) => {
    switch(status) {
      case 'todo': return 'secondary'; 
      case 'in_progress': return 'default';
      case 'done': return 'success';
      default: return 'outline';
    }
  };

  // 计算对比色，确保文本在背景上清晰可见
  const getContrastColor = (hexColor) => {
    // 如果没有颜色或格式不正确，返回黑色
    if (!hexColor || !hexColor.startsWith('#')) {
      return '#000000';
    }
    
    // 从十六进制颜色中提取RGB值
    let r, g, b;
    if (hexColor.length === 4) { // #RGB格式
      r = parseInt(hexColor[1] + hexColor[1], 16);
      g = parseInt(hexColor[2] + hexColor[2], 16);
      b = parseInt(hexColor[3] + hexColor[3], 16);
    } else if (hexColor.length === 7) { // #RRGGBB格式
      r = parseInt(hexColor.substr(1, 2), 16);
      g = parseInt(hexColor.substr(3, 2), 16);
      b = parseInt(hexColor.substr(5, 2), 16);
    } else {
      return '#000000';
    }
    
    // 计算亮度 (YIQ公式)
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    
    // 根据亮度返回黑色或白色
    return (yiq >= 128) ? '#000000' : '#ffffff';
  };

  // 修改渲染任务卡片函数
  const renderTaskCard = (task) => {
    if (!task) {
      console.error("尝试渲染无效任务");
      return null;
    }
    
    try {
      
      const taskName = getTaskName(task);
      const taskDescription = getTaskDescription(task);
            
      return (
        <div key={task.id} className="p-3 mb-2 bg-muted-background rounded-md shadow-sm border">
          <div className="flex justify-between">
            <div className="font-medium truncate max-w-[80%]" title={taskName}>{taskName}</div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-6 w-6 p-0 flex-shrink-0"
              onClick={() => openEditTaskDialog(task)}
            >
              <Pen className="h-3 w-3" />
            </Button>
          </div>
          
          <div className="mt-2">
            <div className="text-sm text-gray-600 truncate" title={taskDescription}>
              {taskDescription || t('noDescription')}
            </div>
            
            <div className="mt-2 flex justify-between items-center">
              <Select 
                value={task.tag_values && task.tag_values['2'] ? 
                  (Array.isArray(task.tag_values['2']) && task.tag_values['2'].length > 0 ? task.tag_values['2'][0] : task.tag_values['2']) 
                  : (task.assignee || 'none')} 
                onValueChange={(value) => updateTaskAssignee(task.id, value)}
                disabled={loading}
              >
                <SelectTrigger className="w-full h-8 text-xs">
                  <SelectValue placeholder={t('assignTo')}>
                    {task.assignee || (task.tag_values && task.tag_values['2']) ? getUserDisplayName(task) : t('unassigned')}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('unassigned')}</SelectItem>
                  {agileMembers.map(member => (
                    <SelectItem key={member.user_id} value={member.user_id}>
                      {member.name || (member.user_id && getMemberInfo(member.user_id)?.name) || t('unnamed')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {(task.assignee || (task.tag_values && task.tag_values['2'])) && (
                <Avatar className="w-6 h-6 flex-shrink-0">
                  <AvatarImage src={getMemberInfo(task.tag_values && task.tag_values['2'] ? task.tag_values['2'] : task.assignee)?.avatar} />
                  <AvatarFallback className={getMemberInfo(task.tag_values && task.tag_values['2'] ? task.tag_values['2'] : task.assignee)?.isMultiple ? 'bg-blue-500 text-white text-[10px]' : ''}>
                    {getUserInitial(task)}
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          </div>
          
          {/* 状态操作按钮 */}
          <div className="mt-3 flex justify-end space-x-2">
            {selectedType === 'PENDING' && (task.status === 'todo' || !task.status) && (
              <Button 
                size="sm" 
                variant={themeColor} 
                className="text-xs flex-shrink-0" 
                onClick={() => updateTaskStatus(task.id, 'in_progress')}
                disabled={loading}
              >
                <ArrowRight className="w-3 h-3 mr-1" />
                {t('moveToProgress')}
              </Button>
            )}
            
            {selectedType === 'PENDING' && task.status === 'in_progress' && (
              <Button 
                size="sm" 
                variant={themeColor} 
                className="text-xs flex-shrink-0" 
                onClick={() => updateTaskStatus(task.id, 'done')}
                disabled={loading}
              >
                <CheckCircle className="w-3 h-3 mr-1" />
                {t('markAsDone')}
              </Button>
            )}
          </div>
        </div>
      );
    } catch (error) {
      console.error("渲染任务卡片错误:", task?.id, error);
      return (
        <div className="p-3 mb-2 bg-red-50 rounded-md shadow-sm border border-red-200">
          <div className="text-sm text-red-600">Loading task error: {error.message}</div>
        </div>
      );
    }
  };

  // 修改useEffect来完全重新加载sprint board
  useEffect(() => {
    // 当sprint变化时，通过dispatch一个action来重置sprintTasks并重新加载所有数据
    if (sprint?.id) {
      
      
      // 显示加载状态
      setLoading(true);
      
      // 清空Redux中的sprintTasks
      dispatch(clearSprintTasks());
      
      // 重置本地状态
      setTasksByStatus({
        todo: [],
        in_progress: [],
        done: []
      });
      
      // 重新获取sprint详情
      dispatch(fetchSelectedTeamAgileById(sprint.id))
        .unwrap()
        .then((sprintDetail) => {
          
          
          // 加载任务IDs
          const taskIdsObj = sprintDetail?.task_ids;
          if (taskIdsObj && Object.keys(taskIdsObj).length > 0) {
            const allTaskIds = [];
            
            // 处理任务ID - 对不同状态的任务进行处理
            const statusKeys = ['ToDo', 'InProgress', 'Done'];
            
            statusKeys.forEach(status => {
              if (taskIdsObj[status]) {
                try {
                  // 处理任务ID字符串
                  let idsArray = [];
                  if (typeof taskIdsObj[status] === 'string') {
                    idsArray = taskIdsObj[status].split(',').map(id => id.trim());
                  } else if (Array.isArray(taskIdsObj[status])) {
                    idsArray = taskIdsObj[status].map(id => id.toString().trim());
                  }
                  allTaskIds.push(...idsArray);
                } catch (error) {
                  console.error(`解析${status}任务ID出错:`, error);
                }
              }
            });
            
            // 去重并过滤空值
            const uniqueTaskIds = [...new Set(allTaskIds)].filter(id => id && id !== '');
            
            // 创建获取任务的Promise数组
            const taskPromises = uniqueTaskIds.map(taskId => 
              dispatch(fetchTaskById(taskId)).unwrap()
            );
            
            // 等待所有任务获取完成
            Promise.allSettled(taskPromises)
              .then(() => {
                
                setLoading(false);
              })
              .catch(error => {
                console.error('获取任务失败:', error);
                setLoading(false);
              });
          } else {
            
            setLoading(false);
          }
        })
        .catch(error => {
          console.error('获取Sprint详情失败:', error);
          setHasError(true);
          setLoading(false);
        });
    }
  }, [sprint?.id, dispatch]);

  // 修改addTaskToSprintBoard函数，在PENDING状态下禁用
  const addTaskToSprintBoard = async (task) => {
    try {
      // 如果当前Sprint处于PENDING状态，不允许添加任务
      if (selectedType === 'PENDING') {
        toast.error(t('cannotAddTasksToActiveSprint'));
        return;
      }
      
      setLoading(true);
      
      if (!sprint || !sprint.id) {
        toast.error(t('noSelectedSprint'));
        return;
      }
      
      // 使用isTaskInSprint函数检查任务是否已在冲刺中
      const taskExists = isTaskInSprint(task.id);
      if (taskExists) {
        toast.info(t('taskAlreadyInSprint'));
        return;
      }
      
      // 准备要更新的冲刺数据
      const taskIds = {...(sprint.task_ids || {})};
      
      // 确保ToDo数组存在
      if (!taskIds['ToDo']) {
        taskIds['ToDo'] = [];
      }
      
      // 将任务ID添加到ToDo列表
      if (Array.isArray(taskIds['ToDo'])) {
        taskIds['ToDo'] = [...taskIds['ToDo'], task.id.toString()];
      } else {
        // 如果ToDo是字符串，转换为数组
        taskIds['ToDo'] = taskIds['ToDo'] ? 
          [...taskIds['ToDo'].split(',').map(id => id.trim()), task.id.toString()] : 
          [task.id.toString()];
      }
      
      // 调用Redux action更新冲刺
      await dispatch(updateSprint({
        sprintId: sprint.id,
        sprintData: {
          task_ids: taskIds
        },
        teamId: teamId
      })).unwrap();
      
      // 更新本地状态
      // 添加任务到todo列表
      const taskWithStatus = {
        ...task,
        status: 'todo' // 设置默认状态为todo
      };
      
      setTasksByStatus(prev => ({
        ...prev,
        todo: [...prev.todo, taskWithStatus]
      }));
      
      toast.success(t('taskAddedToSprint'));
      
      // 关闭所有任务对话框
      setIsAllTasksOpen(false);
      
    } catch (error) {
      console.error('添加任务到冲刺失败:', error);
      toast.error(t('addTaskToSprintError'));
    } finally {
      setLoading(false);
    }
  };

  // 添加状态管理相关状态
  const [isStatusManagerOpen, setIsStatusManagerOpen] = useState(false);

  // 添加更新任务状态的函数
  const updateTaskStatus = async (taskId, newStatus) => {
    try {
      setLoading(true);
      
      if (!sprint || !sprint.id) {
        toast.error(t('noSelectedSprint'));
        return;
      }
      
      // 查找要更新的任务
      const task = sprintTasks.find(t => t.id === taskId);
      if (!task) {
        toast.error(t('taskNotFound'));
        return;
      }
      
      // 获取当前状态
      let currentStatus = '';
      if (tasksByStatus.todo.some(t => t.id === taskId)) {
        currentStatus = 'ToDo';
      } else if (tasksByStatus.in_progress.some(t => t.id === taskId)) {
        currentStatus = 'InProgress';
      } else if (tasksByStatus.done.some(t => t.id === taskId)) {
        currentStatus = 'Done';
      }
      
      if (!currentStatus) {
        toast.error(t('currentStatusNotFound'));
        return;
      }
      
      // 将新状态转换为存储格式
      let newStatusKey = '';
      if (newStatus === 'todo') {
        newStatusKey = 'ToDo';
      } else if (newStatus === 'in_progress') {
        newStatusKey = 'InProgress';
      } else if (newStatus === 'done') {
        newStatusKey = 'Done';
      }
      
      // 准备要更新的sprint数据
      const taskIds = {...(sprint.task_ids || {})};
      
      // 从旧状态移除任务ID
      if (taskIds[currentStatus]) {
        if (Array.isArray(taskIds[currentStatus])) {
          taskIds[currentStatus] = taskIds[currentStatus].filter(id => id.toString() !== taskId.toString());
        } else if (typeof taskIds[currentStatus] === 'string') {
          taskIds[currentStatus] = taskIds[currentStatus]
            .split(',')
            .filter(id => id.trim() !== taskId.toString())
            .join(',');
        }
      }
      
      // 添加到新状态
      if (!taskIds[newStatusKey]) {
        taskIds[newStatusKey] = [];
      }
      
      if (Array.isArray(taskIds[newStatusKey])) {
        taskIds[newStatusKey] = [...taskIds[newStatusKey], taskId.toString()];
      } else if (typeof taskIds[newStatusKey] === 'string') {
        const ids = taskIds[newStatusKey].split(',').map(id => id.trim());
        ids.push(taskId.toString());
        taskIds[newStatusKey] = ids.join(',');
      } else {
        taskIds[newStatusKey] = [taskId.toString()];
      }
      
      // 更新sprint
      await dispatch(updateSprint({
        sprintId: sprint.id,
        sprintData: {
          task_ids: taskIds
        },
        teamId: teamId
      })).unwrap();
      
      // 更新本地状态
      setTasksByStatus(prevState => {
        // 从当前状态列表中移除任务
        const updatedPrevState = {
          todo: [...prevState.todo],
          in_progress: [...prevState.in_progress],
          done: [...prevState.done]
        };
        
        // 从所有状态中移除任务
        updatedPrevState.todo = updatedPrevState.todo.filter(t => t.id !== taskId);
        updatedPrevState.in_progress = updatedPrevState.in_progress.filter(t => t.id !== taskId);
        updatedPrevState.done = updatedPrevState.done.filter(t => t.id !== taskId);
        
        // 复制任务并更新状态
        const updatedTask = { ...task, status: newStatus };
        
        // 将任务添加到新状态
        if (newStatus === 'todo') {
          updatedPrevState.todo.push(updatedTask);
        } else if (newStatus === 'in_progress') {
          updatedPrevState.in_progress.push(updatedTask);
        } else if (newStatus === 'done') {
          updatedPrevState.done.push(updatedTask);
        }
        
        return updatedPrevState;
      });
      
      toast.success(t('taskStatusUpdated'));
      
    } catch (error) {
      console.error('更新任务状态失败:', error);
      toast.error(t('taskStatusUpdateFailed'));
    } finally {
      setLoading(false);
    }
  };

  // 添加一个函数来检查任务是否已在冲刺看板中
  const isTaskInSprint = (taskId) => {
    if (!sprint || !sprint.task_ids) return false;
    
    // 检查所有状态列表中是否存在此任务ID
    const statuses = ['ToDo', 'InProgress', 'Done'];
    
    for (const status of statuses) {
      if (!sprint.task_ids[status]) continue;
      
      let taskIdsArray = [];
      
      // 处理字符串或数组格式的任务ID
      if (typeof sprint.task_ids[status] === 'string') {
        taskIdsArray = sprint.task_ids[status].split(',').map(id => id.trim());
      } else if (Array.isArray(sprint.task_ids[status])) {
        taskIdsArray = sprint.task_ids[status].map(id => id.toString().trim());
      }
      
      // 检查taskId是否在数组中
      if (taskIdsArray.includes(taskId.toString())) {
        return true;
      }
    }
    
    return false;
  };

  // 修改removeTaskFromSprintBoard函数，在PENDING状态下禁用
  const removeTaskFromSprintBoard = async (task) => {
    try {
      // 如果当前Sprint处于PENDING状态，不允许移除任务
      if (selectedType === 'PENDING') {
        toast.error(t('cannotRemoveTasksFromActiveSprint'));
        return;
      }
      
      setLoading(true);
      
      if (!sprint || !sprint.id) {
        toast.error(t('noSelectedSprint'));
        return;
      }
      
      // 准备要更新的冲刺数据
      const taskIds = {...(sprint.task_ids || {})};
      
      // 从所有状态中移除任务ID
      const statuses = ['ToDo', 'InProgress', 'Done'];
      
      for (const status of statuses) {
        if (!taskIds[status]) continue;
        
        if (Array.isArray(taskIds[status])) {
          taskIds[status] = taskIds[status].filter(id => id.toString() !== task.id.toString());
        } else if (typeof taskIds[status] === 'string') {
          taskIds[status] = taskIds[status]
            .split(',')
            .filter(id => id.trim() !== task.id.toString())
            .join(',');
        }
      }
      
      // 调用Redux action更新冲刺
      await dispatch(updateSprint({
        sprintId: sprint.id,
        sprintData: {
          task_ids: taskIds
        },
        teamId: teamId
      })).unwrap();
      
      // 更新本地状态
      setTasksByStatus(prev => ({
        todo: prev.todo.filter(t => t.id !== task.id),
        in_progress: prev.in_progress.filter(t => t.id !== task.id),
        done: prev.done.filter(t => t.id !== task.id)
      }));
      
      toast.success(t('taskRemovedFromSprint'));
      
    } catch (error) {
      console.error('从冲刺移除任务失败:', error);
      toast.error(t('removeTaskFromSprintError'));
    } finally {
      setLoading(false);
    }
  };

  // 从Redux获取标签数据
  const { label: teamLabel, status: labelStatus } = useSelector(state => 
    state.teamLabels || {}
  );

  // 当组件加载时获取团队标签数据
  useEffect(() => {
    if (teamId) {
      dispatch(getLabelByTeamId(teamId));
    }
  }, [dispatch, teamId]);
  
  // 当团队标签数据加载完成后，提取SINGLE-SELECT选项
  useEffect(() => {
    if (labelStatus === 'succeeded' && teamLabel) {
      const options = extractSingleSelectOptions(teamLabel);
      setStatusOptions(options);
    }
  }, [teamLabel, labelStatus]);

  return (
    <Card className="">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>
          {t('sprintBoard')}
        </CardTitle>
        {/* 只有当前用户是团队创建者并且Sprint类型是PLANNING才显示"查看所有任务"按钮 */}
        {isTeamCreator && selectedType === 'PLANNING' && (
          <Button 
            size="sm" 
            variant={themeColor} 
            onClick={handleViewAllTasks}
            disabled={loadingAllTasks}
            className="flex items-center"
          >
            <ClipboardList className="w-4 h-4 mr-2" />
            {t('viewAllTasks')}
          </Button>
        )}
      </CardHeader>
      
      <CardContent>
        {hasError && (
          <div className="p-4 mb-4 bg-red-50 text-red-800 rounded-md flex items-center">
            <AlertCircle className="w-5 h-5 mr-2" />
            <span>{t('errorLoadingData')}</span>
          </div>
        )}
        
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 待处理列骨架屏 */}
            <div className="bg-background p-2 rounded-md">
              <h3 className="font-medium p-2 text-center border-b mb-2">
                <Skeleton className="h-6 w-24 mx-auto" />
              </h3>
              <div className="min-h-[300px] space-y-2">
                {[1, 2, 3].map((_, i) => (
                  <div key={`todo-${i}`} className="p-3 mb-2 bg-muted-background rounded-md shadow-sm border">
                    <div className="flex justify-between">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-5 w-6" />
                    </div>
                    <div className="mt-2">
                      <Skeleton className="h-4 w-full mt-2" />
                      <Skeleton className="h-4 w-5/6 mt-1" />
                      <div className="mt-2 flex justify-between items-center">
                        <Skeleton className="h-8 w-3/4" />
                        <Skeleton className="h-6 w-6 rounded-full" />
                      </div>
                    </div>
                    <div className="mt-3 flex justify-end">
                      <Skeleton className="h-8 w-28" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* 进行中列骨架屏 */}
            <div className="bg-background p-2 rounded-md">
              <h3 className="font-medium p-2 text-center border-b mb-2">
                <Skeleton className="h-6 w-24 mx-auto" />
              </h3>
              <div className="min-h-[300px] space-y-2">
                {[1, 2, 3].map((_, i) => (
                  <div key={`progress-${i}`} className="p-3 mb-2 bg-muted-background rounded-md shadow-sm border">
                    <div className="flex justify-between">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-5 w-6" />
                    </div>
                    <div className="mt-2">
                      <Skeleton className="h-4 w-full mt-2" />
                      <Skeleton className="h-4 w-5/6 mt-1" />
                      <div className="mt-2 flex justify-between items-center">
                        <Skeleton className="h-8 w-3/4" />
                        <Skeleton className="h-6 w-6 rounded-full" />
                      </div>
                    </div>
                    <div className="mt-3 flex justify-end">
                      <Skeleton className="h-8 w-28" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* 已完成列骨架屏 */}
            <div className="bg-background p-2 rounded-md">
              <h3 className="font-medium p-2 text-center border-b mb-2">
                <Skeleton className="h-6 w-24 mx-auto" />
              </h3>
              <div className="min-h-[300px] space-y-2">
                {[1, 2, 3].map((_, i) => (
                  <div key={`done-${i}`} className="p-3 mb-2 bg-muted-background rounded-md shadow-sm border">
                    <div className="flex justify-between">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-5 w-6" />
                    </div>
                    <div className="mt-2">
                      <Skeleton className="h-4 w-full mt-2" />
                      <Skeleton className="h-4 w-5/6 mt-1" />
                      <div className="mt-2 flex justify-between items-center">
                        <Skeleton className="h-8 w-3/4" />
                        <Skeleton className="h-6 w-6 rounded-full" />
                      </div>
                    </div>
                    <div className="mt-3 flex justify-end">
                      <Skeleton className="h-8 w-28" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        
        {!loading && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 待处理列 */}
            <div className="bg-background p-2 rounded-md">
              <h3 className="font-medium p-2 text-center border-b mb-2">
                {t('todo')} ({tasksByStatus.todo.length})
              </h3>
              <div className="min-h-[300px]">
                {tasksByStatus.todo.map(task => (
                  <React.Fragment key={task.id}>
                    {renderTaskCard(task)}
                  </React.Fragment>
                ))}
              </div>
            </div>
            
            {/* 进行中列 */}
            <div className="bg-background p-2 rounded-md">
              <h3 className="font-medium p-2 text-center border-b mb-2">
                {t('inProgress')} ({tasksByStatus.in_progress.length})
              </h3>
              <div className="min-h-[300px]">
                {tasksByStatus.in_progress.map(task => (
                  <React.Fragment key={task.id}>
                    {renderTaskCard(task)}
                  </React.Fragment>
                ))}
              </div>
            </div>
            
            {/* 已完成列 */}
            <div className="bg-background p-2 rounded-md">
              <h3 className="font-medium p-2 text-center border-b mb-2">
                {t('done')} ({tasksByStatus.done.length})
              </h3>
              <div className="min-h-[300px]">
                {tasksByStatus.done.map(task => (
                  <React.Fragment key={task.id}>
                    {renderTaskCard(task)}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        )}
        
        {/* 编辑任务对话框 */}
        {renderEditTaskDialog()}
      </CardContent>

      {/* 所有任务对话框 */}
      <Dialog open={isAllTasksOpen} onOpenChange={setIsAllTasksOpen}>
        <DialogContent className="max-w-4xl w-full">
          <DialogHeader>
            <DialogTitle>{t('allTeamTasks')}</DialogTitle>
            <DialogDescription>
              {t('allTeamTasksDescription')}
            </DialogDescription>
          </DialogHeader>
          
          {loadingAllTasks ? (
            <div className="px-4">
              <div className="space-y-3">
                {/* 表头骨架 */}
                <div className="flex items-center justify-between py-2 border-b">
                  <Skeleton className="h-5 w-[15%]" />
                  <Skeleton className="h-5 w-[15%]" />
                  <Skeleton className="h-5 w-[10%]" />
                  <Skeleton className="h-5 w-[35%]" />
                  <Skeleton className="h-5 w-[15%]" />
                  <Skeleton className="h-5 w-[10%]" />
                </div>
                {/* 表行骨架 */}
                {Array(5).fill(0).map((_, i) => (
                  <div key={i} className="flex items-center justify-between py-4 border-b">
                    <Skeleton className="h-4 w-[15%]" />
                    <Skeleton className="h-4 w-[15%]" />
                    <Skeleton className="h-6 w-6 rounded-full" />
                    <Skeleton className="h-4 w-[35%]" />
                    <div className="flex items-center w-[15%]">
                      <Skeleton className="h-6 w-6 rounded-full mr-2" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                    <div className="flex space-x-2 w-[10%]">
                      <Skeleton className="h-8 w-8 rounded-md" />
                      <Skeleton className="h-8 w-8 rounded-md" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <ScrollArea className="h-[60vh] w-full overflow-x-auto">
              <Table className="w-full table-fixed">
                <TableHeader>
                  <TableRow>
                    <TableHead onClick={() => requestSort('name')} className="cursor-pointer w-[15%] truncate">
                      {t('name')} {sortConfig.key === 'name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </TableHead>
                    <TableHead onClick={() => requestSort('startDate')} className="cursor-pointer w-[20%] truncate">
                      {t('startDate')} {sortConfig.key === 'startDate' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </TableHead>
                    <TableHead onClick={() => requestSort('status')} className="cursor-pointer w-[10%] truncate">
                      {t('status')} {sortConfig.key === 'status' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </TableHead>    
                    <TableHead onClick={() => requestSort('description')} className="cursor-pointer w-[30%] truncate">
                      {t('description')} {sortConfig.key === 'description' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </TableHead>                  
                    <TableHead onClick={() => requestSort('assignee')} className="cursor-pointer w-[15%] truncate">
                      {t('assignee')} {sortConfig.key === 'assignee' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </TableHead>
                    <TableHead className="w-[10%]">{t('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {getSortedTasks(teamTasks).map(task => (
                    <TableRow key={task.id}>
                      <TableCell className="max-w-[15%] truncate" title={getTaskName(task)}>{getTaskName(task)}</TableCell>
                      <TableCell className="max-w-[20%] truncate" title={getTaskStartDate(task)}>{getTaskStartDate(task)}</TableCell>
                      <TableCell className="max-w-[10%]">
                        {renderStatusOptions(task)}
                      </TableCell>      
                      <TableCell className="max-w-[30%] truncate" title={getTaskDescription(task)}>
                        {getTaskDescription(task)}
                      </TableCell>                  
                      <TableCell className="max-w-[15%]">
                        {task.assignee || (task.tag_values && task.tag_values['2']) ? (
                          <div className="flex items-center">
                            <Avatar className="w-6 h-6 mr-2 flex-shrink-0">
                              <AvatarFallback className={getMemberInfo(task.tag_values && task.tag_values['2'] ? task.tag_values['2'] : task.assignee)?.isMultiple ? 'bg-blue-500 text-white text-[10px]' : ''}>
                                {getUserInitial(task)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="truncate max-w-[100px]" title={getUserDisplayName(task)}>
                              {getUserDisplayName(task)}
                            </span>
                          </div>
                        ) : (
                          t('unassigned')
                        )}
                      </TableCell>
                      <TableCell className="max-w-[10%]">
                        <div className="flex space-x-2">
                          {selectedType !== 'PENDING' && (
                            isTaskInSprint(task.id) ? (
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="h-8 w-8 p-0 flex-shrink-0"
                                onClick={() => removeTaskFromSprintBoard(task)}
                                title={t('removeFromSprint')}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            ) : (
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="h-8 w-8 p-0 flex-shrink-0"
                                onClick={() => addTaskToSprintBoard(task)}
                                title={t('addToSprint')}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            )
                          )}
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-8 w-8 p-0 flex-shrink-0"
                            onClick={() => openEditTaskDialog(task)}
                            title={t('editTask')}
                          >
                            <Pen className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      {/* 添加状态管理对话框 */}
      <Dialog open={isStatusManagerOpen} onOpenChange={setIsStatusManagerOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('manageStatus')}</DialogTitle>
            <DialogDescription>
              {t('customizeSprintStatus')}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {/* 这里引入TagLabelManager组件 */}
            <TagLabelManager
              teamId={teamId}
              selectionMode={false}
            />
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default SprintBoard; 