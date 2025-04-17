'use client';

import { useState, useEffect } from 'react';
import { getSectionByTeamId } from '@/lib/redux/features/sectionSlice';
import { fetchTasksBySectionId } from '@/lib/redux/features/taskSlice';
import { fetchAllTags } from '@/lib/redux/features/tagSlice';
import { useDispatch } from 'react-redux';

export default function BodyContent({ projectId, teamId, teamCFId }) {
    const dispatch = useDispatch();
    const [columns, setColumns] = useState({});
    const [tasks, setTasks] = useState({});
    const [columnOrder, setColumnOrder] = useState([]);
    const [tags, setTags] = useState([]);
    const [isLoaded, setIsLoaded] = useState(false);

    // 默认数据（当API返回为空时使用）
    const getDefaultColumns = () => ({
        'doing': {
            id: 'doing',
            title: 'Doing',
            taskIds: ['task-2', 'task-3']
        },
        'done': {
            id: 'done',
            title: 'Done',
            taskIds: ['task-4', 'task-5', 'task-6']
        },
        'todo': {
            id: 'todo',
            title: 'To do',
            taskIds: ['task-1']
        }
    });

    const getDefaultTasks = () => ({
        'task-1': {
          id: 'task-1',
          content: 'Meeting Report',
          assignee: {
            avatar: '/avatar-placeholder.png'
          }
        },
        'task-2': {
          id: 'task-2',
          content: '设计首页UI',
          assignee: null
        },
        'task-3': {
          id: 'task-3',
          content: '后端API开发',
          assignee: null
        },
        'task-4': {
          id: 'task-4',
          content: '测试用户注册流程',
          assignee: null
        },
        'task-5': {
          id: 'task-5',
          content: '修复登录Bug',
          assignee: null
        },
        'task-6': {
          id: 'task-6',
          content: '优化数据库查询',
          assignee: null
        }
    });

    const getDefaultColumnOrder = () => ['doing', 'done', 'todo'];

    const loadData = async () => {
        if (!teamId || isLoaded) return;
        
        try {
            setIsLoaded(true);
            // 获取所有标签
            const tagsData = await dispatch(fetchAllTags()).unwrap();
            setTags(tagsData);
            
            // 获取该团队的所有部门
            const sections = await dispatch(getSectionByTeamId(teamId)).unwrap();
            console.log(sections);
            
            // 构建 columns 和 columnOrder
            const tempColumns = {};
            const tempColumnOrder = [];
            const tempTasks = {};
            
            // 处理各部门数据
            for(let i = 0; i < sections.length; i++) {
                const section = sections[i];
                if(section && section.id) {
                    // 获取该部门的所有任务
                    const sectionTasks = await dispatch(fetchTasksBySectionId(section.id)).unwrap();
                    console.log(sectionTasks);
                    
                    // 构建该部门的任务ID列表
                    const taskIds = [];
                    
                    // 处理该部门的所有任务
                    sectionTasks.forEach(task => {
                        // 查找名称标签
                        let taskContent = task.id.toString(); // 默认使用任务ID作为内容
                        
                        // 如果任务有标签值
                        if (task.tag_values) {
                            // 查找类型为"Name"的标签
                            const nameTag = tagsData.find(tag => tag.name === "Name");
                            if (nameTag && task.tag_values[nameTag.id]) {
                                taskContent = task.tag_values[nameTag.id];
                            }
                        }
                        
                        // 将任务添加到任务集合
                        tempTasks[task.id] = {
                            id: task.id.toString(),
                            content: taskContent,
                            assignee: task.assignee_id ? { avatar: '/avatar-placeholder.png' } : null,
                            tag_values: task.tag_values
                        };
                        
                        // 将任务ID添加到部门的任务列表
                        taskIds.push(task.id.toString());
                    });
                    
                    // 将部门添加到列集合
                    tempColumns[section.id] = {
                        id: section.id.toString(),
                        title: section.name,
                        taskIds: taskIds
                    };
                    
                    // 将部门ID添加到顺序列表
                    tempColumnOrder.push(section.id.toString());
                }
            }
            
            // 如果没有部门数据，使用默认数据
            if (tempColumnOrder.length === 0) {
                setColumns(getDefaultColumns());
                setTasks(getDefaultTasks());
                setColumnOrder(getDefaultColumnOrder());
            } else {
                // 更新状态
                setColumns(tempColumns);
                setTasks(tempTasks);
                setColumnOrder(tempColumnOrder);
            }
        } catch (error) {
            console.error('加载数据失败:', error);
            // 加载失败时使用默认数据
            setColumns(getDefaultColumns());
            setTasks(getDefaultTasks());
            setColumnOrder(getDefaultColumnOrder());
        }
    };

    // 使用useEffect自动加载数据
    useEffect(() => {
        if (teamId) {
            loadData();
        }
    }, [teamId]);

    return {
        loadData,
        initialColumns: Object.keys(columns).length > 0 ? columns : getDefaultColumns(),
        initialTasks: Object.keys(tasks).length > 0 ? tasks : getDefaultTasks(),
        initialColumnOrder: columnOrder.length > 0 ? columnOrder : getDefaultColumnOrder()
    };
}

