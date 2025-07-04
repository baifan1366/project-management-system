import React, { memo, useState, useEffect } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, PresentationIcon, Code, Edit, Check, X, Loader2, MessageSquare, Mail } from 'lucide-react';
import ModelSelector from './ModelSelector';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';
import { Checkbox } from '@/components/ui/checkbox';

function WorkflowNode({ data, selected, id }) {
  const t = useTranslations('AI_Workflow');
  const { label, icon, nodeType, outputType, description, selectedModel, jsonFormat, apiUrl, apiMethod } = data;
  const [isEditing, setIsEditing] = useState(false);
  const [tempJsonFormat, setTempJsonFormat] = useState(jsonFormat || '{\n  "title": "Example",\n  "content": "Content here"\n}');
  const [tempApiUrl, setTempApiUrl] = useState(apiUrl || 'https://api.example.com/data');
  const [tempApiMethod, setTempApiMethod] = useState(apiMethod || 'GET');
  
  // Task node settings
  const [selectedProjectId, setSelectedProjectId] = useState(data.projectId || '');
  const [selectedTeamId, setSelectedTeamId] = useState(data.teamId || '');
  const [projects, setProjects] = useState([]);
  const [teams, setTeams] = useState([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [isLoadingTeams, setIsLoadingTeams] = useState(false);

  // Chat message node settings
  const [chatSessions, setChatSessions] = useState([]);
  const [selectedChatSessions, setSelectedChatSessions] = useState(data.chatSessionIds || []);
  const [isLoadingChatSessions, setIsLoadingChatSessions] = useState(false);
  const [messageTemplate, setMessageTemplate] = useState(data.messageTemplate || 'Hello, this is an automated message from the workflow system:\n\n{{content}}');
  const [messageFormat, setMessageFormat] = useState(data.messageFormat || 'text');
  
  // Email node settings
  const [emailRecipients, setEmailRecipients] = useState(data.emailRecipients || '');
  const [emailSubject, setEmailSubject] = useState(data.emailSubject || 'Automated email from workflow system');
  const [emailTemplate, setEmailTemplate] = useState(data.emailTemplate || 'Hello,\n\nThis is an automated email from the workflow system:\n\n{{content}}\n\nRegards,\nWorkflow System');
  const [useCustomSmtp, setUseCustomSmtp] = useState(data.useCustomSmtp || false);
  const [smtpHost, setSmtpHost] = useState(data.smtpHost || '');
  const [smtpPort, setSmtpPort] = useState(data.smtpPort || '587');
  const [smtpUser, setSmtpUser] = useState(data.smtpUser || '');
  const [smtpPassword, setSmtpPassword] = useState(data.smtpPassword || '');
  const [smtpFrom, setSmtpFrom] = useState(data.smtpFrom || '');

  // Fetch user's projects on component mount
  useEffect(() => {
    if (nodeType === 'output' && outputType === 'task' && data.userId) {
      fetchUserProjects();
    }
  }, [nodeType, outputType, data.userId]);

  // Fetch chat sessions on component mount
  useEffect(() => {
    if (nodeType === 'output' && outputType === 'chat' && data.userId) {
      fetchChatSessions();
    }
  }, [nodeType, outputType, data.userId]);

  // Fetch teams when project is selected
  useEffect(() => {
    if (selectedProjectId) {
      fetchProjectTeams(selectedProjectId);
    }
  }, [selectedProjectId]);

  // Fetch user's chat sessions
  const fetchChatSessions = async () => {
    if (!data.userId) return;
    
    try {
      setIsLoadingChatSessions(true);
      const response = await fetch(`/api/chat/sessions?userId=${data.userId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch chat sessions');
      }
      
      const chatSessionData = await response.json();
      const filteredSessions = chatSessionData.filter(session => session.type !== 'AI');
      setChatSessions(filteredSessions);
    } catch (error) {
      console.error('Error fetching chat sessions:', error);
    } finally {
      setIsLoadingChatSessions(false);
    }
  };

  // Fetch user's projects
  const fetchUserProjects = async () => {
    if (!data.userId) return;
    
    try {
      setIsLoadingProjects(true);
      const response = await fetch(`/api/projects/user/${data.userId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch projects');
      }
      
      const projectData = await response.json();
      setProjects(projectData);
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setIsLoadingProjects(false);
    }
  };

  // Fetch teams for a project
  const fetchProjectTeams = async (projectId) => {
    if (!projectId) {
      setTeams([]);
      return;
    }
    
    try {
      setIsLoadingTeams(true);
      const response = await fetch(`/api/projects/${projectId}/team?userId=${data.userId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch teams');
      }
      
      const teamData = await response.json();
      setTeams(teamData);
      
      // If there's only one team, auto-select it
      if (teamData.length === 1) {
        setSelectedTeamId(teamData[0].id);
        // Update parent component directly with setTimeout to avoid React warnings
        if (data.handleInputChange) {
          setTimeout(() => {
            data.handleInputChange(id, 'projectId', projectId);
            data.handleInputChange(id, 'teamId', teamData[0].id);
          }, 0);
        }
      }
    } catch (error) {
      console.error('Error fetching teams:', error);
    } finally {
      setIsLoadingTeams(false);
    }
  };

  // Handle project change
  const handleProjectChange = (projectId) => {
    setSelectedProjectId(projectId);
    setSelectedTeamId(''); // Reset team selection when project changes
  };

  // Handle team change
  const handleTeamChange = (teamId) => {
    setSelectedTeamId(teamId);
  };
  
  // Update parent when project or team changes
  useEffect(() => {
    if (data.handleInputChange) {
      data.handleInputChange(id, 'projectId', selectedProjectId);
      data.handleInputChange(id, 'teamId', selectedTeamId);
    }
  }, [selectedProjectId, selectedTeamId, data.handleInputChange, id]);

  // Handle model change
  const handleModelChange = (modelId) => {
    // Update local state first (if needed)
    // Then parent will be updated via useEffect
    if (data.handleInputChange) {
      // Use setTimeout to defer state update to next tick
      setTimeout(() => {
        data.handleInputChange(id, 'selectedModel', modelId);
      }, 0);
    }
  };

  // Save JSON format changes
  const saveJsonFormat = () => {
    if (data.handleInputChange) {
      data.handleInputChange(id, 'jsonFormat', tempJsonFormat);
    }
    setIsEditing(false);
  };

  // Save API settings
  const saveApiSettings = () => {
    if (data.handleInputChange) {
      data.handleInputChange(id, 'apiUrl', tempApiUrl);
      data.handleInputChange(id, 'apiMethod', tempApiMethod);
    }
    setIsEditing(false);
  };

  // Toggle chat session selection
  const toggleChatSession = (sessionId) => {
    setSelectedChatSessions(prev => {
      const isSelected = prev.includes(sessionId);
      
      // If already selected, remove it
      if (isSelected) {
        return prev.filter(id => id !== sessionId);
      } 
      // If not selected, add it
      else {
        return [...prev, sessionId];
      }
    });
  };
  
  // Update parent component when selectedChatSessions changes
  useEffect(() => {
    if (data.handleInputChange) {
      data.handleInputChange(id, 'chatSessionIds', selectedChatSessions);
    }
  }, [selectedChatSessions, data.handleInputChange, id]);

  // Save message template
  const saveMessageTemplate = () => {
    if (data.handleInputChange) {
      data.handleInputChange(id, 'messageTemplate', messageTemplate);
      data.handleInputChange(id, 'messageFormat', messageFormat);
    }
    setIsEditing(false);
  };

  // Save email settings
  const saveEmailSettings = () => {
    if (data.handleInputChange) {
      data.handleInputChange(id, 'emailRecipients', emailRecipients);
      data.handleInputChange(id, 'emailSubject', emailSubject);
      data.handleInputChange(id, 'emailTemplate', emailTemplate);
      data.handleInputChange(id, 'useCustomSmtp', useCustomSmtp);
      
      if (useCustomSmtp) {
        data.handleInputChange(id, 'smtpHost', smtpHost);
        data.handleInputChange(id, 'smtpPort', smtpPort);
        data.handleInputChange(id, 'smtpUser', smtpUser);
        data.handleInputChange(id, 'smtpPassword', smtpPassword);
        data.handleInputChange(id, 'smtpFrom', smtpFrom);
      }
    }
    setIsEditing(false);
  };

  // Cancel editing
  const cancelEditing = () => {
    setTempJsonFormat(jsonFormat || '{\n  "title": "Example",\n  "content": "Content here"\n}');
    setTempApiUrl(apiUrl || 'https://api.example.com/data');
    setTempApiMethod(apiMethod || 'GET');
    setMessageTemplate(data.messageTemplate || 'Hello, this is an automated message from the workflow system:\n\n{{content}}');
    setMessageFormat(data.messageFormat || 'text');
    setEmailRecipients(data.emailRecipients || '');
    setEmailSubject(data.emailSubject || 'Automated email from workflow system');
    setEmailTemplate(data.emailTemplate || 'Hello,\n\nThis is an automated email from the workflow system:\n\n{{content}}\n\nRegards,\nWorkflow System');
    setUseCustomSmtp(data.useCustomSmtp || false);
    setSmtpHost(data.smtpHost || '');
    setSmtpPort(data.smtpPort || '587');
    setSmtpUser(data.smtpUser || '');
    setSmtpPassword(data.smtpPassword || '');
    setSmtpFrom(data.smtpFrom || '');
    setIsEditing(false);
  };

  // Handle message format change
  const handleMessageFormatChange = (format) => {
    setMessageFormat(format);
  };
  
  // Update parent when messageFormat changes
  useEffect(() => {
    if (data.handleInputChange && messageFormat) {
      data.handleInputChange(id, 'messageFormat', messageFormat);
    }
  }, [messageFormat, data.handleInputChange, id]);

  // Get background color based on node type
  const getNodeColor = () => {
    switch(nodeType) {
      case 'input':
        return 'bg-white dark:bg-[#303842] border-blue-100 dark:border-[#404a55]';
      case 'process':
        return 'bg-white dark:bg-[#3a3a4a] border-purple-100 dark:border-[#4a4a5a]';
      case 'output':
        if (outputType === 'json') {
          return 'bg-white dark:bg-[#304238] border-green-100 dark:border-[#405248]';
        } else if (outputType === 'api') {
          return 'bg-white dark:bg-[#3f3242] border-purple-100 dark:border-[#4f4252]';
        } else if (outputType === 'document') {
          return 'bg-white dark:bg-[#303a42] border-blue-100 dark:border-[#404a52]';
        } else if (outputType === 'ppt') {
          return 'bg-white dark:bg-[#42303a] border-red-100 dark:border-[#52404a]';
        } else if (outputType === 'task') {
          return 'bg-white dark:bg-[#323a30] border-amber-100 dark:border-[#424a40]';
        } else if (outputType === 'chat') {
          return 'bg-white dark:bg-[#303842] border-indigo-100 dark:border-[#404a55]';
        } else if (outputType === 'email') {
          return 'bg-white dark:bg-[#383030] border-cyan-100 dark:border-[#484040]';
        }
        return 'bg-white dark:bg-[#303842] border-gray-100 dark:border-[#404a55]';
      default:
        return 'bg-white dark:bg-[#2a2a2a] border-gray-100 dark:border-[#3a3a3a]';
    }
  };

  // Get icon color based on node type
  const getIconColor = () => {
    switch(nodeType) {
      case 'input':
        return 'text-blue-500 dark:text-blue-400';
      case 'process':
        return 'text-purple-500 dark:text-purple-400';
      case 'output':
        if (outputType === 'json') {
          return 'text-green-500 dark:text-green-400';
        } else if (outputType === 'api') {
          return 'text-purple-500 dark:text-purple-400';
        } else if (outputType === 'document') {
          return 'text-blue-500 dark:text-blue-400';
        } else if (outputType === 'ppt') {
          return 'text-red-500 dark:text-red-400';
        } else if (outputType === 'task') {
          return 'text-amber-500 dark:text-amber-400';
        } else if (outputType === 'chat') {
          return 'text-indigo-500 dark:text-indigo-400';
        } else if (outputType === 'email') {
          return 'text-cyan-500 dark:text-cyan-400';
        }
        return 'text-gray-500 dark:text-gray-400';
      default:
        return 'text-blue-500 dark:text-blue-400';
    }
  };

  // Get handle color based on node type
  const getHandleColor = () => {
    switch(nodeType) {
      case 'input':
        return 'bg-blue-500 dark:bg-blue-400';
      case 'process':
        return 'bg-purple-500 dark:bg-purple-400';
      case 'output':
        if (outputType === 'json') {
          return 'bg-green-500 dark:bg-green-400';
        } else if (outputType === 'api') {
          return 'bg-purple-500 dark:bg-purple-400';
        } else if (outputType === 'document') {
          return 'bg-blue-500 dark:bg-blue-400';
        } else if (outputType === 'ppt') {
          return 'bg-red-500 dark:bg-red-400';
        } else if (outputType === 'task') {
          return 'bg-amber-500 dark:bg-amber-400';
        } else if (outputType === 'chat') {
          return 'bg-indigo-500 dark:bg-indigo-400';
        } else if (outputType === 'email') {
          return 'bg-cyan-500 dark:bg-cyan-400';
        }
        return 'bg-gray-500 dark:bg-gray-400';
      default:
        return 'bg-blue-500 dark:bg-blue-400';
    }
  };

  // Render appropriate output format based on node type and output type
  const renderOutputFormat = () => {
    if (nodeType !== 'output') return null;
    
    switch (outputType) {
      case 'document':
        return (
          <div className="mt-2 text-xs">
            <p className="font-semibold mb-1 dark:text-gray-200">{t('documentOutput')}</p>
            <div className="bg-gray-50 dark:bg-[#252b33] p-1 rounded text-xs flex items-center border border-gray-100 dark:border-[#353b43]">
              <FileText className="h-3 w-3 mr-1 text-blue-500" />
              <span className="dark:text-gray-300">{t('formattedDocument')}</span>
            </div>
          </div>
        );
      case 'ppt':
        return (
          <div className="mt-2 text-xs">
            <p className="font-semibold mb-1 dark:text-gray-200">{t('presentationOutput')}</p>
            <div className="bg-gray-50 dark:bg-[#2b2529] p-1 rounded text-xs flex items-center border border-gray-100 dark:border-[#3b3539]">
              <PresentationIcon className="h-3 w-3 mr-1 text-red-500" />
              <span className="dark:text-gray-300">{t('powerPointSlides')}</span>
            </div>
          </div>
        );
      case 'email':
        return (
          <div className="mt-2 text-xs">
            <p className="font-semibold mb-1 dark:text-gray-200">{t('emailOutput') || 'Email Output'}</p>
            <div className="bg-gray-50 dark:bg-[#2a2526] p-1 rounded text-xs flex items-center border border-gray-100 dark:border-[#3a3536]">
              <Mail className="h-3 w-3 mr-1 text-cyan-500" />
              <span className="dark:text-gray-300">{t('sendEmail') || 'Send Email'}</span>
            </div>
            
            {/* Email Recipients */}
            <div className="mt-2">
              <div className="font-semibold mb-1 flex justify-between items-center dark:text-gray-200">
                {t('emailSettings') || 'Email Settings'}
                {!isEditing ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#3a3536]"
                    onClick={() => setIsEditing(true)}
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                ) : (
                  <div className="flex items-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4 mr-1 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#3a3536]"
                      onClick={saveEmailSettings}
                    >
                      <Check className="h-3 w-3 text-green-500" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon" 
                      className="h-4 w-4 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#3a3536]"
                      onClick={cancelEditing}
                    >
                      <X className="h-3 w-3 text-red-500" />
                    </Button>
                  </div>
                )}
              </div>
              
              {!isEditing ? (
                <div className="bg-gray-50 dark:bg-[#2a2526] p-2 rounded text-xs space-y-1 border border-gray-100 dark:border-[#3a3536]">
                  <div className="flex items-center">
                    <span className="font-semibold mr-1 dark:text-gray-300">{t('recipients') || 'Recipients'}:</span>
                    <span className="truncate dark:text-gray-400">{emailRecipients || 'No recipients specified'}</span>
                  </div>
                  <div className="flex items-center">
                    <span className="font-semibold mr-1 dark:text-gray-300">{t('subject') || 'Subject'}:</span>
                    <span className="dark:text-gray-400">{emailSubject || 'Automated email from workflow system'}</span>
                  </div>
                  <div>
                    <span className="font-semibold dark:text-gray-300">{t('smtp') || 'SMTP'}: </span>
                    <span className="dark:text-gray-400">{useCustomSmtp ? t('custom') || 'Custom' : t('default') || 'Default (Environment)'}</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div>
                    <p className="text-xs mb-1 dark:text-gray-300">{t('recipients') || 'Recipients'} <span className="text-gray-400">(comma separated)</span>:</p>
                    <Input 
                      value={emailRecipients}
                      onChange={(e) => setEmailRecipients(e.target.value)}
                      className="h-6 text-xs p-1 dark:bg-[#2a2526] dark:border-[#3a3536] dark:text-gray-200"
                      placeholder="user@example.com, another@example.com"
                    />
                  </div>
                  <div>
                    <p className="text-xs mb-1 dark:text-gray-300">{t('subject') || 'Subject'}:</p>
                    <Input 
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      className="h-6 text-xs p-1 dark:bg-[#2a2526] dark:border-[#3a3536] dark:text-gray-200"
                      placeholder="Email subject"
                    />
                  </div>
                  <div>
                    <p className="text-xs mb-1 dark:text-gray-300">{t('emailTemplate') || 'Email Template'}:</p>
                    <Textarea
                      value={emailTemplate}
                      onChange={(e) => setEmailTemplate(e.target.value)}
                      className="text-xs p-1 font-mono h-20 dark:bg-[#2a2526] dark:border-[#3a3536] dark:text-gray-200"
                      placeholder="Use {{content}} as a placeholder for the workflow output content"
                    />
                    <p className="text-xs mt-1 text-gray-500 dark:text-gray-400">
                      {t('templateHint') || 'Use {{content}} as a placeholder for content'}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="use-custom-smtp"
                      checked={useCustomSmtp}
                      onCheckedChange={setUseCustomSmtp}
                      className="h-3 w-3 text-cyan-500 dark:text-cyan-400"
                    />
                    <label 
                      htmlFor="use-custom-smtp"
                      className="text-xs cursor-pointer dark:text-gray-300"
                    >
                      {t('useCustomSmtp') || 'Use custom SMTP settings'}
                    </label>
                  </div>
                  
                  {useCustomSmtp && (
                    <div className="space-y-2 pl-5 border-l-2 border-cyan-200 dark:border-cyan-800">
                      <div>
                        <p className="text-xs mb-1 dark:text-gray-300">{t('smtpHost') || 'SMTP Host'}:</p>
                        <Input 
                          value={smtpHost}
                          onChange={(e) => setSmtpHost(e.target.value)}
                          className="h-6 text-xs p-1 dark:bg-[#2a2526] dark:border-[#3a3536] dark:text-gray-200"
                          placeholder="smtp.example.com"
                        />
                      </div>
                      <div>
                        <p className="text-xs mb-1 dark:text-gray-300">{t('smtpPort') || 'SMTP Port'}:</p>
                        <Input 
                          value={smtpPort}
                          onChange={(e) => setSmtpPort(e.target.value)}
                          className="h-6 text-xs p-1 dark:bg-[#2a2526] dark:border-[#3a3536] dark:text-gray-200"
                          placeholder="587"
                        />
                      </div>
                      <div>
                        <p className="text-xs mb-1 dark:text-gray-300">{t('smtpUser') || 'SMTP User'}:</p>
                        <Input 
                          value={smtpUser}
                          onChange={(e) => setSmtpUser(e.target.value)}
                          className="h-6 text-xs p-1 dark:bg-[#2a2526] dark:border-[#3a3536] dark:text-gray-200"
                          placeholder="user@example.com"
                        />
                      </div>
                      <div>
                        <p className="text-xs mb-1 dark:text-gray-300">{t('smtpPassword') || 'SMTP Password'}:</p>
                        <Input 
                          type="password"
                          value={smtpPassword}
                          onChange={(e) => setSmtpPassword(e.target.value)}
                          className="h-6 text-xs p-1 dark:bg-[#2a2526] dark:border-[#3a3536] dark:text-gray-200"
                          placeholder="••••••••"
                        />
                      </div>
                      <div>
                        <p className="text-xs mb-1 dark:text-gray-300">{t('smtpFrom') || 'From Email'}:</p>
                        <Input 
                          value={smtpFrom}
                          onChange={(e) => setSmtpFrom(e.target.value)}
                          className="h-6 text-xs p-1 dark:bg-[#2a2526] dark:border-[#3a3536] dark:text-gray-200"
                          placeholder="noreply@example.com"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      case 'task':
        return (
          <div className="mt-2 text-xs">
            <p className="font-semibold mb-1 dark:text-gray-200">{t('taskOutput') || 'Task Creation'}</p>
            <div className="bg-gray-50 dark:bg-[#252a25] p-1 rounded text-xs flex items-center border border-gray-100 dark:border-[#353a35]">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="12" 
                height="12" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                className="h-3 w-3 mr-1 text-amber-500"
              >
                <path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z" />
                <path d="m9 12 2 2 4-4" />
              </svg>
              <span className="dark:text-gray-300">{t('taskCreation') || 'Create Project Tasks'}</span>
            </div>
            
            {/* Project Selection */}
            <div className="mt-2">
              <p className="text-xs mb-1 dark:text-gray-300">{t('selectProject') || 'Select Project'}:</p>
              <Select 
                value={selectedProjectId} 
                onValueChange={handleProjectChange}
                disabled={isLoadingProjects}
              >
                <SelectTrigger className="h-6 text-xs dark:bg-[#253025] dark:border-[#354035] dark:text-gray-200">
                  <SelectValue placeholder={isLoadingProjects ? 'Loading...' : (t('selectProject') || 'Select Project')} />
                </SelectTrigger>
                <SelectContent className="dark:bg-[#303a30] dark:border-[#404a40] dark:text-gray-200">
                  {isLoadingProjects ? (
                    <div className="flex items-center justify-center py-2">
                      <Loader2 className="h-3 w-3 animate-spin mr-1 text-gray-400" />
                      <span className="text-xs">{t('loading') || 'Loading...'}</span>
                    </div>
                  ) : projects.length > 0 ? (
                    projects.map(project => (
                      <SelectItem 
                        key={project.id} 
                        value={project.id} 
                        className="dark:text-gray-300 dark:focus:bg-[#404a40] dark:data-[highlighted]:bg-[#404a40]"
                      >
                        {project.project_name}
                      </SelectItem>
                    ))
                  ) : (
                    <div className="text-xs text-gray-500 dark:text-gray-400 p-2">
                      {t('noProjects') || 'No projects found'}
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>
            
            {/* Team Selection */}
            {selectedProjectId && (
              <div className="mt-2">
                <p className="text-xs mb-1 dark:text-gray-300">{t('selectTeam') || 'Select Team'}:</p>
                <Select 
                  value={selectedTeamId} 
                  onValueChange={handleTeamChange}
                  disabled={isLoadingTeams}
                >
                  <SelectTrigger className="h-6 text-xs dark:bg-[#253025] dark:border-[#354035] dark:text-gray-200">
                    <SelectValue placeholder={isLoadingTeams ? 'Loading...' : (t('selectTeam') || 'Select Team')} />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-[#303a30] dark:border-[#404a40] dark:text-gray-200">
                    {isLoadingTeams ? (
                      <div className="flex items-center justify-center py-2">
                        <Loader2 className="h-3 w-3 animate-spin mr-1 text-gray-400" />
                        <span className="text-xs">{t('loading') || 'Loading...'}</span>
                      </div>
                    ) : teams.length > 0 ? (
                      teams.map(team => (
                        <SelectItem 
                          key={team.id} 
                          value={team.id} 
                          className="dark:text-gray-300 dark:focus:bg-[#404a40] dark:data-[highlighted]:bg-[#404a40]"
                        >
                          {team.name}
                        </SelectItem>
                      ))
                    ) : (
                      <div className="text-xs text-gray-500 dark:text-gray-400 p-2">
                        {t('noTeams') || 'No teams found'}
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        );
      case 'api':
        return (
          <div className="mt-2 text-xs">
            <div className="font-semibold mb-1 flex justify-between items-center dark:text-gray-200">
              {t('apiRequest')}
              {!isEditing ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#353545]"
                  onClick={() => setIsEditing(true)}
                >
                  <Edit className="h-3 w-3" />
                </Button>
              ) : (
                <div className="flex items-center">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 mr-1 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#353545]"
                    onClick={saveApiSettings}
                  >
                    <Check className="h-3 w-3 text-green-500" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon" 
                    className="h-4 w-4 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#353545]"
                    onClick={cancelEditing}
                  >
                    <X className="h-3 w-3 text-red-500" />
                  </Button>
                </div>
              )}
            </div>
            {!isEditing ? (
              <div className="bg-gray-50 dark:bg-[#252329] p-2 rounded text-xs space-y-1 border border-gray-100 dark:border-[#353339]">
                <div className="flex items-center">
                  <span className="font-semibold mr-1 dark:text-gray-300">{t('url')}:</span>
                  <span className="truncate dark:text-gray-400">{apiUrl || 'https://api.example.com/data'}</span>
                </div>
                <div className="flex items-center">
                  <span className="font-semibold mr-1 dark:text-gray-300">{t('method')}:</span>
                  <span className="dark:text-gray-400">{apiMethod || 'GET'}</span>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div>
                  <p className="text-xs mb-1 dark:text-gray-300">{t('apiUrl')}:</p>
                  <Input 
                    value={tempApiUrl}
                    onChange={(e) => setTempApiUrl(e.target.value)}
                    className="h-6 text-xs p-1 dark:bg-[#2f232f] dark:border-[#3f333f] dark:text-gray-200"
                  />
                </div>
                <div>
                  <p className="text-xs mb-1 dark:text-gray-300">{t('method')}:</p>
                  <Select 
                    value={tempApiMethod} 
                    onValueChange={setTempApiMethod}
                  >
                    <SelectTrigger className="h-6 text-xs dark:bg-[#2f232f] dark:border-[#3f333f] dark:text-gray-200">
                      <SelectValue placeholder={t('method')} />
                    </SelectTrigger>
                    <SelectContent className="dark:bg-[#3f2f3f] dark:border-[#4f3f4f] dark:text-gray-200">
                      <SelectItem value="GET" className="dark:text-gray-300 dark:focus:bg-[#4f3f4f] dark:data-[highlighted]:bg-[#4f3f4f]">GET</SelectItem>
                      <SelectItem value="POST" className="dark:text-gray-300 dark:focus:bg-[#4f3f4f] dark:data-[highlighted]:bg-[#4f3f4f]">POST</SelectItem>
                      <SelectItem value="PUT" className="dark:text-gray-300 dark:focus:bg-[#4f3f4f] dark:data-[highlighted]:bg-[#4f3f4f]">PUT</SelectItem>
                      <SelectItem value="DELETE" className="dark:text-gray-300 dark:focus:bg-[#4f3f4f] dark:data-[highlighted]:bg-[#4f3f4f]">DELETE</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
        );
      case 'chat':
        return (
          <div className="mt-2 text-xs">
            <p className="font-semibold mb-1 dark:text-gray-200">{t('chatOutput') || 'Chat Message'}</p>
            <div className="bg-gray-50 dark:bg-[#25293d] p-1 rounded text-xs flex items-center border border-gray-100 dark:border-[#35394d]">
              <MessageSquare className="h-3 w-3 mr-1 text-indigo-500" />
              <span className="dark:text-gray-300">{t('chatMessageSending') || 'Send Chat Messages'}</span>
            </div>
            
            {/* Chat Sessions Selection */}
            <div className="mt-2">
              <p className="text-xs mb-1 dark:text-gray-300">{t('selectChatSessions') || 'Select Chat Sessions'}:</p>
              <div className="bg-gray-50 dark:bg-[#25293d] p-2 rounded text-xs border border-gray-100 dark:border-[#35394d] max-h-32 overflow-y-auto">
                {isLoadingChatSessions ? (
                  <div className="flex items-center justify-center py-2">
                    <Loader2 className="h-3 w-3 animate-spin mr-1 text-gray-400" />
                    <span className="text-xs">{t('loading') || 'Loading...'}</span>
                  </div>
                ) : chatSessions.length > 0 ? (
                  <div className="space-y-1">
                    {chatSessions.map(session => (
                      <div key={session.id} className="flex items-center space-x-2">
                        <Checkbox 
                          id={`chat-session-${session.id}`}
                          checked={selectedChatSessions.includes(session.id)}
                          onCheckedChange={() => toggleChatSession(session.id)}
                          className="h-3 w-3 text-indigo-500 dark:text-indigo-400"
                        />
                        <label 
                          htmlFor={`chat-session-${session.id}`}
                          className="text-xs cursor-pointer dark:text-gray-300"
                        >
                          {session.name || `Chat #${typeof session.id === 'string' ? session.id.substring(0, 6) : session.id}`}
                        </label>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-gray-500 dark:text-gray-400 p-1">
                    {t('noChatSessions') || 'No chat sessions found'}
                  </div>
                )}
              </div>
            </div>
            
            {/* Message Format Selection */}
            <div className="mt-2">
              <p className="text-xs mb-1 dark:text-gray-300">{t('messageFormat') || 'Message Format'}:</p>
              <Select 
                value={messageFormat} 
                onValueChange={handleMessageFormatChange}
              >
                <SelectTrigger className="h-6 text-xs dark:bg-[#25293d] dark:border-[#35394d] dark:text-gray-200">
                  <SelectValue placeholder={t('selectFormat') || 'Select Format'} />
                </SelectTrigger>
                <SelectContent className="dark:bg-[#30354d] dark:border-[#40455d] dark:text-gray-200">
                  <SelectItem value="text" className="dark:text-gray-300 dark:focus:bg-[#40455d] dark:data-[highlighted]:bg-[#40455d]">
                    {t('textFormat') || 'Plain Text'}
                  </SelectItem>
                  <SelectItem value="markdown" className="dark:text-gray-300 dark:focus:bg-[#40455d] dark:data-[highlighted]:bg-[#40455d]">
                    {t('markdownFormat') || 'Markdown'}
                  </SelectItem>
                  <SelectItem value="html" className="dark:text-gray-300 dark:focus:bg-[#40455d] dark:data-[highlighted]:bg-[#40455d]">
                    {t('htmlFormat') || 'HTML'}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Message Template */}
            <div className="mt-2">
              <div className="font-semibold mb-1 flex justify-between items-center dark:text-gray-200">
                {t('messageTemplate') || 'Message Template'}
                {!isEditing ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#35394d]"
                    onClick={() => setIsEditing(true)}
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                ) : (
                  <div className="flex items-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4 mr-1 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#35394d]"
                      onClick={saveMessageTemplate}
                    >
                      <Check className="h-3 w-3 text-green-500" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon" 
                      className="h-4 w-4 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#35394d]"
                      onClick={cancelEditing}
                    >
                      <X className="h-3 w-3 text-red-500" />
                    </Button>
                  </div>
                )}
              </div>
              {!isEditing ? (
                <div className="bg-gray-50 dark:bg-[#25293d] p-1 rounded text-xs overflow-auto max-h-20 border border-gray-100 dark:border-[#35394d]">
                  <pre className="dark:text-gray-300">{messageTemplate || 'Hello, this is an automated message from the workflow system:\n\n{{content}}'}</pre>
                </div>
              ) : (
                <Textarea
                  value={messageTemplate}
                  onChange={(e) => setMessageTemplate(e.target.value)}
                  className="text-xs p-1 font-mono h-20 dark:bg-[#25293d] dark:border-[#35394d] dark:text-gray-200"
                  placeholder="Use {{content}} as a placeholder for the workflow output content"
                />
              )}
              <p className="text-xs mt-1 text-gray-500 dark:text-gray-400">
                {t('templateHint')}
              </p>
            </div>
          </div>
        );
      default:
        return (
          <div className="mt-2 text-xs">
            <div className="font-semibold mb-1 flex justify-between items-center dark:text-gray-200">
              {t('jsonFormat')}
              {!isEditing ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#253525]"
                  onClick={() => setIsEditing(true)}
                >
                  <Edit className="h-3 w-3" />
                </Button>
              ) : (
                <div className="flex items-center">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 mr-1 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#253525]"
                    onClick={saveJsonFormat}
                  >
                    <Check className="h-3 w-3 text-green-500" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon" 
                    className="h-4 w-4 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#253525]"
                    onClick={cancelEditing}
                  >
                    <X className="h-3 w-3 text-red-500" />
                  </Button>
                </div>
              )}
            </div>
            {!isEditing ? (
              <div className="bg-gray-50 dark:bg-[#1f2920] p-1 rounded text-xs overflow-auto max-h-20 border border-gray-100 dark:border-[#2f3930]">
                <pre className="dark:text-gray-300">{jsonFormat || '{\n  "title": "Example",\n  "content": "Content here"\n}'}</pre>
              </div>
            ) : (
              <Textarea
                value={tempJsonFormat}
                onChange={(e) => setTempJsonFormat(e.target.value)}
                className="text-xs p-1 font-mono h-20 dark:bg-[#1f2920] dark:border-[#2f3930] dark:text-gray-200"
              />
            )}
          </div>
        );
    }
  };

  return (
    <Card className={`min-w-60 shadow-sm border ${getNodeColor()} ${selected ? 'ring-2 ring-blue-400 dark:ring-blue-500' : ''}`}>
      <Handle
        type="source"
        position={Position.Bottom}
        className={`w-3 h-3 ${getHandleColor()}`}
        style={{ borderRadius: '50%', border: '2px solid #fff', bottom: '-8px' }}
      />
      
      <Handle
        type="target"
        position={Position.Top}
        className={`w-3 h-3 ${getHandleColor()}`}
        style={{ borderRadius: '50%', border: '2px solid #fff', top: '-8px' }}
      />
      
      <CardHeader className="p-3 pb-0">
        <CardTitle className="text-sm font-medium flex items-center dark:text-gray-100">
          <div className={`mr-2 ${getIconColor()}`}>{icon}</div>
          {label}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-3 pt-1">
        <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
        
        {nodeType === 'input' && (
          <div className="mt-2 text-xs">
            <p className="font-semibold mb-1 dark:text-gray-200">{t('inputVariables')}</p>
            <ul className="list-disc list-inside dark:text-gray-300">
              {Object.keys(data.inputs || {}).map(key => (
                <li key={key}>{key}</li>
              ))}
            </ul>
          </div>
        )}
        
        {nodeType === 'process' && (
          <div className="mt-2 text-xs">
            <p className="font-semibold mb-1 dark:text-gray-200">{t('aiModel')}</p>
            <ModelSelector 
              selectedModel={selectedModel || "google/gemini-2.0-flash-exp:free"} 
              onModelChange={handleModelChange}
              userId={data.userId}
            />
            <div className="bg-gray-50 dark:bg-[#272733] p-1 rounded text-xs mt-2 border border-gray-100 dark:border-[#373743]">
              {selectedModel?.includes('deepseek') ? (
                <div className="flex flex-col">
                  <span className="font-semibold dark:text-gray-300">DeepSeek Coder</span>
                  <span className="text-gray-500 dark:text-gray-400">Code generation</span>
                </div>
              ) : selectedModel?.includes('gemini') ? (
                <div className="flex flex-col">
                  <span className="font-semibold dark:text-gray-300">Google Gemini</span>
                  <span className="text-gray-500 dark:text-gray-400">General purpose AI</span>
                </div>
              ) : selectedModel?.includes('mistral') ? (
                <div className="flex flex-col">
                  <span className="font-semibold dark:text-gray-300">Mistral AI</span>
                  <span className="text-gray-500 dark:text-gray-400">High-quality outputs</span>
                </div>
              ) : selectedModel?.includes('codellama') ? (
                <div className="flex flex-col">
                  <span className="font-semibold dark:text-gray-300">Code Llama</span>
                  <span className="text-gray-500 dark:text-gray-400">Code generation</span>
                </div>
              ) : (
                <div className="flex flex-col">
                  <span className="font-semibold dark:text-gray-300">{selectedModel || "AI Model"}</span>
                  <span className="text-gray-500 dark:text-gray-400">General purpose AI</span>
                </div>
              )}
            </div>
          </div>
        )}
        
        {renderOutputFormat()}
      </CardContent>
    </Card>
  );
}

export default memo(WorkflowNode); 