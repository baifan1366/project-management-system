'use client';

import { useState, useEffect } from 'react';
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
import { CalendarIcon, Clock, Video, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from '@/lib/supabase';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import useGetUser from '@/lib/hooks/useGetUser';

export default function CreateCalendarEvent({ isOpen, setIsOpen, selectedDate = new Date(), onSuccess, isGoogleConnected = false }) {
  const t = useTranslations('Calendar');
  const [eventType, setEventType] = useState('task'); // 'task', 'google', 'personal'
  const [isLoading, setIsLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState([]);
  
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
    addGoogleMeet: false, // 是否添加Google Meet视频会议
    inviteParticipants: false, // 是否邀请参与者
  });

  // 当selectedDate变化时更新表单数据
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      startDate: selectedDate,
      endDate: selectedDate
    }));
  }, [selectedDate]);

  // 获取用户列表
  useEffect(() => {
    if (formData.inviteParticipants && eventType === 'google') {
      fetchUsers();
    }
  }, [formData.inviteParticipants, eventType]);

  // 搜索用户
  useEffect(() => {
    if (searchTerm.trim() && formData.inviteParticipants) {
      searchUsers(searchTerm);
    }
  }, [searchTerm]);

  // 获取用户列表
  const fetchUsers = async () => {
    try {
      setIsLoadingUsers(true);
      const { user: session } = useGetUser();
      
      if (!session) {
        throw new Error(t('notLoggedIn'));
      }

      const { data, error } = await supabase
        .from('user')
        .select('id, name, email, avatar_url')
        .neq('id', session.id)
        .limit(20);
      
      if (error) {
        throw error;
      }
      
      setUsers(data || []);
    } catch (error) {
      console.error('获取用户列表失败:', error);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  // 搜索用户
  const searchUsers = async (query) => {
    try {
      setIsLoadingUsers(true);
      const { user: session } = useGetUser();
      
      if (!session) {
        throw new Error(t('notLoggedIn'));
      }

      const { data, error } = await supabase
        .from('user')
        .select('id, name, email, avatar_url')
        .neq('id', session.id)
        .or(`name.ilike.%${query}%,email.ilike.%${query}%`)
        .limit(10);
      
      if (error) {
        throw error;
      }
      
      setUsers(data || []);
    } catch (error) {
      console.error('搜索用户失败:', error);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  // 选择用户
  const selectUser = (user) => {
    if (!selectedUsers.some(u => u.id === user.id)) {
      setSelectedUsers([...selectedUsers, user]);
    }
  };

  // 移除用户
  const removeUser = (userId) => {
    setSelectedUsers(selectedUsers.filter(user => user.id !== userId));
  };

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
    if (e) e.preventDefault();
    
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
        const { user: session } = useGetUser();
        
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
          user_id: session.id
        };
        
        const { error } = await supabase
          .from('personal_calendar_event')
          .insert(personalEventData);
        
        if (error) {
          console.error('创建个人日历事件失败:', error);
          throw new Error(error.message || '创建个人日历事件失败');
        }
      } else if (eventType === 'google') {
        // 创建Google日历事件
        const startDateTime = formData.isAllDay 
          ? format(formData.startDate, 'yyyy-MM-dd')
          : format(formData.startDate, 'yyyy-MM-dd') + 'T' + formData.startTime + ':00';
        
        const endDateTime = formData.isAllDay
          ? format(formData.endDate, 'yyyy-MM-dd')
          : format(formData.endDate, 'yyyy-MM-dd') + 'T' + formData.endTime + ':00';
        
        // 获取当前会话信息
        const { user: session } = useGetUser();
        const accessToken = session?.provider_token;
        const refreshToken = session?.provider_refresh_token;
        
        if (!accessToken && !refreshToken) {
          throw new Error('No Google tokens available');
        }
        
        // 准备参与者列表
        const attendees = formData.inviteParticipants 
          ? selectedUsers.map(user => ({ email: user.email, displayName: user.name })) 
          : [];
        
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
          attendees: attendees,  // 添加参与者
        };

        // 如果需要添加Google Meet会议
        if (formData.addGoogleMeet) {
          eventData.conferenceData = {
            createRequest: {
              requestId: `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
              conferenceSolutionKey: { type: "hangoutsMeet" }
            }
          };
        }
        
        const response = await fetch('/api/google-calendar', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            eventData,
            accessToken,
            refreshToken,
            conferenceDataVersion: formData.addGoogleMeet ? 1 : 0,
            sendNotifications: formData.inviteParticipants
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
        
        // 获取创建的事件数据，包括Meet链接
        const eventResponseData = await response.json();
        
        // 如果有参与者且有会议链接，创建通知
        if (formData.inviteParticipants && formData.addGoogleMeet && eventResponseData.event.hangoutLink) {
          const meetLink = eventResponseData.event.hangoutLink;
          
          // 为每个参与者创建通知
          for (const user of selectedUsers) {
            await supabase
              .from('notification')
              .insert({
                user_id: user.id,
                title: `${t('meetingInvitation')}: ${formData.title}`,
                content: `${session.user.user_metadata.name || '用户'} ${t('invitedYouToMeeting')}`,
                type: 'SYSTEM',
                related_entity_type: 'calendar_event',
                related_entity_id: eventResponseData.event.id,
                data: {
                  meetLink,
                  eventId: eventResponseData.event.id,
                  eventTitle: formData.title,
                  startTime: startDateTime,
                  endTime: endDateTime,
                  isMeetingInvitation: true,
                  inviterId: session.user.id
                },
                is_read: false
              });
          }
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
        addGoogleMeet: false,
        inviteParticipants: false,
      });
      
      setSelectedUsers([]);
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
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>{t('createEvent')}</DialogTitle>
          <DialogDescription>
            {t('createEventDescription')}
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="task" value={eventType} onValueChange={setEventType} className="mt-4 flex-shrink-0">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="task">{t('task')}</TabsTrigger>
            <TabsTrigger value="personal">{t('personalCalendar')}</TabsTrigger>
            <TabsTrigger value="google">Google {t('event')}</TabsTrigger>
          </TabsList>
        </Tabs>
        
        <div className="flex-1 overflow-y-auto pr-2 my-4">
          <form className="space-y-4" id="eventForm">
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
            
            {eventType === 'google' && isGoogleConnected && (
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="addGoogleMeet" 
                  checked={formData.addGoogleMeet} 
                  onCheckedChange={(checked) => handleCheckboxChange('addGoogleMeet', checked)} 
                />
                <label htmlFor="addGoogleMeet" className="text-sm font-medium leading-none flex items-center">
                  <Video className="h-4 w-4 mr-1" /> {t('addGoogleMeet')}
                </label>
              </div>
            )}
            
            {eventType === 'google' && isGoogleConnected && (
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="inviteParticipants" 
                  checked={formData.inviteParticipants} 
                  onCheckedChange={(checked) => handleCheckboxChange('inviteParticipants', checked)} 
                />
                <label htmlFor="inviteParticipants" className="text-sm font-medium leading-none flex items-center">
                  <Users className="h-4 w-4 mr-1" /> {t('inviteParticipants')}
                </label>
              </div>
            )}
            
            {eventType === 'google' && formData.inviteParticipants && (
              <div className="space-y-2">
                <Label>{t('participants')}</Label>
                <Command className="border rounded-md">
                  <CommandInput 
                    placeholder={t('searchUsers')} 
                    value={searchTerm}
                    onValueChange={setSearchTerm}
                  />
                  <CommandList className="max-h-[120px] overflow-y-auto">
                    {isLoadingUsers ? (
                      <CommandEmpty>{t('loading')}</CommandEmpty>
                    ) : users.length === 0 ? (
                      <CommandEmpty>{t('noUsersFound')}</CommandEmpty>
                    ) : (
                      <CommandGroup>
                        {users.map((user) => (
                          <CommandItem
                            key={user.id}
                            onSelect={() => selectUser(user)}
                            className="cursor-pointer"
                          >
                            <div className="flex items-center space-x-2">
                              {user.avatar_url ? (
                                <img 
                                  src={user.avatar_url} 
                                  alt={user.name} 
                                  className="h-6 w-6 rounded-full"
                                />
                              ) : (
                                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                                  {user.name?.charAt(0) || user.email?.charAt(0)}
                                </div>
                              )}
                              <span>{user.name}</span>
                              <span className="text-xs text-muted-foreground">{user.email}</span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    )}
                  </CommandList>
                </Command>
                
                {selectedUsers.length > 0 && (
                  <div className="mt-2">
                    <Label>{t('selectedParticipants')}</Label>
                    <div className="flex flex-wrap gap-2 mt-1 max-h-[100px] overflow-y-auto p-1">
                      {selectedUsers.map((user) => (
                        <div 
                          key={user.id} 
                          className="flex items-center gap-1 px-2 py-1 rounded-md bg-primary/10"
                        >
                          {user.name}
                          <button 
                            type="button"
                            onClick={() => removeUser(user.id)}
                            className="text-sm text-muted-foreground hover:text-foreground"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            
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
          </form>
        </div>
        
        <DialogFooter className="flex-shrink-0 pt-2 border-t">
          <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
            {t('cancel')}
          </Button>
          <Button 
            onClick={handleCreateEvent} 
            disabled={isLoading}
          >
            {isLoading ? t('creating') : t('create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 