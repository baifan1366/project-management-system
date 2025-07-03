import { useState, useEffect } from 'react';
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

// Maximum word count constants
const MAX_TEXT_WORDS = 20;
const MAX_TEXTAREA_WORDS = 30;
const MAX_NUMBER_VALUE = 999999;
const MIN_NUMBER_VALUE = 0; // Minimum allowed number value

const InputForm = ({ fields, onSubmit, isLoading }) => {
  const t = useTranslations('AI_Workflow');
  const [values, setValues] = useState({});
  const [errors, setErrors] = useState({});
  const [wordCounts, setWordCounts] = useState({});
  
  // Calculate word count for a text value
  const countWords = (text) => {
    if (!text) return 0;
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  };
  
  const handleInputChange = (field, value) => {
    setValues(prev => ({ ...prev, [field.name]: value }));
    
    // Calculate and set word count for text and textarea
    if (field.type === 'text' || field.type === 'textarea') {
      const count = countWords(value);
      setWordCounts(prev => ({ ...prev, [field.name]: count }));
      
      // Validate word count limits
      if ((field.type === 'text' && count > MAX_TEXT_WORDS) || 
          (field.type === 'textarea' && count > MAX_TEXTAREA_WORDS)) {
        setErrors(prev => ({ 
          ...prev, 
          [field.name]: t('wordLimitExceeded', { 
            limit: field.type === 'text' ? MAX_TEXT_WORDS : MAX_TEXTAREA_WORDS 
          }) || `Word limit exceeded (max: ${field.type === 'text' ? MAX_TEXT_WORDS : MAX_TEXTAREA_WORDS})`
        }));
      } else {
        // Clear error when valid
        if (errors[field.name]) {
          setErrors(prev => ({ ...prev, [field.name]: null }));
        }
      }
    }
    
    // Validate number fields
    if (field.type === 'number') {
      const numValue = parseFloat(value);
      if (!isNaN(numValue)) {
        if (numValue > MAX_NUMBER_VALUE) {
          setErrors(prev => ({ 
            ...prev, 
            [field.name]: t('numberTooLarge', { max: MAX_NUMBER_VALUE }) || 
              `Value too large (max: ${MAX_NUMBER_VALUE})`
          }));
        } else if (numValue < MIN_NUMBER_VALUE) {
          setErrors(prev => ({
            ...prev,
            [field.name]: t('numberNegative') || 'Negative values are not allowed'
          }));
        } else if (errors[field.name]) {
          setErrors(prev => ({ ...prev, [field.name]: null }));
        }
      }
    }
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate required fields and word limits
    const newErrors = {};
    fields.forEach(field => {
      // Required field validation
      if (field.required && (!values[field.name] || values[field.name].toString().trim() === '')) {
        newErrors[field.name] = t('requiredField') || 'This field is required';
        return;
      }
      
      // Word count validation
      if (field.type === 'text' && wordCounts[field.name] > MAX_TEXT_WORDS) {
        newErrors[field.name] = t('wordLimitExceeded', { limit: MAX_TEXT_WORDS }) || 
          `Word limit exceeded (max: ${MAX_TEXT_WORDS})`;
      } else if (field.type === 'textarea' && wordCounts[field.name] > MAX_TEXTAREA_WORDS) {
        newErrors[field.name] = t('wordLimitExceeded', { limit: MAX_TEXTAREA_WORDS }) || 
          `Word limit exceeded (max: ${MAX_TEXTAREA_WORDS})`;
      }
      
      // Number validation
      if (field.type === 'number') {
        const numValue = parseFloat(values[field.name]);
        if (!isNaN(numValue)) {
          if (numValue > MAX_NUMBER_VALUE) {
            newErrors[field.name] = t('numberTooLarge', { max: MAX_NUMBER_VALUE }) || 
              `Value too large (max: ${MAX_NUMBER_VALUE})`;
          } else if (numValue < MIN_NUMBER_VALUE) {
            newErrors[field.name] = t('numberNegative') || 'Negative values are not allowed';
          }
        }
      }
    });
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    onSubmit(values);
  };
  
  // Initialize word counts on component mount
  useEffect(() => {
    const initialWordCounts = {};
    fields.forEach(field => {
      if ((field.type === 'text' || field.type === 'textarea') && values[field.name]) {
        initialWordCounts[field.name] = countWords(values[field.name]);
      }
    });
    setWordCounts(initialWordCounts);
  }, [fields]);
  
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
                <div className="flex justify-between mt-1">
                  {errors[field.name] && (
                    <p className="text-red-500 text-xs">{errors[field.name]}</p>
                  )}
                  <p className={`text-xs ml-auto ${
                    wordCounts[field.name] > MAX_TEXTAREA_WORDS 
                      ? 'text-red-500 font-medium' 
                      : 'text-gray-500 dark:text-gray-400'
                  }`}>
                    {wordCounts[field.name] || 0}/{MAX_TEXTAREA_WORDS} {t('words') || 'words'}
                  </p>
                </div>
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
                min={MIN_NUMBER_VALUE}
                value={values[field.name] || ''}
                onChange={(e) => handleInputChange(field, e.target.value)}
                placeholder={field.placeholder || ''}
                className={`w-full mt-1 dark:bg-[#333333] dark:border-[#444444] dark:text-gray-200 dark:placeholder-gray-500 ${
                  errors[field.name] ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
                }`}
              />
              <div className="flex justify-between mt-1">
                {errors[field.name] && (
                  <p className="text-red-500 text-xs">{errors[field.name]}</p>
                )}
                <p className="text-xs ml-auto text-gray-500 dark:text-gray-400">
                  {t('validRange') || 'Valid range'}: {MIN_NUMBER_VALUE} - {MAX_NUMBER_VALUE}
                </p>
              </div>
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
                <div className="flex justify-between mt-1">
                  {errors[field.name] && (
                    <p className="text-red-500 text-xs">{errors[field.name]}</p>
                  )}
                  <p className={`text-xs ml-auto ${
                    wordCounts[field.name] > MAX_TEXT_WORDS 
                      ? 'text-red-500 font-medium' 
                      : 'text-gray-500 dark:text-gray-400'
                  }`}>
                    {wordCounts[field.name] || 0}/{MAX_TEXT_WORDS} {t('words') || 'words'}
                  </p>
                </div>
              </div>
            </div>
          );
        }
      })}
      
      <div className="mt-4">
        <Button 
          type="submit" 
          disabled={isLoading || Object.values(errors).some(error => error !== null && error !== undefined)}
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