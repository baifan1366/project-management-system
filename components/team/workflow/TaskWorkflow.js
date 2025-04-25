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

    // 监听selectedTaskId的变化并记录日志
    useEffect(() => {
        console.log('TaskWorkflow - 选中任务ID已更新:', selectedTaskId);
    }, [selectedTaskId]);

    // 创建一个包装函数来设置选中的任务ID
    const handleSetSelectedTaskId = useCallback((taskId) => {
        console.log('设置新的选中任务ID:', taskId);
        setSelectedTaskId(taskId);
    }, []);

    return (
        <WorkflowContext.Provider value={{ 
            selectedTaskId, 
            setSelectedTaskId: handleSetSelectedTaskId, 
            workflowData, 
            setWorkflowData,
            projectId,
            teamId,
            teamCFId
        }}>
            <div className="container mx-auto p-4">
                <div className="flex flex-col lg:flex-row gap-6">
                    <div className="lg:w-2/3 rounded-lg shadow">
                        <WorkflowTools />
                    </div>
                    <div className="lg:w-1/3 rounded-lg shadow">
                        <BodyContent />
                    </div>
                </div>
            </div>
        </WorkflowContext.Provider>
    );
};
