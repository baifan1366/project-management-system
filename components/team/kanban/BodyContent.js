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
            
            
            setColumns(tempColumns);
            setTasks(tempTasks);
            setColumnOrder(tempColumnOrder);
            
        } catch (error) {
            console.error('加载数据失败:', error);
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
        initialColumns: Object.keys(columns).length > 0 ? columns : '',
        initialTasks: Object.keys(tasks).length > 0 ? tasks : '',
        initialColumnOrder: columnOrder.length > 0 ? columnOrder : []
    };
}

