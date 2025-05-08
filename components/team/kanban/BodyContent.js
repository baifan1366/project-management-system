'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { getSectionByTeamId } from '@/lib/redux/features/sectionSlice';
import { fetchTasksBySectionId } from '@/lib/redux/features/taskSlice';
import { fetchAllTags, getTagByName } from '@/lib/redux/features/tagSlice';
import { useDispatch } from 'react-redux';

// 为空数据创建固定引用的空对象，避免每次渲染创建新对象
const EMPTY_OBJECT = {};
const EMPTY_ARRAY = [];

export default function BodyContent({ projectId, teamId, teamCFId }) {
    const dispatch = useDispatch();
    const [columns, setColumns] = useState({});
    const [tasks, setTasks] = useState({});
    const [columnOrder, setColumnOrder] = useState([]);
    const [tags, setTags] = useState([]);
    const [isLoaded, setIsLoaded] = useState(false);
    const [assigneeTagId, setAssigneeTagId] = useState(null);
    const [nameTagId, setNameTagId] = useState(null);

    // 获取Assignee和Name标签ID
    useEffect(() => {
        async function fetchTagIds() {
            try {
                // 获取Assignee标签ID
                const assigneeTag = await dispatch(getTagByName("Assignee")).unwrap();
                if (assigneeTag) {
                    setAssigneeTagId(assigneeTag);
                    console.log('获取到Assignee标签ID:', assigneeTag);
                }

                // 获取Name标签ID
                const nameTag = await dispatch(getTagByName("Name")).unwrap();
                if (nameTag) {
                    setNameTagId(nameTag);
                    console.log('获取到Name标签ID:', nameTag);
                }
            } catch (error) {
                console.error('获取标签ID失败:', error);
            }
        }

        fetchTagIds();
    }, [dispatch]);

    // 使用useCallback包装loadData，确保函数引用稳定
    const loadData = useCallback(async (forceReload = false) => {
        if (!teamId || (isLoaded && !forceReload)) return;
        
        try {
            // 仅在首次加载时设置为true，强制重新加载时不改变
            if (!isLoaded) {
                setIsLoaded(true);
            }
            
            // 获取所有标签
            const tagsData = await dispatch(fetchAllTags()).unwrap();
            setTags(tagsData);
            
            // 获取该团队的所有部门
            const sections = await dispatch(getSectionByTeamId(teamId)).unwrap();
            
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
                    
                    // 构建该部门的任务ID列表
                    const taskIds = [];
                    
                    // 处理该部门的所有任务
                    sectionTasks.forEach(task => {
                        // 查找名称标签
                        let taskContent = task.id.toString(); // 默认使用任务ID作为内容
                        
                        // 如果任务有标签值
                        if (task.tag_values) {
                            // 使用动态获取的nameTagId
                            if (nameTagId && task.tag_values[nameTagId]) {
                                taskContent = task.tag_values[nameTagId];
                            } else {
                                // 查找类型为"Name"的标签
                                const nameTag = tagsData.find(tag => tag.name === "Name");
                                if (nameTag && task.tag_values[nameTag.id]) {
                                    taskContent = task.tag_values[nameTag.id];
                                }
                            }
                        }
                        
                        // 将任务添加到任务集合
                        tempTasks[task.id] = {
                            id: task.id.toString(),
                            content: taskContent,
                            // 处理assignee，使用动态获取的assigneeTagId
                            assignee: (() => {
                                // 检查是否有tag_values
                                if (!task.tag_values) return null;

                                // 尝试使用动态获取的assigneeTagId
                                let assigneeValue = null;
                                if (assigneeTagId && task.tag_values[assigneeTagId]) {
                                    assigneeValue = task.tag_values[assigneeTagId];
                                } else {
                                    // 尝试使用旧的固定值"2"作为后备
                                    assigneeValue = task.tag_values["2"];
                                }

                                // 如果找到assignee值
                                if (assigneeValue) {
                                    // 处理assignee为数组的情况
                                    if (Array.isArray(assigneeValue)) {
                                        // 返回带有assignees属性的对象，表示多个指派人
                                        return { 
                                            avatar: '/avatar-placeholder.png',
                                            assignees: assigneeValue
                                        };
                                    }
                                    // 处理assignee为单个值的情况
                                    return { 
                                        avatar: '/avatar-placeholder.png',
                                        assignee: assigneeValue 
                                    };
                                }
                                
                                // 兼容旧数据，检查assignee_id字段
                                return task.assignee_id ? { avatar: '/avatar-placeholder.png' } : null;
                            })(),
                            tag_values: task.tag_values,
                            likes: task.likes || [] // 确保包含likes字段，如果不存在则设为空数组
                        };
                        
                        // 将任务ID添加到部门的任务列表
                        taskIds.push(task.id.toString());
                    });
                    
                    // 将部门添加到列集合
                    tempColumns[section.id] = {
                        id: section.id.toString(),
                        title: section.name,
                        taskIds: taskIds,
                        originalId: section.id // 保存原始ID以便后续操作
                    };
                    
                    // 将部门ID添加到顺序列表
                    tempColumnOrder.push(section.id.toString());
                }
            }
            
            // 更新状态
            setColumns(tempColumns);
            setTasks(tempTasks);
            setColumnOrder(tempColumnOrder);
            
            // 重置加载状态，允许强制重新加载
            if (forceReload) {
                console.log('重新加载看板数据完成');
            }
            
        } catch (error) {
            console.error('加载数据失败:', error);
        }
    }, [teamId, dispatch, isLoaded, nameTagId, assigneeTagId]); // 添加nameTagId和assigneeTagId作为依赖项

    // 使用useEffect自动加载数据
    useEffect(() => {
        if (teamId) {
            loadData();
        }
    }, [teamId, loadData]); // 更新正确的依赖项

    // 使用useMemo缓存返回值，避免每次渲染创建新的对象引用
    const returnData = useMemo(() => {
        return {
            loadData,
            // 使用对象引用检查，返回相同引用的空对象而不是每次创建新字符串
            initialColumns: Object.keys(columns).length > 0 ? columns : EMPTY_OBJECT,
            initialTasks: Object.keys(tasks).length > 0 ? tasks : EMPTY_OBJECT,
            initialColumnOrder: columnOrder.length > 0 ? columnOrder : EMPTY_ARRAY,
            // 返回标签ID供其他组件使用
            assigneeTagId
        };
    }, [columns, tasks, columnOrder, loadData, assigneeTagId]); // 添加assigneeTagId作为依赖项

    return returnData;
}

