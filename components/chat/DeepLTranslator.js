'use client';

import { useState } from 'react';
import { Languages } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

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
  const t = useTranslations('Chat');
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
      const response = await fetch('/api/deepLTranslate', {
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
      
      {/* 翻译按钮 - 修改样式与回复按钮保持一致 */}
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
      
      {/* 错误提示 */}
      {error && (
        <div className="text-xs text-red-500 mt-1">
          {error}
        </div>
      )}
    </div>
  );
} 