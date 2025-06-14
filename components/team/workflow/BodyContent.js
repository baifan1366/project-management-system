'use client';

import { useContext, useEffect, useState, useRef } from 'react';
import { WorkflowContext } from './TaskWorkflow';
import { useSelector, useDispatch } from 'react-redux';
import { fetchTasksBySectionId, updateTask, fetchTaskById, createTask, deleteTask } from '@/lib/redux/features/taskSlice';
import { getSectionByTeamId, createSection, updateTaskIds } from '@/lib/redux/features/sectionSlice';
import { fetchAllTags, getTagByName } from '@/lib/redux/features/tagSlice';
import { getTags } from '@/lib/redux/features/teamCFSlice';
import { Plus, Edit, Check, X, CheckCircle2, Circle, Trash, Settings } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { useGetUser } from '@/lib/hooks/useGetUser';
import { useConfirm } from '@/hooks/use-confirm';
import WorkflowLabelManager from './WorkflowLabelManager';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { parseSingleSelectValue, generateColorFromLabel, renderStatusBadge } from './helpers';
import { supabase } from '@/lib/supabase';
import { getLabelByTeamId, updateLabel } from '@/lib/redux/features/teamLabelSlice';
import { extractSingleSelectOptions } from './labelUtils';

// 使用唯一键记录全局请求状态，避免重复请求
const requestCache = {
  allTags: false,
  teamTags: {},
  sections: {},
  teamLabel: false
};

// 根据ID查找标签
const findTagById = (tagId, tags) => {
  return tags.find(tag => tag.id === parseInt(tagId) || tag.id === tagId || tag.id.toString() === tagId);
};

