'use client';

import { useState, useEffect } from 'react';
import { X, Phone, Video, Minus, Paperclip, Image, Smile, Send } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ChatDialog({ 
  isOpen, 
  onClose, 
  user = {
    name: 'Badia Aadab',
    avatar: 'BA',
    online: true
  }
}) {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([
    {
      id: 1,
      content: 'Btw i am doing degree in CS',
      sender: 'them',
      timestamp: '17:34'
    },
    {
      id: 2,
      content: 'How are you?',
      sender: 'me',
      timestamp: '17:35'
    }
  ]);

  const [isMinimized, setIsMinimized] = useState(false);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (message.trim()) {
      setMessages([...messages, {
        id: messages.length + 1,
        content: message,
        sender: 'me',
        timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
      }]);
      setMessage('');
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className={cn(
        "fixed bottom-0 right-4 w-80 bg-background rounded-t-lg shadow-lg flex flex-col",
        isMinimized ? "h-[48px]" : "h-[480px]"
      )}
    >
      {/* 对话框头部 */}
      <div className="flex items-center justify-between p-2 border-b">
        <div className="flex items-center gap-2">
          <div className="relative">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-medium">
              {user.avatar}
            </div>
            {user.online && (
              <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-background"></div>
            )}
          </div>
          <span className="font-medium text-sm">{user.name}</span>
        </div>
        <div className="flex items-center gap-1">
          <button className="p-1 hover:bg-accent rounded-lg" onClick={() => setIsMinimized(!isMinimized)}>
            <Minus className="h-4 w-4" />
          </button>
          <button className="p-1 hover:bg-accent rounded-lg" onClick={onClose}>
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* 消息区域 */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.map((msg) => (
              <div 
                key={msg.id} 
                className={cn(
                  "flex items-end gap-2",
                  msg.sender === 'me' ? "flex-row-reverse" : "flex-row"
                )}
              >
                {msg.sender === 'them' && (
                  <div className="w-6 h-6 bg-blue-600 rounded-lg flex items-center justify-center text-white text-xs">
                    {user.avatar}
                  </div>
                )}
                <div 
                  className={cn(
                    "max-w-[70%] rounded-lg p-2 text-sm",
                    msg.sender === 'me' 
                      ? "bg-primary text-primary-foreground" 
                      : "bg-accent"
                  )}
                >
                  {msg.content}
                </div>
                <span className="text-xs text-muted-foreground">{msg.timestamp}</span>
              </div>
            ))}
          </div>

          {/* 输入区域 */}
          <div className="p-3 border-t">
            <form onSubmit={handleSendMessage} className="flex items-end gap-2">
              <div className="flex-1 bg-accent rounded-lg">
                <div className="flex items-center px-2 py-1 gap-1">
                  <button type="button" className="p-1 hover:bg-accent/50 rounded">
                    <Paperclip className="h-4 w-4 text-muted-foreground" />
                  </button>
                  <button type="button" className="p-1 hover:bg-accent/50 rounded">
                    <Image className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>
                <div className="px-2 pb-1">
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Aa"
                    className="w-full bg-transparent border-0 focus:ring-0 resize-none text-sm py-1 max-h-32"
                    rows={1}
                  />
                </div>
              </div>
              <div className="flex items-center gap-1 pb-1">
                <button type="button" className="p-1.5 hover:bg-accent rounded-lg">
                  <Smile className="h-4 w-4 text-muted-foreground" />
                </button>
                <button 
                  type="submit" 
                  className="p-1.5 text-primary disabled:opacity-50"
                  disabled={!message.trim()}
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
} 