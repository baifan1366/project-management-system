"use client"
import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { useConfirm } from '@/hooks/use-confirm';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslations } from 'next-intl';
import { 
    ReactFlow, 
    Controls, 
    Background, 
    MiniMap,
    addEdge,
    applyEdgeChanges,
    applyNodeChanges,
    Panel
  } from '@xyflow/react';
  import '@xyflow/react/dist/style.css';
import { Button } from '@/components/ui/button';
import { 
  PlusCircle, 
  PlayCircle, 
  Save, 
  Trash2, 
  FileDown, 
  Settings,
  Database,
  FileText,
  PresentationIcon,
  Code,
  BarChart4,
  FileInput,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Menu,
  CheckCircle,
  MessageSquare
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue,
  SelectGroup,
  SelectLabel
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import WorkflowNode from './components/WorkflowNode';
import InputForm from './components/InputForm';
import { cn } from '@/lib/utils';
import useGetUser from '@/lib/hooks/useGetUser';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

// Node types for React Flow
const nodeTypes = {
  workflowNode: WorkflowNode,
};
const proOptions = { hideAttribution: true };
// Define initial nodes for a new workflow
const initialNodes = [
  {
    id: 'input',
    type: 'workflowNode',
    position: { x: 250, y: 50 },
    data: { 
      label: 'Input',
      icon: <FileInput size={20} />,
      nodeType: 'input',
      description: 'User input values',
      handleInputChange: () => {},
      inputs: {}
    }
  },
  {
    id: 'process',
    type: 'workflowNode',
    position: { x: 250, y: 200 },
    data: { 
      label: 'AI Processing',
      icon: <Settings size={20} />,
      nodeType: 'process',
      description: 'AI model processing',
      handleInputChange: () => {},
      selectedModel: 'google/gemini-2.0-flash-exp:free',
      inputs: {}
    }
  },
  {
    id: 'json_output',
    type: 'workflowNode',
    position: { x: 150, y: 350 },
    data: { 
      label: 'JSON Output',
      icon: <Code size={20} />,
      nodeType: 'output',
      outputType: 'json',
      description: 'Generate JSON result',
      handleInputChange: () => {},
      jsonFormat: '{\n  "title": "Result",\n  "content": "Generated content",\n  "items": []\n}',
      inputs: {}
    }
  },
  {
    id: 'api_output',
    type: 'workflowNode',
    position: { x: 350, y: 500 },
    data: { 
      label: 'API Request',
      icon: <Code size={20} />,
      nodeType: 'output',
      outputType: 'api',
      description: 'Send data to external API',
      handleInputChange: () => {},
      apiUrl: 'https://httpbin.org/post',
      apiMethod: 'POST',
      inputs: {}
    }
  },
  {
    id: 'task_output',
    type: 'workflowNode',
    position: { x: 350, y: 350 },
    data: { 
      label: 'Task Creation',
      icon: <CheckCircle size={20} />,
      nodeType: 'output',
      outputType: 'task',
      description: 'Create project tasks automatically',
      handleInputChange: () => {},
      inputs: {}
    }
  }
];

// Initial edges connecting the nodes
const initialEdges = [
  { 
    id: 'input-process', 
    source: 'input', 
    target: 'process', 
    animated: true 
  },
  { 
    id: 'process-json_output', 
    source: 'process', 
    target: 'json_output', 
    animated: true 
  },
  { 
    id: 'json_output-api_output', 
    source: 'json_output', 
    target: 'api_output', 
    animated: true 
  },
  { 
    id: 'process-task_output', 
    source: 'process', 
    target: 'task_output', 
    animated: true 
  }
];

// Workflow types with icons
const workflowTypes = [
  { id: 'ppt_generation', name: 'PowerPoint Generation', icon: <PresentationIcon size={18} /> },
  { id: 'document_generation', name: 'Document Generation', icon: <FileText size={18} /> },
  { id: 'api_request', name: 'API Request', icon: <Code size={18} /> },
  { id: 'data_analysis', name: 'Data Analysis', icon: <BarChart4 size={18} /> },
];

export default function AIWorkflow() {
  const t = useTranslations('AI_Workflow');
  const { confirm } = useConfirm();
  
  // User state
  const [userId, setUserId] = useState(null);
  
  // State for panel collapse
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(true);
  
  // State for workflow
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);
  const [currentWorkflow, setCurrentWorkflow] = useState(null);
  const [workflowName, setWorkflowName] = useState('New Workflow');
  const [workflowDescription, setWorkflowDescription] = useState('');
  const [workflowType, setWorkflowType] = useState('document_generation');
  const [workflowPrompt, setWorkflowPrompt] = useState('');
  
  // State for saving/loading workflows
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [userWorkflows, setUserWorkflows] = useState([]);
  
  // State for workflow execution
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState(null);
  const [showExecutionForm, setShowExecutionForm] = useState(false);
  
  // Input schema for the workflow
  const [inputFields, setInputFields] = useState([
    { name: 'topic', label: 'Topic', type: 'text', required: true }
  ]);
  
  // Create a node ID counter for unique node IDs
  const nodeIdRef = useRef(1);
  const { user } = useGetUser();
  // Get current user on component mount
  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        if (user && user.id) {
          console.log('AIWorkflow: Setting userId from user:', user.id);
          setUserId(user.id);
        } else if (user === null) {
          console.log('AIWorkflow: User is null, not authenticated');
        } else if (user) {
          console.log('AIWorkflow: User exists but no ID:', user);
        }
      } catch (error) {
        console.error('Error getting user:', error);
        toast.error('Failed to authenticate user');
      }
    };
    
    getCurrentUser();
  }, [user]); // Add user as a dependency so this effect runs when user changes
  
  // Load user workflows on component mount
  useEffect(() => {
    if (userId) {
      fetchUserWorkflows();
    }
  }, [userId]);
  
  // Fetch user workflows
  const fetchUserWorkflows = async () => {
    if (!userId) return;
    
    try {
      setIsLoading(true);
      const response = await fetch(`/api/ai/workflow-agent/workflows?userId=${userId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch workflows');
      }
      
      const data = await response.json();
      setUserWorkflows(data);
    } catch (error) {
      console.error('Error fetching workflows:', error);
      toast.error('Failed to load workflows');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle node changes
  const onNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );
  
  // Handle edge changes
  const onEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );
  
  // Handle adding new edges
  const onConnect = useCallback(
    (connection) => {
      // 创建一个新的边缘连接，添加动画效果
      const newEdge = {
        ...connection,
        id: `${connection.source}-${connection.target}`,
        animated: true
      };
      
      // 将新连接添加到边缘列表
      setEdges((eds) => addEdge(newEdge, eds));
      
      // 提示用户连接已创建
      toast.success('节点已连接');
    },
    [setEdges]
  );
  
  // Handle node input changes (for model selection, etc.)
  const handleNodeInputChange = useCallback((nodeId, fieldName, value) => {
    setNodes(prevNodes => 
      prevNodes.map(node => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              [fieldName]: value
            }
          };
        }
        return node;
      })
    );
  }, []);
  
  // Update nodes with the handleInputChange function after userId is set
  useEffect(() => {
    if (userId) {
      console.log('AIWorkflow: Updating nodes with userId:', userId);
      setNodes(prevNodes => 
        prevNodes.map(node => ({
          ...node,
          data: {
            ...node.data,
            handleInputChange: handleNodeInputChange,
            userId: userId
          }
        }))
      );
    }
  }, [userId, handleNodeInputChange]);
  
  // Save the current workflow
  const saveWorkflow = async () => {
    if (!userId) {
      toast.error('User not authenticated');
      return;
    }
    
    if (!workflowName || !workflowType || !workflowPrompt) {
      toast.error(t('missingRequiredFields'));
      return;
    }
    
    try {
      setIsSaving(true);
      
      // Create serializable versions of nodes and edges
      const serializableNodes = nodes.map(node => {
        // Create a new object without React elements
        const { data, ...rest } = node;
        const serializableData = { ...data };
        
        // Remove the React element icon and replace with a string identifier
        if (data.nodeType) {
          serializableData.iconType = data.nodeType; // Store icon type as string
        }
        
        // Remove function references which can't be serialized
        if (serializableData.handleInputChange) {
          delete serializableData.handleInputChange;
        }
        
        // Preserve the selected model
        if (data.selectedModel) {
          serializableData.selectedModel = data.selectedModel;
        }
        
        // Preserve custom output properties
        if (data.jsonFormat) {
          serializableData.jsonFormat = data.jsonFormat;
        }
        
        if (data.apiUrl) {
          serializableData.apiUrl = data.apiUrl;
        }
        
        if (data.apiMethod) {
          serializableData.apiMethod = data.apiMethod;
        }
        
        // Preserve output type
        if (data.outputType) {
          serializableData.outputType = data.outputType;
        }
        
        return {
          ...rest,
          data: serializableData
        };
      });
      
      const workflowData = {
        userId,
        name: workflowName,
        description: workflowDescription,
        type: workflowType,
        prompt: workflowPrompt,
        input_schema: {
          fields: inputFields
        },
        flow_data: {
          nodes: serializableNodes,
          edges: edges
        },
        is_public: false,
        icon: workflowTypes.find(type => type.id === workflowType)?.id === 'ppt_generation' 
          ? '📊' 
          : workflowType === 'document_generation' 
            ? '📄' 
            : workflowType === 'api_request' 
              ? '🔌' 
              : '📈'
      };
      
      let response;
      
      if (currentWorkflow) {
        // Update existing workflow
        response = await fetch('/api/ai/workflow-agent/workflows', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: currentWorkflow.id,
            userId,
            ...workflowData
          }),
        });
      } else {
        // Create new workflow
        response = await fetch('/api/ai/workflow-agent/workflows', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(workflowData),
        });
      }
      
      if (!response.ok) {
        throw new Error('Failed to save workflow');
      }
      
      const savedWorkflow = await response.json();
      console.log('Workflow saved successfully:', savedWorkflow);
      setCurrentWorkflow(savedWorkflow);
      toast.success(t('workflowSaved'));
      
      // Refresh the workflows list
      fetchUserWorkflows();
    } catch (error) {
      console.error('Error saving workflow:', error);
      toast.error('Failed to save workflow');
    } finally {
      setIsSaving(false);
    }
  };
  
  // Load a workflow
  const loadWorkflow = async (workflowId) => {
    if (!userId) {
      toast.error('User not authenticated');
      return;
    }
    
    try {
      setIsLoading(true);
      const response = await fetch(`/api/ai/workflow-agent/workflows?id=${workflowId}&userId=${userId}`);
      
      if (!response.ok) {
        throw new Error('Failed to load workflow');
      }
      
      const workflow = await response.json();
      console.log('Loaded workflow data:', workflow);
      
      // Set workflow data
      setCurrentWorkflow(workflow);
      setWorkflowName(workflow.name);
      setWorkflowDescription(workflow.description || '');
      setWorkflowType(workflow.type);
      setWorkflowPrompt(workflow.prompt);
      
      // Set input fields if available
      if (workflow.input_schema && workflow.input_schema.fields) {
        setInputFields(workflow.input_schema.fields);
      }
      
      // Set flow data if available
      if (workflow.flow_data) {
        console.log('Loaded flow data:', workflow.flow_data);
        
        // Restore React elements in nodes
        if (workflow.flow_data.nodes) {
          const restoredNodes = workflow.flow_data.nodes.map(node => {
            // Create a new node with restored React elements
            const updatedNode = { ...node };
            const nodeData = { ...node.data };
            
            // Restore icon based on iconType or nodeType
            if (nodeData.iconType || nodeData.nodeType) {
              const nodeType = nodeData.iconType || nodeData.nodeType;
              
              // Set appropriate icon based on node type
              switch (nodeType) {
                case 'input':
                  nodeData.icon = <FileInput size={20} />;
                  break;
                case 'process':
                  nodeData.icon = <Settings size={20} />;
                  break;
                case 'output':
                  nodeData.icon = <FileDown size={20} />;
                  break;
              }
              
              // Set additional icons based on outputType if available
              if (nodeData.outputType) {
                switch (nodeData.outputType) {
                  case 'document':
                    nodeData.icon = <FileText size={20} />;
                    break;
                  case 'ppt':
                    nodeData.icon = <PresentationIcon size={20} />;
                    break;
                  case 'api':
                    nodeData.icon = <Code size={20} />;
                    break;
                  case 'task':
                    nodeData.icon = <CheckCircle size={20} />;
                    break;
                }
              }
            }
            
            // Add function for handleInputChange and userId 
            nodeData.handleInputChange = handleNodeInputChange;
            nodeData.userId = userId;
            
            updatedNode.data = nodeData;
            return updatedNode;
          });
          
          console.log('Restored nodes with React elements:', restoredNodes);
          setNodes(restoredNodes);
        }
        
        if (workflow.flow_data.edges) {
          console.log('Setting edges:', workflow.flow_data.edges);
          setEdges(workflow.flow_data.edges);
        }
      }
      
      toast.success(t('workflowLoaded'));
    } catch (error) {
      console.error('Error loading workflow:', error);
      toast.error('Failed to load workflow');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Delete a workflow
  const deleteWorkflow = async (workflowId) => {
    if (!userId) {
      toast.error('User not authenticated');
      return;
    }
    
    const confirmed = await confirm({
      title: t('deleteConfirm'),
      description: t('deleteConfirmDesc')
    });
    
    if (!confirmed) return;
    
    try {
      setIsLoading(true);
      const response = await fetch(`/api/ai/workflow-agent/workflows?id=${workflowId}&userId=${userId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete workflow');
      }
      
      toast.success(t('workflowDeleted'));
      
      // Reset current workflow if it's the one being deleted
      if (currentWorkflow && currentWorkflow.id === workflowId) {
        setCurrentWorkflow(null);
        setWorkflowName('New Workflow');
        setWorkflowDescription('');
        setWorkflowType('document_generation');
        setWorkflowPrompt('');
        setNodes(initialNodes);
        setEdges(initialEdges);
      }
      
      // Refresh the workflows list
      fetchUserWorkflows();
    } catch (error) {
      console.error('Error deleting workflow:', error);
      toast.error('Failed to delete workflow');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Create a new workflow
  const createNewWorkflow = () => {
    setCurrentWorkflow(null);
    setWorkflowName('New Workflow');
    setWorkflowDescription('');
    setWorkflowType('document_generation');
    setWorkflowPrompt('');
    setNodes(initialNodes);
    setEdges(initialEdges);
    setInputFields([
      { name: 'topic', label: 'Topic', type: 'text', required: true }
    ]);
    setExecutionResult(null);
    setShowExecutionForm(false);
  };
  
  // Show execution form
  const handleShowExecutionForm = () => {
    if (!currentWorkflow) {
      toast.error('Please save the workflow before executing');
      return;
    }
    
    setShowExecutionForm(true);
  };
  
  // 分析工作流连接关系的函数
  const analyzeWorkflowConnections = useCallback(() => {
    // 创建节点连接图
    const connectionMap = {};
    
    // 将每个边添加到连接图中
    edges.forEach(edge => {
      if (!connectionMap[edge.source]) {
        connectionMap[edge.source] = [];
      }
      connectionMap[edge.source].push(edge.target);
    });
    
    return connectionMap;
  }, [edges]);
  
  // 执行工作流
  const executeWorkflow = async (inputs) => {
    if (!userId) {
      toast.error('User not authenticated');
      return;
    }
    
    if (!currentWorkflow) {
      toast.error('Please save the workflow before executing');
      return;
    }
    
    try {
      setIsExecuting(true);
      setExecutionResult(null);
      
      // 分析工作流连接
      const connectionMap = analyzeWorkflowConnections();
      console.log("Connection map:", connectionMap);
      
      // 找到所有处理节点获取选定的模型
      const processNodes = nodes.filter(node => node.data.nodeType === 'process');
      
      // 默认使用第一个处理节点的模型，如果没有则使用默认模型
      let selectedModel = processNodes.length > 0 
        ? processNodes[0].data.selectedModel 
        : 'google/gemini-2.0-flash-exp:free';
        
      // 收集所有AI模型用于多模型处理
      const aiModels = processNodes.map(node => node.data.selectedModel).filter(Boolean);
      
      // 找到所有输出节点
      const outputNodes = nodes.filter(node => node.data.nodeType === 'output');
      
      // 收集输出格式和它们的设置
      const outputFormats = [];
      const outputSettings = {};
      const nodeConnections = {};
      
      // 处理输出节点
      outputNodes.forEach(node => {
        const outputType = node.data.outputType || 'default';
        outputFormats.push(outputType);
        
        // 为每种输出类型收集设置
        if (outputType === 'json' && node.data.jsonFormat) {
          outputSettings[node.id] = {
            type: 'json',
            format: node.data.jsonFormat
          };
        } else if (outputType === 'api') {
          outputSettings[node.id] = {
            type: 'api',
            url: node.data.apiUrl || 'https://httpbin.org/post',
            method: node.data.apiMethod || 'POST'
          };
          
          // 查找连接到此 API 节点的节点
          const connectedToApi = Object.keys(connectionMap).filter(
            sourceId => connectionMap[sourceId].includes(node.id)
          );
          
          if (connectedToApi.length > 0) {
            // 找到连接到此 API 节点的 JSON 节点
            const jsonNodes = nodes.filter(
              n => connectedToApi.includes(n.id) && 
                  n.data.outputType === 'json'
            );
            
            if (jsonNodes.length > 0) {
              // 记录这个连接，以便后端可以使用 JSON 输出作为 API 请求数据
              nodeConnections[node.id] = {
                sourceNodes: jsonNodes.map(n => n.id)
              };
            }
          }
        } else if (outputType === 'task') {
          // 为 task 节点收集项目和团队设置
          outputSettings[node.id] = {
            type: 'task',
            projectId: node.data.projectId || null,
            teamId: node.data.teamId || null
          };
        }
      });
      
      // 发送请求，包含连接信息和多模型配置
      const response = await fetch('/api/ai/workflow-agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workflowId: currentWorkflow.id,
          inputs,
          modelId: selectedModel,
          aiModels: aiModels, // 发送所有选择的AI模型
          userId,
          outputFormats,
          outputSettings,
          nodeConnections,
          connectionMap
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to execute workflow');
      }
      
      const result = await response.json();
      console.log("Workflow execution result:", result);
      
      setExecutionResult(result);
      setShowExecutionForm(false);
      toast.success(t('workflowExecuted'));
    } catch (error) {
      console.error('Error executing workflow:', error);
      toast.error('Failed to execute workflow');
    } finally {
      setIsExecuting(false);
    }
  };
  
  // Add a new input field to the workflow
  const addInputField = () => {
    setInputFields([
      ...inputFields,
      { name: `input_${inputFields.length + 1}`, label: `Input ${inputFields.length + 1}`, type: 'text', required: false }
    ]);
  };
  
  // Remove an input field
  const removeInputField = (index) => {
    setInputFields(inputFields.filter((_, i) => i !== index));
  };
  
  // Update input field
  const updateInputField = (index, field, value) => {
    const updatedFields = [...inputFields];
    updatedFields[index] = { ...updatedFields[index], [field]: value };
    setInputFields(updatedFields);
  };
  
  // Add node function
  const addNode = (nodeType) => {
    const id = `node_${nodeIdRef.current++}`;
    let node = null;
    
    // 根据节点类型生成节点
    switch (nodeType) {
      case 'document':
        node = {
          id,
          type: 'workflowNode',
          position: { x: 350, y: 500 },
          data: { 
            label: 'Document Output',
            icon: <FileText size={20} />,
            nodeType: 'output',
            outputType: 'document',
            description: 'Generate formatted document content',
            handleInputChange: handleNodeInputChange,
            userId: userId,
            inputs: {}
          }
        };
        break;
      case 'ppt':
        node = {
          id,
          type: 'workflowNode',
          position: { x: 500, y: 500 },
          data: { 
            label: 'Presentation Output',
            icon: <PresentationIcon size={20} />,
            nodeType: 'output',
            outputType: 'ppt',
            description: 'Generate PowerPoint presentation content',
            handleInputChange: handleNodeInputChange,
            userId: userId,
            inputs: {}
          }
        };
        break;
      case 'json':
        node = {
          id,
          type: 'workflowNode',
          position: { x: 250, y: 500 },
          data: { 
            label: 'JSON Output',
            icon: <Code size={20} />,
            nodeType: 'output',
            outputType: 'json',
            description: 'Generate custom JSON structure',
            handleInputChange: handleNodeInputChange,
            userId: userId,
            jsonFormat: '{\n  "title": "Custom Title",\n  "content": "Your content here",\n  "items": [\n    "Item 1",\n    "Item 2"\n  ]\n}',
            inputs: {}
          }
        };
        break;
      case 'api':
        node = {
          id,
          type: 'workflowNode',
          position: { x: 600, y: 500 },
          data: { 
            label: 'API Request',
            icon: <Code size={20} />,
            nodeType: 'output',
            outputType: 'api',
            description: 'Send data to external API',
            handleInputChange: handleNodeInputChange,
            userId: userId,
            apiUrl: 'https://httpbin.org/post',
            apiMethod: 'POST',
            inputs: {}
          }
        };
        break;
      case 'task':
        node = {
          id,
          type: 'workflowNode',
          position: { x: 400, y: 500 },
          data: { 
            label: 'Task Creation',
            icon: <CheckCircle size={20} />,
            nodeType: 'output',
            outputType: 'task',
            description: 'Create project tasks automatically',
            handleInputChange: handleNodeInputChange,
            userId: userId,
            inputs: {}
          }
        };
        break;
      case 'chat':
        node = {
          id,
          type: 'workflowNode',
          position: { x: 450, y: 500 },
          data: { 
            label: 'Chat Message',
            icon: <MessageSquare size={20} />,
            nodeType: 'output',
            outputType: 'chat',
            description: 'Sends messages to selected chat sessions',
            handleInputChange: handleNodeInputChange,
            userId: userId,
            chatSessionIds: [],
            messageTemplate: 'Hello, this is an automated message from the workflow system:\n\n{{content}}',
            messageFormat: 'text',
            inputs: {}
          }
        };
        break;
      case 'ai_model':
        node = {
          id,
          type: 'workflowNode',
          position: { x: 400, y: 200 },
          data: { 
            label: 'AI Processing',
            icon: <Settings size={20} />,
            nodeType: 'process',
            description: 'AI model processing',
            handleInputChange: handleNodeInputChange,
            userId: userId,
            selectedModel: 'google/gemini-2.0-flash-exp:free',
            inputs: {}
          }
        };
        break;
      default:
        break;
    }
    
    if (node) {
      setNodes((nds) => [...nds, node]);
      toast.success(`Added ${nodeType} node`);
    }
  };
  
  // Toggle panel collapse
  const togglePanel = () => {
    setIsPanelCollapsed(!isPanelCollapsed);
  };
  
  return (
    <div className="flex flex-col h-screen bg-[#f5f5f5] dark:bg-[#1f1f1f]">
      <div className="grid grid-cols-12 gap-4 p-4 h-full">
        {/* Left panel - Workflow List */}
        <div className={`${isPanelCollapsed ? 'col-span-1' : 'col-span-3'} bg-white dark:bg-[#282828] rounded-lg shadow-sm border border-gray-100 dark:border-[#333333] overflow-hidden transition-all duration-300`}>
          <div className="p-4 border-b border-gray-100 dark:border-[#383838] flex justify-between items-center">
            <h2 className={`text-md font-semibold ${isPanelCollapsed ? 'hidden' : 'block'}`}>{t('myWorkflows')}</h2>
            <div className="flex items-center">
              <Button 
                onClick={createNewWorkflow} 
                size="icon" 
                variant="ghost"
                title={t('newWorkflow')}
                className="text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#333333]"
              >
                <PlusCircle className="h-5 w-5" />
              </Button>
              <Button 
                onClick={togglePanel} 
                size="icon" 
                variant="ghost" 
                className="mr-1 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#333333]"
              >
                {isPanelCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
              </Button>
            </div>
          </div>
          
          <div className="p-2">
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full dark:bg-[#383838]" />
                <Skeleton className="h-12 w-full dark:bg-[#383838]" />
                <Skeleton className="h-12 w-full dark:bg-[#383838]" />
              </div>
            ) : userWorkflows.length > 0 ? (
              <div className="space-y-2">
                {userWorkflows.map((workflow) => (
                  <div 
                    key={workflow.id} 
                    className={cn(
                      "flex justify-between items-center p-3 rounded-md cursor-pointer hover:bg-gray-100 dark:hover:bg-[#333333]",
                      currentWorkflow && currentWorkflow.id === workflow.id ? "bg-[#eef6ff] border border-[#d9e8fc] dark:bg-[#303742] dark:border-[#3a4553]" : ""
                    )}
                    onClick={() => loadWorkflow(workflow.id)}
                  >
                    <div className="flex items-center">
                      <div className="mr-3 text-xl">{workflow.icon || '📄'}</div>
                      <div className={isPanelCollapsed ? 'hidden' : 'block'}>
                        <div className="font-medium dark:text-gray-200">{workflow.name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {t(`workflowTypes.${workflow.type}`) || workflow.type}
                        </div>
                      </div>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteWorkflow(workflow.id);
                      }}
                      className={`${isPanelCollapsed ? 'hidden' : 'block'} text-gray-500 dark:text-gray-400 hover:bg-gray-100 hover:text-red-500 dark:hover:bg-[#333333] dark:hover:text-red-400`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className={`${isPanelCollapsed ? 'py-2' : 'py-8'} text-center text-gray-500 dark:text-gray-400`}>
                <Database className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p className={isPanelCollapsed ? 'hidden' : 'block'}>{t('noWorkflows')}</p>
                <p className={`text-sm ${isPanelCollapsed ? 'hidden' : 'block'}`}>{t('createFirstWorkflow')}</p>
              </div>
            )}
          </div>
        </div>
        
        {/* Middle panel - Workflow Editor */}
        <div className={`${isPanelCollapsed ? 'col-span-11' : 'col-span-9'} bg-white dark:bg-[#282828] rounded-lg shadow-sm border border-gray-100 dark:border-[#333333] overflow-hidden transition-all duration-300`}>
          <div className="border-b border-gray-100 dark:border-[#383838] p-4 flex justify-between items-center">
            <div>
              <input
                type="text"
                value={workflowName}
                onChange={(e) => setWorkflowName(e.target.value)}
                className="text-lg font-semibold bg-transparent border-none focus:outline-none focus:ring-0 w-full dark:text-gray-200 dark:placeholder-gray-500"
                placeholder="Workflow Name"
              />
              <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                <Select value={workflowType} onValueChange={setWorkflowType}>
                  <SelectTrigger className="h-7 w-auto border-none focus:ring-0 dark:bg-transparent dark:text-gray-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-[#333333] dark:border-[#444444]">
                    {workflowTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id} className="dark:text-gray-300 dark:focus:bg-[#444444] dark:data-[highlighted]:bg-[#444444]">
                        <div className="flex items-center">
                          {type.icon}
                          <span className="ml-2">{type.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button 
                onClick={saveWorkflow} 
                disabled={isSaving}
                className="bg-[#ff6d5a] hover:bg-[#ff5c46] text-white dark:bg-[#ff6d5a] dark:hover:bg-[#ff5c46] dark:text-white"
              >
                <Save className="h-4 w-4 mr-2" />
                {t('save')}
              </Button>
              <Button 
                onClick={handleShowExecutionForm} 
                disabled={isExecuting || !currentWorkflow}
                variant="default"
                className="bg-[#39ac91] hover:bg-[#33a085] text-white dark:bg-[#39ac91] dark:hover:bg-[#33a085] dark:text-white"
              >
                <PlayCircle className="h-4 w-4 mr-2" />
                {t('run')}
              </Button>
            </div>
          </div>
          
          <div className="p-4 grid grid-cols-3 gap-4">
            {/* Workflow Configuration */}
            <div className="space-y-4 col-span-1">
              <div>
                <Label className="dark:text-gray-300">{t('workflowDescription')}</Label>
                <Textarea
                  value={workflowDescription}
                  onChange={(e) => setWorkflowDescription(e.target.value)}
                  placeholder="Describe what this workflow does"
                  className="resize-none h-20 dark:bg-[#333333] dark:border-[#444444] dark:text-gray-200 dark:placeholder-gray-500"
                />
              </div>
              
              <div>
                <Label className="dark:text-gray-300">{t('promptTemplate')}</Label>
                <Textarea
                  value={workflowPrompt}
                  onChange={(e) => setWorkflowPrompt(e.target.value)}
                  placeholder="Enter your prompt template with {{variable}} placeholders"
                  className="h-40 font-mono text-sm dark:bg-[#333333] dark:border-[#444444] dark:text-gray-200 dark:placeholder-gray-500"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {t('variablePlaceholder', { variableSyntax: '{{variable_name}}' })}
                </p>
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-2">
                  <Label className="dark:text-gray-300">{t('inputVariables')}</Label>
                  <Button 
                    onClick={addInputField} 
                    size="sm" 
                    variant="outline"
                    className="dark:bg-[#333333] dark:text-gray-300 dark:border-[#444444] dark:hover:bg-[#444444]"
                  >
                    <PlusCircle className="h-3 w-3 mr-1" />
                    {t('addInput')}
                  </Button>
                </div>
                
                <div className="space-y-2">
                  {inputFields.map((field, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <Input
                        value={field.name}
                        onChange={(e) => updateInputField(index, 'name', e.target.value)}
                        placeholder="Variable name"
                        className="w-1/3 dark:bg-[#333333] dark:border-[#444444] dark:text-gray-200 dark:placeholder-gray-500"
                      />
                      <Input
                        value={field.label}
                        onChange={(e) => updateInputField(index, 'label', e.target.value)}
                        placeholder="Display label"
                        className="w-1/3 dark:bg-[#333333] dark:border-[#444444] dark:text-gray-200 dark:placeholder-gray-500"
                      />
                      <Select
                        value={field.type}
                        onValueChange={(value) => updateInputField(index, 'type', value)}
                      >
                        <SelectTrigger className="w-1/4 dark:bg-[#333333] dark:border-[#444444] dark:text-gray-200">
                          <SelectValue placeholder="Type" />
                        </SelectTrigger>
                        <SelectContent className="dark:bg-[#333333] dark:border-[#444444]">
                          <SelectItem value="text" className="dark:text-gray-300 dark:focus:bg-[#444444] dark:data-[highlighted]:bg-[#444444]">Text</SelectItem>
                          <SelectItem value="textarea" className="dark:text-gray-300 dark:focus:bg-[#444444] dark:data-[highlighted]:bg-[#444444]">Text Area</SelectItem>
                          <SelectItem value="number" className="dark:text-gray-300 dark:focus:bg-[#444444] dark:data-[highlighted]:bg-[#444444]">Number</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        onClick={() => removeInputField(index)}
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-gray-500 dark:text-gray-400 hover:bg-gray-100 hover:text-red-500 dark:hover:bg-[#333333] dark:hover:text-red-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Workflow Flow Editor */}
            <div className="border rounded-md overflow-hidden h-[500px] col-span-2 dark:border-[#444444]">
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                nodeTypes={nodeTypes}
                fitView
                proOptions={proOptions}
                className="dark:bg-[#202020]"
              >
                <Background variant="dots" gap={12} size={1} color="#444444" />
                <Controls className="bg-white dark:bg-[#333333] dark:border-[#444444] dark:text-gray-300" />
                <Panel position="top-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="bg-white dark:bg-[#333333] dark:border-[#444444] dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#444444]"
                      >
                        <PlusCircle className="h-3 w-3 mr-1" />
                        {t('addNode')}
                        <ChevronDown className="h-3 w-3 ml-1" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent 
                      align="end" 
                      className="dark:bg-[#333333] dark:border-[#444444] dark:text-gray-200"
                    >
                      <DropdownMenuItem 
                        onClick={() => addNode('document')} 
                        className="dark:hover:bg-[#444444] dark:focus:bg-[#444444]"
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        <span>{t('document')}</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => addNode('ppt')} 
                        className="dark:hover:bg-[#444444] dark:focus:bg-[#444444]"
                      >
                        <PresentationIcon className="h-4 w-4 mr-2" />
                        <span>{t('presentation')}</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => addNode('json')} 
                        className="dark:hover:bg-[#444444] dark:focus:bg-[#444444]"
                      >
                        <Code className="h-4 w-4 mr-2" />
                        <span>JSON</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => addNode('api')} 
                        className="dark:hover:bg-[#444444] dark:focus:bg-[#444444]"
                      >
                        <Code className="h-4 w-4 mr-2" />
                        <span>{t('apiRequest')}</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => addNode('task')} 
                        className="dark:hover:bg-[#444444] dark:focus:bg-[#444444]"
                      >
                        <CheckCircle className="h-4 w-4 mr-2 text-amber-500" />
                        <span>{t('taskCreation') || 'Task Creation'}</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => addNode('chat')} 
                        className="dark:hover:bg-[#444444] dark:focus:bg-[#444444]"
                      >
                        <MessageSquare className="h-4 w-4 mr-2 text-indigo-500" />
                        <span>{t('chatMessage') || 'Chat Message'}</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="dark:bg-[#444444]" />
                      <DropdownMenuItem 
                        onClick={() => addNode('ai_model')} 
                        className="dark:hover:bg-[#444444] dark:focus:bg-[#444444]"
                      >
                        <Settings className="h-4 w-4 mr-2" />
                        <span>{t('aiModel')}</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </Panel>
              </ReactFlow>
            </div>
          </div>
        </div>
      </div>
      
      {/* Input Form Overlay */}
      {showExecutionForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-1/3 dark:bg-[#333333] dark:border-[#444444] dark:text-gray-200">
            <CardHeader>
              <CardTitle className="dark:text-gray-100">{t('executeWorkflow')}</CardTitle>
              <CardDescription className="dark:text-gray-400">
                {t('workflowInputs')} {workflowName}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <InputForm 
                fields={inputFields} 
                onSubmit={executeWorkflow} 
                isLoading={isExecuting} 
              />
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button 
                variant="outline"
                onClick={() => setShowExecutionForm(false)}
                disabled={isExecuting}
                className="dark:bg-[#333333] dark:text-gray-300 dark:border-[#444444] dark:hover:bg-[#444444]"
              >
                {t('cancel')}
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
      
      {/* Execution Result Overlay */}
      {executionResult && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-3/4 max-h-[80vh] overflow-auto dark:bg-[#333333] dark:border-[#444444] dark:text-gray-200">
            <CardHeader>
              <CardTitle className="dark:text-gray-100">{t('workflowResult')}</CardTitle>
              <CardDescription className="dark:text-gray-400">
                {t('executedWith')} {t(`workflowTypes.${workflowType}`)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* API Response Results */}
                {executionResult.apiResponses && Object.keys(executionResult.apiResponses).length > 0 && (
                  <div className="bg-blue-50 dark:bg-[#2a3246] p-4 rounded-md border border-blue-100 dark:border-[#3a4255]">
                    <h3 className="text-sm font-medium mb-2 dark:text-blue-300">{t('apiResponseResults')}</h3>
                    <div className="space-y-3">
                      {Object.entries(executionResult.apiResponses).map(([nodeId, response]) => (
                        <div key={nodeId} className="p-3 border rounded bg-white dark:bg-[#282828] dark:border-[#383838]">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium dark:text-gray-200">{t('node')}: {nodeId}</h4>
                            <span className={`px-2 py-1 rounded text-xs ${response.success ? 
                              'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 dark:border dark:border-green-800' : 
                              'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 dark:border dark:border-red-800'}`}>
                              {response.success ? t('success') : t('failure')} {response.status && `(${response.status})`}
                            </span>
                          </div>
                          {response.data && (
                            <div className="mt-2">
                              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('responseData')}:</p>
                              <pre className="bg-gray-50 dark:bg-[#222222] p-2 rounded text-xs overflow-auto max-h-40 dark:text-gray-300 border dark:border-[#383838]">
                                {JSON.stringify(response.data, null, 2)}
                              </pre>
                            </div>
                          )}
                          {response.error && (
                            <div className="mt-2">
                              <p className="text-xs text-red-500 dark:text-red-400">{t('error')}: {response.error}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Generated Files */}
                {(executionResult.document || executionResult.ppt || executionResult.docxUrl || executionResult.pptxUrl) && (
                  <div className="bg-blue-50 dark:bg-[#2a3246] p-4 rounded-md border border-blue-100 dark:border-[#3a4255]">
                    <h3 className="text-sm font-medium mb-2 dark:text-blue-300">{t('generatedFiles')}</h3>
                    <div className="space-y-2">
                      {/* Word Document */}
                      {(executionResult.document || executionResult.docxUrl) && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <FileText className="h-5 w-5 text-blue-500 dark:text-blue-400 mr-2" />
                            <span className="dark:text-gray-200">{t('wordDocument')}</span>
                          </div>
                          <a 
                            href={executionResult.document || executionResult.docxUrl} 
                            download 
                            className="px-3 py-1 bg-blue-500 text-white text-sm rounded-md hover:bg-blue-600 flex items-center"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <FileDown className="h-4 w-4 mr-1" />
                            {t('download')}
                          </a>
                        </div>
                      )}
                      
                      {/* Document Information */}
                      {executionResult.documentInfo && (
                        <div className="mt-2 bg-green-50 dark:bg-[#223a30] p-3 rounded-md text-xs border border-green-100 dark:border-[#2a4a3d]">
                          <div className="font-medium text-green-600 dark:text-green-400 mb-1">
                            {executionResult.documentInfo.type}
                          </div>
                          <ul className="list-disc pl-4 text-gray-600 dark:text-gray-400">
                            {executionResult.documentInfo.features.map((feature, index) => (
                              <li key={index}>{feature}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {/* PowerPoint Presentation */}
                      {(executionResult.ppt || executionResult.pptxUrl) && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <PresentationIcon className="h-5 w-5 text-blue-500 dark:text-blue-400 mr-2" />
                            <span className="dark:text-gray-200">{t('powerPointPresentation')}</span>
                          </div>
                          <a 
                            href={executionResult.ppt || executionResult.pptxUrl} 
                            download 
                            className="px-3 py-1 bg-blue-500 text-white text-sm rounded-md hover:bg-blue-600 flex items-center"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <FileDown className="h-4 w-4 mr-1" />
                            {t('download')}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {/* SlideGo-inspired Design Information */}
                {executionResult.designInfo && (
                  <div className="mt-2 bg-blue-50 dark:bg-[#2a3246] p-3 rounded-md text-xs border border-blue-100 dark:border-[#3a4255]">
                    <div className="font-medium text-blue-600 dark:text-blue-400 mb-1">
                      {executionResult.designInfo.type} Presentation Design
                    </div>
                    <ul className="list-disc pl-4 text-gray-600 dark:text-gray-400">
                      {executionResult.designInfo.features.map((feature, index) => (
                        <li key={index}>{feature}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {/* Task Creation Results */}
                {executionResult.task_result && executionResult.task_result.success && (
                  <div className="bg-amber-50 dark:bg-[#3a3020] p-4 rounded-md border border-amber-100 dark:border-[#4a4030]">
                    <h3 className="text-sm font-medium mb-2 dark:text-amber-300">{t('taskCreationResults') || 'Task Creation Results'}</h3>
                    <div className="flex items-center mb-2">
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        width="16" 
                        height="16" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2" 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        className="text-amber-500 dark:text-amber-400 mr-2"
                      >
                        <path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z" />
                        <path d="m9 12 2 2 4-4" />
                      </svg>
                      <span className="font-medium dark:text-amber-300">
                        {t('tasksCreated', { count: executionResult.task_result.tasksCreated }) || 
                         `Created ${executionResult.task_result.tasksCreated} tasks successfully`}
                      </span>
                    </div>
                    
                    {executionResult.taskInfo && (
                      <div className="mt-2 bg-amber-100/50 dark:bg-[#463828] p-3 rounded-md text-xs border border-amber-200 dark:border-[#564838]">
                        <div className="font-medium text-amber-800 dark:text-amber-400 mb-1">
                          {executionResult.taskInfo.type}
                        </div>
                        <ul className="list-disc pl-4 text-gray-600 dark:text-gray-400">
                          {executionResult.taskInfo.features.map((feature, index) => (
                            <li key={index}>{feature}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {executionResult.task_result.tasks && executionResult.task_result.tasks.length > 0 && (
                      <div className="mt-3">
                        <p className="font-medium dark:text-amber-300 mb-1">{t('createdTasks') || 'Created Tasks:'}</p>
                        <ul className="bg-white dark:bg-[#282420] p-2 rounded border border-amber-100 dark:border-[#383430] text-xs space-y-1">
                          {executionResult.task_result.tasks.map((task, index) => (
                            <li key={index} className="flex items-center">
                              <span className="text-amber-500 dark:text-amber-400 mr-1">•</span>
                              <span className="dark:text-gray-300">{task.title}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Generated Content Results */}
                <div className="bg-gray-50 dark:bg-[#282828] p-4 rounded-md border border-gray-100 dark:border-[#383838]">
                  <h3 className="text-sm font-medium mb-2 dark:text-gray-200">{t('generatedContent')}</h3>
                  <Tabs defaultValue="json" className="w-full">
                    <TabsList className="mb-2 bg-white dark:bg-[#333333] border border-gray-100 dark:border-[#444444]">
                      {Object.keys(executionResult.results || {}).map((format) => (
                        <TabsTrigger 
                          key={format} 
                          value={format} 
                          className="dark:text-gray-400 dark:data-[state=active]:bg-[#444444] dark:data-[state=active]:text-gray-100 dark:data-[state=active]:border-b-2 dark:data-[state=active]:border-[#39ac91]"
                        >
                          {format === 'ppt' ? t('presentation') : 
                            format === 'document' ? t('document') : 
                              format.charAt(0).toUpperCase() + format.slice(1)}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                    
                    {Object.entries(executionResult.results || {}).map(([format, content]) => (
                      <TabsContent key={format} value={format}>
                        <div className="bg-white dark:bg-[#222222] p-3 rounded border border-gray-100 dark:border-[#383838] max-h-[500px] overflow-auto">
                          <pre className="text-xs dark:text-gray-300">{JSON.stringify(content, null, 2)}</pre>
                        </div>
                      </TabsContent>
                    ))}
                  </Tabs>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end space-x-2">
              <Button 
                variant="outline"
                onClick={() => setExecutionResult(null)}
                className="dark:bg-[#333333] dark:text-gray-300 dark:border-[#444444] dark:hover:bg-[#444444]"
              >
                {t('close')}
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  );
}