export default function BodyContent({ projectThemeColor }) {
    const dispatch = useDispatch();
    const t = useTranslations('CreateTask');
    const allTags = useSelector(state => state.tags.tags);
    const teamCFTags = useSelector(state => state.teamCF.tags);
    // 获取团队标签数据 - 修正Redux状态选择器名称
    const teamLabelState = useSelector(state => state.teamLabels || {});
    const teamLabel = teamLabelState.label || {};
    const teamLabelStatus = teamLabelState.status || 'idle';
    const { user } = useGetUser()
    const userId = user?.id;
    const { confirm } = useConfirm();
    const { 
        selectedTaskId, 
        setSelectedTaskId,
        projectId,
        teamId,
        teamCFId,
        setWorkflowData,
        editableTask,
        setEditableTask,
        refreshWorkflow,
        workflowData
    } = useContext(WorkflowContext);
    
    const [sections, setSections] = useState([]);
    const [allTasks, setAllTasks] = useState([]);
    const [processedTasks, setProcessedTasks] = useState([]);
    const [tags, setTags] = useState([]);
    const [loading, setLoading] = useState(true);
    // 状态选项，初始使用默认值，后续会根据团队标签更新
    const [statusOptions, setStatusOptions] = useState();
    
    // 本地跟踪当前组件实例的已请求状态
    const localRequestTracker = useRef({
      allTagsFetched: false,
      teamTagsFetched: false,
      sectionsFetched: false,
      teamLabelFetched: false
    });

    // 动态标签ID状态
    const [nameTagId, setNameTagId] = useState(null);
    const [descriptionTagId, setDescriptionTagId] = useState(null);
    const [statusTagId, setStatusTagId] = useState(null);
    const [dueDateTagId, setDueDateTagId] = useState(null);

    // 编辑任务相关状态
    const [isEditing, setIsEditing] = useState(false);
    const [editingTask, setEditingTask] = useState(null);
    const [editingValues, setEditingValues] = useState({});

    // 新增添加任务状态
    const [isCreating, setIsCreating] = useState(false);
    const [newTaskValues, setNewTaskValues] = useState({
        name: '',
        description: '',
        status: null,
        dueDate: ''
    });

    // 获取今天的日期，格式为YYYY-MM-DD
    const today = new Date().toISOString().split('T')[0];

    //replace statusOptions to team's label
    //example label record: {"TAGS": [""], "MULTI-SELECT": [""], "SINGLE-SELECT": ["{\"label\":\"Completed\",\"value\":\"completed\",\"color\":\"#10b981\"}", "{\"label\":\"In Progress\",\"value\":\"inProgress\",\"color\":\"#123456\"}"]}
    //find the SINGLE-SELECT as statusOptions
    //example task record: {"1": "ssss", "3": "{\"label\":\"Completed\",\"value\":\"completed\",\"color\":\"#10b981\"}", "4": "2025-06-29", "5": "sssss"}

    // 获取团队标签数据
    useEffect(() => {
      if (teamId) {
        // 强制每次组件加载时都请求最新数据
        dispatch(getLabelByTeamId(teamId));
        requestCache.teamLabel = true;
        localRequestTracker.current.teamLabelFetched = true;
      }
    }, [dispatch, teamId]);
    
    // 当团队标签数据加载完成后处理状态选项
    useEffect(() => {      
      if (teamLabelStatus === 'succeeded') {
        // 从团队标签数据中提取SINGLE-SELECT选项
        const extractedOptions = extractSingleSelectOptions(teamLabel);
        
        // 如果有提取到选项，则使用提取的选项替换默认选项
        if (extractedOptions && extractedOptions.length > 0) {
          setStatusOptions(extractedOptions);
        }
      }
    }, [teamLabel, teamLabelStatus]);

    // 获取所有通用标签
    useEffect(() => {
      if (!requestCache.allTags && !localRequestTracker.current.allTagsFetched) {
        dispatch(fetchAllTags());
        requestCache.allTags = true;
        localRequestTracker.current.allTagsFetched = true;
      }
    }, [dispatch]);

    // 获取特定团队字段的标签
    useEffect(() => {
      if (teamId && teamCFId) {
        const cacheKey = `${teamId}_${teamCFId}`;
        
        if (!requestCache.teamTags[cacheKey] && !localRequestTracker.current.teamTagsFetched) {
          dispatch(getTags({ teamId, teamCFId }));
          requestCache.teamTags[cacheKey] = true;
          localRequestTracker.current.teamTagsFetched = true;
        }
      }
    }, [dispatch, teamId, teamCFId]);

    // 当标签数据可用时更新本地标签状态
    useEffect(() => {
      if (teamCFTags && teamCFTags.length > 0) {
        setTags(teamCFTags);
      } else if (allTags && allTags.length > 0) {
        setTags(allTags);
      }
    }, [allTags, teamCFTags]);

    // 获取部分和任务数据
    useEffect(() => {
      let isMounted = true;
      setLoading(true);
      
      async function fetchData() {
        try {
          // 检查 workflowData 是否为空，如果为空则强制重新获取数据
          const shouldRefetch = 
            !requestCache.sections[teamId] || 
            !localRequestTracker.current.sectionsFetched ||
            (workflowData && workflowData.nodes && workflowData.nodes.length === 0);
          
          if (shouldRefetch) {
            // 重置请求缓存状态
            requestCache.sections[teamId] = false;
            localRequestTracker.current.sectionsFetched = false;
            
            const sectionsData = await dispatch(getSectionByTeamId(teamId)).unwrap();
            if (!isMounted) return;
            
            requestCache.sections[teamId] = true;
            localRequestTracker.current.sectionsFetched = true;
            setSections(sectionsData || []);
            
            const tasksPromises = sectionsData.map(section => 
              dispatch(fetchTasksBySectionId(section.id)).unwrap()
            );
            const tasksResults = await Promise.all(tasksPromises);
            if (!isMounted) return;
            
            const allTasksData = tasksResults.flat();
            setAllTasks(allTasksData);
          }
        } catch (error) {
          console.error("获取工作流数据时出错:", error);
        } finally {
          if (isMounted) {
            setLoading(false);
          }
        }
      }
      
      if (teamId) {
        fetchData();
      }
      
      return () => {
        isMounted = false;
      };
    }, [teamId, dispatch, workflowData]);

    // 获取标签IDs
    useEffect(() => {
      const fetchTagIds = async () => {
        try {
          // 获取常用标签的ID
          const [nameTag, descriptionTag, statusTag, dueDateTag, assigneeTag] = await Promise.all([
            dispatch(getTagByName(t('name'))).unwrap(),
            dispatch(getTagByName(t('description'))).unwrap(),
            dispatch(getTagByName(t('status'))).unwrap(),
            dispatch(getTagByName(t('dueDate'))).unwrap(),
          ]);
          
          setNameTagId(nameTag);
          setDescriptionTagId(descriptionTag);
          setStatusTagId(statusTag);
          setDueDateTagId(dueDateTag);

        } catch (error) {
          console.error('获取标签ID失败:', error);
        }
      };
      
      fetchTagIds();
    }, [dispatch]);

    // 修改extractTaskInfo函数
    const extractTaskInfo = (task) => {
      const tagValues = task.tag_values || {};
      let taskInfo = {
        id: task.id,
        name: `${t('task')} #${task.id}`,
        description: '',
        status: '-',
        dueDate: '',
        originalTask: task
      };
      
      // 通过标签ID获取值
      // Name 标签
      if (nameTagId && tagValues[nameTagId]) {
        taskInfo.name = String(tagValues[nameTagId] || '');
      }
      
      // Description 标签
      if (descriptionTagId && tagValues[descriptionTagId]) {
        taskInfo.description = String(tagValues[descriptionTagId] || '');
      }
      
      // Status 标签
      if (statusTagId && tagValues[statusTagId]) {
        const statusValue = tagValues[statusTagId];
        // 保存原始状态值，便于编辑
        taskInfo.rawStatus = statusValue;
        // 使用helpers.js中的解析函数处理状态值
        const parsedStatus = parseSingleSelectValue(statusValue);
        
        if (parsedStatus) {
          taskInfo.statusData = parsedStatus;
          taskInfo.status = parsedStatus.label || String(statusValue);
        } else {
          taskInfo.status = String(statusValue || '');
        }
      }
      
      // Due Date 标签
      if (dueDateTagId && tagValues[dueDateTagId]) {
        const dueDateValue = tagValues[dueDateTagId];
        taskInfo.dueDate = dueDateValue ? String(dueDateValue).split('T')[0] : '';
      }
      
      // 保持对老数据的兼容性，使用基于标签名称的处理
      if (!nameTagId || !descriptionTagId || !statusTagId || !dueDateTagId) {
        Object.entries(tagValues).forEach(([tagId, value]) => {
          const tag = findTagById(tagId, tags);
          if (tag) {
            switch (tag.name) {
              case t('name'):
                if (!taskInfo.name || taskInfo.name === `${t('task')} #${task.id}`) {
                  taskInfo.name = String(value || '');
                }
                break;
              case t('description'):
                if (!taskInfo.description) {
                  taskInfo.description = String(value || '');
                }
                break;
              case t('status'):
                if (!taskInfo.status || taskInfo.status === '-') {
                  // 保存原始状态值
                  taskInfo.rawStatus = value;
                  // 使用helpers.js中的解析函数处理状态值
                  const parsedStatus = parseSingleSelectValue(value);
                  
                  if (parsedStatus) {
                    taskInfo.statusData = parsedStatus;
                    taskInfo.status = parsedStatus.label || String(value);
                  } else {
                    taskInfo.status = String(value || '');
                  }
                }
                break;
              case t('dueDate'):
              case 'Due Date': // 保留兼容旧格式
              case 'DueDate': // 保留兼容旧格式
                if (!taskInfo.dueDate) {
                  const dueDateValue = value;
                  taskInfo.dueDate = dueDateValue ? String(dueDateValue).split('T')[0] : '';
                }
                break;
            }
          }
        });
      }
      
      return taskInfo;
    };

    // 处理任务数据并提取所需信息
    useEffect(() => {
      if (allTasks.length > 0 && tags.length > 0) {
        const taskList = allTasks.map(task => extractTaskInfo(task));
        setProcessedTasks(taskList);
        
        // 更新工作流数据，为工作流工具提供实际的任务数据
        updateWorkflowData(taskList);
        
        // 如果没有选中任务但有任务数据，自动选择第一个
        if (!selectedTaskId && taskList.length > 0) {
          setSelectedTaskId(taskList[0].id);
        }
      }
    }, [allTasks, tags, selectedTaskId, setSelectedTaskId, setWorkflowData]);
    
    // 监听selectedTaskId的变化
    useEffect(() => {      
      // 如果选中了任务，确保视图滚动到该任务
      if (selectedTaskId) {
        const taskElement = document.getElementById(`task-${selectedTaskId}`);
        if (taskElement) {
          taskElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }
    }, [selectedTaskId]);
    
    // 更新工作流数据
    const updateWorkflowData = (tasks) => {
      if (!tasks || tasks.length === 0) return;
      
      // 为工作流图创建节点
      const nodes = tasks.map((task, index) => {
        // 基本布局计算，可根据实际需要调整
        const row = Math.floor(index / 3);
        const col = index % 3;
        return {
          id: task.id.toString(),
          type: 'task',
          data: { 
            id: task.id.toString(),
            label: task.name, 
            description: task.description,
            status: task.status,
            statusData: task.statusData,
            dueDate: task.dueDate,
            originalTask: task.originalTask
          },
          // 简单的网格布局
          position: { x: 150 + col * 250, y: 100 + row * 150 },
        }
      });
      
      // 创建简单的顺序连接边
      const edges = [];
      for (let i = 0; i < tasks.length - 1; i++) {
        edges.push({
          id: `e${tasks[i].id}-${tasks[i+1].id}`,
          source: tasks[i].id.toString(),
          target: tasks[i+1].id.toString(),
          animated: true
        });
      }
      
      setWorkflowData({
        nodes: nodes,
        edges: edges,
        tasks: tasks
      });
    };
    
    // 获取当前选中任务的详细信息
    const selectedTask = processedTasks.find(task => task.id === selectedTaskId);

    // 处理任务编辑 - 使用从 WorkflowContext 提供的 editableTask
    useEffect(() => {
        if (editableTask) {
            setIsEditing(true);
            setEditingTask(editableTask);
            
            // 初始化编辑值
            const initialValues = {
                name: editableTask.name,
                description: editableTask.description,
                status: editableTask.status,
                dueDate: editableTask.dueDate
            };
            
            setEditingValues(initialValues);
            
            // 清除 WorkflowContext 中的 editableTask
            setEditableTask(null);
        }
    }, [editableTask, setEditableTask]);

    // 处理取消编辑
    const handleCancelEdit = () => {
        setIsEditing(false);
        setEditingTask(null);
        setEditingValues({});
    };

    // 处理输入变化
    const handleInputChange = (field, value) => {
        // 如果是任务名称字段，限制最大长度为100个字符
        if (field === 'name') {
            // 限制长度
            if (value.length > 50) {
                value = value.slice(0, 50);
            }
        }
        // 如果是描述字段，限制最大长度为100个字符
        else if (field === 'description') {
            if (value.length > 100) {
                value = value.slice(0, 100);
            }
        }
        
        setEditingValues(prev => ({
            ...prev,
            [field]: value
        }));
    };

    // 处理输入框失焦，自动去除前后空格
    const handleFieldBlur = (field, isNewTask) => {
        if (isNewTask) {
            // 新任务表单
            if (field === 'name' || field === 'description') {
                const currentValue = newTaskValues[field] || '';
                const trimmedValue = currentValue.trim();
                
                if (trimmedValue !== currentValue) {
                    setNewTaskValues(prev => ({
                        ...prev,
                        [field]: trimmedValue
                    }));
                }
            }
        } else {
            // 编辑任务表单
            if (field === 'name' || field === 'description') {
                const currentValue = editingValues[field] || '';
                const trimmedValue = currentValue.trim();
                
                if (trimmedValue !== currentValue) {
                    setEditingValues(prev => ({
                        ...prev,
                        [field]: trimmedValue
                    }));
                }
            }
        }
    };

    // 确保在保存时去除前后空格
    const handleSaveTask = async () => {
        try {
            setLoading(true);
            
            // 去除名称和描述前后空格并更新状态
            const trimmedName = editingValues.name ? editingValues.name.trim() : '';
            const trimmedDescription = editingValues.description ? editingValues.description.trim() : '';
            
            setEditingValues(prev => ({
                ...prev,
                name: trimmedName,
                description: trimmedDescription
            }));
            
            // 验证任务名称不能为空或只包含空格
            if (!trimmedName) {
                toast.error(t('nameRequired'));
                setLoading(false);
                return;
            }
            
            // 获取原始任务数据
            const originalTask = editingTask.originalTask;
            if (!originalTask || !originalTask.id) {
                toast.error(t('taskNotFound'));
                return;
            }
            
            // 准备要更新的tag_values
            const tagValues = {...originalTask.tag_values || {}};
            
            // 更新各字段
            if (nameTagId) {
                tagValues[nameTagId] = editingValues.name;
            }
            
            if (descriptionTagId) {
                tagValues[descriptionTagId] = editingValues.description;
            }
            
            if (statusTagId && editingValues.status) {
                // 处理状态字段 - 确保以JSON对象格式保存
                if (typeof editingValues.status === 'object') {
                    // 确保对象有必要的属性
                    const statusObj = {
                        label: editingValues.status.label || '',
                        value: editingValues.status.value || editingValues.status.label?.toLowerCase()?.replace(/\s+/g, '_') || '',
                        color: editingValues.status.color || generateColorFromLabel(editingValues.status.label || '')
                    };
                    
                    // 根据API需求，可能需要将对象转为JSON字符串
                    // 如果后端需要保存为JSON字符串
                    tagValues[statusTagId] = JSON.stringify(statusObj);
                    // 如果后端可以直接保存对象
                    // tagValues[statusTagId] = statusObj;
                } else {
                    // 如果是字符串，创建一个标准格式的状态对象
                    const statusText = String(editingValues.status);
                    const statusObj = {
                        label: statusText,
                        value: statusText.toLowerCase().replace(/\s+/g, '_'),
                        color: generateColorFromLabel(statusText)
                    };
                    
                    // 同样，根据API需求决定是对象还是JSON字符串
                    tagValues[statusTagId] = JSON.stringify(statusObj);
                    // tagValues[statusTagId] = statusObj;
                }
            }
            
            if (dueDateTagId && editingValues.dueDate) {
                tagValues[dueDateTagId] = editingValues.dueDate;
            }
            
            // 调用更新API
            await dispatch(updateTask({
                taskId: originalTask.id,
                taskData: {
                    tag_values: tagValues
                },
                oldTask: originalTask
            })).unwrap();
            
            // 更新成功后重新获取任务
            const updatedTask = await dispatch(fetchTaskById(originalTask.id)).unwrap();
            
            // 更新本地任务列表
            setAllTasks(prev => {
                const updatedTasks = [...prev];
                const taskIndex = updatedTasks.findIndex(t => t.id === originalTask.id);
                
                if (taskIndex !== -1) {
                    updatedTasks[taskIndex] = updatedTask;
                }
                
                return updatedTasks;
            });
            
            toast.success(t('taskUpdated'));
            
            // 重置编辑状态
            setIsEditing(false);
            setEditingTask(null);
            setEditingValues({});
            
            // 确保处理后的任务列表是最新的并刷新工作流
            const updatedProcessedTasks = processedTasks.map(task => {
                if (task.id === originalTask.id) {
                    // 重新提取任务信息
                    return extractTaskInfo(updatedTask);
                }
                return task;
            });
            
            // 更新本地处理后的任务列表
            setProcessedTasks(updatedProcessedTasks);
            
            // 刷新工作流图
            if (refreshWorkflow) {
                setTimeout(() => {
                    refreshWorkflow([...updatedProcessedTasks]);
                }, 100); // 使用setTimeout确保状态更新已完成
            }
            
        } catch (error) {
            console.error('更新任务失败:', error);
            toast.error(t('updateTaskFailed'));
        } finally {
            setLoading(false);
        }
    };

    // 处理本地编辑任务
    const handleEditTask = (task) => {
        // 检查任务对象是否有效
        if (!task || !task.id) {
            console.error('无法编辑任务: 缺少任务对象或任务ID');
            toast.error(t('editTaskFailed'));
            return;
        }
        
        // 如果正在创建任务，先关闭创建表单
        if (isCreating) {
            setIsCreating(false);
            setNewTaskValues({
                name: '',
                description: '',
                status: null,
                dueDate: ''
            });
        }
        
        setIsEditing(true);
        setEditingTask({...task}); // 确保完整复制任务对象
        
        // 初始化编辑值，确保使用完整的statusData对象
        const initialValues = {
            id: task.id, 
            name: task.name,
            description: task.description,
            // 优先使用statusData对象（如果存在）
            status: task.statusData || task.status,
            dueDate: task.dueDate
        };
        
        setEditingValues(initialValues);
    };

    // 渲染编辑表单
    const renderEditForm = () => {
        if (!selectedTask || !isEditing) return null;
        
        // 检查任务名称是否有效（不为空且不只包含空格）
        const isNameValid = editingValues.name && editingValues.name.trim() !== '';
        
        return (
            <div className="mb-6 p-4 border rounded-lg">
                <div className="flex justify-between items-center mb-3">
                    <h3 className="text-lg font-medium">{t('editTask')}</h3>
                    <button 
                        className="p-1 rounded-full hover:bg-gray-100"
                        onClick={handleCancelEdit}
                    >
                        <X className="w-4 h-4 text-gray-500 hover:text-black" />
                    </button>
                </div>
                
                <div className="space-y-3">
                    <div className="flex flex-col">
                        <label className="font-medium mb-1">{t('name')}:</label>
                        <input
                            type="text"
                            value={editingValues.name || ''}
                            onChange={(e) => handleInputChange('name', e.target.value)}
                            onBlur={(e) => handleFieldBlur('name', false)}
                            className="p-2 border rounded text-sm w-full focus:ring-1 focus:ring-primary focus:outline-none"
                            maxLength={50}
                        />
                        <div className="text-xs text-gray-500 mt-1 text-right">
                            {(editingValues.name || '').length}/50
                        </div>
                    </div>
                    
                    <div className="flex flex-col">
                        <label className="font-medium mb-1">{t('status')}:</label>
                        <WorkflowLabelManager 
                            teamId={teamId}
                            selectedValue={editingValues.status}
                            onSelect={(option) => handleInputChange('status', option)}
                            projectThemeColor={projectThemeColor}
                            selectionMode={true}
                            tasks={[]}
                        />
                    </div>
                    <div className="flex flex-col">
                        <label className="font-medium mb-1">{t('description')}:</label>
                        <textarea
                            value={editingValues.description || ''}
                            onChange={(e) => handleInputChange('description', e.target.value.slice(0, 100))}
                            onBlur={(e) => handleFieldBlur('description', false)}
                            className="p-2 border rounded text-sm min-h-[80px] focus:ring-1 focus:ring-primary focus:outline-none"
                            maxLength={100}
                        />
                        <div className="text-xs text-gray-500 mt-1 text-right">
                            {editingValues.description?.length || 0}/100
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col">
                            <label className="font-medium mb-1">{t('dueDate')}:</label>
                            <input
                                type="date"
                                value={editingValues.dueDate || ''}
                                onChange={(e) => handleInputChange('dueDate', e.target.value)}
                                className="p-2 border rounded text-sm focus:ring-1 focus:ring-primary focus:outline-none"
                                min={today}
                            />
                        </div>
                    </div>
                    
                    <div className="flex justify-between items-center pt-4 mt-3 border-t">
                        <Button 
                            variant="outline"
                            className="flex items-center text-sm text-red-500 hover:text-red-600 py-2 px-3 rounded hover:bg-muted-background transition-colors"
                            onClick={() => {
                                // 直接使用selectedTask，它是完整的任务对象
                                if (selectedTask && selectedTask.id) {
                                    handleCancelEdit(); // 先关闭编辑表单
                                    handleDeleteTask(selectedTask); 
                                } else {
                                    toast.error(t('deleteTaskFailed'));
                                    console.error('无法删除任务: 缺少任务ID', {selectedTask});
                                }
                            }}
                            type="button"
                        >
                            <Trash className="w-4 h-4 mr-1" />
                            {t('delete')}
                        </Button>
                        
                        <Button 
                            variant="outline"
                            className="flex items-center text-sm text-green-500 hover:text-green-600 py-2 px-3 rounded hover:bg-muted-background transition-colors"
                            onClick={handleSaveTask}
                            disabled={!isNameValid}
                            type="button"
                        >
                            <Check className={`w-4 h-4 mr-1 ${!isNameValid ? 'text-gray-300' : ''}`} />
                            {t('save')}
                        </Button>
                    </div>
                </div>
            </div>
        );
    };

    // 处理新任务值变更
    const handleNewTaskInputChange = (field, value) => {
        // 如果是任务名称字段，限制最大长度为100个字符
        if (field === 'name') {
            // 限制长度
            if (value.length > 50) {
                value = value.slice(0, 50);
            }
        }
        // 如果是描述字段，限制最大长度为100个字符
        else if (field === 'description') {
            if (value.length > 100) {
                value = value.slice(0, 100);
            }
        }
        
        setNewTaskValues(prev => ({
            ...prev,
            [field]: value
        }));
    };
    
    // 取消创建任务
    const handleCancelCreate = () => {
        setIsCreating(false);
        setNewTaskValues({
            name: '',
            description: '',
            status: null,
            dueDate: ''
        });
    };
    
    // 确保在创建任务时去除前后空格
    const handleCreateTask = async () => {
        try {
            setLoading(true);
            
            // 去除名称和描述前后空格并更新状态
            const trimmedName = newTaskValues.name ? newTaskValues.name.trim() : '';
            const trimmedDescription = newTaskValues.description ? newTaskValues.description.trim() : '';
            
            setNewTaskValues(prev => ({
                ...prev,
                name: trimmedName,
                description: trimmedDescription
            }));
            
            // 验证必填字段 - 使用trim()确保不能只包含空格
            if (!trimmedName) {
                toast.error(t('nameRequired'));
                setLoading(false);
                return;
            }
            
            // 准备任务数据和标签值
            const tagValues = {};
            
            if (nameTagId) {
                tagValues[nameTagId] = newTaskValues.name;
            }
            
            if (descriptionTagId && newTaskValues.description) {
                tagValues[descriptionTagId] = newTaskValues.description;
            }
            
            if (statusTagId && newTaskValues.status) {
                // 处理状态字段 - 确保以JSON对象格式保存
                if (typeof newTaskValues.status === 'object') {
                    const statusObj = {
                        label: newTaskValues.status.label || '',
                        value: newTaskValues.status.value || newTaskValues.status.label?.toLowerCase()?.replace(/\s+/g, '_') || '',
                        color: newTaskValues.status.color || generateColorFromLabel(newTaskValues.status.label || '')
                    };
                    
                    tagValues[statusTagId] = JSON.stringify(statusObj);
                } else if (newTaskValues.status) {
                    const statusText = String(newTaskValues.status);
                    const statusObj = {
                        label: statusText,
                        value: statusText.toLowerCase().replace(/\s+/g, '_'),
                        color: generateColorFromLabel(statusText)
                    };
                    
                    tagValues[statusTagId] = JSON.stringify(statusObj);
                }
            }
            
            if (dueDateTagId && newTaskValues.dueDate) {
                tagValues[dueDateTagId] = newTaskValues.dueDate;
            }
            
            // 创建任务基础数据
            const taskData = {
                tag_values: tagValues,
                created_by: userId,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            
            // 创建任务
            const createdTask = await dispatch(createTask(taskData)).unwrap();
            
            // 可选: 创建Notion页面并关联到任务
            if (createdTask && createdTask.id) {
                try {
                    // 创建notion_page并关联到任务
                    const { data: notionPageData, error: notionPageError } = await supabase
                        .from('notion_page')
                        .insert({
                            created_by: userId,
                            last_edited_by: userId
                        })
                        .select()
                        .single();
                    
                    if (notionPageData && notionPageData.id) {
                        // 更新任务的page_id
                        const { data: updatedTaskData, error: taskUpdateError } = await supabase
                            .from('task')
                            .update({
                                page_id: notionPageData.id
                            })
                            .eq('id', createdTask.id)
                            .select();
                            
                        if (taskUpdateError) {
                            console.error('更新任务页面关联失败:', taskUpdateError);
                        }
                    }
                } catch (error) {
                    console.error('创建Notion页面关联失败:', error);
                    // 继续流程, 这只是一个可选步骤
                }
            }
            
            // 检查是否需要创建部分或更新部分的任务ID列表
            let sectionToUse = null;
            
            // 尝试获取当前团队的部分
            const sectionsData = await dispatch(getSectionByTeamId(teamId)).unwrap();
            
            if (sectionsData && sectionsData.length > 0) {
                // 使用第一个部分
                sectionToUse = sectionsData[0];
                
                // 更新部分的任务ID列表
                const existingTaskIds = sectionToUse.task_ids || [];
                const updatedTaskIds = [...existingTaskIds, createdTask.id];
                
                await dispatch(updateTaskIds({
                    sectionId: sectionToUse.id,
                    teamId: teamId,
                    newTaskIds: updatedTaskIds
                })).unwrap();
            } else {
                // 没有找到部分，需要创建一个新的
                const sectionData = {
                    teamId,
                    sectionName: "New Section",
                    createdBy: userId
                };
                
                const newSection = await dispatch(createSection({
                    teamId, 
                    sectionData
                })).unwrap();
                
                // 更新新部分的任务ID列表
                await dispatch(updateTaskIds({
                    sectionId: newSection.id,
                    teamId: teamId,
                    newTaskIds: [createdTask.id]
                })).unwrap();
                
                // 更新本地部分数据
                setSections([newSection]);
            }
            
            // 提示创建成功
            toast.success(t('taskCreated'));
            
            // 获取最新任务信息
            const updatedTask = await dispatch(fetchTaskById(createdTask.id)).unwrap();
            
            // 更新本地任务列表
            const newProcessedTask = extractTaskInfo(updatedTask);
            
            // 使用函数形式的setState确保获取最新状态
            setAllTasks(prev => [...prev, updatedTask]);
            
            // 使用函数形式重新构建处理后的任务
            const updatedTasks = [...processedTasks, newProcessedTask];
            setProcessedTasks(updatedTasks);
            
            // 强制重建工作流数据
            // 注意：这里我们不使用updatedTasks，因为可能存在异步状态更新的问题
            // 而是直接在这里构建完整的任务列表
            await new Promise(resolve => setTimeout(resolve, 50)); // 小延迟以确保状态更新
            
            // 刷新工作流图 - 使用强制刷新模式
            if (refreshWorkflow) {
                refreshWorkflow(updatedTasks);
            }
            
            // 重置并关闭创建表单
            setIsCreating(false);
            setNewTaskValues({
                name: '',
                description: '',
                status: null,
                dueDate: ''
            });
            
            // 设置新创建的任务为选中任务
            setSelectedTaskId(createdTask.id);
            
        } catch (error) {
            console.error('创建任务失败:', error);
            toast.error(t('createTaskFailed'));
        } finally {
            setLoading(false);
        }
    };
    
    // 渲染创建任务表单
    const renderCreateForm = () => {
        if (!isCreating) return null;
        
        // 检查任务名称是否有效（不为空且不只包含空格）
        const isNameValid = newTaskValues.name && newTaskValues.name.trim() !== '';
        
        return (
            <div className="mb-6 p-4 border rounded-lg">
                <div className="flex justify-between items-center mb-3">
                    <h3 className="text-lg font-medium">{t('createTask')}</h3>
                    <button 
                        className="p-1 rounded-full hover:bg-gray-100"
                        onClick={handleCancelCreate}
                    >
                        <X className="w-4 h-4 text-gray-500 hover:text-black" />
                    </button>
                </div>
                
                <div className="space-y-3">
                    <div className="flex flex-col">
                        <label className="font-medium mb-1">{t('name')}:</label>
                        <input
                            type="text"
                            value={newTaskValues.name}
                            onChange={(e) => handleNewTaskInputChange('name', e.target.value)}
                            onBlur={(e) => handleFieldBlur('name', true)}
                            placeholder={t('taskName')}
                            className="p-2 border rounded text-sm w-full focus:ring-1 focus:ring-primary focus:outline-none"
                            autoFocus
                            maxLength={50}
                        />
                        <div className="text-xs text-gray-500 mt-1 text-right">
                            {newTaskValues.name.length}/50
                        </div>
                    </div>
                    
                    <div className="flex flex-col">
                        <label className="font-medium mb-1">{t('status')}:</label>
                        <WorkflowLabelManager 
                            teamId={teamId}
                            selectedValue={newTaskValues.status}
                            onSelect={(option) => handleNewTaskInputChange('status', option)}
                            projectThemeColor={projectThemeColor}
                            selectionMode={true}
                            tasks={[]}
                        />
                    </div>
                    <div className="flex flex-col">
                        <label className="font-medium mb-1">{t('description')}:</label>
                        <textarea
                            value={newTaskValues.description}
                            onChange={(e) => handleNewTaskInputChange('description', e.target.value.slice(0, 100))}
                            onBlur={(e) => handleFieldBlur('description', true)}
                            placeholder={t('taskDescription')}
                            className="p-2 border rounded text-sm min-h-[80px] focus:ring-1 focus:ring-primary focus:outline-none"
                            maxLength={100}
                        />
                        <div className="text-xs text-gray-500 mt-1 text-right">
                            {newTaskValues.description?.length || 0}/100
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col">
                            <label className="font-medium mb-1">{t('dueDate')}:</label>
                            <input
                                type="date"
                                value={newTaskValues.dueDate}
                                onChange={(e) => handleNewTaskInputChange('dueDate', e.target.value)}
                                className="p-2 border rounded text-sm focus:ring-1 focus:ring-primary focus:outline-none"
                                min={today}
                            />
                        </div>
                    </div>
                    
                    <div className="flex justify-end items-center pt-4 mt-3 border-t">
                        <Button 
                            variant="outline"
                            className="flex items-center text-sm text-green-500 hover:text-green-600 py-2 px-3 rounded hover:bg-muted-background transition-colors"
                            onClick={handleCreateTask}
                            disabled={!isNameValid}
                            type="button"
                        >
                            <Check className={`w-4 h-4 mr-1 ${!isNameValid ? 'text-gray-300' : ''}`} />
                            <span className={`${!isNameValid ? 'text-gray-300' : ''}`}>{t('create')}</span>
                        </Button>
                    </div>
                </div>
            </div>
        );
    };

    // 打开创建任务表单
    const handleOpenCreateTask = () => {
        // 如果正在编辑任务，先关闭编辑表单
        if (isEditing) {
            setIsEditing(false);
            setEditingTask(null);
            setEditingValues({});
        }
        
        setIsCreating(true);
    };

    // 处理删除任务
    const handleDeleteTask = (task) => {        
        // 检查任务对象是否有效
        if (!task) {
            console.error('删除任务失败: 任务对象为空');
            toast.error(t('deleteTaskFailed'));
            return;
        }
        
        // 检查任务ID是否有效
        if (!task.id) {
            console.error('删除任务失败: 任务ID为空');
            toast.error(t('deleteTaskFailed'));
            return;
        }
        
        const taskId = task.id; // 保存任务ID以确保一致性
        
        confirm({
            title: t('deleteTaskTitle'),
            description: t('deleteTaskDescription'),
            variant: "error",
            onConfirm: async () => {
                try {
                    setLoading(true);
                    
                    // 获取任务所在的部分
                    const sectionsData = await dispatch(getSectionByTeamId(teamId)).unwrap();
                    const sectionWithTask = sectionsData.find(section => 
                        section.task_ids && section.task_ids.includes(taskId)
                    );
                    
                    if (sectionWithTask) {
                        // 从部分的任务ID列表中移除该任务
                        const updatedTaskIds = sectionWithTask.task_ids.filter(id => id !== taskId);
                        
                        // 准备删除任务的参数
                        const deleteParams = {
                            taskId,
                            teamId,
                            sectionId: sectionWithTask.id,
                            userId // 添加用户ID到参数中
                        };
                        
                        // 删除任务
                        await dispatch(deleteTask(deleteParams)).unwrap();
                        
                        // 更新部分的任务ID列表
                        await dispatch(updateTaskIds({
                            sectionId: sectionWithTask.id,
                            teamId: teamId,
                            newTaskIds: updatedTaskIds
                        })).unwrap();
                        
                        // 更新本地任务列表
                        setAllTasks(prev => prev.filter(t => t.id !== taskId));
                        setProcessedTasks(prev => prev.filter(t => t.id !== taskId));
                        
                        // 如果删除的是当前选中的任务，选择其他任务
                        if (selectedTaskId === taskId) {
                            const otherTask = processedTasks.find(t => t.id !== taskId);
                            setSelectedTaskId(otherTask ? otherTask.id : null);
                        }
                        
                        // 更新工作流数据
                        const updatedTasks = processedTasks.filter(t => t.id !== taskId);
                        updateWorkflowData(updatedTasks);
                        
                        // 刷新工作流图
                        if (refreshWorkflow) {
                            setTimeout(() => {
                                refreshWorkflow([...updatedTasks]);
                            }, 100); // 使用setTimeout确保状态更新已完成
                        }
                        
                        toast.success(t('taskDeleted'));
                    } else {
                        // 即使找不到部分，也尝试删除任务
                        const deleteParams = {
                            taskId,
                            teamId,
                            userId // 添加用户ID到参数中
                        };
                        
                        // 删除任务
                        await dispatch(deleteTask(deleteParams)).unwrap();
                        
                        // 更新本地任务列表
                        setAllTasks(prev => prev.filter(t => t.id !== taskId));
                        setProcessedTasks(prev => prev.filter(t => t.id !== taskId));
                        
                        toast.success(t('taskDeleted'));
                    }
                } catch (error) {
                    console.error('删除任务失败:', error);
                    toast.error(t('deleteTaskFailed'));
                } finally {
                    setLoading(false);
                }
            }
        });
    };

    // 添加标签管理状态
    const [showLabelManager, setShowLabelManager] = useState(false);

    if (loading) {
      return <div className="p-4 text-center">{t('loading')}</div>;
    }

    return (
        <div className="p-1">
            {/* 添加标签管理器切换按钮 */}
            <div className="mb-4 flex justify-end items-center">
                <Button
                    variant={projectThemeColor}
                    size="sm"
                    onClick={() => setShowLabelManager(!showLabelManager)}
                    className="flex items-center gap-1"
                >
                    <Settings className="w-4 h-4" />
                    {showLabelManager ? t('hideStatusManager') : t('manageStatusOptions')}
                </Button>
            </div>

            {/* 标签管理器组件 */}
            {showLabelManager && (
                <div className="mb-6 overflow-hidden max-w-full">
                    <WorkflowLabelManager 
                        teamId={teamId}
                        tasks={allTasks}
                        projectThemeColor={projectThemeColor}
                    />
                </div>
            )}

            {selectedTask && !isEditing && (
                <div className="mb-6 p-4 border rounded-lg">
                    <div className="flex justify-between items-center border-b pb-2 mb-3">
                        <h3 className="text-lg max-w-[80%] break-words font-semibold">{selectedTask.name}</h3>
                        <div className="flex items-center space-x-2">
                            <button 
                                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                                onClick={() => handleEditTask(selectedTask)}
                            >
                                <Edit className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <span className="font-medium">{t('status')}:</span>
                            {selectedTask.statusData ? renderStatusBadge(selectedTask.statusData) : renderStatusBadge(selectedTask.status)}
                        </div>
                        <div>
                            <span className="font-medium">{t('description')}:</span>
                            <p className="text-gray-500 mt-1">{selectedTask.description || '-'}</p>
                        </div>
                        <div className="flex justify-between">
                            <div>
                                <span className="font-medium">{t('dueDate')}:</span>
                                <p className="text-gray-500">{selectedTask.dueDate || '-'}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {renderEditForm()}

            <div className="grid grid-cols-1 gap-4">
                {processedTasks.length > 0 ? processedTasks.map((item) => (
                    <div 
                        key={item.id}
                        id={`task-${item.id}`} 
                        className={`p-4 border rounded-md cursor-pointer hover:bg-accent transition-all duration-200 ${
                            selectedTaskId === item.id 
                                ? 'border-primary' 
                                : 'border-border'
                        }`}
                        onClick={() => setSelectedTaskId(item.id)}
                    >
                        <div className="flex justify-between items-center">
                            <h3 className="font-semibold break-words max-w-[80%]">{item.name}</h3>
                            {item.statusData ? renderStatusBadge(item.statusData) : renderStatusBadge(item.status)}
                        </div>
                        <p className="text-gray-600 text-sm mt-1">{item.description || '-'}</p>
                        <div className="mt-2 text-sm text-gray-500 flex justify-between">
                            <span>{t('dueDate')}: {item.dueDate || '-'}</span>
                        </div>
                    </div>
                )) : (
                    <div className="text-center p-4 border rounded-md">
                        <p className="text-gray-500">{t('noAvailableTaskData')}</p>
                    </div>
                )}
            </div>
            {renderCreateForm()}

            {/* add task button */}
            <div className="mt-4">
              <div 
                className="p-4 border rounded-md cursor-pointer hover:bg-accent flex items-center justify-center"
                onClick={handleOpenCreateTask}
              >
                <Plus className="w-4 h-4 mr-2"/>
                <span className="text-sm">{t('addTask')}</span>
              </div>
            </div>
        </div>
    );
};

