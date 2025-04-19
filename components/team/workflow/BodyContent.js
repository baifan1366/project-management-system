'use client';

import { useContext } from 'react';
import { WorkflowContext } from './TaskWorkflow';

export default function BodyContent() {
    //mock data
    const mockData = [
        {
            id: '1',
            name: '开始任务',
            description: '项目初始化任务',
            status: '待开始',
            assignee: '张三',
            dueDate: '2023-10-30',
        },
        {   
            id: '2',
            name: '进行中',
            description: '开发功能模块',
            status: '进行中',
            assignee: '李四',
            dueDate: '2023-11-15',
        },
        {
            id: '3',
            name: '审核',
            description: '代码审查和质量检测',
            status: '待审核',
            assignee: '王五',
            dueDate: '2023-11-20',
        },
        {
            id: '4',
            name: '完成',
            description: '任务完成，准备发布',
            status: '已完成',
            assignee: '赵六',
            dueDate: '2023-11-25',
        },
    ];

    const { 
        selectedTaskId, 
        setSelectedTaskId,
        projectId,
        teamId,
        teamCFId
    } = useContext(WorkflowContext);
    
    // 获取当前选中任务的详细信息
    const selectedTask = mockData.find(task => task.id === selectedTaskId);

    return (
        <div className="p-4">
            {selectedTask && (
                <div className="mb-6 p-4 border rounded-lg bg-blue-50">
                    <h3 className="text-lg font-semibold border-b pb-2 mb-3">{selectedTask.name}</h3>
                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <span className="font-medium">状态:</span>
                            <span className={`px-2 py-1 rounded-full text-xs ${
                                selectedTask.status === '已完成' ? 'bg-green-100 text-green-800' :
                                selectedTask.status === '进行中' ? 'bg-blue-100 text-blue-800' :
                                selectedTask.status === '待审核' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                            }`}>
                                {selectedTask.status}
                            </span>
                        </div>
                        <div>
                            <span className="font-medium">描述:</span>
                            <p className="text-gray-700 mt-1">{selectedTask.description}</p>
                        </div>
                        <div className="flex justify-between">
                            <div>
                                <span className="font-medium">负责人:</span>
                                <p className="text-gray-700">{selectedTask.assignee}</p>
                            </div>
                            <div>
                                <span className="font-medium">截止日期:</span>
                                <p className="text-gray-700">{selectedTask.dueDate}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 gap-4">
                {mockData.map((item) => (
                    <div 
                        key={item.id} 
                        className={`p-4 border rounded-md cursor-pointer hover:bg-gray-50 ${selectedTaskId === item.id ? 'bg-blue-50 border-blue-300' : ''}`}
                        onClick={() => setSelectedTaskId(item.id)}
                    >
                        <div className="flex justify-between items-center">
                            <h3 className="font-semibold">{item.name}</h3>
                            <span className={`px-2 py-1 rounded-full text-xs ${
                                item.status === '已完成' ? 'bg-green-100 text-green-800' :
                                item.status === '进行中' ? 'bg-blue-100 text-blue-800' :
                                item.status === '待审核' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                            }`}>
                                {item.status}
                            </span>
                        </div>
                        <p className="text-gray-600 text-sm mt-1">{item.description}</p>
                        <div className="mt-2 text-sm text-gray-500 flex justify-between">
                            <span>负责人: {item.assignee}</span>
                            <span>截止日期: {item.dueDate}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
