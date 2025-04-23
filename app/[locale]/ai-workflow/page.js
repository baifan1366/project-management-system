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
  ChevronDown
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
import ModelSelector from './components/ModelSelector';
import InputForm from './components/InputForm';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

// Node types for React Flow
const nodeTypes = {
  workflowNode: WorkflowNode,
};

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
      inputs: {}
    }
  },
  {
    id: 'output',
    type: 'workflowNode',
    position: { x: 250, y: 350 },
    data: { 
      label: 'Output',
      icon: <FileDown size={20} />,
      nodeType: 'output',
      description: 'Generated result',
      handleInputChange: () => {},
      inputs: {}
    }
  },
];

// Initial edges connecting the nodes
const initialEdges = [
  { id: 'input-process', source: 'input', target: 'process' },
  { id: 'process-output', source: 'process', target: 'output' },
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
  
  // State for workflow
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);
  const [currentWorkflow, setCurrentWorkflow] = useState(null);
  const [workflowName, setWorkflowName] = useState('New Workflow');
  const [workflowDescription, setWorkflowDescription] = useState('');
  const [workflowType, setWorkflowType] = useState('document_generation');
  const [workflowPrompt, setWorkflowPrompt] = useState('');
  const [selectedModel, setSelectedModel] = useState('google/gemini-2.0-flash-exp:free');
  
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
  
  // Get current user on component mount
  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error) {
          throw error;
        }
        
        if (user) {
          setUserId(user.id);
        }
      } catch (error) {
        console.error('Error getting user:', error);
        toast.error('Failed to authenticate user');
      }
    };
    
    getCurrentUser();
  }, []);
  
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
    (connection) => setEdges((eds) => addEdge(connection, eds)),
    []
  );
  
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
          nodes,
          edges
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
        if (workflow.flow_data.nodes) setNodes(workflow.flow_data.nodes);
        if (workflow.flow_data.edges) setEdges(workflow.flow_data.edges);
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
  
  // Execute the workflow with inputs
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
      
      // Find all output nodes to determine output formats
      const outputNodes = nodes.filter(node => node.data.nodeType === 'output');
      const outputFormats = outputNodes.map(node => node.data.outputType || 'default').filter(Boolean);
      
      const response = await fetch('/api/ai/workflow-agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workflowId: currentWorkflow.id,
          inputs,
          modelId: selectedModel,
          userId,
          outputFormats // Add output formats to the request
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to execute workflow');
      }
      
      const result = await response.json();
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
    
    switch (nodeType) {
      case 'document':
        node = {
          id,
          type: 'workflowNode',
          position: { x: 250, y: 500 },
          data: { 
            label: 'Document Output',
            icon: <FileText size={20} />,
            nodeType: 'output',
            outputType: 'document',
            description: 'Generate formatted document content',
            handleInputChange: () => {},
            inputs: {}
          }
        };
        break;
      case 'ppt':
        node = {
          id,
          type: 'workflowNode',
          position: { x: 400, y: 500 },
          data: { 
            label: 'Presentation Output',
            icon: <PresentationIcon size={20} />,
            nodeType: 'output',
            outputType: 'ppt',
            description: 'Generate PowerPoint presentation content',
            handleInputChange: () => {},
            inputs: {}
          }
        };
        break;
      case 'api':
        node = {
          id,
          type: 'workflowNode',
          position: { x: 100, y: 500 },
          data: { 
            label: 'API Request',
            icon: <Code size={20} />,
            nodeType: 'output',
            outputType: 'api',
            description: 'Send data to external API',
            handleInputChange: () => {},
            inputs: {}
          }
        };
        break;
      default:
        break;
    }
    
    if (node) {
      setNodes((nds) => [...nds, node]);
      
      // Create a new edge connecting process to the new output node
      const newEdge = {
        id: `process-${id}`,
        source: 'process',
        target: id
      };
      
      setEdges((eds) => [...eds, newEdge]);
      toast.success(`Added ${nodeType} node`);
    }
  };
  
    return (
    <div className="flex flex-col h-screen">
      <div className="grid grid-cols-3 gap-4 p-4 h-full">
        {/* Left panel - Workflow List */}
        <div className="col-span-1 bg-white rounded-lg shadow overflow-y-auto">
          <div className="p-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">{t('myWorkflows')}</h2>
              <Button onClick={createNewWorkflow} size="sm" variant="ghost">
                <PlusCircle className="h-5 w-5 mr-1" />
                {t('newWorkflow')}
              </Button>
            </div>
          </div>
          
          <div className="p-2">
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : userWorkflows.length > 0 ? (
              <div className="space-y-2">
                {userWorkflows.map((workflow) => (
                  <div 
                    key={workflow.id} 
                    className={cn(
                      "flex justify-between items-center p-3 rounded-md cursor-pointer hover:bg-gray-100",
                      currentWorkflow && currentWorkflow.id === workflow.id ? "bg-blue-50 border border-blue-200" : ""
                    )}
                    onClick={() => loadWorkflow(workflow.id)}
                  >
                    <div className="flex items-center">
                      <div className="mr-3 text-xl">{workflow.icon || '📄'}</div>
                      <div>
                        <div className="font-medium">{workflow.name}</div>
                        <div className="text-xs text-gray-500">
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
                    >
                      <Trash2 className="h-4 w-4 text-gray-500" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Database className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p>{t('noWorkflows')}</p>
                <p className="text-sm">{t('createFirstWorkflow')}</p>
              </div>
            )}
          </div>
        </div>
        
        {/* Middle panel - Workflow Editor */}
        <div className="col-span-2 bg-white rounded-lg shadow overflow-hidden">
          <div className="border-b border-gray-200 p-4 flex justify-between items-center">
            <div>
              <input
                type="text"
                value={workflowName}
                onChange={(e) => setWorkflowName(e.target.value)}
                className="text-lg font-semibold bg-transparent border-none focus:outline-none focus:ring-0 w-full"
                placeholder="Workflow Name"
              />
              <div className="flex items-center text-sm text-gray-500">
                <Select value={workflowType} onValueChange={setWorkflowType}>
                  <SelectTrigger className="h-7 w-auto border-none focus:ring-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {workflowTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
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
              <ModelSelector
                selectedModel={selectedModel}
                onModelChange={setSelectedModel}
                userId={userId}
              />
              <Button onClick={saveWorkflow} disabled={isSaving}>
                <Save className="h-4 w-4 mr-2" />
                {t('save')}
              </Button>
              <Button 
                onClick={handleShowExecutionForm} 
                disabled={isExecuting || !currentWorkflow}
                variant="default"
              >
                <PlayCircle className="h-4 w-4 mr-2" />
                {t('run')}
              </Button>
            </div>
          </div>
          
          <div className="p-4 grid grid-cols-2 gap-4">
            {/* Workflow Configuration */}
            <div className="space-y-4">
              <div>
                <Label>{t('workflowDescription')}</Label>
                <Textarea
                  value={workflowDescription}
                  onChange={(e) => setWorkflowDescription(e.target.value)}
                  placeholder="Describe what this workflow does"
                  className="resize-none h-20"
                />
              </div>
              
              <div>
                <Label>{t('promptTemplate')}</Label>
                <Textarea
                  value={workflowPrompt}
                  onChange={(e) => setWorkflowPrompt(e.target.value)}
                  placeholder="Enter your prompt template with {{variable}} placeholders"
                  className="h-40 font-mono text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {t('variablePlaceholder', { variableSyntax: '{{variable_name}}' })}
                </p>
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-2">
                  <Label>{t('inputVariables')}</Label>
                  <Button onClick={addInputField} size="sm" variant="outline">
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
                        className="w-1/3"
                      />
                      <Input
                        value={field.label}
                        onChange={(e) => updateInputField(index, 'label', e.target.value)}
                        placeholder="Display label"
                        className="w-1/3"
                      />
                      <Select
                        value={field.type}
                        onValueChange={(value) => updateInputField(index, 'type', value)}
                      >
                        <SelectTrigger className="w-1/4">
                          <SelectValue placeholder="Type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="text">Text</SelectItem>
                          <SelectItem value="textarea">Text Area</SelectItem>
                          <SelectItem value="number">Number</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        onClick={() => removeInputField(index)}
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                      >
                        <Trash2 className="h-4 w-4 text-gray-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Workflow Flow Editor */}
            <div className="border rounded-md overflow-hidden h-[500px]">
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                nodeTypes={nodeTypes}
                fitView
              >
                <Background variant="dots" gap={12} size={1} />
                <Controls />
                <MiniMap />
                <Panel position="top-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <PlusCircle className="h-3 w-3 mr-1" />
                        Add Node
                        <ChevronDown className="h-3 w-3 ml-1" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => addNode('document')}>
                        <FileText className="h-4 w-4 mr-2" />
                        <span>Document</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => addNode('ppt')}>
                        <PresentationIcon className="h-4 w-4 mr-2" />
                        <span>Presentation</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => addNode('api')}>
                        <Code className="h-4 w-4 mr-2" />
                        <span>API Request</span>
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
          <Card className="w-1/3">
            <CardHeader>
              <CardTitle>{t('executeWorkflow')}</CardTitle>
              <CardDescription>
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
          <Card className="w-3/4 max-h-[80vh] overflow-auto">
            <CardHeader>
              <CardTitle>{t('workflowResult')}</CardTitle>
              <CardDescription>
                {t('executedWith')} {t(`workflowTypes.${workflowType}`)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* 显示已生成的文件链接 */}
                {(executionResult.docxUrl || executionResult.pptxUrl) && (
                  <div className="bg-blue-50 p-4 rounded-md">
                    <h3 className="text-sm font-medium mb-2">生成的文件</h3>
                    <div className="space-y-2">
                      {executionResult.docxUrl && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <FileText className="h-5 w-5 text-blue-500 mr-2" />
                            <span>Word文档</span>
                          </div>
                          <a 
                            href={executionResult.docxUrl} 
                            download 
                            className="px-3 py-1 bg-blue-500 text-white text-sm rounded-md hover:bg-blue-600 flex items-center"
                          >
                            <FileDown className="h-4 w-4 mr-1" />
                            下载
                          </a>
                        </div>
                      )}
                      
                      {executionResult.pptxUrl && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <PresentationIcon className="h-5 w-5 text-blue-500 mr-2" />
                            <span>PowerPoint演示文稿</span>
                          </div>
                          <a 
                            href={executionResult.pptxUrl} 
                            download 
                            className="px-3 py-1 bg-blue-500 text-white text-sm rounded-md hover:bg-blue-600 flex items-center"
                          >
                            <FileDown className="h-4 w-4 mr-1" />
                            下载
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {/* 显示结果JSON */}
                <div className="bg-gray-50 p-4 rounded-md overflow-auto max-h-[50vh]">
                  <h3 className="text-sm font-medium mb-2">结果数据</h3>
                  <pre className="whitespace-pre-wrap text-sm">
                    {JSON.stringify(executionResult.result, null, 2)}
                  </pre>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end space-x-2">
              <Button 
                variant="outline"
                onClick={() => setExecutionResult(null)}
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