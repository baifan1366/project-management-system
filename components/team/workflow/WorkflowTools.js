'use client';

import { useCallback, useState, useContext, memo } from 'react';
import { 
  ReactFlow, 
  Controls, 
  Background, 
  MiniMap,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Handle,
  Position
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { WorkflowContext } from './TaskWorkflow';

// 自定义任务节点
const TaskNode = memo(({ data, isConnectable }) => {
  const { 
    selectedTaskId, 
    setSelectedTaskId,
    projectId,
    teamId,
    teamCFId 
  } = useContext(WorkflowContext);
  const isSelected = selectedTaskId === data.id;

  return (
    <div 
      className={`px-4 py-2 shadow-md rounded-md border ${
        isSelected ? 'bg-blue-100 border-blue-400' : 'bg-white border-gray-300'
      }`}
      style={{ minWidth: 150 }}
      onClick={() => setSelectedTaskId(data.id)}
    >
      <div className="flex items-center">
        <div className={`w-3 h-3 rounded-full mr-2 ${
          data.status === '已完成' ? 'bg-green-500' : 
          data.status === '进行中' ? 'bg-blue-500' : 
          data.status === '待审核' ? 'bg-yellow-500' : 
          'bg-gray-500'
        }`}></div>
        <div className="font-bold">{data.label}</div>
      </div>
      {data.description && (
        <div className="mt-1 text-xs text-gray-600">{data.description}</div>
      )}
      <Handle
        type="target"
        position={Position.Top}
        isConnectable={isConnectable}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        isConnectable={isConnectable}
      />
    </div>
  );
});

TaskNode.displayName = 'TaskNode';

const nodeTypes = {
  task: TaskNode,
};

const initialNodes = [
  {
    id: '1',
    type: 'task',
    data: { 
      id: '1',
      label: '开始任务', 
      description: '项目初始化任务',
      status: '待开始'
    },
    position: { x: 250, y: 5 },
  },
  {
    id: '2',
    type: 'task',
    data: { 
      id: '2',
      label: '进行中', 
      description: '开发功能模块',
      status: '进行中'
    },
    position: { x: 100, y: 100 },
  },
  {
    id: '3',
    type: 'task',
    data: { 
      id: '3',
      label: '审核', 
      description: '代码审查和质量检测',
      status: '待审核'
    },
    position: { x: 400, y: 100 },
  },
  {
    id: '4',
    type: 'task',
    data: { 
      id: '4',
      label: '完成', 
      description: '任务完成，准备发布',
      status: '已完成'
    },
    position: { x: 250, y: 200 },
  },
];

const initialEdges = [
  { id: 'e1-2', source: '1', target: '2', animated: true },
  { id: 'e1-3', source: '1', target: '3', animated: true },
  { id: 'e2-4', source: '2', target: '4', animated: true },
  { id: 'e3-4', source: '3', target: '4', animated: true },
];

export const WorkflowTools = () => {
  const { 
    selectedTaskId, 
    setSelectedTaskId, 
    workflowData, 
    setWorkflowData,
    projectId,
    teamId,
    teamCFId
  } = useContext(WorkflowContext);
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);

  const onNodesChange = useCallback(
    (changes) => {
      const newNodes = applyNodeChanges(changes, nodes);
      setNodes(newNodes);
      setWorkflowData(prev => ({ ...prev, nodes: newNodes }));
    },
    [nodes, setWorkflowData]
  );
  
  const onEdgesChange = useCallback(
    (changes) => {
      const newEdges = applyEdgeChanges(changes, edges);
      setEdges(newEdges);
      setWorkflowData(prev => ({ ...prev, edges: newEdges }));
    },
    [edges, setWorkflowData]
  );

  const onConnect = useCallback(
    (connection) => {
      const newEdges = addEdge(
        { ...connection, animated: true },
        edges
      );
      setEdges(newEdges);
      setWorkflowData(prev => ({ ...prev, edges: newEdges }));
    },
    [edges, setWorkflowData]
  );

  // 当节点被选中时，更新上下文中的选中任务ID
  const onNodeClick = useCallback(
    (_, node) => {
      setSelectedTaskId(node.data.id);
    },
    [setSelectedTaskId]
  );

  // 定义proOptions以移除水印
  const proOptions = { hideAttribution: true };

  return (
    <div style={{ width: '100%', height: '500px' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        proOptions={proOptions}
        fitView
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  );
};
