'use client';

import { useState, createContext, useEffect, useCallback } from 'react';
import { WorkflowTools } from './WorkflowTools';
import BodyContent from './BodyContent';
import { useSelector } from 'react-redux';

// 创建工作流上下文
export const WorkflowContext = createContext(null);

export default function TaskWorkflow({projectId, teamId, teamCFId, refreshKey}) {
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
    // 添加一个新的 useEffect 来响应 refreshKey 变化
    useEffect(() => {        
        // 重置工作流数据，以便 BodyContent 组件重新获取任务数据
        setWorkflowData({
            nodes: [],
            edges: []
        });
        
        // 重置选中的任务 ID
        setSelectedTaskId(null);
        setEditableTask(null);
    }, [refreshKey]);

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
        const updatedNodes = workflowData.nodes.map(node => {
            const matchingTask = updatedTasks.find(task => 
                task.id.toString() === node.id.toString()
            );
            
            if (matchingTask) {
                return {
                    ...node,
                    data: {
                        ...node.data,
                        label: matchingTask.name,
                        description: matchingTask.description,
                        status: matchingTask.status,
                        statusData: matchingTask.statusData,
                        assignee: matchingTask.assignee,
                        dueDate: matchingTask.dueDate,
                        originalTask: matchingTask.originalTask
                    }
                };
            }
            
            return node;
        });
        
        setWorkflowData(prev => ({
            ...prev,
            nodes: updatedNodes,
            tasks: updatedTasks
        }));
    }, [workflowData]);

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
                        <BodyContent projectThemeColor={projectThemeColor} />
                    </div>
                </div>
            </div>
        </WorkflowContext.Provider>
    );
};
