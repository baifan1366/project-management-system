'use client';

import { useState, createContext, useEffect, useCallback } from 'react';
import { WorkflowTools } from './WorkflowTools';
import BodyContent from './BodyContent';
import { useSelector } from 'react-redux';

// 创建工作流上下文
export const WorkflowContext = createContext(null);

export default function TaskWorkflow({projectId, teamId, teamCFId, refreshKey, addTask}) {
    const [selectedTaskId, setSelectedTaskId] = useState(null);
    const [workflowData, setWorkflowData] = useState({
        nodes: [],
        edges: []
    });
    const [editableTask, setEditableTask] = useState(null);
    const [projectThemeColor, setProjectThemeColor] = useState('#ffffff');
    const project = useSelector(state => 
      state.projects.projects.find(p => String(p.id) === String(projectId))
    );
    
    useEffect(() => {
      if (project?.theme_color) {
        setProjectThemeColor(project.theme_color);
      }
    }, [project]);

    // 添加一个函数来强制重新渲染ReactFlow
    const forceRefreshFlow = useCallback(() => {
        setWorkflowData(prev => ({
            ...prev,
            _forceUpdate: Date.now() // 添加一个变化的值来触发重新渲染
        }));
    }, []);
    
    // 监听refreshKey变化，触发工作流重置
    useEffect(() => {        
        // 重置工作流数据，以便 BodyContent 组件重新获取任务数据
        setWorkflowData({
            nodes: [],
            edges: []
        });
        
        // 重置选中的任务 ID
        setSelectedTaskId(null);
        setEditableTask(null);

        // 添加一个短暂延迟后强制刷新
        const timer = setTimeout(() => {
            forceRefreshFlow();
        }, 100);
        
        return () => clearTimeout(timer);
    }, [refreshKey, forceRefreshFlow]);

    // 创建一个包装函数来设置选中的任务ID
    const handleSetSelectedTaskId = useCallback((taskId) => {
        setSelectedTaskId(taskId);
    }, []);

    // 处理任务编辑
    const handleTaskEdit = useCallback((task) => {
        setEditableTask(task);
        setSelectedTaskId(task.id);
    }, []);

    // 处理任务更新后刷新工作流
    const handleWorkflowRefresh = useCallback((updatedTasks) => {
        if (!updatedTasks || updatedTasks.length === 0) return;
                
        // 更新工作流中的节点数据
        const updatedNodes = updatedTasks.map((task, index) => {
            // 基本布局计算
            const row = Math.floor(index / 3);
            const col = index % 3;
            
            // 创建全新的节点数据
            return {
                id: task.id.toString(),
                type: 'task',
                data: { 
                    id: task.id.toString(),
                    label: task.name, 
                    description: task.description,
                    status: task.status,
                    statusData: task.statusData,
                    assignee: task.assignee,
                    dueDate: task.dueDate,
                    originalTask: task.originalTask
                },
                // 简单的网格布局
                position: { x: 150 + col * 250, y: 100 + row * 150 },
            };
        });

        // 创建全新的边
        const newEdges = [];
        for (let i = 0; i < updatedTasks.length - 1; i++) {
            newEdges.push({
                id: `e${updatedTasks[i].id}-${updatedTasks[i+1].id}`,
                source: updatedTasks[i].id.toString(),
                target: updatedTasks[i+1].id.toString(),
                animated: true
            });
        }
        
        // 完全重置工作流数据
        setWorkflowData({
            nodes: updatedNodes,
            edges: newEdges,
            tasks: updatedTasks
        });
    }, []);

    return (
        <WorkflowContext.Provider value={{ 
            selectedTaskId, 
            setSelectedTaskId: handleSetSelectedTaskId, 
            workflowData, 
            setWorkflowData,
            projectId,
            teamId,
            teamCFId,
            onTaskEdit: handleTaskEdit,
            refreshWorkflow: handleWorkflowRefresh,
            editableTask,
            setEditableTask
        }}>
            <div className="container mx-auto p-4">
                <div className="flex flex-col lg:flex-row gap-6">
                    <div className="lg:w-2/3 rounded-lg shadow">
                        <WorkflowTools />
                    </div>
                    <div className="lg:w-1/3 rounded-lg shadow h-[600px] overflow-auto">
                        <BodyContent projectThemeColor={projectThemeColor} addTask={addTask} />
                    </div>
                </div>
            </div>
        </WorkflowContext.Provider>
    );
};
