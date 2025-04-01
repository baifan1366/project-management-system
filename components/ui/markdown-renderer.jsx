import React from 'react';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';

// 自定义markdown组件
const MarkdownComponents = {
  // 覆盖默认的代码块样式
  code({ node, inline, className, children, ...props }) {
    const match = /language-(\w+)/.exec(className || '');
    return !inline && match ? (
      <div className="relative rounded bg-gray-800 dark:bg-gray-900 my-2">
        <div className="flex items-center justify-between px-3 py-1 text-xs text-gray-200 bg-gray-700 dark:bg-gray-800 rounded-t">
          <span>{match[1]}</span>
        </div>
        <pre className="p-3 overflow-x-auto">
          <code className={className} {...props}>
            {children}
          </code>
        </pre>
      </div>
    ) : (
      <code className="px-1 py-0.5 rounded-sm bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-200" {...props}>
        {children}
      </code>
    );
  },
  // 覆盖引用块样式
  blockquote({ children }) {
    return (
      <blockquote className="pl-4 italic border-l-4 border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400">
        {children}
      </blockquote>
    );
  },
  // 自定义列表样式
  ul({ children }) {
    return <ul className="list-disc pl-5 space-y-1">{children}</ul>;
  },
  ol({ children }) {
    return <ol className="list-decimal pl-5 space-y-1">{children}</ol>;
  },
  // 自定义标题样式
  h1({ children }) {
    return <h1 className="text-xl font-bold mt-4 mb-2">{children}</h1>;
  },
  h2({ children }) {
    return <h2 className="text-lg font-bold mt-3 mb-2">{children}</h2>;
  },
  h3({ children }) {
    return <h3 className="text-md font-bold mt-2 mb-1">{children}</h3>;
  },
  // 自定义链接样式
  a({ children, href }) {
    return (
      <a 
        href={href} 
        className="text-blue-500 hover:text-blue-700 underline" 
        target="_blank" 
        rel="noreferrer"
      >
        {children}
      </a>
    );
  },
  // 将className添加到根元素
  root({ children, ...props }) {
    return (
      <div className="prose dark:prose-invert prose-sm max-w-none prose-p:my-1 prose-headings:my-2 prose-pre:my-1 prose-pre:p-0 prose-pre:bg-transparent">
        {children}
      </div>
    );
  }
};

export const MarkdownRenderer = ({ content, className }) => {
  return (
    <div className={className}>
      <ReactMarkdown components={MarkdownComponents}>
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer; 