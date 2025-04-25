import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { PlayCircle } from 'lucide-react';

export default function InputForm({ fields, onSubmit, isLoading }) {
  const t = useTranslations('AI_Workflow');
  const [values, setValues] = useState({});
  
  // Handle input change
  const handleInputChange = (field, value) => {
    setValues(prev => ({
      ...prev,
      [field.name]: value
    }));
  };
  
  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate required fields
    const missingFields = fields
      .filter(field => field.required)
      .filter(field => !values[field.name]);
    
    if (missingFields.length > 0) {
      const missingLabels = missingFields.map(f => f.label).join(', ');
      alert(`${t('missingRequiredFields')}: ${missingLabels}`);
      return;
    }
    
    onSubmit(values);
  };
  
  // Render form fields based on their type
  const renderField = (field, index) => {
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
              className="mt-1 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700"
              rows={5}
            />
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
              className="mt-1 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700"
            />
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
              className="mt-1 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700"
            />
          </div>
        );
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="p-4 dark:text-gray-200">
      <div className="space-y-2">
        {fields.map((field, index) => renderField(field, index))}
      </div>
      
      <div className="mt-6">
        <Button 
          type="submit" 
          disabled={isLoading}
          className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800"
        >
          <PlayCircle className="mr-2 h-4 w-4" />
          {isLoading ? t('running') : t('executeWorkflow')}
        </Button>
      </div>
    </form>
  );
} 