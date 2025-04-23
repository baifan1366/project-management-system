'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar, Clock, AlertCircle, MoreHorizontal, MessageSquare } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTranslations } from 'use-intl';

export default function TaskItem({ 
  task = { 
    id: 1,
    title: '无标题任务',
    description: '',
    dueDate: '',
    priority: 'medium',
    status: 'pending',
    assignee: { id: '', name: '未分配', avatar: '?' },
    comments: 0
  }
}) {
  const t = useTranslations('tasks');
  const [isCompleted, setIsCompleted] = useState(task.status === 'done');
  
  // 根据优先级获取样式
  const getPriorityStyles = (priority) => {
    switch (priority) {
      case 'high':
      case 'urgent':
        return { 
          bg: 'bg-red-100', 
          text: 'text-red-800',
          icon: <AlertCircle className="h-3 w-3 text-red-800" /> 
        };
      case 'medium':
        return { 
          bg: 'bg-orange-100', 
          text: 'text-orange-800',
          icon: <AlertCircle className="h-3 w-3 text-orange-800" /> 
        };
      case 'low':
        return { 
          bg: 'bg-green-100', 
          text: 'text-green-800',
          icon: <AlertCircle className="h-3 w-3 text-green-800" /> 
        };
      default:
        return { 
          bg: 'bg-blue-100', 
          text: 'text-blue-800',
          icon: <AlertCircle className="h-3 w-3 text-blue-800" /> 
        };
    }
  };

  // 根据状态获取样式
  const getStatusStyles = (status) => {
    switch (status) {
      case 'done':
      case 'completed':
        return { bg: 'bg-green-100', text: 'text-green-800' };
      case 'in_progress':
      case 'in-progress':
      case 'working':
        return { bg: 'bg-yellow-100', text: 'text-yellow-800' };
      case 'pending':
      case 'todo':
        return { bg: 'bg-gray-100', text: 'text-gray-800' };
      default:
        return { bg: 'bg-blue-100', text: 'text-blue-800' };
    }
  };

  // 获取状态文本
  const getStatusText = (status) => {
    switch (status) {
      case 'done':
      case 'completed':
        return t('status.done');
      case 'in_progress':
      case 'in-progress':
      case 'working':
        return t('status.in_progress');
      case 'todo':
      case 'pending':
        return t('status.todo');
      case 'in_review':
        return t('status.in_review');
      default:
        return status;
    }
  };

  // 获取优先级文本
  const getPriorityText = (priority) => {
    switch (priority) {
      case 'high':
        return t('priority.high');
      case 'urgent':
        return t('priority.urgent');
      case 'medium':
        return t('priority.medium');
      case 'low':
        return t('priority.low');
      default:
        return priority;
    }
  };

  const priorityStyles = getPriorityStyles(task.priority);
  const statusStyles = getStatusStyles(task.status);

  // 处理复选框状态变更
  const handleCheckboxChange = (checked) => {
    setIsCompleted(checked);
    // 这里可以添加更新任务状态的API调用
  };

  return (
    <Card className={`border ${isCompleted ? 'bg-accent/10' : 'bg-background'} transition-colors`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* 复选框 */}
          <Checkbox 
            id={`task-${task.id}`} 
            checked={isCompleted}
            onCheckedChange={handleCheckboxChange}
            className="mt-1"
          />
          
          {/* 任务内容 */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <h3 className={`text-sm font-medium truncate ${isCompleted ? 'line-through text-muted-foreground' : ''}`}>
                {task.title}
              </h3>
              
              <div className="flex items-center gap-2">
                {/* 状态标签 */}
                <span className={`text-xs px-2 py-1 rounded-full ${statusStyles.bg} ${statusStyles.text}`}>
                  {getStatusText(task.status)}
                </span>
                
                {/* 优先级标签 */}
                <span className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 ${priorityStyles.bg} ${priorityStyles.text}`}>
                  {priorityStyles.icon}
                  {getPriorityText(task.priority)}
                </span>
              </div>
            </div>
            
            {/* 任务描述 */}
            {task.description && (
              <p className="text-xs text-muted-foreground mt-1 mb-3">
                {task.description}
              </p>
            )}
            
            {/* 任务元数据 */}
            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
              {/* 截止日期 */}
              {task.dueDate && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>截止日期: {task.dueDate}</span>
                </div>
              )}
              
              {/* 预计时间 - 如果有的话 */}
              {task.estimatedTime && (
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>预计: {task.estimatedTime}</span>
                </div>
              )}
              
              {/* 评论数 */}
              <div className="flex items-center gap-1">
                <MessageSquare className="h-3 w-3" />
                <span>{task.comments} 条评论</span>
              </div>
            </div>
          </div>
          
          {/* 用户头像和操作 */}
          <div className="flex flex-col items-end gap-2">
            {/* 负责人 */}
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary">
              {task.assignee.avatar}
            </div>
            
            {/* 操作菜单 */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>编辑任务</DropdownMenuItem>
                <DropdownMenuItem>分配任务</DropdownMenuItem>
                <DropdownMenuItem>设置日期</DropdownMenuItem>
                <DropdownMenuItem className="text-destructive">删除任务</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 