'use client';

import { useState } from 'react';
import { Languages } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * DeepLTranslator 组件
 * 包装消息内容，并在右下角显示翻译按钮
 * 当用户点击翻译按钮时，调用DeepL API翻译内容
 */
export default function DeepLTranslator({ 
  children, 
  content,
  targetLang = 'ZH', // 默认翻译目标语言为中文
  className,
  buttonClassName
}) {
  const [translatedText, setTranslatedText] = useState(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState(null);

  // 翻译内容
  const translateText = async () => {
    // 如果已经有翻译，则切换回原文
    if (translatedText) {
      setTranslatedText(null);
      return;
    }

    setIsTranslating(true);
    setError(null);

    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: content,
          targetLang: targetLang,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '翻译失败');
      }

      const data = await response.json();
      setTranslatedText(data.translatedText);
    } catch (err) {
      console.error('翻译出错:', err);
      setError(err.message || '翻译服务出错');
    } finally {
      setIsTranslating(false);
    }
  };

  return (
    <div className={cn("relative w-full", className)}>
      {/* 显示原始内容或翻译后的内容 */}
      {translatedText !== null ? translatedText : children}
      
      {/* 翻译按钮 */}
      <button
        onClick={translateText}
        disabled={isTranslating}
        className={cn(
          "absolute bottom-1 right-1 p-1 rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity z-10",
          translatedText ? "bg-blue-600 text-white" : "bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600",
          isTranslating && "cursor-wait",
          buttonClassName
        )}
        title={translatedText ? "查看原文" : "翻译"}
      >
        <Languages size={14} />
      </button>
      
      {/* 错误提示 */}
      {error && (
        <div className="text-xs text-red-500 mt-1">
          {error}
        </div>
      )}
    </div>
  );
} 