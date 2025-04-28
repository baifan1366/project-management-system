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
    // Log userId changes for debugging
    console.log('ModelSelector: userId changed:', userId);
    fetchModels();
  }, [userId]);
  
  // Fetch models from API
  const fetchModels = async () => {
    try {
      setIsLoading(true);
      
      if (userId) {
        console.log('ModelSelector: Fetching models for userId:', userId);
        const response = await fetch(`/api/ai/workflow-agent/models?userId=${userId}`);
        
        if (response.ok) {
          const data = await response.json();
          console.log('ModelSelector: Models fetched successfully:', data);
          setModels(data);
          
          // Set default model if not already set
          if (!selectedModel && data.length > 0) {
            onModelChange(data[0].id);
          }
          setIsLoading(false);
          return;
        } else {
          console.error('ModelSelector: Failed to fetch models, status:', response.status);
        }
      } else {
        console.log('ModelSelector: Using default models (no userId)');
      }
      
      // Fallback to default models if API fails or userId is not available
      const defaultModels = [
        { 
          id: "google/gemini-2.0-flash-exp:free", 
          name: "Gemini Flash 2.0",
          description: "Fast response time with excellent quality"
        },
        { 
          id: "deepseek/deepseek-r1:free", 
          name: "DeepSeek R1",
          description: "671B parameters with open reasoning tokens" 
        }
      ];
      
      setModels(defaultModels);
      
      if (!selectedModel) {
        onModelChange("google/gemini-2.0-flash-exp:free");
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
          id: "deepseek/deepseek-r1:free", 
          name: "DeepSeek R1",
          description: "671B parameters with open reasoning tokens" 
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
    return <Skeleton className="h-10 w-40 dark:bg-gray-700" />;
  }
  
  return (
    <Select value={selectedModel} onValueChange={handleModelChange}>
      <SelectTrigger className="w-[220px] dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700">
        <SelectValue placeholder={t('selectModel')} />
      </SelectTrigger>
      <SelectContent className="dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700">
        {models.map((model) => (
          <SelectItem key={model.id} value={model.id} className="dark:hover:bg-gray-700">
            <div className="flex flex-col">
              <span className="text-s">{model.name}</span>
              <span className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[200px]">
                {model.description}
              </span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
} 