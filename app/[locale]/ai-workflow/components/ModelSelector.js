import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
const getAvailableModels = () => {
  return [
    { id: "google/gemini-2.0-flash-exp:free", name: "Gemini Flash 2.0", description: "Fast response time with quality on par with larger models. Enhanced multimodal understanding and function calling." },
    { id: "qwen/qwen2.5-vl-32b-instruct:free", name: "Qwen 2.5 VL", description: "Proficient in recognizing common objects and analyzing texts, charts, and layouts within images." },
    { id: "qwen/qwq-32b:free", name: "QwQ 32B", description: "Advanced reasoning model with enhanced performance in downstream tasks, especially for hard problems." },
    { id: "deepseek/deepseek-v3-base:free", name: "DeepSeek V3 Base", description: "671B parameter MoE model with strong performance across language, reasoning, math, and coding tasks." },
    { id: "deepseek/deepseek-chat-v3-0324:free", name: "DeepSeek Chat V3", description: "685B-parameter mixture-of-experts model with excellent performance on various tasks." },
    { id: "deepseek/deepseek-r1:free", name: "DeepSeek R1", description: "671B parameters with open reasoning tokens. Performance comparable to OpenAI o1." },
    { id: "microsoft/mai-ds-r1:free", name: "MAI-DS-R1", description: "Post-trained variant of DeepSeek-R1 with improved responsiveness on previously blocked topics." },
    { id: "thudm/glm-4-32b:free", name: "GLM-4-32B", description: "32B bilingual model optimized for code generation, function calling, and agent-style tasks." },
    { id: "agentica-org/deepcoder-14b-preview:free", name: "DeepCoder 14B", description: "14B parameter code generation model fine-tuned from DeepSeek-R1-Distill-Qwen-14B." },
    { id: "google/gemma-3-27b-it:free", name: "Gemma 3", description: "Supports multimodal input with improved math, reasoning, and structured outputs." },
    { id: "nvidia/llama-3.1-nemotron-ultra-253b-v1:free", name: "Llama 3.1 Nemotron Ultra", description: "Optimized for advanced reasoning, human-interactive chat, and tool-calling tasks." }
  ];
};
export default function ModelSelector({ selectedModel, onModelChange, userId }) {
  const t = useTranslations('AI_Workflow');
  const [models, setModels] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Fetch available models on component mount or when userId changes
  useEffect(() => {
    fetchModels();
  }, [userId]);
  
  // Fetch models from API
  const fetchModels = async () => {
    try {
      setIsLoading(true);
      
      if (userId) {
        const response = await fetch(`/api/ai/workflow-agent/models?userId=${userId}`);
        
        if (response.ok) {
          const data = await response.json();
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
      }
      
      // Fallback to default models if API fails or userId is not available
      const defaultModels = getAvailableModels();
      
      setModels(defaultModels);
      
      if (!selectedModel) {
        onModelChange("qwen/qwen2.5-vl-32b-instruct:free");
      }
    } catch (error) {
      console.error('Error fetching models:', error);
      // Fallback to default models if API fails
      setModels([
        { 
          id: "qwen/qwen2.5-vl-32b-instruct:free", 
          name: "Qwen 2.5 VL",
          description: "Proficient in recognizing common objects and analyzing texts, charts, and layouts within images." 
        },
        { 
          id: "deepseek/deepseek-r1:free", 
          name: "DeepSeek R1",
          description: "671B parameters with open reasoning tokens" 
        }
      ]);
      
      if (!selectedModel) {
        onModelChange("qwen/qwen2.5-vl-32b-instruct:free");
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
    return <Skeleton className="h-10 w-40 dark:bg-[#383838]" />;
  }
  
  return (
    <Select value={selectedModel} onValueChange={handleModelChange}>
      <SelectTrigger className="w-[220px] dark:bg-[#333333] dark:text-gray-200 dark:border-[#444444] focus:ring-offset-1 focus:ring-offset-[#444444] focus:ring-[#39ac91]">
        <SelectValue placeholder={t('selectModel')} />
      </SelectTrigger>
      <SelectContent className="dark:bg-[#333333] dark:text-gray-200 dark:border-[#444444]">
        {models.map((model) => (
          <SelectItem 
            key={model.id} 
            value={model.id} 
            className="dark:hover:bg-[#444444] dark:focus:bg-[#444444] dark:data-[highlighted]:bg-[#444444]"
          >
            <div className="flex items-start">
              <div className="flex flex-col">
                <span className="text-s font-medium dark:text-gray-200">{model.name}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[200px]">
                  {model.description}
                </span>
              </div>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
} 