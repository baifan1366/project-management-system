import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { PlayCircle, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function InputForm({ fields, onSubmit, isLoading }) {
  const t = useTranslations('AI_Workflow');
  const [values, setValues] = useState({});
  const [errors, setErrors] = useState({});
  
  // Handle input change
  const handleInputChange = (field, value) => {
    setValues(prev => ({
      ...prev,
      [field.name]: value
    }));
    
    // Clear error for this field
    if (errors[field.name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field.name];
        return newErrors;
      });
    }
  };
  
  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate required fields
    const missingFields = fields
      .filter(field => field.required)
      .filter(field => !values[field.name]);
    
    if (missingFields.length > 0) {
      const newErrors = {};
      missingFields.forEach(field => {
        newErrors[field.name] = t('fieldRequired');
      });
      setErrors(newErrors);
      return;
    }
    
    onSubmit(values);
  };
  
  // Render form fields based on their type
  const renderField = (field, index) => {
    const hasError = errors[field.name];
    
    switch (field.type) {
      case 'textarea':
        return (
          <div key={index} className="mb-4">
            <Label className={`dark:text-gray-200 ${field.required ? 'after:content-["*"] after:text-red-500 after:ml-1' : ''}`}>
              {field.label}
            </Label>
            <Textarea
              value={values[field.name] || ''}
              onChange={(e) => handleInputChange(field, e.target.value)}
              placeholder={field.label}
              className={`mt-1 dark:bg-[#333333] dark:border-[#444444] dark:text-gray-200 dark:placeholder-gray-500 ${hasError ? 'border-red-500 dark:border-red-500 focus-visible:ring-red-500' : 'focus-visible:ring-[#39ac91]'}`}
              rows={5}
            />
            {hasError && (
              <p className="text-xs text-red-500 mt-1">{errors[field.name]}</p>
            )}
          </div>
        );
        
      case 'number':
        return (
          <div key={index} className="mb-4">
            <Label className={`dark:text-gray-200 ${field.required ? 'after:content-["*"] after:text-red-500 after:ml-1' : ''}`}>
              {field.label}
            </Label>
            <Input
              type="number"
              value={values[field.name] || ''}
              onChange={(e) => handleInputChange(field, e.target.value)}
              placeholder={field.label}
              className={`mt-1 dark:bg-[#333333] dark:border-[#444444] dark:text-gray-200 dark:placeholder-gray-500 ${hasError ? 'border-red-500 dark:border-red-500 focus-visible:ring-red-500' : 'focus-visible:ring-[#39ac91]'}`}
            />
            {hasError && (
              <p className="text-xs text-red-500 mt-1">{errors[field.name]}</p>
            )}
          </div>
        );
        
      default: // text
        return (
          <div key={index} className="mb-4">
            <Label className={`dark:text-gray-200 ${field.required ? 'after:content-["*"] after:text-red-500 after:ml-1' : ''}`}>
              {field.label}
            </Label>
            <Input
              type="text"
              value={values[field.name] || ''}
              onChange={(e) => handleInputChange(field, e.target.value)}
              placeholder={field.label}
              className={`mt-1 dark:bg-[#333333] dark:border-[#444444] dark:text-gray-200 dark:placeholder-gray-500 ${hasError ? 'border-red-500 dark:border-red-500 focus-visible:ring-red-500' : 'focus-visible:ring-[#39ac91]'}`}
            />
            {hasError && (
              <p className="text-xs text-red-500 mt-1">{errors[field.name]}</p>
            )}
          </div>
        );
    }
  };
  
  // Show a message if there are no fields
  if (!fields || fields.length === 0) {
    return (
      <Alert className="dark:bg-yellow-900/20 dark:border-yellow-800">
        <AlertCircle className="h-4 w-4 text-yellow-500" />
        <AlertDescription>
          {t('noInputFieldsDefined')}
        </AlertDescription>
      </Alert>
    );
  }
  
  return (
    <form onSubmit={handleSubmit} className="p-4 dark:text-gray-200">
      <div className="space-y-2">
        {fields.map((field, index) => renderField(field, index))}
      </div>
      
      <div className="mt-6">
        <Button 
          type="submit" 
          disabled={isLoading}
          className="w-full bg-[#39ac91] hover:bg-[#33a085] text-white dark:bg-[#39ac91] dark:hover:bg-[#33a085] dark:text-white focus-visible:ring-[#39ac91]"
        >
          <PlayCircle className="mr-2 h-4 w-4" />
          {isLoading ? t('running') : t('executeWorkflow')}
        </Button>
      </div>
    </form>
  );
} 