'use client';

import { useContext, useEffect, useState, useRef } from 'react';
import { WorkflowContext } from './TaskWorkflow';
import { useSelector, useDispatch } from 'react-redux';
import { fetchTasksBySectionId } from '@/lib/redux/features/taskSlice';
import { getSectionByTeamId } from '@/lib/redux/features/sectionSlice';
import { fetchAllTags } from '@/lib/redux/features/tagSlice';
import { getTags } from '@/lib/redux/features/teamCFSlice';
import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';

// 使用唯一键记录全局请求状态，避免重复请求
const requestCache = {
  allTags: false,
  teamTags: {},
  sections: {}
};

// 根据ID查找标签
const findTagById = (tagId, tags) => {
  return tags.find(tag => tag.id === parseInt(tagId) || tag.id === tagId || tag.id.toString() === tagId);
};

export default function BodyContent() {
    const dispatch = useDispatch();
    const t = useTranslations('CreateTask');
    const allTags = useSelector(state => state.tags.tags);
    const teamCFTags = useSelector(state => state.teamCF.tags);
    
    const { 
        selectedTaskId, 
        setSelectedTaskId,
        projectId,
        teamId,
        teamCFId,
        setWorkflowData
    } = useContext(WorkflowContext);
    
    const [sections, setSections] = useState([]);
    const [allTasks, setAllTasks] = useState([]);
    const [processedTasks, setProcessedTasks] = useState([]);
    const [tags, setTags] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // 本地跟踪当前组件实例的已请求状态
    const localRequestTracker = useRef({
      allTagsFetched: false,
      teamTagsFetched: false,
      sectionsFetched: false
    });

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
          if (!requestCache.sections[teamId] && !localRequestTracker.current.sectionsFetched) {
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
            console.log('获取的原始任务数据:', allTasksData);
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
    }, [teamId, dispatch]);

    // 从任务标签值中提取任务信息
    const extractTaskInfo = (task) => {
      const tagValues = task.tag_values || {};
      let taskInfo = {
        id: task.id,
        name: `${t('task')} #${task.id}`,
        description: '',
        status: t('pending'),
        assignee: '',
        dueDate: '',
        originalTask: task
      };
      
      Object.entries(tagValues).forEach(([tagId, value]) => {
        const tag = findTagById(tagId, tags);
        if (tag) {
          switch (tag.name) {
            case 'Name':
              taskInfo.name = String(value || '');
              break;
            case 'Description':
              taskInfo.description = String(value || '');
              break;
            case 'Status':
              taskInfo.status = String(value || t('pending'));
              break;
            case 'Assignee':
              taskInfo.assignee = String(value || '');
              break;
            case 'Due Date':
            case 'DueDate':
              taskInfo.dueDate = value ? String(value).split('T')[0] : '';
              break;
          }
        }
      });
      
      return taskInfo;
    };

    // 处理任务数据并提取所需信息
    useEffect(() => {
      if (allTasks.length > 0 && tags.length > 0) {
        const taskList = allTasks.map(task => extractTaskInfo(task));
        setProcessedTasks(taskList);
        console.log('处理后的任务数据:', taskList);
        
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
      console.log('BodyContent - 选中的任务ID已更新:', selectedTaskId);
      
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
            assignee: task.assignee,
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

    if (loading) {
      return <div className="p-4 text-center">{t('loading')}</div>;
    }

    return (
        <div className="p-1">
            {selectedTask && (
                <div className="mb-6 p-4 border rounded-lg">
                    <h3 className="text-lg font-semibold border-b pb-2 mb-3">{selectedTask.name}</h3>
                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <span className="font-medium">{t('status')}:</span>
                            <span className={`px-2 py-1 rounded-full text-xs ${
                                selectedTask.status === t('completed') ? 'bg-green-100 text-green-800' :
                                selectedTask.status === t('inProgress') ? 'bg-blue-100 text-blue-800' :
                                selectedTask.status === t('pending') ? 'bg-yellow-100 text-yellow-800' :
                                'text-gray-800'
                            }`}>
                                {selectedTask.status}
                            </span>
                        </div>
                        <div>
                            <span className="font-medium">{t('description')}:</span>
                            <p className="text-gray-700 mt-1">{selectedTask.description || '-'}</p>
                        </div>
                        <div className="flex justify-between">
                            <div>
                                <span className="font-medium">{t('assignee')}:</span>
                                <p className="text-gray-700">{selectedTask.assignee || '-'}</p>
                            </div>
                            <div>
                                <span className="font-medium">{t('dueDate')}:</span>
                                <p className="text-gray-700">{selectedTask.dueDate || '-'}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

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
                            <h3 className="font-semibold">{item.name}</h3>
                            <span className={`px-2 py-1 rounded-full text-xs ${
                                item.status === t('completed') ? 'bg-green-100 text-green-800' :
                                item.status === t('inProgress') ? 'bg-blue-100 text-blue-800' :
                                item.status === t('pending') ? 'bg-yellow-100 text-yellow-800' :
                                'text-gray-800'
                            }`}>
                                {item.status}
                            </span>
                        </div>
                        <p className="text-gray-600 text-sm mt-1">{item.description || '-'}</p>
                        <div className="mt-2 text-sm text-gray-500 flex justify-between">
                            <span>{t('assignee')}: {item.assignee || '-'}</span>
                            <span>{t('dueDate')}: {item.dueDate || '-'}</span>
                        </div>
                    </div>
                )) : (
                    <div className="text-center p-4 border rounded-md">
                        <p className="text-gray-500">{t('noAvailableTaskData')}</p>
                    </div>
                )}
            </div>

            {/* add task */}
            <div className="mt-4">
              <div className="p-4 border rounded-md cursor-pointer hover:bg-accent flex items-center justify-center">
                <Plus className="w-4 h-4 text-gray-500"/>
              </div>
            </div>
        </div>
    );
};

