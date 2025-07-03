"use client"
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ArrowLeft, Calendar, Clock, FileText, PresentationIcon, Code, CheckCircle, RefreshCw, Info, AlertCircle, X, ExternalLink, Loader2, Eye, ChevronRight, Table as TableIcon,
         Mail, Database, Download, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import useGetUser from '@/lib/hooks/useGetUser';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

// 从工作流的flow_data中提取用户选择的AI模型
const extractAIModels = (flowData) => {
  if (!flowData || !flowData.nodes) return null;
  
  try {
    // 查找所有类型为process的节点
    const processNodes = flowData.nodes.filter(node => 
      node.data && (node.data.nodeType === 'process' || node.data.iconType === 'process')
    );
    
    // 从每个process节点中提取selectedModel
    const models = processNodes
      .map(node => node.data.selectedModel)
      .filter(Boolean); // 过滤掉undefined或null
    
    if (models.length === 0) return null;
    
    // 返回模型名称，如果有多个则用逗号分隔
    return models.map(model => model.split('/').pop()).join(', ');
  } catch (error) {
    console.error('Error extracting AI models:', error);
    return null;
  }
};

// Add a JSONViewer component for better JSON rendering
const JSONViewer = ({ data }) => {
  if (!data) return <p className="text-gray-500 italic">No data available</p>;

  // Function to colorize different parts of JSON
  const colorizeJson = (jsonString) => {
    return jsonString
      .replace(/"([^"]+)":/g, '<span class="text-purple-500 dark:text-purple-400">"$1"</span>:')
      .replace(/: "(.*?)"/g, ': <span class="text-green-600 dark:text-green-400">"$1"</span>')
      .replace(/: (true|false)/g, ': <span class="text-blue-600 dark:text-blue-400">$1</span>')
      .replace(/: (\d+)/g, ': <span class="text-amber-600 dark:text-amber-400">$1</span>')
      .replace(/null/g, '<span class="text-gray-500">null</span>');
  };

  try {
    let jsonStr = '';
    if (typeof data === 'object') {
      jsonStr = JSON.stringify(data, null, 2);
    } else {
      try {
        // Try to parse if it's a JSON string
        const parsed = JSON.parse(data);
        jsonStr = JSON.stringify(parsed, null, 2);
      } catch (e) {
        // If it's not valid JSON, use as is
        return <pre className="text-sm p-4 rounded whitespace-pre-wrap">{data}</pre>;
      }
    }
    
    return (
      <pre 
        className="text-sm p-4 rounded-md bg-gray-50 dark:bg-gray-800 border overflow-auto max-h-[500px] shadow-inner" 
        dangerouslySetInnerHTML={{ __html: colorizeJson(jsonStr) }}
      />
    );
  } catch (e) {
    console.error("Error rendering JSON:", e);
    return <pre className="text-sm p-4 bg-gray-50 dark:bg-gray-800 rounded">{String(data)}</pre>;
  }
};

