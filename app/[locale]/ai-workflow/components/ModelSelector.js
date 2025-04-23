import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

export default function ModelSelector({ selectedModel, onModelChange, userId }) {
  const t = useTranslations('AI_Workflow');
  const [models, setModels] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Fetch available models on component mount or when userId changes
  useEffect(() => {
    if (userId) {
      fetchModels();
    }
  }, [userId]);
  
  // Fetch models from API
  const fetchModels = async () => {
    if (!userId) return;
    
    try {
      setIsLoading(true);
      const response = await fetch(`/api/ai/workflow-agent/models?userId=${userId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch models');
      }
      
      const data = await response.json();
      setModels(data);
      
      // Set default model if not already set
      if (!selectedModel && data.length > 0) {
        onModelChange(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching models:', error);
      // Fallback to default models if API fails
      setModels([
        { 
          id: "google/gemini-2.0-flash-exp:free", 
          name: "Gemini Flash 2.0",
          description: "Fast response time with excellent quality"
        },
        { 
          id: "deepseek/deepseek-chat-v3-0324:free", 
          name: "DeepSeek Chat V3",
          description: "Advanced reasoning capabilities" 
        }
      ]);
      
      if (!selectedModel) {
        onModelChange("google/gemini-2.0-flash-exp:free");
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle model selection
  const handleModelChange = (modelId) => {
    onModelChange(modelId);
  };
  
  if (isLoading) {
    return <Skeleton className="h-10 w-40" />;
  }
  
  return (
    <Select value={selectedModel} onValueChange={handleModelChange}>
      <SelectTrigger className="w-[220px]">
        <SelectValue placeholder={t('selectModel')} />
      </SelectTrigger>
      <SelectContent>
        {models.map((model) => (
          <SelectItem key={model.id} value={model.id}>
            <div className="flex flex-col">
              <span className="font-medium">{model.name}</span>
              <span className="text-xs text-gray-500 truncate max-w-[200px]">
                {model.description}
              </span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
} 