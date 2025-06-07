'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from 'sonner';
import { Loader2, MessageSquare, CheckCircle2, Edit, Send, AlertCircle, Bug } from "lucide-react";
import { useRouter, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function TaskManagerAgent({ userId, projectId }) {
  const [instruction, setInstruction] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState(null);
  
  // 使用ref替代state存储导航信息，避免渲染期间更新state
  const navigationRef = useRef({ 
    shouldNavigate: false, 
    projectId: null,
    shouldRefresh: false
  });
  
  // New states for streaming
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedResponse, setStreamedResponse] = useState("");
  const [streamingComplete, setStreamingComplete] = useState(false);
  const [editedResponse, setEditedResponse] = useState("");
  const [currentView, setCurrentView] = useState("input"); // "input", "streaming", "edit"
  const [processingResponse, setProcessingResponse] = useState(false);
  
  // Debug state
  const [debugMode, setDebugMode] = useState(false);
  const [streamStatus, setStreamStatus] = useState("Not started");
  const [receivedChunks, setReceivedChunks] = useState(0);
  
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations();
  const locale = useTranslations().locale;
  
  // Effect for handling navigation after render
  useEffect(() => {
    // 改为每秒检查一次导航状态
    const checkNavigation = () => {
      const { shouldNavigate, projectId, shouldRefresh } = navigationRef.current;
      
      if (shouldNavigate && projectId) {
        const langCode = pathname.split('/')[1];
        // 使用window.location而不是router.push，避免React钩子问题
        window.location.href = `/${langCode}/projects/${projectId}`;
        // 重置导航状态
        navigationRef.current.shouldNavigate = false;
        navigationRef.current.projectId = null;
      } else if (shouldRefresh) {
        // 使用window.location.reload()而不是router.refresh()
        window.location.reload();
        navigationRef.current.shouldRefresh = false;
      }
    };
    
    // 延迟5秒后开始检查导航状态
    const initialTimer = setTimeout(() => {
      // 每秒检查一次导航状态
      const intervalId = setInterval(checkNavigation, 1000);
      return () => clearInterval(intervalId);
    }, 5000);
    
    return () => clearTimeout(initialTimer);
  }, []); // 移除所有依赖，只在组件挂载时运行一次

  // Predefined prompt templates
  const promptTemplates = [
    {
      id: 'feature',
      label: 'Feature Task',
      template: 'Create a new feature task for [feature name] with priority [high/medium/low] assigned to [username/email]',
    },
    {
      id: 'bug',
      label: 'Bug Fix',
      template: 'Create a bug fix task for [describe bug] with priority [high/medium/low] assigned to [username/email]',
    },
    {
      id: 'milestone',
      label: 'Milestone',
      template: 'Create a milestone task for [milestone name] due on [date] with subtasks: [task1, task2]',
    },
    {
      id: 'sprint',
      label: 'Sprint Planning',
      template: 'Plan a sprint with [number] tasks focused on [feature area] with team members [name1, name2]',
    },
    {
      id: 'assignee',
      label: 'Assign Multiple Tasks',
      template: 'Create 3 tasks: [task1], [task2], [task3] and assign them to [username/email]',
    },
    {
      id: 'multipleAssignees',
      label: 'Different Assignees',
      template: 'Create a task for [task1] assigned to [name1] and another task for [task2] assigned to [name2]',
    }
  ];
  
  const applyTemplate = (template) => {
    setInstruction(template);
  };
  
  // Initialize event source for streaming
  const initEventSource = async () => {
    try {
      setCurrentView("streaming");
      setIsStreaming(true);
      setStreamedResponse("");
      setStreamingComplete(false);
      setReceivedChunks(0);
      setStreamStatus("Starting request");
      
      console.log("Starting streaming request...");
      
      // Configure fetch with proper options for streaming
      const response = await fetch('/api/ai/task-manager-agent/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          instruction,
          userId
        }),
      });
      
      if (!response.ok) {
        setStreamStatus(`Error: HTTP ${response.status}`);
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to start streaming");
      }
      
      if (!response.body) {
        setStreamStatus("Error: ReadableStream not supported");
        throw new Error("ReadableStream not supported in this browser");
      }
      
      // Use the streaming API
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      console.log("Stream connected, waiting for data...");
      setStreamStatus("Connected, waiting for data");
      
      // Process the stream
      while (true) {
        const { value, done } = await reader.read();
        
        if (done) {
          console.log("Stream complete");
          setStreamStatus("Stream complete");
          break;
        }
        
        // Decode the received chunk
        const chunk = decoder.decode(value, { stream: true });
        console.log("Received chunk:", chunk.length, "bytes");
        setStreamStatus(`Processing chunk: ${chunk.length} bytes`);
        
        // Process all events in this chunk
        const events = chunk.split("\n\n");
        
        for (const event of events) {
          if (event.startsWith("data: ")) {
            try {
              // Parse the JSON data
              const jsonData = JSON.parse(event.slice(6));
              console.log("Parsed event:", jsonData.type);
              setStreamStatus(`Received event: ${jsonData.type}`);
              setReceivedChunks(prev => prev + 1);
              
              if (jsonData.type === 'start') {
                console.log("Generation started");
              }
              else if (jsonData.type === 'chunk') {
                setStreamedResponse(prev => prev + (jsonData.content || ""));
              }
              else if (jsonData.type === 'complete') {
                console.log("Generation completed");
                setStreamingComplete(true);
                setEditedResponse(jsonData.content || "");
                setStreamStatus("Generation complete");
                
                setTimeout(() => {
                  setCurrentView("edit");
                  setIsStreaming(false);
                }, 500);
              }
              else if (jsonData.type === 'error') {
                setStreamStatus(`Error: ${jsonData.error}`);
                throw new Error(jsonData.error || "Unknown streaming error");
              }
            } catch (parseError) {
              console.error("Error parsing event data:", parseError, event);
              setStreamStatus(`Parse error: ${parseError.message}`);
            }
          }
        }
      }
      
    } catch (error) {
      console.error("Streaming error:", error);
      setStreamStatus(`Fatal error: ${error.message}`);
      toast.error(error.message || t('errors.general'));
      setIsStreaming(false);
      setCurrentView("input");
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!instruction.trim()) {
      toast.error(t('CreateTask.taskNameRequired'));
      return;
    }
    
    if (!userId) {
      toast.error(t('errors.userNotLoggedIn'));
      return;
    }
    
    setIsLoading(true);
    setResults(null);
    
    try {
      console.log("Starting streaming request...");
      // Start streaming response
      await initEventSource();
    } catch (error) {
      console.error('Error:', error);
      toast.error(error.message || t('errors.general'));
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle the processing of edited AI response
  const handleProcessResponse = async () => {
    if (!editedResponse) {
      toast.error("Response cannot be empty");
      return;
    }
    
    setProcessingResponse(true);
    
    try {
      // Prepare request body based on whether a projectId is provided
      const requestBody = { 
        aiResponse: editedResponse,
        userId
      };
      
      // Only add projectId if it exists
      if (projectId) {
        requestBody.projectId = projectId;
      }
      
      const response = await fetch('/api/ai/task-manager-agent/process-response', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        console.error("API Error:", data);
        let errorMessage = data.error || t('errors.general');
        
        // Process specific error messages
        if (data.message && data.message.includes('Failed to get team')) {
          errorMessage = t('errors.teamNotFound');
        } else if (data.message && data.message.includes('Project has no associated teams')) {
          errorMessage = t('errors.noTeamsInProject');
        }
        
        throw new Error(errorMessage);
      }
      
      setResults(data);
      setCurrentView("results");
      
      if (data.success) {
        // Different success messages based on operation
        const successMessage = projectId 
          ? (t('CreateTask.tasksAddedSuccess') || "Tasks added successfully") 
          : (t('CreateTask.projectCreatedSuccess') || "Project created successfully");
        
        toast.success(successMessage);
        
        // 使用ref设置导航状态，避免在渲染期间更新state
        if (data.projectId && !projectId) {
          // 设置3秒后导航，确保所有渲染和状态更新完成
          setTimeout(() => {
            navigationRef.current.projectId = data.projectId;
            navigationRef.current.shouldNavigate = true;
          }, 3000);
        } else if (projectId) {
          // 设置3秒后刷新
          setTimeout(() => {
            navigationRef.current.shouldRefresh = true;
          }, 3000);
        }
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error(error.message || t('errors.general'));
    } finally {
      setProcessingResponse(false);
    }
  };
  
  const resetForm = () => {
    setCurrentView("input");
    setStreamedResponse("");
    setEditedResponse("");
    setStreamingComplete(false);
    setResults(null);
  };
  
  // Format JSON for display
  const formatJSON = (jsonStr) => {
    try {
      if (typeof jsonStr === 'string') {
        const parsed = JSON.parse(jsonStr);
        return JSON.stringify(parsed, null, 2);
      } else {
        return JSON.stringify(jsonStr, null, 2);
      }
    } catch (e) {
      return jsonStr; // Return original if parsing fails
    }
  };
  
  return (
    <Card className="w-full shadow-md overflow-hidden">
      <CardHeader className="border-b bg-muted/20">
        <div className="flex items-center space-x-3">
          <div className="hidden sm:block">
            <Image 
              src="/pengy assistant.png" 
              alt="Pengy" 
              width={40} 
              height={40} 
              className="rounded-full"
            />
          </div>
          <div className="flex-grow">
            <CardTitle>
              {projectId ? t('pengy.titleForProject') : t('pengy.title') || "Project & Task Creator"}
            </CardTitle>
            <CardDescription>
              {!projectId && (
                <span className="font-semibold text-primary">Create new projects with tasks</span>
              )}
              {" "}
              {projectId ? t('pengy.greetingForProject') : t('pengy.greeting')}
            </CardDescription>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setDebugMode(!debugMode)}
            title="Toggle debug mode"
          >
            <Bug className={`h-4 w-4 ${debugMode ? 'text-red-500' : 'text-muted-foreground'}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-6 max-h-[calc(100vh-220px)] overflow-y-auto">
        {currentView === "input" && (
          <>
        <div className="mb-4">
          <p className="text-sm mb-2 font-medium">Choose a prompt template:</p>
          <div className="flex flex-wrap gap-2">
            {promptTemplates.map((template) => (
              <Badge 
                key={template.id}
                variant="outline" 
                className="cursor-pointer hover:bg-primary/10"
                onClick={() => applyTemplate(template.template)}
              >
                {template.label}
              </Badge>
            ))}
          </div>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="grid w-full gap-4">
            <div className="relative">
              <Textarea
                placeholder={projectId ? 
                  t('pengy.promptForProject') : 
                  t('pengy.prompt') || "Describe a new project and tasks to create..."}
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                className="min-h-[120px] pr-10"
              />
              <MessageSquare className="absolute right-3 bottom-3 h-5 w-5 text-muted-foreground" />
            </div>
            <Button 
              type="submit" 
                  disabled={isLoading || isStreaming || !instruction.trim() || !userId}
              className="w-full"
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLoading ? 
                t('pengy.thinking') : 
                    "Generate Task Plan"}
            </Button>
          </div>
        </form>
          </>
        )}
        
        {currentView === "streaming" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-lg">Generating Task Plan...</h3>
              {isStreaming && <div className="flex items-center"><Loader2 className="h-4 w-4 animate-spin mr-2" /> <span className="text-sm text-muted-foreground">Receiving data...</span></div>}
            </div>
            
            {debugMode && (
              <div className="mb-4 rounded border border-amber-200 bg-amber-50 p-3 text-xs">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-semibold">Debug Information</span>
                  <Badge variant="outline" className={
                    streamStatus.includes("Error") ? "bg-red-100" :
                    streamStatus.includes("complete") ? "bg-green-100" :
                    "bg-blue-100"
                  }>
                    {streamStatus}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>Status: {isStreaming ? "Streaming" : "Idle"}</div>
                  <div>Chunks: {receivedChunks}</div>
                  <div>Response Size: {streamedResponse.length} chars</div>
                  <div>Complete: {streamingComplete ? "Yes" : "No"}</div>
                </div>
              </div>
            )}
            
            <div className="rounded-md border bg-muted/10 p-4 font-mono text-sm relative">
              {streamedResponse ? (
                <pre className="whitespace-pre-wrap overflow-auto max-h-[300px]">{streamedResponse}</pre>
              ) : (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" />
                  <p>Connecting to AI service...</p>
                </div>
              )}
              
              {streamingComplete && (
                <div className="absolute top-2 right-2 bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                  Generation complete
                </div>
              )}
            </div>
            
            <div className="flex justify-end mt-4">
              <Button 
                variant="secondary" 
                onClick={resetForm}
                className="mr-2"
              >
                Start Over
              </Button>
              <Button 
                onClick={() => {
                  setCurrentView("edit");
                  setEditedResponse(streamedResponse || "{}");
                }}
                disabled={!streamedResponse}
              >
                <Edit className="mr-2 h-4 w-4" />
                Edit Response
              </Button>
            </div>
          </div>
        )}
        
        {currentView === "edit" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-lg">Edit AI Response</h3>
              <div className="flex items-center">
                <AlertCircle className="h-4 w-4 text-amber-500 mr-2" />
                <span className="text-sm text-muted-foreground">You can edit the JSON before submitting</span>
              </div>
            </div>
            
            <Textarea
              value={editedResponse}
              onChange={(e) => setEditedResponse(e.target.value)}
              className="min-h-[300px] font-mono text-sm"
              placeholder="Edit the AI response here..."
            />
            
            <div className="flex justify-end mt-4">
              <Button 
                variant="secondary" 
                onClick={resetForm}
                disabled={processingResponse}
                className="mr-2"
              >
                Start Over
              </Button>
              <Button 
                onClick={handleProcessResponse}
                disabled={processingResponse}
              >
                {processingResponse ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                {processingResponse ? "Processing..." : "Create Tasks"}
              </Button>
            </div>
          </div>
        )}
        
        {currentView === "results" && results && results.success && (
          <div className="mt-6 space-y-4">
            <div className="rounded-md bg-green-50 p-4">
              <div className="flex items-center">
                <CheckCircle2 className="h-5 w-5 text-green-500 mr-2" />
                <p className="text-green-700">{t('pengy.success')}</p>
              </div>
            </div>
            
            {results.projectId && !projectId && (
              <div className="space-y-2">
                <h3 className="font-medium">{t('Projects.projectID')}:</h3>
                <p className="text-sm text-gray-500">{results.projectId}</p>
              </div>
            )}
            
            {results.tasks && results.tasks.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-medium">{t('tasks.title')}:</h3>
                <ul className="space-y-1 text-sm text-gray-500">
                  {results.tasks.map((task, index) => (
                    <li key={index} className="flex items-start">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-gray-400 mt-1.5 mr-2"></span>
                      <span>
                        {task.tag_values[1] || t('CreateTask.untitled')} 
                        {task.tag_values[10] && (
                          <span className="ml-1 text-xs px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-700">
                            {task.tag_values[10]}
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            <div className="flex justify-end mt-4">
              <Button 
                onClick={resetForm}
                variant="secondary"
              >
                Create More Tasks
              </Button>
            </div>
          </div>
        )}
        
        {(currentView === "input" || currentView === "results") && (
        <div className="mt-8 rounded-md bg-muted/30 p-4 text-sm border">
          <h4 className="font-medium mb-2">
            {projectId ? t('pengy.tipsForProject') : t('pengy.tips')}
          </h4>
          <p className="text-muted-foreground">
            {projectId ? t('pengy.tipDetailsForProject') : t('pengy.tipDetails')}
          </p>
          <div className="mt-2 text-muted-foreground">
            <p className="font-medium mb-1">Usage Examples:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Create a new feature task for user authentication with priority high assigned to john@example.com</li>
              <li>Create a bug fix task for login page crash with priority high assigned to Sarah</li>
              <li>Create a project for website redesign with 4 tasks: wireframes, design, frontend development, and testing assigned to different team members</li>
            </ul>
          </div>
        </div>
        )}
      </CardContent>
    </Card>
  );
} 