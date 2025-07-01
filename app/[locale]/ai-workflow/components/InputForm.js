import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { HelpCircle, Loader2 } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const InputForm = ({ fields, onSubmit, isLoading }) => {
  const t = useTranslations('AI_Workflow');
  const [values, setValues] = useState({});
  const [errors, setErrors] = useState({});
  
  const handleInputChange = (field, value) => {
    setValues(prev => ({ ...prev, [field.name]: value }));
    
    // Clear error when user types
    if (errors[field.name]) {
      setErrors(prev => ({ ...prev, [field.name]: null }));
    }
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate required fields
    const newErrors = {};
    fields.forEach(field => {
      if (field.required && (!values[field.name] || values[field.name].toString().trim() === '')) {
        newErrors[field.name] = t('requiredField') || 'This field is required';
      }
    });
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    onSubmit(values);
  };
  
  return (
    <form onSubmit={handleSubmit}>
      {fields.map((field, index) => {
        if (field.type === 'textarea') {
          return (
            <div key={index} className="mb-4">
              <div className="flex items-center">
                <Label 
                  htmlFor={`field-${field.name}`}
                  className={`dark:text-gray-200 ${field.required ? 'after:content-["*"] after:text-red-500 after:ml-1' : ''}`}
                >
                  {field.label}
                </Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button type="button" variant="ghost" className="p-0 h-6 w-6 ml-1">
                        <HelpCircle className="h-3 w-3 text-gray-400" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-[300px] p-3">
                      <p className="text-xs">
                        {field.description || t('inputFieldHelp', { field: field.label }) || `Enter a value for ${field.label}. This will be used in the workflow to generate content.`}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="relative">
                <Textarea
                  id={`field-${field.name}`}
                  value={values[field.name] || ''}
                  onChange={(e) => handleInputChange(field, e.target.value)}
                  placeholder={field.placeholder || ''}
                  className={`w-full mt-1 dark:bg-[#333333] dark:border-[#444444] dark:text-gray-200 dark:placeholder-gray-500 ${
                    errors[field.name] ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
                  }`}
                  rows={4}
                />
                {errors[field.name] && (
                  <p className="text-red-500 text-xs mt-1">{errors[field.name]}</p>
                )}
              </div>
            </div>
          );
        } else if (field.type === 'number') {
          return (
            <div key={index} className="mb-4">
              <div className="flex items-center">
                <Label 
                  htmlFor={`field-${field.name}`}
                  className={`dark:text-gray-200 ${field.required ? 'after:content-["*"] after:text-red-500 after:ml-1' : ''}`}
                >
                  {field.label}
                </Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button type="button" variant="ghost" className="p-0 h-6 w-6 ml-1">
                        <HelpCircle className="h-3 w-3 text-gray-400" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-[300px] p-3">
                      <p className="text-xs">
                        {field.description || t('inputFieldHelp', { field: field.label }) || `Enter a value for ${field.label}. This will be used in the workflow to generate content.`}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Input
                id={`field-${field.name}`}
                type="number"
                value={values[field.name] || ''}
                onChange={(e) => handleInputChange(field, e.target.value)}
                placeholder={field.placeholder || ''}
                className={`w-full mt-1 dark:bg-[#333333] dark:border-[#444444] dark:text-gray-200 dark:placeholder-gray-500 ${
                  errors[field.name] ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
                }`}
              />
              {errors[field.name] && (
                <p className="text-red-500 text-xs mt-1">{errors[field.name]}</p>
              )}
            </div>
          );
        } else {
          return (
            <div key={index} className="mb-4">
              <div className="flex items-center">
                <Label 
                  htmlFor={`field-${field.name}`}
                  className={`dark:text-gray-200 ${field.required ? 'after:content-["*"] after:text-red-500 after:ml-1' : ''}`}
                >
                  {field.label}
                </Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button type="button" variant="ghost" className="p-0 h-6 w-6 ml-1">
                        <HelpCircle className="h-3 w-3 text-gray-400" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-[300px] p-3">
                      <p className="text-xs">
                        {field.description || t('inputFieldHelp', { field: field.label }) || `Enter a value for ${field.label}. This will be used in the workflow to generate content.`}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="relative">
                <Input
                  id={`field-${field.name}`}
                  type="text"
                  value={values[field.name] || ''}
                  onChange={(e) => handleInputChange(field, e.target.value)}
                  placeholder={field.placeholder || ''}
                  className={`w-full mt-1 dark:bg-[#333333] dark:border-[#444444] dark:text-gray-200 dark:placeholder-gray-500 ${
                    errors[field.name] ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
                  }`}
                />
                {errors[field.name] && (
                  <p className="text-red-500 text-xs mt-1">{errors[field.name]}</p>
                )}
              </div>
            </div>
          );
        }
      })}
      
      <div className="mt-4">
        <Button 
          type="submit" 
          disabled={isLoading}
          className="w-full bg-[#39ac91] hover:bg-[#33a085] text-white dark:bg-[#39ac91] dark:hover:bg-[#33a085] dark:text-white"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
              {t('executing')}
            </>
          ) : (
            t('executeWorkflow') || 'Execute Workflow'
          )}
        </Button>
      </div>
    </form>
  );
};

export default InputForm; 