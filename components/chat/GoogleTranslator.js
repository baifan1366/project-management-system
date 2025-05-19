'use client';

import { useState, useImperativeHandle, forwardRef } from 'react';
import { Languages } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import useGetUser from '@/lib/hooks/useGetUser';

/**
 * GoogleTranslator component
 * Wraps message content and displays a translation button in the bottom right
 * When the user clicks the translation button, the Google Translate API is called to translate the content
 * Uses the user's language preference by default
 */
const GoogleTranslator = forwardRef(({ 
  children, 
  content,
  targetLang, // Remove default value to use user's language preference
  className,
  buttonClassName,
  showButton = true // Display button attribute, defaults to true
}, ref) => {
  const t = useTranslations('Chat');
  const { user } = useGetUser(); // Get user data including language preference
  const [translatedText, setTranslatedText] = useState(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState(null);
  
  // Use user's language preference as default, fallback to 'en' if not available
  const effectiveTargetLang = targetLang || (user?.language || 'en');

  // Translate content
  const translateText = async () => {
    // If already translated, switch back to original text
    if (translatedText) {
      setTranslatedText(null);
      return;
    }

    setIsTranslating(true);
    setError(null);

    try {
      const response = await fetch('/api/googleTranslate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: content,
          targetLang: effectiveTargetLang,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Translation failed');
      }

      const data = await response.json();
      setTranslatedText(data.translatedText);
    } catch (err) {
      console.error('Translation error:', err);
      setError(err.message || 'Translation service error');
    } finally {
      setIsTranslating(false);
    }
  };

  // Expose translateText method to parent component
  useImperativeHandle(ref, () => ({
    translateText,
    isTranslated: translatedText !== null
  }));

  return (
    <div className={cn("relative w-full", className)}>
      {/* Display original content or translated content */}
      {translatedText !== null ? translatedText : children}
      
      {/* Translation button - display based on showButton property */}
      {showButton && (
        <button
          onClick={translateText}
          disabled={isTranslating}
          className={cn(
            "absolute right-5 p-1 rounded hover:bg-background/60 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity",
            isTranslating && "cursor-wait",
            buttonClassName
          )}
          title={translatedText ? t('seeOriginal') : t('translate')}
        >
          <Languages size={16} />
        </button>
      )}
      
      {/* Error message */}
      {error && (
        <div className="text-xs text-red-500 mt-1">
          {error}
        </div>
      )}
    </div>
  );
});

GoogleTranslator.displayName = 'GoogleTranslator';

export default GoogleTranslator; 