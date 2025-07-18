"use client"
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useConfirm } from '@/hooks/use-confirm';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslations } from 'next-intl';
import { 
    ReactFlow, 
    Controls, 
    Background, 
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
  Clock,
  CheckCircle,
  MessageSquare,
  Mail,
  Calendar,
  ListChecks,
  Lightbulb,
  BookOpen,
  X,
  Loader2,
  ArrowRight,
  ExternalLink,
  Maximize2,
  Minimize2,
  Move,
  Square,
  HelpCircle
} from 'lucide-react';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue
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
import { useDispatch } from 'react-redux';
import { getSubscriptionLimit, trackSubscriptionUsage } from '@/lib/subscriptionService';
import { limitExceeded } from '@/lib/redux/features/subscriptionSlice';

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
      selectedModel: 'qwen/qwen2.5-vl-32b-instruct:free',
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
  }
];

// Workflow types with icons
const workflowTypes = [
  { id: 'ppt_generation', name: 'PowerPoint Generation', icon: <PresentationIcon size={18} /> },
  { id: 'document_generation', name: 'Document Generation', icon: <FileText size={18} /> },
  { id: 'api_request', name: 'API Request', icon: <Code size={18} /> },
  { id: 'data_analysis', name: 'Data Analysis', icon: <BarChart4 size={18} /> },
  { id: 'email_message', name: 'Email Message', icon: <Mail size={18} /> },
  { id: 'email_template', name: 'Email Template', icon: <Mail size={18} /> },
  { id: 'meeting_summary', name: 'Meeting Summary', icon: <Calendar size={18} /> },
  { id: 'task_automation', name: 'Task Automation', icon: <ListChecks size={18} /> },
  { id: 'idea_generation', name: 'Idea Generation', icon: <Lightbulb size={18} /> },
  { id: 'learning_content', name: 'Learning Content', icon: <BookOpen size={18} /> },
];

// Prompt templates
const promptTemplates = [
  { id: 'default', name: 'Default', template: 'Generate based on {{topic}}' },
  { id: 'detailed', name: 'Detailed', template: 'Create a comprehensive output about {{topic}}. Include key points, examples, and analysis.' },
  { id: 'creative', name: 'Creative', template: 'Think outside the box and generate creative content about {{topic}}. Be innovative and unique.' },
  { id: 'professional', name: 'Professional', template: 'Write a professional analysis of {{topic}} suitable for business contexts. Include relevant data and insights.' },
];

// Add debounce utility at the top of the file after imports
const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Create a draggable, resizable panel component
const DraggablePanel = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  initialWidth = 800, 
  initialHeight = 650,
  initialPosition = { x: 100, y: 100 }
}) => {
  const [position, setPosition] = useState(initialPosition);
  const [size, setSize] = useState({ width: initialWidth, height: initialHeight });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const panelRef = useRef(null);
  const resizeStartSize = useRef({ width: 0, height: 0 });
  const resizeStartPos = useRef({ x: 0, y: 0 });
  
  // Handle dragging
  const handleDragStart = (e) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartPos.current = { 
      x: e.clientX - position.x, 
      y: e.clientY - position.y 
    };
  };
  
  const handleDrag = useCallback((e) => {
    if (!isDragging) return;
    
    const newX = e.clientX - dragStartPos.current.x;
    const newY = e.clientY - dragStartPos.current.y;
    
    // Ensure the panel stays within viewport bounds
    setPosition({ 
      x: Math.max(0, Math.min(newX, window.innerWidth - 200)), 
      y: Math.max(0, Math.min(newY, window.innerHeight - 40))
    });
  }, [isDragging]);
  
  const handleDragEnd = () => {
    setIsDragging(false);
  };
  
  // Handle resizing
  const handleResizeStart = (e) => {
    e.preventDefault();
    setIsResizing(true);
    resizeStartSize.current = { ...size };
    resizeStartPos.current = { x: e.clientX, y: e.clientY };
  };
  
  const handleResize = useCallback((e) => {
    if (!isResizing) return;
    
    const deltaX = e.clientX - resizeStartPos.current.x;
    const deltaY = e.clientY - resizeStartPos.current.y;
    
    setSize({
      width: Math.max(400, resizeStartSize.current.width + deltaX),
      height: Math.max(300, resizeStartSize.current.height + deltaY)
    });
  }, [isResizing]);
  
  const handleResizeEnd = () => {
    setIsResizing(false);
  };
  
  // Add/remove event listeners
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleDrag);
      document.addEventListener('mouseup', handleDragEnd);
    } else {
      document.removeEventListener('mousemove', handleDrag);
      document.removeEventListener('mouseup', handleDragEnd);
    }
    
    return () => {
      document.removeEventListener('mousemove', handleDrag);
      document.removeEventListener('mouseup', handleDragEnd);
    };
  }, [isDragging, handleDrag]);
  
  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleResize);
      document.addEventListener('mouseup', handleResizeEnd);
    } else {
      document.removeEventListener('mousemove', handleResize);
      document.removeEventListener('mouseup', handleResizeEnd);
    }
    
    return () => {
      document.removeEventListener('mousemove', handleResize);
      document.removeEventListener('mouseup', handleResizeEnd);
    };
  }, [isResizing, handleResize]);
  
  if (!isOpen) return null;
  
  return (
    <div 
      ref={panelRef}
      className="fixed z-50 flex flex-col shadow-lg rounded-lg bg-white dark:bg-[#282828] border border-gray-200 dark:border-[#333333] overflow-hidden"
      style={{ 
        left: `${position.x}px`, 
        top: `${position.y}px`,
        width: minimized ? 'auto' : `${size.width}px`,
        height: minimized ? 'auto' : `${size.height}px`
      }}
    >
      <div 
        className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-[#333333] bg-gray-50 dark:bg-[#323232] cursor-move"
        onMouseDown={handleDragStart}
      >
        <div className="flex items-center">
          <Move className="h-4 w-4 mr-2 text-gray-500 dark:text-gray-400" />
          <h3 className="font-medium text-sm dark:text-gray-200">{title}</h3>
        </div>
        <div className="flex items-center space-x-1">
          <Button 
            size="icon" 
            variant="ghost" 
            className="h-6 w-6"
            onClick={() => setMinimized(!minimized)}
          >
            {minimized ? <Square className="h-3 w-3" /> : <Minimize2 className="h-3 w-3" />}
          </Button>
          <Button 
            size="icon" 
            variant="ghost" 
            className="h-6 w-6 hover:bg-red-100 hover:text-red-500 dark:hover:bg-red-900/30 dark:hover:text-red-400"
            onClick={onClose}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>
      
      {!minimized && (
        <>
          <div className="flex-grow overflow-auto">
            {children}
          </div>
          
          <div 
            className="absolute bottom-0 right-0 w-6 h-6 cursor-nwse-resize"
            onMouseDown={handleResizeStart}
          >
            <div className="absolute bottom-1 right-1 w-3 h-3 border-b-2 border-r-2 border-gray-400 dark:border-gray-600" />
          </div>
        </>
      )}
    </div>
  );
};

// Create a tab system component for the panels
const TabSystem = ({ tabs, activeTab, onTabChange, onClose }) => {
  // Handle drag and drop for tabs
  const [draggingTab, setDraggingTab] = useState(null);
  
  const handleDragStart = (e, tabId) => {
    setDraggingTab(tabId);
    e.dataTransfer.setData('text/plain', tabId);
    // Use a transparent drag image
    const dragImg = document.createElement('div');
    dragImg.style.opacity = '0';
    document.body.appendChild(dragImg);
    e.dataTransfer.setDragImage(dragImg, 0, 0);
    document.body.removeChild(dragImg);
  };
  
  const handleDragOver = (e) => {
    e.preventDefault();
  };
  
  const handleDrop = (e, targetTabId) => {
    e.preventDefault();
    if (draggingTab && draggingTab !== targetTabId) {
      // Implement tab reordering logic if needed
      console.log(`Reordering tabs: ${draggingTab} to position of ${targetTabId}`);
    }
    setDraggingTab(null);
  };
  
  return (
    <div className="fixed bottom-0 left-0 z-40 flex flex-wrap items-end space-x-1 p-1">
      {tabs.map((tab) => (
        <div 
          key={tab.id}
          className={`flex items-center px-3 py-1 rounded-t-lg cursor-pointer border border-b-0 ${
            activeTab === tab.id 
              ? 'bg-white dark:bg-[#282828] shadow-md z-10' 
              : 'bg-gray-100 dark:bg-[#333333] hover:bg-gray-200 dark:hover:bg-[#3a3a3a]'
          } border-gray-200 dark:border-[#444444] text-sm transition-all duration-150`}
          onClick={() => onTabChange(tab.id)}
          draggable
          onDragStart={(e) => handleDragStart(e, tab.id)}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, tab.id)}
        >
          <tab.icon className="h-3.5 w-3.5 mr-2 text-gray-500 dark:text-gray-400" />
          <span className={activeTab === tab.id ? 'font-medium dark:text-gray-200' : 'text-gray-600 dark:text-gray-400'}>
            {tab.title}
          </span>
          <Button 
            size="icon" 
            variant="ghost" 
            className="h-4 w-4 ml-2 hover:bg-gray-200 dark:hover:bg-[#444444] rounded-full"
            onClick={(e) => {
              e.stopPropagation();
              onClose(tab.id);
            }}
          >
            <X className="h-2 w-2" />
          </Button>
        </div>
      ))}
    </div>
  );
};

