'use client';

import { useState, useRef, useEffect } from 'react';
import { Smile } from 'lucide-react';
import dynamic from 'next/dynamic';
import { cn } from '@/lib/utils';

// 动态导入表情选择器组件，避免SSR问题
const DynamicEmojiPicker = dynamic(
  () => import('emoji-picker-react'),
  { 
    ssr: false,
    loading: () => <div className="h-[350px] w-[320px] bg-accent/50 animate-pulse rounded-lg" />
  }
);

export default function EmojiPicker({ 
  onEmojiSelect,
  buttonClassName,
  iconClassName,
  buttonOnly = false,
  buttonTitle = "选择表情",
  showPreview = true,
  position = "top", // top, bottom, left, right
  offset = 5, // 弹出框偏移距离
  isPending = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef(null);
  const pickerRef = useRef(null);

  // 处理表情选择
  const handleEmojiClick = (emojiData) => {
    onEmojiSelect(emojiData);
    setIsOpen(false);
  };

  // 处理点击外部关闭
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        isOpen && 
        pickerRef.current && 
        !pickerRef.current.contains(event.target) &&
        !triggerRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // 计算弹出框位置样式
  const getPositionStyles = () => {
    const baseStyles = {
      position: 'absolute',
      zIndex: 50
    };

    switch (position) {
      case 'top':
        return {
          ...baseStyles,
          bottom: `calc(100% + ${offset}px)`,
          left: '50%',
          transform: 'translateX(-50%)'
        };
      case 'bottom':
        return {
          ...baseStyles,
          top: `calc(100% + ${offset}px)`,
          left: '50%',
          transform: 'translateX(-50%)'
        };
      case 'left':
        return {
          ...baseStyles,
          right: `calc(100% + ${offset}px)`,
          top: '50%',
          transform: 'translateY(-50%)'
        };
      case 'right':
        return {
          ...baseStyles,
          left: `calc(100% + ${offset}px)`,
          top: '50%',
          transform: 'translateY(-50%)'
        };
      default:
        return {
          ...baseStyles,
          bottom: `calc(100% + ${offset}px)`,
          left: '50%',
          transform: 'translateX(-50%)'
        };
    }
  };

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        className={cn(
          "p-2 hover:bg-accent rounded-lg",
          buttonClassName
        )}
        onClick={() => setIsOpen(!isOpen)}
        title={buttonTitle}
        disabled={isPending}
      >
        <Smile className={cn("h-5 w-5 text-muted-foreground", iconClassName)} />
      </button>

      {isOpen && (
        <div 
          ref={pickerRef}
          style={getPositionStyles()}
          className="shadow-lg rounded-lg overflow-hidden bg-background border border-border"
        >
          <DynamicEmojiPicker 
            onEmojiClick={handleEmojiClick}
            previewConfig={{ showPreview: showPreview }}
            skinTonesDisabled={false}
            searchDisabled={false}
            width={320}
            height={350}
            theme="auto" // 根据系统设置决定深色或浅色
          />
        </div>
      )}
    </div>
  );
} 