import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, PresentationIcon, Code } from 'lucide-react';

function WorkflowNode({ data, selected }) {
  const { label, icon, nodeType, outputType, description } = data;

  // Render appropriate output format based on node type and output type
  const renderOutputFormat = () => {
    if (nodeType !== 'output') return null;
    
    switch (outputType) {
      case 'document':
        return (
          <div className="mt-2 text-xs">
            <p className="font-semibold mb-1">Document Output</p>
            <div className="bg-gray-50 p-1 rounded text-xs flex items-center">
              <FileText className="h-3 w-3 mr-1 text-blue-500" />
              Formatted document
            </div>
          </div>
        );
      case 'ppt':
        return (
          <div className="mt-2 text-xs">
            <p className="font-semibold mb-1">Presentation Output</p>
            <div className="bg-gray-50 p-1 rounded text-xs flex items-center">
              <PresentationIcon className="h-3 w-3 mr-1 text-blue-500" />
              PowerPoint slides
            </div>
          </div>
        );
      case 'api':
        return (
          <div className="mt-2 text-xs">
            <p className="font-semibold mb-1">API Output</p>
            <div className="bg-gray-50 p-1 rounded text-xs flex items-center">
              <Code className="h-3 w-3 mr-1 text-blue-500" />
              JSON payload
            </div>
          </div>
        );
      default:
        return (
          <div className="mt-2 text-xs">
            <p className="font-semibold mb-1">Output Format</p>
            <div className="bg-gray-50 p-1 rounded text-xs">
              Structured JSON
            </div>
          </div>
        );
    }
  };

  return (
    <Card className={`min-w-60 ${selected ? 'border-blue-500 shadow-md' : ''}`}>
      {nodeType !== 'output' && (
        <Handle
          type="source"
          position={Position.Bottom}
          className="w-2 h-2 bg-blue-500"
        />
      )}
      
      {nodeType !== 'input' && (
        <Handle
          type="target"
          position={Position.Top}
          className="w-2 h-2 bg-blue-500"
        />
      )}
      
      <CardHeader className="p-3 pb-0">
        <CardTitle className="text-sm font-medium flex items-center">
          <div className="mr-2 text-blue-600">{icon}</div>
          {label}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-3 pt-1">
        <p className="text-xs text-gray-500">{description}</p>
        
        {nodeType === 'input' && (
          <div className="mt-2 text-xs">
            <p className="font-semibold mb-1">Input Variables</p>
            <ul className="list-disc list-inside">
              {Object.keys(data.inputs || {}).map(key => (
                <li key={key}>{key}</li>
              ))}
            </ul>
          </div>
        )}
        
        {nodeType === 'process' && (
          <div className="mt-2 text-xs">
            <p className="font-semibold mb-1">Processing</p>
            <div className="bg-gray-50 p-1 rounded text-xs">
              Using AI to generate content
            </div>
          </div>
        )}
        
        {nodeType === 'output' && renderOutputFormat()}
      </CardContent>
    </Card>
  );
}

export default memo(WorkflowNode); 