// VideoTutorial component
const VideoTutorial = ({ onClose, t }) => {
  const videoUrl = "https://xvvuzblglnbbsrmzgexp.supabase.co/storage/v1/object/public/workflow-files//workflowVideo.mp4";
  const [isLoading, setIsLoading] = useState(true);
  const [isVisible, setIsVisible] = useState(false);
  
  // Add fade-in animation
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 500);
    return () => clearTimeout(timer);
  }, []);
  
  const openInNewTab = () => {
    window.open(videoUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div 
      className={`fixed bottom-4 left-4 z-50 w-72 bg-white dark:bg-[#282828] rounded-lg shadow-xl border border-gray-200 dark:border-[#333333] overflow-hidden transition-all duration-500 hover:shadow-2xl ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}
    >
      <div className="relative group">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-[#333333]">
            <Loader2 className="h-8 w-8 animate-spin text-[#39ac91]" />
          </div>
        )}
        <video 
          src={videoUrl}
          autoPlay
          muted
          loop
          playsInline
          className="w-full h-auto cursor-pointer"
          onClick={openInNewTab}
          onLoadedData={() => setIsLoading(false)}
          title="Click to open video in new tab"
        />
        {/* Play button overlay */}
        <div 
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          aria-hidden="true"
        >
          <div className="bg-black/30 rounded-full p-2 opacity-70">
            <PlayCircle className="h-10 w-10 text-white" />
          </div>
        </div>
        <div className="absolute top-2 right-2">
          <Button 
            size="icon" 
            variant="ghost" 
            className="h-6 w-6 bg-black/30 text-white hover:bg-black/50 rounded-full"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center" onClick={openInNewTab}>
          <div className="bg-black/50 p-2 rounded-full">
            <ExternalLink className="h-8 w-8 text-white" />
          </div>
        </div>
      </div>
      
      <div className="p-3 bg-gradient-to-r from-[#39ac91] to-[#2d8a73] text-white">
        <h3 className="font-medium text-sm mb-1">{t('title') || 'Introducing Workflow Builder'}</h3>
        <p className="text-xs opacity-90 mb-2">{t('description') || 'Create and automate workflows with AI processing'}</p>
        <div className="flex flex-col space-y-2">
          <Button 
            size="sm" 
            className="w-full bg-white text-[#39ac91] hover:bg-gray-100 font-medium"
            onClick={onClose}
          >
            {t('run') || 'Try it out'}
          </Button>
          <a 
            href={videoUrl} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-xs text-center text-white/80 hover:text-white underline"
          >
            {t('openInNewWindow') || 'Open video in new window'}
          </a>
        </div>
      </div>
    </div>
  );
};

export default function AIWorkflow() {
  const t = useTranslations('AI_Workflow');
  const router = useRouter();
  const { confirm, confirmAsync } = useConfirm();
  const dispatch = useDispatch();
  
  // State to control video tutorial visibility
  const [showTutorial, setShowTutorial] = useState(false);
  
  // User state
  const [userId, setUserId] = useState(null);
  
  // State for panel collapse
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(true);
  const [isConfigCollapsed, setIsConfigCollapsed] = useState(false);
  
  // State for resizable panel
  const [configWidth, setConfigWidth] = useState(33); // 33% by default (1/3 of the grid)
  const [isDragging, setIsDragging] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  
  // State for workflow
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);
  const [isNodeDragging, setIsNodeDragging] = useState(false);
  // 使用useRef代替useState来存储已显示的错误消息，避免状态更新触发多次渲染
  const shownErrorMessagesRef = useRef(new Set());
  const [shownErrorMessages, setShownErrorMessages] = useState(new Set());
  const [currentWorkflow, setCurrentWorkflow] = useState(null);
  const [workflowName, setWorkflowName] = useState('New Workflow');
  const [workflowNameError, setWorkflowNameError] = useState(false);
  const [workflowDescription, setWorkflowDescription] = useState('');
  const [descriptionCharCount, setDescriptionCharCount] = useState(0);
  const [isDescriptionOverLimit, setIsDescriptionOverLimit] = useState(false);
  const [workflowType, setWorkflowType] = useState('document_generation');
  const [workflowPrompt, setWorkflowPrompt] = useState('');
  const [promptCharCount, setPromptCharCount] = useState(0);
  const [isPromptOverLimit, setIsPromptOverLimit] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [inputFieldErrors, setInputFieldErrors] = useState({});
  
  // Constants for validation
  const MAX_WORKFLOW_NAME_LENGTH = 30;
  const MAX_DESCRIPTION_LENGTH = 100;
  const MAX_PROMPT_LENGTH = 1000;
  const MAX_INPUT_NAME_LENGTH = 20;
  const MAX_NUMBER_LENGTH = 10;
  
  // State for saving/loading workflows
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [userWorkflows, setUserWorkflows] = useState([]);
  
  // State for workflow execution
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState(null);
  const [showExecutionForm, setShowExecutionForm] = useState(false);
  
  // State for streaming output
  const [streamingOutput, setStreamingOutput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [showStreamingModal, setShowStreamingModal] = useState(false);
  const [aiResponseData, setAiResponseData] = useState({});
  const [showReviewStep, setShowReviewStep] = useState(false);
  const [editedResponseData, setEditedResponseData] = useState({});
  const [currentFormat, setCurrentFormat] = useState('');
  const streamEndRef = useRef(null);
  
  // Store output settings and node connections
  const [outputSettings, setOutputSettings] = useState({});
  const [nodeConnections, setNodeConnections] = useState({});
  
  // Add a ref for storing JSON parsing timeouts
  const jsonParseTimeoutRef = useRef({});
  
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
          setUserId(user.id);
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
    if (!userId) {
      return;
    }
    
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
    (changes) => {
      // 检查是否有节点正在被拖动
      const isDragging = changes.some(change => change.type === 'position' && change.dragging === true);
      
      // 如果正在拖动中，设置拖动状态
      if (isDragging) {
        setIsNodeDragging(true);
      } 
      // 如果拖动结束，清除已显示的错误消息集合
      else if (isNodeDragging) {
        setIsNodeDragging(false);
        // 清除错误消息
        shownErrorMessagesRef.current.clear();
        setShownErrorMessages(new Set());
      }
      
      setNodes((nds) => applyNodeChanges(changes, nds));
    },
    [] // 移除validateNodeConnections依赖
  );
  
  // Handle edge changes
  const onEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );
  
  // 处理添加新的边缘连接
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
      
      // 避免显示过多的连接成功消息
      // 使用静态变量记录上次显示时间
      const now = Date.now();
      if (!window.lastConnectionToastTime || (now - window.lastConnectionToastTime) > 3000) {
        toast.success(t('nodeConnected') || 'Node connected successfully');
        window.lastConnectionToastTime = now;
      }
      
      // 清除部分错误消息，因为用户刚刚连接了一个节点
      shownErrorMessagesRef.current.clear();
      setShownErrorMessages(new Set());
    },
    [setEdges, t]
  );
  
  // 添加标志和时间戳，用于跟踪最近添加的节点
  const [recentlyAddedNode, setRecentlyAddedNode] = useState(null);
  const [connectionValidationSuppressed, setConnectionValidationSuppressed] = useState(false);
  
  // 使用useRef跟踪最后一次验证时间，避免频繁验证
  const lastValidationTimeRef = useRef(0);
  
  // Check if workflow is ready to run
  const isWorkflowRunnable = () => {
    // Check for basic workflow requirements
    if (!currentWorkflow) return false;
    if (isExecuting) return false;
    if (!workflowName.trim() || workflowNameError) return false;
    if (!workflowPrompt.trim() || isPromptOverLimit) return false;
    if (inputFields.length === 0) return false;
    
    // Check for any invalid input fields
    const hasInvalidInputFields = Object.values(inputFieldErrors).some(error => error !== null && error !== undefined);
    if (hasInvalidInputFields) return false;
    
    // 使用节流检查，避免频繁验证触发toast
    const now = Date.now();
    if (now - lastValidationTimeRef.current > 3000) {
      lastValidationTimeRef.current = now;
      
      // 清除之前的错误消息
      shownErrorMessagesRef.current.clear();
    }
    
    // 验证节点连接 - 这个必须每次都检查
    const nodeConnectionsValid = validateNodeConnections(true);
    if (!nodeConnectionsValid) return false;
    
    // All checks passed
    return true;
  };
  
  // Validate node connections based on rules
  const validateNodeConnections = (isFinalCheck = false) => {
    // 如果验证被抑制且不是最终检查，则直接返回true
    if (connectionValidationSuppressed && !isFinalCheck) {
      return true;
    }
    
    // Create a connection map for easy lookup
    const connectionMap = {};
    edges.forEach(edge => {
      if (!connectionMap[edge.target]) {
        connectionMap[edge.target] = [];
      }
      connectionMap[edge.target].push(edge.source);
    });
    
    // Get nodes by type for validation
    const inputNodes = nodes.filter(node => node.data.nodeType === 'input');
    const processNodes = nodes.filter(node => node.data.nodeType === 'process');
    const outputNodes = nodes.filter(node => node.data.nodeType === 'output');
    
          // 显示错误消息的辅助函数，防止重复显示
      const showErrorToast = (errorMessage) => {
        // 只在最终检查时显示错误消息
        if (!isFinalCheck) {
          return;
        }
        
        // 使用ref直接访问和修改集合，避免触发重渲染
        if (shownErrorMessagesRef.current.has(errorMessage)) {
          return;
        }
        
        // 记录该消息已被显示
        shownErrorMessagesRef.current.add(errorMessage);
        // 同时更新state以便其他地方使用
        setShownErrorMessages(new Set(shownErrorMessagesRef.current));
        
        // 只有在最终检查时显示错误消息，避免频繁弹出
        toast.error(errorMessage);
      };
    
    let isValid = true;
    
    // Rule 1: AI processing nodes must connect to input nodes
    for (const node of processNodes) {
      // 如果是最近添加的节点且不是最终检查，则跳过验证
      if (node.id === recentlyAddedNode && !isFinalCheck) {
        continue;
      }
      
      const sources = connectionMap[node.id] || [];
      const isConnectedToInput = sources.some(sourceId => 
        inputNodes.some(inputNode => inputNode.id === sourceId)
      );
      
      if (!isConnectedToInput) {
        showErrorToast(t('aiProcessingConnectionError') || 'AI processing nodes must be connected to input nodes');
        isValid = false;
      }
    }
    
    // Rule 2 & 3: Check JSON/Task nodes and API request nodes
    for (const node of outputNodes) {
      // 如果是最近添加的节点且不是最终检查，则跳过验证
      if (node.id === recentlyAddedNode && !isFinalCheck) {
        continue;
      }
      
      const sources = connectionMap[node.id] || [];
      
      if (node.data.outputType === 'json' || node.data.outputType === 'task') {
        // JSON and Task nodes must connect to AI process nodes
        const isConnectedToProcess = sources.some(sourceId => 
          processNodes.some(processNode => processNode.id === sourceId)
        );
        
        if (!isConnectedToProcess) {
          const nodeType = node.data.outputType === 'json' ? 'JSON' : 'Task';
          showErrorToast(t('outputNodeConnectionError', { type: nodeType }) || 
            `${nodeType} nodes must be connected to AI processing nodes`);
          isValid = false;
        }
      } else if (node.data.outputType === 'api') {
        // API request nodes must connect to JSON nodes
        const jsonNodes = outputNodes.filter(n => n.data.outputType === 'json');
        const isConnectedToJson = sources.some(sourceId => 
          jsonNodes.some(jsonNode => jsonNode.id === sourceId)
        );
        
        if (!isConnectedToJson) {
          showErrorToast(t('apiConnectionError') || 'API request nodes must be connected to JSON nodes');
          isValid = false;
        }
      } else if (node.data.outputType === 'document' || node.data.outputType === 'ppt') {
        // Document and PPT nodes can connect to AI process or API request nodes
        const apiNodes = outputNodes.filter(n => n.data.outputType === 'api');
        const isConnectedToProcessOrApi = sources.some(sourceId => 
          processNodes.some(processNode => processNode.id === sourceId) ||
          apiNodes.some(apiNode => apiNode.id === sourceId)
        );
        
        if (!isConnectedToProcessOrApi) {
          const nodeType = node.data.outputType === 'document' ? 'Document' : 'Presentation';
          showErrorToast(t('docPptConnectionError', { type: nodeType }) || 
            `${nodeType} nodes must be connected to AI processing or API request nodes`);
          isValid = false;
        }
      } else if (node.data.outputType === 'chat' || node.data.outputType === 'email') {
        // Chat and Email nodes can connect to document, PPT, API, or AI nodes
        const docNodes = outputNodes.filter(n => n.data.outputType === 'document');
        const pptNodes = outputNodes.filter(n => n.data.outputType === 'ppt');
        const apiNodes = outputNodes.filter(n => n.data.outputType === 'api');
        
        const isConnectedToValid = sources.some(sourceId => 
          processNodes.some(processNode => processNode.id === sourceId) ||
          docNodes.some(docNode => docNode.id === sourceId) ||
          pptNodes.some(pptNode => pptNode.id === sourceId) ||
          apiNodes.some(apiNode => apiNode.id === sourceId)
        );
        
        if (!isConnectedToValid) {
          const nodeType = node.data.outputType === 'chat' ? 'Chat message' : 'Email';
          showErrorToast(t('chatEmailConnectionError', { type: nodeType }) || 
            `${nodeType} nodes must be connected to AI processing, Document, Presentation, or API nodes`);
          isValid = false;
        }
      }
    }
    
    return isValid;
  };
  
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
    
    if (!workflowName.trim()) {
      toast.error(t('nameRequired') || 'Workflow name is required');
      return;
    }
    
    if (workflowNameError || workflowName.length > MAX_WORKFLOW_NAME_LENGTH) {
      toast.error('Workflow name cannot exceed ' + MAX_WORKFLOW_NAME_LENGTH + ' characters');
      return;
    }
    
    if (isDescriptionOverLimit || workflowDescription.length > MAX_DESCRIPTION_LENGTH) {
      toast.error('Workflow description cannot exceed ' + MAX_DESCRIPTION_LENGTH + ' characters');
      return;
    }
    
    if (!workflowType || !workflowPrompt) {
      toast.error(t('missingRequiredFields'));
      return;
    }
    
    if (isPromptOverLimit || workflowPrompt.length > MAX_PROMPT_LENGTH) {
      toast.error('Prompt template cannot exceed ' + MAX_PROMPT_LENGTH + ' characters');
      return;
    }
    
    // Check for input field name errors
    const hasNameErrors = Object.values(inputFieldErrors).some(error => error !== null && error !== undefined);
    if (hasNameErrors) {
      toast.error('Please fix all input variable name errors before saving');
      return;
    }
    
    // Validate input field names
    const nameErrors = inputFields.some((field, index) => 
      field.name && field.name.length > MAX_INPUT_NAME_LENGTH
    );
    if (nameErrors) {
      toast.error('Input variable names cannot exceed ' + MAX_INPUT_NAME_LENGTH + ' characters');
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
      console.error('Cannot load workflow: userId is not set');
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
                case 'task':
                  nodeData.icon = <CheckCircle size={20} />;
                  break;
                case 'chat':
                  nodeData.icon = <MessageSquare size={20} />;
                  break;
                case 'email':
                  nodeData.icon = <Mail size={20} />;
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
          
          setNodes(restoredNodes);
          
          // 更新nodeIdRef以避免新节点ID冲突
          // 查找最大的node_数字格式的ID值
          let maxNodeNumber = 0;
          restoredNodes.forEach(node => {
            if (node.id && node.id.startsWith('node_')) {
              const idNumber = parseInt(node.id.replace('node_', ''), 10);
              if (!isNaN(idNumber) && idNumber > maxNodeNumber) {
                maxNodeNumber = idNumber;
              }
            }
          });
          
          // 设置nodeIdRef为最大ID+1，确保下一个节点有唯一ID
          nodeIdRef.current = maxNodeNumber + 1;
          console.log(`Updated nodeIdRef to ${nodeIdRef.current} after loading workflow`);
        }
        
        if (workflow.flow_data.edges) {
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
    if (!workflowId) {
      console.error('Cannot delete workflow: workflowId is not provided');
      toast.error('Invalid workflow ID');
      return;
    }

    if (!userId) {
      console.error('Cannot delete workflow: userId is not set');
      toast.error('User not authenticated');
      return;
    }
    
    console.log(`Attempting to delete workflow: ${workflowId} for user: ${userId}`);
    
    const confirmed = await confirmAsync({
      title: t('deleteConfirm'),
      description: t('deleteConfirmDesc'),
      variant: 'warning'
    });
    
    if (!confirmed) {
      console.log('Workflow deletion canceled by user');
      return;
    }
    
    try {
      setIsLoading(true);
      const response = await fetch(`/api/ai/workflow-agent/workflows?id=${workflowId}&userId=${userId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: workflowId,
          userId
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Delete workflow error:', errorData);
        throw new Error(errorData.error || 'Failed to delete workflow');
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
      console.log(`Successfully deleted workflow: ${workflowId}`);
    } catch (error) {
      console.error('Error deleting workflow:', error);
      toast.error(`Failed to delete workflow: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Set prompt template
  const setPromptTemplate = (templateId) => {
    const template = promptTemplates.find(t => t.id === templateId);
    if (template) {
      const newPrompt = template.template;
      setWorkflowPrompt(newPrompt);
      setSelectedTemplate(templateId);
      
      // Update character count and check length limit
      setPromptCharCount(newPrompt.length);
      setIsPromptOverLimit(newPrompt.length > MAX_PROMPT_LENGTH);
    }
  };

  // Create a new workflow
  const createNewWorkflow = () => {
    setCurrentWorkflow(null);
    setWorkflowName('New Workflow');
    setWorkflowDescription('');
    setWorkflowType('document_generation');
    setWorkflowPrompt('');
    setSelectedTemplate('');
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
    if (!isWorkflowRunnable()) {
      toast.error(t('cannotRunWorkflow') || 'Cannot run workflow. Please check requirements.');
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
  
  // Execute workflow with streaming output
  const executeWorkflow = async (inputs) => {
    const canExecute = await getSubscriptionLimit(userId, 'ai_workflow_runs');
    if (!canExecute.allowed) {
      dispatch(limitExceeded({ feature: 'AI Workflow', reason: canExecute.reason }));
      return;
    }

    if (!currentWorkflow) {
      toast.error('Please save the workflow before executing');
      return;
    }
    
    try {
      setIsExecuting(true);
      setExecutionResult(null);
      setAiResponseData({});
      setEditedResponseData({});
      setShowStreamingModal(true);
      setIsStreaming(true);
      setStreamingOutput('');
      setShowExecutionForm(false); // Close the input form when execution starts
      
      // 分析工作流连接
      const connectionMap = analyzeWorkflowConnections();
      
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
      const newOutputSettings = {};
      const newNodeConnections = {};
      
      // 处理输出节点
      outputNodes.forEach(node => {
        const outputType = node.data.outputType || 'default';
        outputFormats.push(outputType);
        
        // 为每种输出类型收集设置
        if (outputType === 'json' && node.data.jsonFormat) {
          newOutputSettings[node.id] = {
            type: 'json',
            format: node.data.jsonFormat
          };
        } else if (outputType === 'api') {
          newOutputSettings[node.id] = {
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
              newNodeConnections[node.id] = {
                sourceNodes: jsonNodes.map(n => n.id),
                dataType: 'json'
              };
            }
          }
        } else if (outputType === 'task') {
          // 为 task 节点收集项目和团队设置
          newOutputSettings[node.id] = {
            type: 'task',
            projectId: node.data.projectId || null,
            teamId: node.data.teamId || null
          };
        } else if (outputType === 'chat') {
          
          // Check if chatSessionIds is defined and not empty
          if (node.data.chatSessionIds && node.data.chatSessionIds.length > 0) {
            newOutputSettings[node.id] = {
              type: 'chat',
              chatSessionIds: node.data.chatSessionIds,
              messageTemplate: node.data.messageTemplate || 'Hello, this is an automated message from the workflow system:\n\n{{content}}',
              messageFormat: node.data.messageFormat || 'text'
            };
          } else {
            console.warn(`[Debug] No chat sessions selected for chat node ${node.id}`);
          }
        } else if (outputType === 'email') {
          
          // Check if email recipients are specified
          if (node.data.emailRecipients) {
            newOutputSettings[node.id] = {
              type: 'email',
              recipients: node.data.emailRecipients,
              subject: node.data.emailSubject || 'Automated email from workflow system',
              template: node.data.emailTemplate || 'Hello,\n\nThis is an automated email from the workflow system:\n\n{{content}}\n\nRegards,\nWorkflow System',
              useCustomSmtp: node.data.useCustomSmtp || false
            };
            
            // Add custom SMTP settings if enabled
            if (node.data.useCustomSmtp) {
              newOutputSettings[node.id].smtp = {
                host: node.data.smtpHost,
                port: node.data.smtpPort || '587',
                user: node.data.smtpUser,
                password: node.data.smtpPassword,
                from: node.data.smtpFrom
              };
            }
            
          } else {
            console.warn(`[Debug] No recipients specified for email node ${node.id}`);
          }
        } else if (outputType === 'document' || outputType === 'ppt') {
          // Make sure we also set up document and presentation output types
          newOutputSettings[node.id] = {
            type: outputType
          };
        }
      });
      
      // Validate JSON-API connections to ensure data flow
      Object.keys(newNodeConnections).forEach(apiNodeId => {
        const connection = newNodeConnections[apiNodeId];
        
        if (connection.sourceNodes && connection.sourceNodes.length > 0) {
          // Make sure we generate JSON output for any node that's connected to an API
          connection.sourceNodes.forEach(jsonNodeId => {
            if (!outputFormats.includes('json')) {
              outputFormats.push('json');
            }
          });
        }
      });
      
      // Save output settings and connections to state for later use
      setOutputSettings(newOutputSettings);
      setNodeConnections(newNodeConnections);
      
      // Create the request payload
      const payload = {
        workflowId: currentWorkflow.id,
        inputs,
        modelId: selectedModel,
        aiModels: aiModels, // 发送所有选择的AI模型
        userId: userId || undefined,  // 允许为undefined，后端会处理
        outputFormats,
        outputSettings: newOutputSettings,
        nodeConnections: newNodeConnections,
        connectionMap,
        streaming: true // Enable streaming output
      };
      
      // 设置超时处理，只针对初始连接
      const timeoutId = setTimeout(() => {
        if (isStreaming) {
          toast.error('Connection is taking too long. Check console for details.');
        }
      }, 15000); // 15秒超时
      
      // Start streaming request
      const response = await fetch('/api/ai/workflow-agent/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      // 清除初始连接超时
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Error response from stream API:', { status: response.status, data: errorData });
        throw new Error(`Failed to stream workflow: ${errorData.error || response.statusText || 'Unknown error'}`);
      }
      
      let receivedFirstData = false;
      const noDataTimeoutId = setTimeout(() => {
        if (!receivedFirstData && isStreaming) {
          toast.error('No data received from server. Check console for details.');
        }
      }, 20000); // 20秒没收到数据则超时
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let formatResponses = {};
      
      while (true) {
        const { value, done } = await reader.read();
        
        if (done) {
          break;
        }
        
        const chunk = decoder.decode(value, { stream: true });
        
        if (!receivedFirstData) {
          receivedFirstData = true;
          clearTimeout(noDataTimeoutId);
        }
        
        // Split by lines to handle multiple JSON objects
        const lines = chunk.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          try {
            // Process each data chunk
            if (line.startsWith('data: ')) {
              const data = JSON.parse(line.slice(5));
              
              if (data.type === 'content') {
                setStreamingOutput(prev => prev + data.content);
              } else if (data.type === 'format_complete') {
                const { format, content } = data;
                formatResponses[format] = content;
                setCurrentFormat(format);
                setAiResponseData(prev => ({ ...prev, [format]: content }));
                
                // Also set in edited responses so user can modify it
                setEditedResponseData(prev => ({ ...prev, [format]: content }));
                
                // Show success message for this format
                toast.success(`Generated ${format} content`);
              } else if (data.type === 'complete') {
                // All AI responses are complete, move to review step
                setIsStreaming(false);
                setShowReviewStep(true);
                trackSubscriptionUsage({ userId, actionType: 'ai_workflow_runs' });
              } else if (data.type === 'error') {
                console.error('Error in stream:', data.error);
                toast.error(`Error: ${data.error}`);
                setIsStreaming(false);
              }
            }
          } catch (e) {
            console.error('Error parsing streaming data:', e, line);
          }
        }
      }
      
      if (isStreaming) {
        // 如果流结束但状态没有更新为完成，可能是发生了问题
        setIsStreaming(false);
        if (Object.keys(formatResponses).length > 0) {
          setShowReviewStep(true);
          toast.success('AI content generation complete! Review and confirm to continue.');
        } else {
          toast.error('Stream ended unexpectedly. Check the console for details.');
          setShowStreamingModal(false);
        }
      }
    } catch (error) {
      console.error('Error executing workflow:', error);
      toast.error(`Failed to execute workflow: ${error.message}`);
      setIsStreaming(false);
      setShowStreamingModal(false);
    } finally {
      setIsExecuting(false);
    }
  };
  
  // Process final outputs after user review
  const handleProcessFinalOutputs = async () => {
    try {
      setIsExecuting(true);
      setShowReviewStep(false);
      toast.info('Processing final outputs...');
      
      // Analyze the connections to ensure JSON data is properly linked to API nodes
      const connectionMap = analyzeWorkflowConnections();
      
      // Find all API output nodes
      const apiNodes = nodes.filter(node => 
        node.data.nodeType === 'output' && 
        node.data.outputType === 'api'
      );
      
      // For each API node, find if there's a JSON node connected to it
      // and ensure that connection is properly recorded
      const enhancedNodeConnections = {...nodeConnections};
      
      apiNodes.forEach(apiNode => {
        // Find nodes that connect to this API node
        const connectedSources = Object.keys(connectionMap).filter(
          sourceId => connectionMap[sourceId].includes(apiNode.id)
        );
        
        // Find connected JSON nodes
        const connectedJsonNodes = nodes.filter(
          node => connectedSources.includes(node.id) && 
                 node.data.outputType === 'json'
        );
        
        if (connectedJsonNodes.length > 0) {
          // Update or create connection info to ensure JSON data flows to API
          enhancedNodeConnections[apiNode.id] = {
            sourceNodes: connectedJsonNodes.map(node => node.id),
            dataType: 'json'
          };
        }
      });
      
      // Create the request payload with the edited AI responses
      const payload = {
        workflowId: currentWorkflow.id,
        userId: userId || undefined,  // 允许为undefined，后端会处理
        aiResponses: editedResponseData,
        outputSettings, // Include the output settings from the workflow execution
        nodeConnections: enhancedNodeConnections, // Use enhanced node connections
        connectionMap, // Include connection map for backend processing
        processOutput: true
      };

      // 设置超时处理
      const timeoutId = setTimeout(() => {
        toast.error('Request is taking too long. Check console for details.');
        setIsExecuting(false);
        setShowStreamingModal(false);
      }, 30000); // 30秒超时
      
      // Send request to process final outputs
      const response = await fetch('/api/ai/workflow-agent/process-outputs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      // 清除超时
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Error response from process-outputs:', { status: response.status, data: errorData });
        throw new Error(`Failed to process outputs: ${errorData.error || response.statusText || 'Unknown error'}`);
      }

      const result = await response.json();      
      setExecutionResult(result);
      setShowStreamingModal(false);
      toast.success(t('workflowExecuted'));
    } catch (error) {
      console.error('Error processing final outputs:', error);
      toast.error(`Processing failed: ${error.message}`);
      setShowStreamingModal(false);
    } finally {
      setIsExecuting(false);
    }
  };
  
  // Update edited response for a specific format with debouncing for JSON
  const updateEditedResponse = (format, value, isJson = false) => {
    // For non-JSON values or immediate updates, apply directly
    if (!isJson) {
      setEditedResponseData(prev => ({
        ...prev,
        [format]: value
      }));
      return;
    }
    
    // For JSON values, first update with the raw string for immediate feedback
    setEditedResponseData(prev => ({
      ...prev,
      [format]: value
    }));
    
    // Then debounce the expensive JSON parsing operation
    if (jsonParseTimeoutRef.current[format]) {
      clearTimeout(jsonParseTimeoutRef.current[format]);
    }
    
    jsonParseTimeoutRef.current[format] = setTimeout(() => {
      const parsed = safeParseJSON(value);
      if (parsed.data !== null) {
        setEditedResponseData(prev => ({
          ...prev,
          [format]: parsed.data
        }));
      }
    }, 300); // Wait 300ms after typing stops to parse JSON
  };
  
  // Scroll to bottom of streaming output
  useEffect(() => {
    if (streamEndRef.current) {
      streamEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [streamingOutput]);
  
  // Toggle panel collapse
  const togglePanel = () => {
    setIsPanelCollapsed(!isPanelCollapsed);
  };

  // Toggle config collapse
  const toggleConfig = () => {
    setIsConfigCollapsed(!isConfigCollapsed);
  };
  
  // Add a new input field to the workflow
  const addInputField = () => {
    setInputFields([
      ...inputFields,
      { name: `input_${inputFields.length + 1}`, label: `Input ${inputFields.length + 1}`, type: 'text', required: false }
    ]);
  };

  // Extract variables from prompt template
  const extractVariablesFromPrompt = (promptText) => {
    const variablePattern = /{{(.*?)}}/g;
    const matches = [];
    let match;
    
    while ((match = variablePattern.exec(promptText)) !== null) {
      matches.push(match[1].trim());
    }
    
    return matches;
  };
  
  // Remove an input field
  const removeInputField = (index) => {
    const fieldToRemove = inputFields[index];
    
    // Check if the variable is used in the prompt template
    const usedVariables = extractVariablesFromPrompt(workflowPrompt);
    
    if (usedVariables.includes(fieldToRemove.name)) {
      toast.error(
        t('cannotDeleteUsedVariable', { variable: fieldToRemove.name }) || 
        `Cannot delete variable "${fieldToRemove.name}" as it is used in the prompt template.`
      );
      return;
    }
    
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
      case 'email':
        node = {
          id,
          type: 'workflowNode',
          position: { x: 500, y: 500 },
          data: { 
            label: 'Email Output',
            icon: <Mail size={20} />,
            nodeType: 'output',
            outputType: 'email',
            description: 'Send email with generated content',
            handleInputChange: handleNodeInputChange,
            userId: userId,
            emailRecipients: '',
            emailSubject: 'Automated email from workflow system',
            emailTemplate: 'Hello,\n\nThis is an automated email from the workflow system:\n\n{{content}}\n\nRegards,\nWorkflow System',
            useCustomSmtp: false,
            smtpHost: '',
            smtpPort: '587',
            smtpUser: '',
            smtpPassword: '',
            smtpFrom: '',
            inputs: {}
          }
        };
        break;
      case 'ai_model':
        // Find existing process nodes to calculate new position
        const processNodes = nodes.filter(n => n.data.nodeType === 'process');
        const xOffset = processNodes.length * 50 + 250; // Offset x position based on number of existing process nodes
        const yPosition = 200; // Keep y position the same
        
        node = {
          id,
          type: 'workflowNode',
          position: { x: xOffset, y: yPosition },
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
      // 添加节点
      setNodes((nds) => [...nds, node]);
      
      // 设置最近添加的节点ID
      setRecentlyAddedNode(node.id);
      
      // 临时抑制连接验证10秒钟，给用户更多时间连接节点
      setConnectionValidationSuppressed(true);
      // 清除之前的所有错误消息
      setShownErrorMessages(new Set());
      
      // 确保只有一个活跃的timeout
      if (window.validationTimeoutId) {
        clearTimeout(window.validationTimeoutId);
      }
      
      window.validationTimeoutId = setTimeout(() => {
        setConnectionValidationSuppressed(false);
        setRecentlyAddedNode(null);
      }, 10000);
      
      // 显示成功提示，不要重复显示节点添加消息
      if (!window.lastAddedNodeType || window.lastAddedNodeType !== nodeType) {
        toast.success(`Added ${nodeType} node`);
        window.lastAddedNodeType = nodeType;
        
        // 5秒后重置，允许再次显示相同节点类型的添加消息
        setTimeout(() => {
          if (window.lastAddedNodeType === nodeType) {
            window.lastAddedNodeType = null;
          }
        }, 5000);
      }
    }
  };
  
  // Handle resizing of the config panel
  const handleResizeStart = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleResizeEnd = () => {
    setIsDragging(false);
  };

  const handleResize = useCallback((e) => {
    if (!isDragging) return;
    
    // Get grid container width
    const gridContainer = document.querySelector('.workflow-grid-container');
    if (!gridContainer) return;
    
    const containerWidth = gridContainer.offsetWidth;
    const mouseX = e.clientX;
    const containerRect = gridContainer.getBoundingClientRect();
    const relativeX = mouseX - containerRect.left;
    
    // Calculate new width as percentage
    let newWidth = (relativeX / containerWidth) * 100;
    
    // Limit the width between 20% and 70%
    newWidth = Math.max(20, Math.min(70, newWidth));
    
    setConfigWidth(newWidth);
  }, [isDragging]);

  // Add/remove event listeners for resizing
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleResize);
      document.addEventListener('mouseup', handleResizeEnd);
    } else {
      document.removeEventListener('mousemove', handleResize);
      document.removeEventListener('mouseup', handleResizeEnd);
    }
    
    return () => {
      document.removeEventListener('mousemove', handleResize);
      document.removeEventListener('mouseup', handleResizeEnd);
    };
  }, [isDragging, handleResize]);
  
  // State for draggable panels
  const [panels, setPanels] = useState([]);
  const [activePanel, setActivePanel] = useState(null);
  
  // Function to open a new panel
  const openPanel = (panelType) => {
    const panelId = `panel-${Date.now()}`;
    
    let panelConfig = {
      id: panelId,
      type: panelType,
      position: { x: 100 + (panels.length * 30), y: 100 + (panels.length * 20) }
    };
    
    // Configure based on panel type
    switch (panelType) {
      case 'workflow-config':
        panelConfig = {
          ...panelConfig,
          title: t('workflowConfiguration') || 'Workflow Configuration',
          icon: Settings
        };
        break;
      default:
        break;
    }
    
    setPanels([...panels, panelConfig]);
    setActivePanel(panelId);
  };
  
  // Close a panel
  const closePanel = (panelId) => {
    setPanels(panels.filter(panel => panel.id !== panelId));
    if (activePanel === panelId) {
      setActivePanel(panels.length > 1 ? panels[0].id : null);
    }
  };
  
  // Activate a panel
  const activatePanel = (panelId) => {
    setActivePanel(panelId);
  };
  
  // Replace showConfigModal with openPanel for workflow configuration
  const handleOpenWorkflowConfig = () => {
    // Look for existing workflow config panel
    const existingPanel = panels.find(panel => panel.type === 'workflow-config');
    if (existingPanel) {
      // Activate existing panel
      setActivePanel(existingPanel.id);
    } else {
      // Open new panel
      openPanel('workflow-config');
    }
    
    // Auto-collapse the sidebar configuration panel
    if (!isConfigCollapsed) {
      setIsConfigCollapsed(true);
    }
  };
  
  // Check if user has seen the tutorial before
  useEffect(() => {
    const hasSeenTutorial = localStorage.getItem('hasSeenWorkflowTutorial');
    if (!hasSeenTutorial) {
      setShowTutorial(true);
    }
  }, []);
  
  // Handle closing the tutorial
  const closeTutorial = () => {
    setShowTutorial(false);
    localStorage.setItem('hasSeenWorkflowTutorial', 'true');
  };
  
  return (
    <div className="flex flex-col h-screen bg-[#f5f5f5] dark:bg-[#000000]">
      {/* Video Tutorial */}
      {showTutorial && <VideoTutorial onClose={closeTutorial} t={t} />}
      
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
                          {(t(`workflowTypes.${workflow.type}`, {fallback: workflow.type})) || workflow.type}
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
        <div className={`${isPanelCollapsed ? 'col-span-11' : 'col-span-9'} h-auto bg-white dark:bg-[#282828] rounded-lg shadow-sm border border-gray-100 dark:border-[#333333] overflow-hidden transition-all duration-300`}>
          <div className="border-b border-gray-100 dark:border-[#383838] p-4 flex justify-between items-center">
            <div>
              <div className="flex items-center">
                                  <div className="flex flex-col flex-grow">
                  <input
                    type="text"
                    value={workflowName}
                    onChange={(e) => {
                      const newValue = e.target.value;
                      setWorkflowName(newValue);
                      setWorkflowNameError(newValue.length > MAX_WORKFLOW_NAME_LENGTH);
                    }}
                    maxLength={MAX_WORKFLOW_NAME_LENGTH + 5}
                    className={`text-lg font-semibold bg-transparent border-b-2 ${
                      workflowNameError ? 'border-red-500 dark:border-red-500' : 'border-transparent hover:border-gray-200 dark:hover:border-[#444444] focus:border-[#39ac91] dark:focus:border-[#39ac91]'
                    } focus:outline-none focus:ring-0 w-full dark:text-gray-200 dark:placeholder-gray-500 transition-colors duration-200`}
                    placeholder="Enter Workflow Name"
                  />
                  {workflowName.length > 25 && (
                    <div className={`text-xs mt-1 text-right ${
                      workflowNameError ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      {workflowName.length}/{MAX_WORKFLOW_NAME_LENGTH}
                    </div>
                  )}
                </div>
                {workflowNameError && (
                  <div className="text-xs text-red-500 ml-3 whitespace-nowrap">
                    Name must not exceed {MAX_WORKFLOW_NAME_LENGTH} characters
                  </div>
                )}
              </div>
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
              <div className="flex space-x-2">
                <Button 
                  onClick={saveWorkflow} 
                  disabled={isSaving}
                  className="bg-[#ff6d5a] hover:bg-[#ff5c46] text-white dark:bg-[#ff6d5a] dark:hover:bg-[#ff5c46] dark:text-white"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {t('save')}
                </Button>
                <Button 
                  onClick={() => router.push('/ai-workflow/history')}
                  variant="outline"
                  className="border-gray-300 dark:border-gray-600"
                >
                  <Clock className="h-4 w-4 mr-2" />
                  {t('history') || 'History'}
                </Button>
              </div>
              <TooltipProvider>
                <Tooltip>
                                      <TooltipTrigger asChild>
                      <div>
                        <Button 
                          onClick={handleShowExecutionForm} 
                          disabled={isExecuting || !isWorkflowRunnable()}
                          variant="default"
                          className="bg-[#39ac91] hover:bg-[#33a085] text-white dark:bg-[#39ac91] dark:hover:bg-[#33a085] dark:text-white"
                        >
                          <PlayCircle className="h-4 w-4 mr-2" />
                          {t('run')}
                        </Button>
                      </div>
                    </TooltipTrigger>
                  {!isWorkflowRunnable() && (
                    <TooltipContent side="bottom" align="center" className="max-w-[300px]">
                      <div className="p-2">
                        <h4 className="font-medium text-sm mb-2">{t('runRequirements') || 'Requirements to run workflow:'}</h4>
                        <ul className="space-y-1 text-xs">
                          <li className="flex items-center">
                            <span className={`mr-2 ${currentWorkflow ? 'text-green-500' : 'text-gray-400'}`}>
                              {currentWorkflow ? '✓' : '○'}
                            </span>
                            {t('saveWorkflowFirst') || 'Save the workflow first'}
                          </li>
                          <li className="flex items-center">
                            <span className={`mr-2 ${workflowName.trim().length > 0 && !workflowNameError ? 'text-green-500' : 'text-gray-400'}`}>
                              {workflowName.trim().length > 0 && !workflowNameError ? '✓' : '○'}
                            </span>
                            {t('validName') || 'Valid workflow name'}
                          </li>
                          <li className="flex items-center">
                            <span className={`mr-2 ${workflowPrompt.trim().length > 0 && !isPromptOverLimit ? 'text-green-500' : 'text-gray-400'}`}>
                              {workflowPrompt.trim().length > 0 && !isPromptOverLimit ? '✓' : '○'}
                            </span>
                            {t('validPrompt') || 'Valid prompt template'}
                          </li>
                          <li className="flex items-center">
                            <span className={`mr-2 ${inputFields.length > 0 ? 'text-green-500' : 'text-gray-400'}`}>
                              {inputFields.length > 0 ? '✓' : '○'}
                            </span>
                            {t('atLeastOneInput') || 'At least one input field'}
                          </li>
                          <li className="flex items-center">
                            <span className={`mr-2 ${validateNodeConnections() ? 'text-green-500' : 'text-gray-400'}`}>
                              {validateNodeConnections() ? '✓' : '○'}
                            </span>
                            {t('validNodeConnections') || 'Valid node connections'}
                          </li>
                        </ul>
                        <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                          <p className="text-xs font-medium mb-1">{t('nodeConnectionRules') || 'Node connection rules:'}</p>
                          <ul className="space-y-1 text-xs pl-2">
                            <li>• {t('aiProcessingConnectionRule') || 'AI processing → Input'}</li>
                            <li>• {t('jsonTaskConnectionRule') || 'JSON/Task → AI processing'}</li>
                            <li>• {t('apiConnectionRule') || 'API request → JSON'}</li>
                            <li>• {t('docPptConnectionRule') || 'Document/PPT → AI processing or API'}</li>
                            <li>• {t('chatEmailConnectionRule') || 'Chat/Email → AI, Document, PPT, or API'}</li>
                          </ul>
                        </div>
                      </div>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
          
          <div className="p-4 flex h-5/6 workflow-grid-container relative">
            {/* Workflow Configuration */}
            <div 
              className={`space-y-4 transition-all duration-300 overflow-auto ${
                isConfigCollapsed ? 'w-10 flex-shrink-0' : ''
              }`}
              style={{ 
                width: isConfigCollapsed ? '40px' : `${configWidth}%`,
                minWidth: isConfigCollapsed ? '40px' : '250px',
                maxWidth: isConfigCollapsed ? '40px' : '70%'
              }}
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className={`text-base font-medium dark:text-gray-300 ${isConfigCollapsed ? 'hidden' : 'block'}`}>{t('workflowConfiguration') || 'Workflow Configuration'}</h3>
                <div className="flex">
                  {!isConfigCollapsed && (
                    <Button 
                      onClick={handleOpenWorkflowConfig} 
                      size="icon" 
                      variant="ghost" 
                      className="h-6 w-6 mr-1 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#333333]"
                      title={t('openInNewWindow') || 'Open in New Window'}
                    >
                      <Maximize2 className="h-4 w-4" />
                    </Button>
                  )}
                  <Button 
                    onClick={toggleConfig} 
                    size="icon" 
                    variant="ghost" 
                    className={`${isConfigCollapsed ? 'ml-1' : ''} h-6 w-6 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#333333]`}
                  >
                    {isConfigCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              
              {/* Rest of the config sections with their conditional hiding */}
              <div className={isConfigCollapsed ? 'hidden' : 'block'}>
                <Label className="dark:text-gray-300">{t('workflowDescription')}</Label>
                <div className="relative">
                  <Textarea
                    value={workflowDescription}
                    onChange={(e) => {
                      const newValue = e.target.value;
                      setWorkflowDescription(newValue);
                      setDescriptionCharCount(newValue.length);
                      setIsDescriptionOverLimit(newValue.length > MAX_DESCRIPTION_LENGTH);
                    }}
                    maxLength={MAX_DESCRIPTION_LENGTH + 10}
                    placeholder="Describe what this workflow does"
                    className={`resize-none h-20 dark:bg-[#333333] dark:border-[#444444] dark:text-gray-200 dark:placeholder-gray-500 focus:ring-2 focus:ring-offset-0 focus:ring-offset-transparent ${
                      isDescriptionOverLimit ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'focus:border-[#39ac91] focus:ring-[#39ac91]/20'
                    }`}
                  />
                  <div className={`flex justify-end items-center mt-1`}>
                    <div className={`text-xs ${
                      isDescriptionOverLimit ? 'text-red-500 font-medium' : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      {descriptionCharCount}/{MAX_DESCRIPTION_LENGTH}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Rest of the existing config sections */}
              <div className={isConfigCollapsed ? 'hidden' : 'block'}>
                <div className="flex items-center mb-1">
                  <Label className="dark:text-gray-300">
                    {t('promptTemplate')} <span className="text-red-500 ml-0.5">*</span>
                  </Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" className="p-0 h-6 w-6 ml-1">
                          <HelpCircle className="h-3 w-3 text-gray-400" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-[300px] p-3">
                        <p className="text-xs">{t('promptTemplateHelp') || 'Define the template that will be used by the AI model. Use {{variable_name}} to reference input variables in your prompt.'}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className="flex flex-wrap gap-2 mb-2">
                  {promptTemplates.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => setPromptTemplate(template.id)}
                      className={`px-3 py-1 text-xs rounded-full transition-colors ${
                        selectedTemplate === template.id
                          ? 'bg-[#39ac91] text-white dark:bg-[#39ac91] dark:text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-[#333333] dark:text-gray-300 dark:hover:bg-[#444444]'
                      }`}
                    >
                      {template.name}
                    </button>
                  ))}
                </div>
                <div className="relative">
                  <Textarea
                    value={workflowPrompt}
                    onChange={(e) => {
                      const newValue = e.target.value;
                      setWorkflowPrompt(newValue);
                      setSelectedTemplate('');
                      setPromptCharCount(newValue.length);
                      setIsPromptOverLimit(newValue.length > MAX_PROMPT_LENGTH);
                    }}
                    placeholder="Generate based on {{topic}}"
                    maxLength={MAX_PROMPT_LENGTH + 50}
                    className={`h-28 font-mono text-sm ${
                      isPromptOverLimit ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'focus:border-[#39ac91] focus:ring-[#39ac91]/20'
                    } dark:bg-[#333333] dark:border-[#444444] dark:text-gray-200 dark:placeholder-gray-500 focus:ring-2 focus:ring-offset-0 focus:ring-offset-transparent`}
                  />
                  <div className={`flex justify-between items-center mt-1`}>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {t('variablePlaceholder', { variableSyntax: '{{variable_name}}' })}
                    </p>
                    <div className={`text-xs ${
                      isPromptOverLimit ? 'text-red-500 font-medium' : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      {promptCharCount}/{MAX_PROMPT_LENGTH}
                    </div>
                  </div>
                  {isPromptOverLimit && (
                    <div className="text-xs text-red-500 mt-1">
                      Prompt exceeds maximum of {MAX_PROMPT_LENGTH} characters
                    </div>
                  )}
                </div>
              </div>
              
              <div className={isConfigCollapsed ? 'hidden' : 'block'}>
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center">
                    <Label className="dark:text-gray-300">{t('inputVariables')}</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" className="p-0 h-6 w-6 ml-1">
                            <HelpCircle className="h-3 w-3 text-gray-400" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-[300px] p-3">
                          <p className="text-xs">{t('inputVariablesHelp') || 'Define input fields that users will fill out when running the workflow. These variables can be referenced in your prompt template using {{variable_name}} syntax.'}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
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
                
                <div className="border rounded-md dark:border-[#444444] max-h-[200px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-[#444444] scrollbar-track-transparent p-2">
                                      <div className="space-y-2">
                      {inputFields.map((field, index) => {
                        // Check if this variable is used in the prompt
                        const usedVariables = extractVariablesFromPrompt(workflowPrompt);
                        const isUsedInPrompt = usedVariables.includes(field.name);
                        
                        return (
                          <div key={index} className={`flex items-center space-x-2 ${isUsedInPrompt ? 'bg-blue-50/50 dark:bg-blue-900/10 rounded-md p-1' : ''}`}>
                                                          <div className="w-1/3 flex flex-col">
                                <Input
                                  value={field.name}
                                  onChange={(e) => {
                                    const oldName = field.name;
                                    const newValue = e.target.value;
                                    
                                    // Check if old name was in prompt and update it
                                    if (usedVariables.includes(oldName)) {
                                      const newPrompt = workflowPrompt.replaceAll(
                                        `{{${oldName}}}`, 
                                        `{{${newValue}}}`
                                      );
                                      setWorkflowPrompt(newPrompt);
                                    }
                                    
                                    updateInputField(index, 'name', newValue);
                                    
                                    // Update errors state
                                    setInputFieldErrors(prev => ({
                                      ...prev,
                                      [`name_${index}`]: newValue.length > MAX_INPUT_NAME_LENGTH ? 
                                        `Cannot exceed ${MAX_INPUT_NAME_LENGTH} chars` : null
                                    }));
                                  }}
                                  maxLength={MAX_INPUT_NAME_LENGTH + 5}
                                  placeholder="Variable name"
                                  className={`w-full dark:bg-[#333333] dark:border-[#444444] dark:text-gray-200 dark:placeholder-gray-500 ${
                                    inputFieldErrors[`name_${index}`] ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
                                  } ${isUsedInPrompt ? 'border-blue-300 dark:border-blue-600' : ''}`}
                                />
                                {inputFieldErrors[`name_${index}`] && (
                                  <div className="text-xs text-red-500 mt-1 truncate max-w-full">
                                    {inputFieldErrors[`name_${index}`]}
                                  </div>
                                )}
                              </div>
                                                          <Input
                                value={field.label}
                                onChange={(e) => updateInputField(index, 'label', e.target.value)}
                                placeholder="Display label"
                                maxLength={MAX_INPUT_NAME_LENGTH + 5}
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
                                                          {isUsedInPrompt ? (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-8 w-8 text-blue-500 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                      >
                                        <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs">
                                          i
                                        </div>
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p className="text-xs">{t('usedInPrompt') || 'This variable is used in the prompt template'}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              ) : (
                                <Button
                                  onClick={() => removeInputField(index)}
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 text-gray-500 dark:text-gray-400 hover:bg-gray-100 hover:text-red-500 dark:hover:bg-[#333333] dark:hover:text-red-400"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                          </div>
                        );
                      })}
                    </div>
                </div>
              </div>
            </div>
            
            {/* Resize handle */}
            {!isConfigCollapsed && (
              <div 
                className="w-1 hover:w-2 bg-gray-200 dark:bg-[#383838] hover:bg-gray-300 dark:hover:bg-[#444444] cursor-col-resize transition-all flex items-center justify-center mx-1"
                onMouseDown={handleResizeStart}
              >
                <div className="h-8 w-1 bg-gray-300 dark:bg-[#444444] rounded-full"></div>
              </div>
            )}
            
            {/* Workflow Flow Editor */}
            <div 
              className="border rounded-md overflow-hidden h-full dark:border-[#444444] transition-all duration-300 flex-grow"
              style={{ 
                width: isConfigCollapsed ? 'calc(100% - 42px)' : `calc(100% - ${configWidth}% - 10px)` 
              }}
            >
              {/* ReactFlow component */}
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
                      <DropdownMenuItem 
                        onClick={() => addNode('email')} 
                        className="dark:hover:bg-[#444444] dark:focus:bg-[#444444]"
                      >
                        <Mail className="h-4 w-4 mr-2 text-cyan-500" />
                        <span>{t('emailOutput') || 'Email Output'}</span>
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
      
      {/* Streaming Output Modal */}
      {showStreamingModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-3/4 h-4/5 max-h-[90vh] dark:bg-[#333333] dark:border-[#444444] dark:text-gray-200 flex flex-col">
            <CardHeader className="border-b dark:border-[#444444]">
              <div className="flex justify-between items-center">
                <CardTitle className="dark:text-gray-100">
                  {isStreaming ? t('generatingContent') || 'Generating Content...' : t('reviewAiOutput') || 'Review AI Generated Content'}
                </CardTitle>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => {
                    if (!isStreaming || confirm({
                      title: t('cancelGenerationTitle') || 'Cancel Generation?',
                      description: t('cancelGenerationDesc') || 'Are you sure you want to cancel the content generation?'
                    })) {
                      setShowStreamingModal(false);
                      setIsStreaming(false);
                      setShowReviewStep(false);
                    }
                  }}
                  className="text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#444444]"
                >
                  <X size={18} />
                </Button>
              </div>
              <CardDescription className="dark:text-gray-400">
                {isStreaming 
                  ? t('streamingDesc') || 'AI is generating content based on your workflow configuration. Please wait...' 
                  : t('reviewDesc') || 'Review and edit the AI-generated content before finalizing outputs.'}
              </CardDescription>
            </CardHeader>
            
            <CardContent className="flex-grow overflow-hidden p-0 flex flex-col">
              {isStreaming ? (
                // Streaming output view
                <div className="h-full flex flex-col">
                  <div className="flex-grow overflow-y-auto p-4 font-mono text-sm bg-gray-50 dark:bg-[#222222] whitespace-pre-wrap">
                    {streamingOutput || '...'}
                    <div ref={streamEndRef}></div>
                  </div>
                  <div className="p-4 border-t dark:border-[#444444] flex items-center">
                    <Loader2 className="animate-spin h-4 w-4 mr-2 text-blue-500 dark:text-blue-400" />
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      {t('generatingContent')}
                    </span>
                  </div>
                </div>
              ) : showReviewStep ? (
                // Review and edit step
                <div className="h-full flex flex-col">
                  <Tabs defaultValue={Object.keys(aiResponseData)[0] || 'document'} className="flex flex-col h-full">
                    <div className="border-b dark:border-[#444444] px-4">
                      <TabsList className="bg-transparent">
                        {Object.keys(aiResponseData).map((format) => (
                          <TabsTrigger 
                            key={format} 
                            value={format}
                            className="data-[state=active]:bg-[#eef6ff] data-[state=active]:dark:bg-[#2a3246] dark:text-gray-300 data-[state=active]:dark:text-blue-300"
                          >
                            {format === 'ppt' ? t('presentation') : 
                             format === 'document' ? t('document') : 
                             format.charAt(0).toUpperCase() + format.slice(1)}
                          </TabsTrigger>
                        ))}
                      </TabsList>
                    </div>
                    
                    <div className="flex-grow overflow-hidden">
                      {Object.keys(aiResponseData).map((format) => (
                        <TabsContent key={format} value={format} className="h-full p-0">
                          <div className="h-full flex flex-col">
                            <div className="p-4 border-b dark:border-[#444444] flex justify-between items-center">
                              <div>
                                <h3 className="text-sm font-medium dark:text-gray-200">
                                  {format === 'ppt' ? t('editPresentationContent') : 
                                   format === 'document' ? t('editDocumentContent') : 
                                   format === 'email' ? t('editEmailContent') : 
                                   format === 'task' ? t('editTaskContent') : 
                                   format === 'chat' ? t('editChatMessage') : 
                                   t('editContent')}
                                </h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  {t('editContentDesc')}
                                </p>
                              </div>
                            </div>
                            <div className="flex-grow p-0 overflow-y-auto">
                              <Textarea 
                                value={typeof editedResponseData[format] === 'string' ? 
                                  editedResponseData[format] : 
                                  JSON.stringify(editedResponseData[format], null, 2)
                                }
                                onChange={(e) => updateEditedResponse(
                                  format, 
                                  e.target.value,
                                  typeof aiResponseData[format] === 'object'
                                )}
                                className="min-h-[400px] font-mono text-sm border-0 rounded-none p-4 bg-gray-50 dark:bg-[#222222] dark:text-gray-300"
                              />
                            </div>
                          </div>
                        </TabsContent>
                      ))}
                    </div>
                  </Tabs>
                </div>
              ) : null}
            </CardContent>
            
            <CardFooter className="border-t dark:border-[#444444] p-4">
              {showReviewStep ? (
                <div className="flex justify-between w-full items-center">
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {t('editPrompt') || 'Edit the content above before generating final outputs.'}
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline"
                      onClick={() => {
                        setShowStreamingModal(false);
                        setShowReviewStep(false);
                      }}
                      className="dark:bg-[#333333] dark:text-gray-300 dark:border-[#444444] dark:hover:bg-[#444444]"
                    >
                      {t('cancel')}
                    </Button>
                    <Button 
                      onClick={handleProcessFinalOutputs}
                      disabled={isExecuting}
                      className="bg-[#39ac91] hover:bg-[#33a085] text-white dark:bg-[#39ac91] dark:hover:bg-[#33a085] dark:text-white"
                    >
                      {isExecuting && <Loader2 className="animate-spin h-4 w-4 mr-2" />}
                      {t('generateOutputs') || 'Generate Outputs'} <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="w-full text-center text-sm text-gray-500 dark:text-gray-400">
                  {t('waitingForAi') || 'Please wait while the AI generates content...'}
                </div>
              )}
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
                
                {/* API Results - New API data format */}
                {executionResult.api_results && Object.keys(executionResult.api_results).length > 0 && (
                  <div className="bg-indigo-50 dark:bg-[#2a2d46] p-4 rounded-md border border-indigo-100 dark:border-[#3a3d55] mt-4">
                    <h3 className="text-sm font-medium mb-2 dark:text-indigo-300">{t('apiResults') || 'API Results'}</h3>
                    <div className="space-y-3">
                      {Object.entries(executionResult.api_results).map(([nodeId, response]) => (
                        <div key={nodeId} className="p-3 border rounded bg-white dark:bg-[#282828] dark:border-[#383838]">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium dark:text-gray-200">{t('apiNode')}: {nodeId}</h4>
                            <span className={`px-2 py-1 rounded text-xs ${response.success ? 
                              'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 dark:border dark:border-green-800' : 
                              'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 dark:border dark:border-red-800'}`}>
                              {response.success ? t('success') : t('failure')} {response.status && `(${response.status})`}
                            </span>
                          </div>
                          {response.data && (
                            <div className="mt-2">
                              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('responseData') || 'Response Data'}:</p>
                              <pre className="bg-gray-50 dark:bg-[#222222] p-2 rounded text-xs overflow-auto max-h-40 dark:text-gray-300 border dark:border-[#383838]">
                                {JSON.stringify(response.data, null, 2)}
                              </pre>
                            </div>
                          )}
                          {response.error && (
                            <div className="mt-2">
                              <p className="text-xs text-red-500 dark:text-red-400">{t('error') || 'Error'}: {response.error}</p>
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
                      
                      {/* PowerPoint Presentation */}
                      {(executionResult.ppt || executionResult.pptxUrl) ? (
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
                      ) : (
                        executionResult.results && executionResult.results.ppt && executionResult.ppt_error && (
                          <div className="flex flex-col">
                            <div className="flex items-center">
                              <PresentationIcon className="h-5 w-5 text-orange-500 dark:text-orange-400 mr-2" />
                              <span className="dark:text-gray-200">{t('powerPointPresentation')}</span>
                              <span className="ml-2 px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full dark:bg-orange-900/30 dark:text-orange-300">
                                {t('generationError') || 'Generation Error'}
                              </span>
                            </div>
                            <div className="mt-2 bg-orange-50 dark:bg-[#382820] p-2 rounded-md text-xs border border-orange-100 dark:border-[#483830]">
                              <p className="text-orange-700 dark:text-orange-300">{executionResult.ppt_error}</p>
                            </div>
                          </div>
                        )
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
                
                {/* Email Sending Results */}
                {executionResult.email_result && (
                  <div className="bg-cyan-50 dark:bg-[#203038] p-4 rounded-md border border-cyan-100 dark:border-[#304048]">
                    <h3 className="text-sm font-medium mb-2 dark:text-cyan-300">{t('emailSendingResults') || 'Email Sending Results'}</h3>
                    <div className="flex items-center mb-2">
                      <Mail className="h-5 w-5 text-cyan-500 dark:text-cyan-400 mr-2" />
                      <span className="font-medium dark:text-cyan-300">
                        {executionResult.email_result.success 
                          ? (t('emailsSent', { count: executionResult.email_result.sentCount }) || `Sent ${executionResult.email_result.sentCount} emails successfully`)
                          : (t('emailSendingFailed') || 'Failed to send emails')}
                      </span>
                    </div>
                    
                    {executionResult.email_result.success && (
                      <div className="mt-2 bg-cyan-100/50 dark:bg-[#253840] p-3 rounded-md text-xs border border-cyan-200 dark:border-[#354850]">
                        <div className="font-medium text-cyan-800 dark:text-cyan-400 mb-1">
                          {t('emailDetails') || 'Email Details'}
                        </div>
                        <ul className="space-y-1 text-gray-600 dark:text-gray-400">
                          <li>
                            <span className="font-medium dark:text-gray-300">{t('recipients') || 'Recipients'}:</span> {executionResult.email_result.recipients}
                          </li>
                          <li>
                            <span className="font-medium dark:text-gray-300">{t('subject') || 'Subject'}:</span> {executionResult.email_result.subject}
                          </li>
                          <li>
                            <span className="font-medium dark:text-gray-300">{t('smtpConfig') || 'SMTP Config'}:</span> {executionResult.email_result.usedCustomSmtp ? t('custom') || 'Custom' : t('default') || 'Default (Environment)'}
                          </li>
                        </ul>
                      </div>
                    )}
                    
                    {!executionResult.email_result.success && executionResult.email_result.error && (
                      <div className="mt-2 bg-red-100/50 dark:bg-[#382830] p-3 rounded-md text-xs border border-red-200 dark:border-[#483840]">
                        <div className="font-medium text-red-800 dark:text-red-400">
                          {t('error') || 'Error'}
                        </div>
                        <p className="text-red-600 dark:text-red-300">{executionResult.email_result.error}</p>
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
      
      {/* Render all panels */}
      {panels.map(panel => {
        // Only render active panel for performance
        if (panel.id !== activePanel && panels.length > 1) return null;
        
        return (
          <DraggablePanel
            key={panel.id}
            isOpen={true}
            onClose={() => closePanel(panel.id)}
            title={panel.title}
            initialPosition={panel.position}
            initialWidth={750}
            initialHeight={650}
          >
            {panel.type === 'workflow-config' && (
              <div className="p-6 h-full overflow-y-auto">
                <div className="space-y-6">
                  <div>
                    <Label className="text-base dark:text-gray-300 mb-2 block">{t('workflowDescription')}</Label>
                    <div className="relative">
                      <Textarea
                        value={workflowDescription}
                        onChange={(e) => {
                          const newValue = e.target.value;
                          setWorkflowDescription(newValue);
                          setDescriptionCharCount(newValue.length);
                          setIsDescriptionOverLimit(newValue.length > MAX_DESCRIPTION_LENGTH);
                        }}
                        maxLength={MAX_DESCRIPTION_LENGTH + 10}
                        placeholder="Describe what this workflow does"
                        className={`resize-none h-20 dark:bg-[#333333] dark:border-[#444444] dark:text-gray-200 dark:placeholder-gray-500 w-full focus:ring-2 focus:ring-offset-0 focus:ring-offset-transparent ${
                          isDescriptionOverLimit ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'focus:border-[#39ac91] focus:ring-[#39ac91]/20'
                        }`}
                      />
                      <div className={`flex justify-end items-center mt-1`}>
                        <div className={`text-xs ${
                          isDescriptionOverLimit ? 'text-red-500 font-medium' : 'text-gray-500 dark:text-gray-400'
                        }`}>
                          {descriptionCharCount}/{MAX_DESCRIPTION_LENGTH}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex items-center mb-2">
                      <Label className="text-base dark:text-gray-300">
                        {t('promptTemplate')} <span className="text-red-500 ml-0.5">*</span>
                      </Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" className="p-0 h-6 w-6 ml-2">
                              <HelpCircle className="h-4 w-4 text-gray-400" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-[300px] p-3">
                            <p className="text-sm">{t('promptTemplateHelp') || 'Define the template that will be used by the AI model. Use {{variable_name}} to reference input variables in your prompt.'}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {promptTemplates.map((template) => (
                        <button
                          key={template.id}
                          onClick={() => setPromptTemplate(template.id)}
                          className={`px-3 py-1 text-sm rounded-full transition-colors ${
                            selectedTemplate === template.id
                              ? 'bg-[#39ac91] text-white dark:bg-[#39ac91] dark:text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-[#333333] dark:text-gray-300 dark:hover:bg-[#444444]'
                          }`}
                        >
                          {template.name}
                        </button>
                      ))}
                    </div>
                    <div className="relative">
                      <Textarea
                        value={workflowPrompt}
                        onChange={(e) => {
                          const newValue = e.target.value;
                          setWorkflowPrompt(newValue);
                          setSelectedTemplate('');
                          setPromptCharCount(newValue.length);
                          setIsPromptOverLimit(newValue.length > MAX_PROMPT_LENGTH);
                        }}
                        placeholder="Generate based on {{topic}}"
                        maxLength={MAX_PROMPT_LENGTH + 50}
                        className={`h-40 font-mono text-sm ${
                          isPromptOverLimit ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'focus:border-[#39ac91] focus:ring-[#39ac91]/20'
                        } dark:bg-[#333333] dark:border-[#444444] dark:text-gray-200 dark:placeholder-gray-500 w-full focus:ring-2 focus:ring-offset-0 focus:ring-offset-transparent`}
                      />
                      <div className={`flex justify-between items-center mt-1`}>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {t('variablePlaceholder', { variableSyntax: '{{variable_name}}' })}
                        </p>
                        <div className={`text-xs ${
                          isPromptOverLimit ? 'text-red-500 font-medium' : 'text-gray-500 dark:text-gray-400'
                        }`}>
                          {promptCharCount}/{MAX_PROMPT_LENGTH}
                        </div>
                      </div>
                      {isPromptOverLimit && (
                        <div className="text-xs text-red-500 mt-1">
                          Prompt exceeds maximum of {MAX_PROMPT_LENGTH} characters
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex items-center mb-2">
                      <Label className="text-base dark:text-gray-300">{t('inputVariables')}</Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" className="p-0 h-6 w-6 ml-2">
                              <HelpCircle className="h-4 w-4 text-gray-400" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-[350px] p-3">
                            <p className="text-sm">{t('inputVariablesHelp') || 'Define input fields that users will fill out when running the workflow. These variables can be referenced in your prompt template using {{variable_name}} syntax.'}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <div className="flex-grow"></div>
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
                    
                    <div className="border rounded-md dark:border-[#444444] max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-[#444444] scrollbar-track-transparent p-4">
                      <div className="space-y-4">
                        {inputFields.map((field, index) => {
                          // Check if this variable is used in the prompt
                          const usedVariables = extractVariablesFromPrompt(workflowPrompt);
                          const isUsedInPrompt = usedVariables.includes(field.name);
                          
                          return (
                            <div key={index} className={`flex items-center space-x-3 ${isUsedInPrompt ? 'bg-blue-50/50 dark:bg-blue-900/10 rounded-md p-2' : ''}`}>
                              <div className="relative w-1/3">
                                <Input
                                  value={field.name}
                                  onChange={(e) => {
                                    const oldName = field.name;
                                    const newValue = e.target.value;
                                    
                                    // Check if old name was in prompt and update it
                                    if (usedVariables.includes(oldName)) {
                                      const newPrompt = workflowPrompt.replaceAll(
                                        `{{${oldName}}}`, 
                                        `{{${newValue}}}`
                                      );
                                      setWorkflowPrompt(newPrompt);
                                    }
                                    
                                    updateInputField(index, 'name', newValue);
                                    
                                    // Update errors state
                                    setInputFieldErrors(prev => ({
                                      ...prev,
                                      [`name_${index}`]: newValue.length > MAX_INPUT_NAME_LENGTH ? 
                                        `Cannot exceed ${MAX_INPUT_NAME_LENGTH} chars` : null
                                    }));
                                  }}
                                  maxLength={MAX_INPUT_NAME_LENGTH + 5}
                                  placeholder="Variable name"
                                  className={`w-full dark:bg-[#333333] dark:border-[#444444] dark:text-gray-200 dark:placeholder-gray-500 ${
                                    inputFieldErrors[`name_${index}`] ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
                                  } ${isUsedInPrompt ? 'border-blue-300 dark:border-blue-600' : ''}`}
                                />
                                {inputFieldErrors[`name_${index}`] && (
                                  <div className="text-xs text-red-500 relative mt-1 truncate max-w-full">
                                    {inputFieldErrors[`name_${index}`]}
                                  </div>
                                )}

                              </div>
                              <Input
                                value={field.label}
                                onChange={(e) => updateInputField(index, 'label', e.target.value)}
                                placeholder="Display label"
                                maxLength={MAX_INPUT_NAME_LENGTH + 5}
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
                              {isUsedInPrompt ? (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-8 w-8 text-blue-500 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                      >
                                        <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs">
                                          i
                                        </div>
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p className="text-xs">{t('usedInPrompt') || 'This variable is used in the prompt template'}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              ) : (
                                <Button
                                  onClick={() => removeInputField(index)}
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 text-gray-500 dark:text-gray-400 hover:bg-gray-100 hover:text-red-500 dark:hover:bg-[#333333] dark:hover:text-red-400"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </DraggablePanel>
        );
      })}
      
      {/* Remove Chrome-like tabs at the bottom */}
    </div>
  );
}

// Helper function to safely parse JSON
const safeParseJSON = (jsonString) => {
  try {
    return { data: JSON.parse(jsonString), error: null };
  } catch (e) {
    return { data: null, error: e.message };
  }
};