import React, { memo, useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, PresentationIcon, Code, Edit, Check, X } from 'lucide-react';
import ModelSelector from './ModelSelector';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';

function WorkflowNode({ data, selected, id }) {
  const t = useTranslations('AI_Workflow');
  const { label, icon, nodeType, outputType, description, selectedModel, jsonFormat, apiUrl, apiMethod } = data;
  const [isEditing, setIsEditing] = useState(false);
  const [tempJsonFormat, setTempJsonFormat] = useState(jsonFormat || '{\n  "title": "Example",\n  "content": "Content here"\n}');
  const [tempApiUrl, setTempApiUrl] = useState(apiUrl || 'https://api.example.com/data');
  const [tempApiMethod, setTempApiMethod] = useState(apiMethod || 'GET');

  // Handle model change
  const handleModelChange = (modelId) => {
    if (data.handleInputChange) {
      data.handleInputChange(id, 'selectedModel', modelId);
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

  // Cancel editing
  const cancelEditing = () => {
    setTempJsonFormat(jsonFormat || '{\n  "title": "Example",\n  "content": "Content here"\n}');
    setTempApiUrl(apiUrl || 'https://api.example.com/data');
    setTempApiMethod(apiMethod || 'GET');
    setIsEditing(false);
  };

  // Render appropriate output format based on node type and output type
  const renderOutputFormat = () => {
    if (nodeType !== 'output') return null;
    
    switch (outputType) {
      case 'document':
        return (
          <div className="mt-2 text-xs">
            <p className="font-semibold mb-1">{t('documentOutput')}</p>
            <div className="bg-gray-50 dark:bg-gray-800 p-1 rounded text-xs flex items-center">
              <FileText className="h-3 w-3 mr-1 text-blue-500" />
              {t('formattedDocument')}
            </div>
          </div>
        );
      case 'ppt':
        return (
          <div className="mt-2 text-xs">
            <p className="font-semibold mb-1">{t('presentationOutput')}</p>
            <div className="bg-gray-50 dark:bg-gray-800 p-1 rounded text-xs flex items-center">
              <PresentationIcon className="h-3 w-3 mr-1 text-blue-500" />
              {t('powerPointSlides')}
            </div>
          </div>
        );
      case 'api':
        return (
          <div className="mt-2 text-xs">
            <p className="font-semibold mb-1 flex justify-between items-center">
              {t('apiRequest')}
              {!isEditing ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4"
                  onClick={() => setIsEditing(true)}
                >
                  <Edit className="h-3 w-3" />
                </Button>
              ) : (
                <div className="flex items-center">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 mr-1"
                    onClick={saveApiSettings}
                  >
                    <Check className="h-3 w-3 text-green-500" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon" 
                    className="h-4 w-4"
                    onClick={cancelEditing}
                  >
                    <X className="h-3 w-3 text-red-500" />
                  </Button>
                </div>
              )}
            </p>
            {!isEditing ? (
              <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded text-xs space-y-1">
                <div className="flex items-center">
                  <span className="font-semibold mr-1">{t('url')}:</span>
                  <span className="truncate">{apiUrl || 'https://api.example.com/data'}</span>
                </div>
                <div className="flex items-center">
                  <span className="font-semibold mr-1">{t('method')}:</span>
                  <span>{apiMethod || 'GET'}</span>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div>
                  <p className="text-xs mb-1">{t('apiUrl')}:</p>
                  <Input 
                    value={tempApiUrl}
                    onChange={(e) => setTempApiUrl(e.target.value)}
                    className="h-6 text-xs p-1 dark:bg-gray-700 dark:text-gray-200"
                  />
                </div>
                <div>
                  <p className="text-xs mb-1">{t('method')}:</p>
                  <Select 
                    value={tempApiMethod} 
                    onValueChange={setTempApiMethod}
                  >
                    <SelectTrigger className="h-6 text-xs dark:bg-gray-700 dark:text-gray-200">
                      <SelectValue placeholder={t('method')} />
                    </SelectTrigger>
                    <SelectContent className="dark:bg-gray-800 dark:text-gray-200">
                      <SelectItem value="GET">GET</SelectItem>
                      <SelectItem value="POST">POST</SelectItem>
                      <SelectItem value="PUT">PUT</SelectItem>
                      <SelectItem value="DELETE">DELETE</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
        );
      default:
        return (
          <div className="mt-2 text-xs">
            <p className="font-semibold mb-1 flex justify-between items-center">
              {t('jsonFormat')}
              {!isEditing ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4"
                  onClick={() => setIsEditing(true)}
                >
                  <Edit className="h-3 w-3" />
                </Button>
              ) : (
                <div className="flex items-center">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 mr-1"
                    onClick={saveJsonFormat}
                  >
                    <Check className="h-3 w-3 text-green-500" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon" 
                    className="h-4 w-4"
                    onClick={cancelEditing}
                  >
                    <X className="h-3 w-3 text-red-500" />
                  </Button>
                </div>
              )}
            </p>
            {!isEditing ? (
              <div className="bg-gray-50 dark:bg-gray-800 p-1 rounded text-xs overflow-auto max-h-20">
                <pre className="dark:text-gray-300">{jsonFormat || '{\n  "title": "Example",\n  "content": "Content here"\n}'}</pre>
              </div>
            ) : (
              <Textarea
                value={tempJsonFormat}
                onChange={(e) => setTempJsonFormat(e.target.value)}
                className="text-xs p-1 font-mono h-20 dark:bg-gray-700 dark:text-gray-200"
              />
            )}
          </div>
        );
    }
  };

  return (
    <Card className={`min-w-60 ${selected ? 'border-blue-500 shadow-md' : ''} dark:bg-gray-900 dark:text-gray-200 dark:border-gray-700`}>
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-2 h-2 bg-blue-500"
      />
      
      <Handle
        type="target"
        position={Position.Top}
        className="w-2 h-2 bg-blue-500"
      />
      
      <CardHeader className="p-3 pb-0">
        <CardTitle className="text-sm font-medium flex items-center">
          <div className="mr-2 text-blue-600 dark:text-blue-400">{icon}</div>
          {label}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-3 pt-1">
        <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
        
        {nodeType === 'input' && (
          <div className="mt-2 text-xs">
            <p className="font-semibold mb-1">{t('inputVariables')}</p>
            <ul className="list-disc list-inside">
              {Object.keys(data.inputs || {}).map(key => (
                <li key={key}>{key}</li>
              ))}
            </ul>
          </div>
        )}
        
        {nodeType === 'process' && (
          <div className="mt-2 text-xs">
            <p className="font-semibold mb-1">{t('aiModel')}</p>
            <ModelSelector 
              selectedModel={selectedModel || "google/gemini-2.0-flash-exp:free"} 
              onModelChange={handleModelChange}
              userId={data.userId}
            />
            <div className="bg-gray-50 dark:bg-gray-800 p-1 rounded text-xs mt-2">
              {selectedModel?.includes('deepseek') ? (
                <div className="flex flex-col">
                  <span className="font-medium">DeepSeek R1</span>
                  <span className="dark:text-gray-300">{t('deepseekDescription')}</span>
                </div>
              ) : selectedModel?.includes('gemini') ? (
                <div className="flex flex-col">
                  <span className="font-medium">Gemini Flash 2.0</span>
                  <span className="dark:text-gray-300">{t('geminiDescription')}</span>
                </div>
              ) : (
                <span className="dark:text-gray-300">{t('usingAiGenerate')}</span>
              )}
            </div>
          </div>
        )}
        
        {nodeType === 'output' && outputType === 'api' && (
          <div className="mt-2 text-xs bg-blue-50 dark:bg-blue-900/30 p-1 rounded mb-2">
            <p className="font-semibold">{t('inputConnection')}</p>
            <p className="text-xs dark:text-gray-300">{t('connectJsonNode')}</p>
          </div>
        )}
        
        {nodeType === 'output' && renderOutputFormat()}
      </CardContent>
    </Card>
  );
}

export default memo(WorkflowNode); 