'use client';

import { useState, createContext, useEffect, useCallback } from 'react';
import { WorkflowTools } from './WorkflowTools';
import BodyContent from './BodyContent';

// 创建工作流上下文
export const WorkflowContext = createContext(null);

export default function TaskWorkflow({projectId, teamId, teamCFId}) {
    const [selectedTaskId, setSelectedTaskId] = useState(null);
    const [workflowData, setWorkflowData] = useState({
        nodes: [],
        edges: []
    });
    const [editableTask, setEditableTask] = useState(null);

    // 监听selectedTaskId的变化并记录日志
    useEffect(() => {
        console.log('TaskWorkflow - 选中任务ID已更新:', selectedTaskId);
    }, [selectedTaskId]);

    // 创建一个包装函数来设置选中的任务ID
    const handleSetSelectedTaskId = useCallback((taskId) => {
        console.log('设置新的选中任务ID:', taskId);
        setSelectedTaskId(taskId);
    }, []);

    // 处理任务编辑
    const handleTaskEdit = useCallback((task) => {
        console.log('准备编辑任务:', task);
        setEditableTask(task);
        setSelectedTaskId(task.id);
    }, []);

    // 处理任务更新后刷新工作流
    const handleWorkflowRefresh = useCallback((updatedTasks) => {
        if (!updatedTasks || updatedTasks.length === 0) return;
        
        console.log('刷新工作流数据:', updatedTasks);
        
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
                        <BodyContent />
                    </div>
                </div>
            </div>
        </WorkflowContext.Provider>
    );
};
