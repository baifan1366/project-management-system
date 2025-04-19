'use client';

import { useState, createContext } from 'react';
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

    return (
        <WorkflowContext.Provider value={{ 
            selectedTaskId, 
            setSelectedTaskId, 
            workflowData, 
            setWorkflowData,
            projectId,
            teamId,
            teamCFId
        }}>
            <div className="container mx-auto p-4">
                <div className="flex flex-col lg:flex-row gap-6">
                    <div className="lg:w-2/3 bg-white rounded-lg shadow">
                        <WorkflowTools />
                    </div>
                    <div className="lg:w-1/3 bg-white rounded-lg shadow">
                        <BodyContent />
                    </div>
                </div>
            </div>
        </WorkflowContext.Provider>
    );
};
