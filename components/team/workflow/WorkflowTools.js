'use client';

import { useCallback, useState, useContext, memo, useEffect } from 'react';
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
    setSelectedTaskId
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
      {data.assignee && (
        <div className="mt-1 text-xs text-gray-500">负责人: {data.assignee}</div>
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

export const WorkflowTools = () => {
  const { 
    selectedTaskId, 
    setSelectedTaskId, 
    workflowData, 
    setWorkflowData
  } = useContext(WorkflowContext);
  
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);

  // 当workflowData更新时，更新节点和边
  useEffect(() => {
    if (workflowData && workflowData.nodes && workflowData.nodes.length > 0) {
      setNodes(workflowData.nodes);
      setEdges(workflowData.edges || []);
      console.log('工作流图形数据已更新:', workflowData);
    }
  }, [workflowData]);

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

  if (nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">Loading workflow data...</p>
      </div>
    );
  }

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
