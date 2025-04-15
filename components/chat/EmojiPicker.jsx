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
  buttonTitle = "select emoji",
  showPreview = true,
  position = "top", // top, bottom, left, right
  offset = 5, // 弹出框偏移距离
  isPending = false,
  emojiVersion = "5.0" // 使用更广泛支持的emoji版本
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

    // 获取触发按钮的位置
    const triggerRect = triggerRef.current?.getBoundingClientRect();
    if (!triggerRect) return baseStyles;

    // 获取视口尺寸
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // 计算可用空间
    const spaceRight = viewportWidth - triggerRect.right;
    const spaceLeft = triggerRect.left;
    const spaceTop = triggerRect.top;
    const spaceBottom = viewportHeight - triggerRect.bottom;

    // 默认位置
    let finalPosition = position;

    // 如果指定了位置，检查是否有足够空间
    if (position === 'top' && spaceTop < 350) {
      finalPosition = 'bottom';
    } else if (position === 'bottom' && spaceBottom < 350) {
      finalPosition = 'top';
    } else if (position === 'left' && spaceLeft < 320) {
      finalPosition = 'right';
    } else if (position === 'right' && spaceRight < 320) {
      finalPosition = 'left';
    }

    // 根据最终位置返回样式
    switch (finalPosition) {
      case 'top':
        return {
          ...baseStyles,
          bottom: `calc(100% + ${offset}px)`,
          left: '-100%',
          transform: 'translateX(-75%)'
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
            emojiVersion={emojiVersion} // 添加emoji版本限制
          />
        </div>
      )}
    </div>
  );
} 