export default function WorkflowHistory() {
  const t = useTranslations('AI_Workflow');
  const router = useRouter();
  const { user } = useGetUser();
  
  // State
  const [executionHistory, setExecutionHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedExecution, setSelectedExecution] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  
  // Fetch execution history
  useEffect(() => {
    const fetchHistory = async () => {
      if (!user || !user.id) return;
      
      try {
        setIsLoading(true);
        const response = await fetch(`/api/ai/workflow-agent/executions?userId=${user.id}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch execution history');
        }
        
        const data = await response.json();
        setExecutionHistory(data);
      } catch (err) {
        console.error('Error fetching workflow execution history:', err);
        setError(err.message);
        toast.error('Failed to load execution history');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchHistory();
  }, [user]);
  
  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };
  
  // Get icon for workflow type
  const getWorkflowTypeIcon = (type) => {
    switch (type) {
      case 'document_generation':
        return <FileText className="h-4 w-4 mr-2" />;
      case 'ppt_generation':
        return <PresentationIcon className="h-4 w-4 mr-2" />;
      case 'api_request':
        return <Code className="h-4 w-4 mr-2" />;
      case 'task_automation':
        return <CheckCircle className="h-4 w-4 mr-2" />;
      default:
        return <Info className="h-4 w-4 mr-2" />;
    }
  };
  
  // Get status badge
  const getStatusBadge = (status) => {
    switch (status) {
      case 'COMPLETED':
        return <Badge className="bg-green-500 hover:bg-green-600">Completed</Badge>;
      case 'PROCESSING':
        return <Badge className="bg-blue-500 hover:bg-blue-600">Processing</Badge>;
      case 'FAILED':
        return <Badge className="bg-red-500 hover:bg-red-600">Failed</Badge>;
      case 'partial':
        return <Badge className="bg-amber-500 hover:bg-amber-600">Partial</Badge>;
      case 'completed':
        return <Badge className="bg-green-500 hover:bg-green-600">Completed</Badge>;
      default:
        return <Badge className="bg-gray-500 hover:bg-gray-600">{status}</Badge>;
    }
  };
  
  // Navigate back to workflow page
  const handleBack = () => {
    router.push('/ai-workflow');
  };

  // Open execution details modal
  const openExecutionDetails = (execution) => {
    setSelectedExecution(execution);
    setShowDetailsModal(true);
  };
  
  // Close execution details modal
  const closeExecutionDetails = () => {
    setShowDetailsModal(false);
    setSelectedExecution(null);
  };
  
  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleBack} 
            className="mr-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">{t('workflowHistory') || 'Workflow Execution History'}</h1>
        </div>
        <Button
          onClick={() => {
            setIsLoading(true);
            const fetchHistory = async () => {
              if (!user || !user.id) return;
              
              try {
                const response = await fetch(`/api/ai/workflow-agent/executions?userId=${user.id}`);
                
                if (!response.ok) {
                  throw new Error('Failed to fetch execution history');
                }
                
                const data = await response.json();
                setExecutionHistory(data);
                toast.success('History refreshed successfully');
              } catch (err) {
                console.error('Error refreshing workflow execution history:', err);
                toast.error('Failed to refresh history');
              } finally {
                setIsLoading(false);
              }
            };
            
            fetchHistory();
          }}
          variant="outline"
          size="sm"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          {t('refresh') || 'Refresh'}
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>{t('pastExecutions') || 'Past Workflow Executions'}</CardTitle>
          <CardDescription>
            {t('viewPastExecutions') || 'View your past workflow executions and download generated files'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : error ? (
            <div className="flex items-center justify-center p-6 text-center">
              <div>
                <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Failed to load execution history</h3>
                <p className="text-gray-500 dark:text-gray-400">{error}</p>
              </div>
            </div>
          ) : executionHistory.length === 0 ? (
            <div className="flex items-center justify-center p-6 text-center">
              <div>
                <Info className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">{t('noExecutions') || 'No executions found'}</h3>
                <p className="text-gray-500 dark:text-gray-400">
                  {t('runWorkflowFirst') || 'Run a workflow to see your execution history here'}
                </p>
                <Button 
                  variant="outline"
                  className="mt-4"
                  onClick={handleBack}
                >
                  {t('goToWorkflow') || 'Go to Workflow Builder'}
                </Button>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('workflow') || 'Workflow'}</TableHead>
                  <TableHead>{t('executedAt') || 'Executed At'}</TableHead>
                  <TableHead>{t('status') || 'Status'}</TableHead>
                  <TableHead>{t('model') || 'Model'}</TableHead>
                  <TableHead>{t('outputs') || 'Outputs'}</TableHead>
                  <TableHead>{t('actions') || 'Actions'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {executionHistory.map((execution) => (
                  <TableRow key={execution.id}>
                    <TableCell>
                      <div className="flex items-center">
                        {getWorkflowTypeIcon(execution.workflow?.type)}
                        <span className="font-medium">{execution.workflow?.name || 'Unknown Workflow'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <div className="flex items-center text-gray-500 dark:text-gray-400 text-xs">
                          <Calendar className="h-3 w-3 mr-1" />
                          {formatDate(execution.executed_at).split(',')[0]}
                        </div>
                        <div className="flex items-center text-gray-500 dark:text-gray-400 text-xs mt-1">
                          <Clock className="h-3 w-3 mr-1" />
                          {formatDate(execution.executed_at).split(',')[1]}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(execution.status)}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-mono">
                        {execution.model_id === 'user_edited' 
                          ? extractAIModels(execution.workflow?.flow_data) || 'Custom Model'
                          : execution.model_id ? execution.model_id.split('/').pop() : 'Default'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        {execution.output_formats?.map((format) => (
                          <TooltipProvider key={format}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge variant="outline" className="border-gray-300 dark:border-gray-600">
                                  {format === 'document' ? (
                                    <FileText className="h-3 w-3 mr-1" />
                                  ) : format === 'ppt' ? (
                                    <PresentationIcon className="h-3 w-3 mr-1" />
                                  ) : format === 'json' ? (
                                    <Code className="h-3 w-3 mr-1" />
                                  ) : (
                                    <Info className="h-3 w-3 mr-1" />
                                  )}
                                  {format}
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{format === 'document' ? 'Document' : format === 'ppt' ? 'Presentation' : format}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        {/* Document download */}
                        {execution.document_urls?.docxUrl && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <a 
                                  href={execution.document_urls.docxUrl} 
                                  download 
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 inline-flex items-center justify-center"
                                >
                                  <FileText className="h-4 w-4 text-blue-500" />
                                </a>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Download Document</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                        
                        {/* Presentation download */}
                        {(execution.document_urls?.pptxUrl || execution.document_urls?.ppt) && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <a 
                                  href={execution.document_urls?.pptxUrl || execution.document_urls?.ppt} 
                                  download 
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 inline-flex items-center justify-center"
                                >
                                  <PresentationIcon className="h-4 w-4 text-orange-500" />
                                </a>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Download Presentation</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                        
                        {/* View full results */}
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex items-center gap-1 text-xs transition-all hover:bg-gray-100 dark:hover:bg-gray-800 border-gray-200 dark:border-gray-700"
                                onClick={() => openExecutionDetails(execution)}
                              >
                                <Eye className="h-3.5 w-3.5" />
                                {t('viewResults') || 'View Results'}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>View Full Results</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      
      {/* Execution Details Modal */}
      {showDetailsModal && selectedExecution && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 overflow-y-auto backdrop-blur-sm transition-all duration-300">
          <Card className="w-11/12 max-w-5xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200 shadow-xl">
            <CardHeader className="border-b bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    {getWorkflowTypeIcon(selectedExecution.workflow?.type)}
                    {selectedExecution.workflow?.name || 'Workflow Execution Details'}
                    {getStatusBadge(selectedExecution.status)}
                  </CardTitle>
                  <CardDescription className="mt-1 flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {formatDate(selectedExecution.executed_at)}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9"
                    onClick={() => {
                      // Code to copy execution ID or details to clipboard
                      navigator.clipboard.writeText(selectedExecution.id);
                      toast.success('Execution ID copied to clipboard');
                    }}
                  >
                    <Database className="h-4 w-4 mr-1" />
                    Copy ID
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={closeExecutionDetails}
                    className="h-8 w-8 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            
            <div className="flex-grow overflow-auto bg-gray-50/50 dark:bg-gray-900/50">
              <CardContent className="p-6">
                <div className="space-y-6">
                  {/* Execution Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="shadow-sm">
                      <CardContent className="p-4">
                        <h3 className="text-sm font-medium mb-3 text-gray-700 dark:text-gray-300 flex items-center gap-1">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          Status
                        </h3>
                        <div>{getStatusBadge(selectedExecution.status)}</div>
                      </CardContent>
                    </Card>
                    
                    <Card className="shadow-sm">
                      <CardContent className="p-4">
                        <h3 className="text-sm font-medium mb-3 text-gray-700 dark:text-gray-300 flex items-center gap-1">
                          <Code className="h-4 w-4 text-indigo-500" />
                          AI Model
                        </h3>
                        <div className="text-sm font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-md">
                          {selectedExecution.model_id === 'user_edited' 
                            ? extractAIModels(selectedExecution.workflow?.flow_data) || 'Custom Model'
                            : selectedExecution.model_id}
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card className="shadow-sm">
                      <CardContent className="p-4">
                        <h3 className="text-sm font-medium mb-3 text-gray-700 dark:text-gray-300 flex items-center gap-1">
                          <FileText className="h-4 w-4 text-blue-500" />
                          Output Formats
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {selectedExecution.output_formats?.map((format) => (
                            <Badge key={format} className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700">
                              {format === 'document' ? (
                                <FileText className="h-3 w-3 mr-1" />
                              ) : format === 'ppt' ? (
                                <PresentationIcon className="h-3 w-3 mr-1" />
                              ) : format === 'json' ? (
                                <Code className="h-3 w-3 mr-1" />
                              ) : format === 'task' ? (
                                <CheckCircle className="h-3 w-3 mr-1" />
                              ) : (
                                <Info className="h-3 w-3 mr-1" />
                              )}
                              {format}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                  
                  {/* Input Values */}
                  {selectedExecution.inputs && Object.keys(selectedExecution.inputs).length > 0 && (
                    <Card className="overflow-hidden">
                      <CardHeader className="bg-gray-50 dark:bg-gray-800 py-3 px-4">
                        <CardTitle className="text-sm font-medium flex items-center">
                          <ChevronRight className="h-4 w-4 mr-1" />
                          Input Values
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 bg-white dark:bg-gray-900 grid grid-cols-1 md:grid-cols-2 gap-4">
                        {Object.entries(selectedExecution.inputs).map(([key, value]) => (
                          <div key={key} className="border rounded-md p-3 bg-white dark:bg-gray-900 shadow-sm">
                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 font-medium">{key}</div>
                            <div className="text-sm bg-gray-50 dark:bg-gray-800 p-2 rounded-md max-h-[200px] overflow-auto whitespace-pre-wrap">{value}</div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}
                  
                  {/* Generated Files */}
                  {(selectedExecution.document_urls || selectedExecution.docxUrl || selectedExecution.pptxUrl) && (
                    <Card className="overflow-hidden">
                      <CardHeader className="bg-gray-50 dark:bg-gray-800 py-3 px-4">
                        <CardTitle className="text-sm font-medium flex items-center">
                          <Download className="h-4 w-4 mr-1" />
                          Generated Files
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 bg-white dark:bg-gray-900">
                        <div className="space-y-3">
                          {/* Document */}
                          {(selectedExecution.document_urls?.docxUrl || selectedExecution.docxUrl) && (
                            <div className="flex items-center justify-between border rounded-md p-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                              <div className="flex items-center">
                                <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-md mr-3">
                                  <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div>
                                  <p className="font-medium text-sm">Document</p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">.docx format</p>
                                </div>
                              </div>
                              <a 
                                href={selectedExecution.document_urls?.docxUrl || selectedExecution.docxUrl} 
                                download 
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center px-3 py-1.5 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors text-sm font-medium"
                              >
                                <Download className="h-4 w-4 mr-1" />
                                Download
                              </a>
                            </div>
                          )}
                          
                          {/* Presentation */}
                          {(selectedExecution.document_urls?.pptxUrl || selectedExecution.document_urls?.ppt || selectedExecution.pptxUrl) && (
                            <div className="flex items-center justify-between border rounded-md p-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                              <div className="flex items-center">
                                <div className="bg-orange-100 dark:bg-orange-900/30 p-2 rounded-md mr-3">
                                  <PresentationIcon className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                                </div>
                                <div>
                                  <p className="font-medium text-sm">Presentation</p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">.pptx format</p>
                                </div>
                              </div>
                              <a 
                                href={selectedExecution.document_urls?.pptxUrl || selectedExecution.document_urls?.ppt || selectedExecution.pptxUrl} 
                                download 
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center px-3 py-1.5 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors text-sm font-medium"
                              >
                                <Download className="h-4 w-4 mr-1" />
                                Download
                              </a>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  
                  {/* Results */}
                  {selectedExecution.result && (
                    <Card className="overflow-hidden">
                      <CardHeader className="bg-gray-50 dark:bg-gray-800 py-3 px-4">
                        <CardTitle className="text-sm font-medium flex items-center">
                          <Maximize2 className="h-4 w-4 mr-1" />
                          Results
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-0 bg-white dark:bg-gray-900">
                        <Tabs defaultValue={selectedExecution.output_formats?.[0] || "results"} className="w-full">
                          <TabsList className="flex w-full border-b bg-gray-50 dark:bg-gray-800 p-0 h-auto">
                            {selectedExecution.output_formats?.map(format => (
                              <TabsTrigger 
                                key={format} 
                                value={format}
                                className="flex items-center py-2 px-4 gap-1 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-900 rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500"
                              >
                                {format === 'document' ? (
                                  <FileText className="h-4 w-4 text-blue-500" />
                                ) : format === 'ppt' ? (
                                  <PresentationIcon className="h-4 w-4 text-orange-500" />
                                ) : format === 'json' ? (
                                  <Code className="h-4 w-4 text-indigo-500" />
                                ) : format === 'task' ? (
                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                ) : (
                                  <Info className="h-4 w-4 text-gray-500" />
                                )}
                                {format.charAt(0).toUpperCase() + format.slice(1)}
                              </TabsTrigger>
                            ))}
                            
                            {selectedExecution.result.api_results && (
                              <TabsTrigger 
                                value="api"
                                className="flex items-center py-2 px-4 gap-1 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-900 rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500"
                              >
                                <Database className="h-4 w-4 text-purple-500" />
                                API
                              </TabsTrigger>
                            )}
                            
                            {selectedExecution.result.task_result && (
                              <TabsTrigger 
                                value="task"
                                className="flex items-center py-2 px-4 gap-1 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-900 rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500"
                              >
                                <TableIcon className="h-4 w-4 text-green-500" />
                                Tasks
                              </TabsTrigger>
                            )}
                            
                            {selectedExecution.result.email_result && (
                              <TabsTrigger 
                                value="email"
                                className="flex items-center py-2 px-4 gap-1 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-900 rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500"
                              >
                                <Mail className="h-4 w-4 text-blue-500" />
                                Email
                              </TabsTrigger>
                            )}
                          </TabsList>
                          
                          {/* Format-specific content */}
                          {selectedExecution.output_formats?.map(format => (
                            <TabsContent key={format} value={format} className="p-0 focus-visible:outline-none focus-visible:ring-0">
                              <div className="p-4">
                                <JSONViewer data={selectedExecution.result[format]} />
                              </div>
                            </TabsContent>
                          ))}
                          
                          {/* API Results */}
                          {selectedExecution.result.api_results && (
                            <TabsContent value="api" className="p-0 focus-visible:outline-none focus-visible:ring-0">
                              <div className="p-4">
                                <JSONViewer data={selectedExecution.result.api_results} />
                              </div>
                            </TabsContent>
                          )}
                          
                          {/* Task Results */}
                          {selectedExecution.result.task_result && (
                            <TabsContent value="task" className="p-0 focus-visible:outline-none focus-visible:ring-0">
                              <div className="p-4">
                                <div className="mb-4 flex items-center gap-3">
                                  <Badge className={`px-3 py-1 flex items-center gap-1 ${
                                    selectedExecution.result.task_result.success 
                                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' 
                                      : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                                  }`}>
                                    {selectedExecution.result.task_result.success 
                                      ? <CheckCircle className="h-4 w-4" /> 
                                      : <AlertCircle className="h-4 w-4" />}
                                    {selectedExecution.result.task_result.success ? 'Success' : 'Failed'}
                                  </Badge>
                                  {selectedExecution.result.task_result.tasksCreated && (
                                    <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 px-3 py-1">
                                      {selectedExecution.result.task_result.tasksCreated} tasks created
                                    </Badge>
                                  )}
                                </div>
                                <JSONViewer data={selectedExecution.result.task_result} />
                              </div>
                            </TabsContent>
                          )}
                          
                          {/* Email Results */}
                          {selectedExecution.result.email_result && (
                            <TabsContent value="email" className="p-0 focus-visible:outline-none focus-visible:ring-0">
                              <div className="p-4">
                                <div className="mb-4">
                                  <Badge className={`px-3 py-1 flex items-center gap-1 ${
                                    selectedExecution.result.email_result.success 
                                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' 
                                      : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                                  }`}>
                                    {selectedExecution.result.email_result.success 
                                      ? <CheckCircle className="h-4 w-4" /> 
                                      : <AlertCircle className="h-4 w-4" />}
                                    {selectedExecution.result.email_result.success ? 'Email Sent' : 'Failed'}
                                  </Badge>
                                </div>
                                <JSONViewer data={selectedExecution.result.email_result} />
                              </div>
                            </TabsContent>
                          )}
                        </Tabs>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </CardContent>
            </div>
            
            <CardFooter className="border-t p-4 flex justify-end bg-white dark:bg-gray-900">
              <Button variant="outline" onClick={closeExecutionDetails}>
                Close
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  );
}