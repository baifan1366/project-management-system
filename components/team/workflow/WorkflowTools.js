'use client';

import { useCallback, useState, useContext, useEffect } from 'react';
import { 
  ReactFlow, 
  Controls, 
  Background, 
  MiniMap,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Position
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { WorkflowContext } from './TaskWorkflow';
import TaskNode from './TaskNode';
import { useTranslations } from 'next-intl';

const nodeTypes = {
  task: TaskNode,
};

export const WorkflowTools = () => {
  const { 
    selectedTaskId, 
    setSelectedTaskId, 
    workflowData, 
    setWorkflowData,
    refreshWorkflow
  } = useContext(WorkflowContext);
  const t = useTranslations('CreateTask');
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);

  // 当workflowData更新时，更新节点和边
  useEffect(() => {
    // 即使没有节点，也要清空当前状态
    if (!workflowData || !workflowData.nodes) {
      setNodes([]);
      setEdges([]);
      return;
    }
    
    // 更新节点和边
    setNodes([...workflowData.nodes]);
    setEdges([...(workflowData.edges || [])]);
    
    // 强制触发ReactFlow实例重绘
    const timer = setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
      
      // 再次检查确保节点被正确渲染
      if (workflowData.nodes.length > 0) {
        const flowInstance = document.querySelector('.react-flow');
        if (flowInstance) {
          // 尝试触发ReactFlow的内部fitView功能
          const event = new CustomEvent('react-flow-force-update');
          flowInstance.dispatchEvent(event);
        }
      }
    }, 100);
    
    return () => clearTimeout(timer);
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
      // 确保ID类型一致，如果任务ID存储为数字，则转换为数字类型
      const taskId = parseInt(node.data.id) || node.data.id;
      setSelectedTaskId(taskId);
    },
    [setSelectedTaskId]
  );

  // 定义proOptions以移除水印
  const proOptions = { hideAttribution: true };

  // if (nodes.length === 0) {
  //   return (
  //     <div className="flex items-center justify-center h-full">
  //       <p className="text-red-500">{t('loading')}</p>
  //     </div>
  //   );
  // }

  return (
    <div style={{ width: '100%', height: '600px' }}>
      <ReactFlow
        key={`flow-${workflowData.nodes?.length || 0}-${Date.now()}`}
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
        <Controls className="dark:text-black" />
        <MiniMap className="dark:bg-background" />
      </ReactFlow>
    </div>
  );
};
