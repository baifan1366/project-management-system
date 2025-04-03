'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { format, parse, addHours } from 'date-fns';
import { CalendarIcon, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from '@/lib/supabase';

export default function CreateCalendarEvent({ isOpen, setIsOpen, selectedDate = new Date(), onSuccess }) {
  const t = useTranslations('Calendar');
  const [eventType, setEventType] = useState('task'); // 'task', 'google', 'personal'
  const [isLoading, setIsLoading] = useState(false);
  
  // 事件表单数据
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startDate: selectedDate,
    startTime: format(new Date().setMinutes(0, 0, 0), 'HH:mm'),
    endDate: selectedDate,
    endTime: format(addHours(new Date().setMinutes(0, 0, 0), 1), 'HH:mm'),
    isAllDay: false,
    location: '',
    reminders: false,
    color: '#4285F4', // 默认颜色
  });

  // 处理表单数据变化
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // 处理复选框变化
  const handleCheckboxChange = (name, checked) => {
    setFormData((prev) => ({ ...prev, [name]: checked }));
  };

  // 处理日期变化
  const handleDateChange = (date, name) => {
    setFormData((prev) => ({ ...prev, [name]: date }));
  };

  // 创建事件
  const handleCreateEvent = async (e) => {
    e.preventDefault();
    
    try {
      setIsLoading(true);
      
      if (eventType === 'task') {
        // 创建任务
        const taskData = {
          title: formData.title,
          description: formData.description,
          due_date: formData.isAllDay 
            ? format(formData.startDate, 'yyyy-MM-dd')
            : format(formData.startDate, 'yyyy-MM-dd') + 'T' + formData.startTime + ':00',
          // 添加其他必要的任务数据，如 project_id, team_id 等
        };
        
        const response = await fetch('/api/tasks', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(taskData),
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to create task');
        }
      } else if (eventType === 'personal') {
        // 创建个人日历事件
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          throw new Error('未登录状态');
        }

        const startDateTime = formData.isAllDay 
          ? `${format(formData.startDate, 'yyyy-MM-dd')}T00:00:00`
          : `${format(formData.startDate, 'yyyy-MM-dd')}T${formData.startTime}:00`;
        
        const endDateTime = formData.isAllDay
          ? `${format(formData.endDate, 'yyyy-MM-dd')}T23:59:59`
          : `${format(formData.endDate, 'yyyy-MM-dd')}T${formData.endTime}:00`;
        
        const personalEventData = {
          title: formData.title,
          description: formData.description,
          start_time: startDateTime,
          end_time: endDateTime,
          is_all_day: formData.isAllDay,
          location: formData.location,
          color: formData.color,
          user_id: session.user.id
        };
        
        const { error } = await supabase
          .from('personal_calendar_event')
          .insert(personalEventData);
        
        if (error) {
          console.error('创建个人日历事件失败:', error);
          throw new Error(error.message || '创建个人日历事件失败');
        }
      } else {
        // 创建Google日历事件
        const startDateTime = formData.isAllDay 
          ? format(formData.startDate, 'yyyy-MM-dd')
          : format(formData.startDate, 'yyyy-MM-dd') + 'T' + formData.startTime + ':00';
        
        const endDateTime = formData.isAllDay
          ? format(formData.endDate, 'yyyy-MM-dd')
          : format(formData.endDate, 'yyyy-MM-dd') + 'T' + formData.endTime + ':00';
        
        // 获取当前会话信息
        const { data: { session } } = await supabase.auth.getSession();
        const accessToken = session?.provider_token;
        const refreshToken = session?.provider_refresh_token;
        
        if (!accessToken && !refreshToken) {
          throw new Error('No Google tokens available');
        }
        
        const eventData = {
          summary: formData.title,
          description: formData.description,
          start: formData.isAllDay
            ? { date: startDateTime }
            : { dateTime: startDateTime, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
          end: formData.isAllDay
            ? { date: endDateTime }
            : { dateTime: endDateTime, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
          location: formData.location,
          reminders: formData.reminders
            ? { useDefault: true }
            : { useDefault: false, overrides: [] },
        };
        
        const response = await fetch('/api/google-calendar', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            eventData,
            accessToken,
            refreshToken
          }),
        });
        
        if (response.status === 401) {
          throw new Error('Google授权已过期或权限不足，请重新连接Google账号');
        }
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error('创建Google日历事件失败:', errorData);
          
          if (errorData.error && errorData.error.includes('insufficient authentication scopes')) {
            throw new Error('Google Calendar权限不足，请重新登录并授予完整日历访问权限');
          }
          
          throw new Error(errorData.error || '创建Google日历事件失败');
        }
      }
      
      // 重置表单和关闭对话框
      setFormData({
        title: '',
        description: '',
        startDate: new Date(),
        startTime: format(new Date().setMinutes(0, 0, 0), 'HH:mm'),
        endDate: new Date(),
        endTime: format(addHours(new Date().setMinutes(0, 0, 0), 1), 'HH:mm'),
        isAllDay: false,
        location: '',
        reminders: false,
        color: '#4285F4', // 默认颜色
      });
      
      setIsOpen(false);
      toast.success(t('eventCreated'));
      
      // 如果有成功回调，调用它
      if (onSuccess) {
        onSuccess();
      }
      
    } catch (error) {
      console.error('Error creating event:', error);
      toast.error(error.message || t('eventCreationFailed'));
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t('createEvent')}</DialogTitle>
          <DialogDescription>
            {t('createEventDescription')}
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="task" value={eventType} onValueChange={setEventType} className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="task">{t('task')}</TabsTrigger>
            <TabsTrigger value="personal">{t('personalCalendar')}</TabsTrigger>
            <TabsTrigger value="google">Google {t('event')}</TabsTrigger>
          </TabsList>
        </Tabs>
        
        <form onSubmit={handleCreateEvent} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="title">{t('title')}</Label>
            <Input 
              id="title" 
              name="title" 
              value={formData.title} 
              onChange={handleInputChange} 
              placeholder={t('titlePlaceholder')} 
              required 
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">{t('description')}</Label>
            <Textarea 
              id="description" 
              name="description" 
              value={formData.description} 
              onChange={handleInputChange} 
              placeholder={t('descriptionPlaceholder')} 
              rows={3} 
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">{t('startDate')}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="startDate"
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.startDate ? format(formData.startDate, 'PPP') : t('pickDate')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.startDate}
                    onSelect={(date) => handleDateChange(date, 'startDate')}
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            {!formData.isAllDay && (
              <div className="space-y-2">
                <Label htmlFor="startTime">{t('startTime')}</Label>
                <Input 
                  id="startTime" 
                  name="startTime" 
                  type="time" 
                  value={formData.startTime} 
                  onChange={handleInputChange} 
                />
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="endDate">{t('endDate')}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="endDate"
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.endDate ? format(formData.endDate, 'PPP') : t('pickDate')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.endDate}
                    onSelect={(date) => handleDateChange(date, 'endDate')}
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            {!formData.isAllDay && (
              <div className="space-y-2">
                <Label htmlFor="endTime">{t('endTime')}</Label>
                <Input 
                  id="endTime" 
                  name="endTime" 
                  type="time" 
                  value={formData.endTime} 
                  onChange={handleInputChange} 
                />
              </div>
            )}
          </div>
          
          {(eventType === 'google' || eventType === 'personal') && (
            <div className="space-y-2">
              <Label htmlFor="location">{t('location')}</Label>
              <Input 
                id="location" 
                name="location" 
                value={formData.location} 
                onChange={handleInputChange} 
                placeholder={t('locationPlaceholder')} 
              />
            </div>
          )}
          
          {eventType === 'personal' && (
            <div className="space-y-2">
              <Label htmlFor="color">{t('color')}</Label>
              <div className="flex items-center space-x-2">
                <Input 
                  id="color" 
                  name="color" 
                  type="color" 
                  value={formData.color} 
                  onChange={handleInputChange} 
                  className="w-12 h-8 p-1" 
                />
                <div 
                  className="h-8 w-8 rounded-md" 
                  style={{ backgroundColor: formData.color }}
                ></div>
              </div>
            </div>
          )}
          
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="isAllDay" 
              checked={formData.isAllDay} 
              onCheckedChange={(checked) => handleCheckboxChange('isAllDay', checked)} 
            />
            <label htmlFor="isAllDay" className="text-sm font-medium leading-none">
              {t('allDay')}
            </label>
          </div>
          
          {eventType === 'google' && (
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="reminders" 
                checked={formData.reminders} 
                onCheckedChange={(checked) => handleCheckboxChange('reminders', checked)} 
              />
              <label htmlFor="reminders" className="text-sm font-medium leading-none">
                {t('useDefaultReminders')}
              </label>
            </div>
          )}
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? t('creating') : t('create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 