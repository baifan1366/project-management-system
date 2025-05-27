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
import { format, parse, addHours, isPast, isSameDay, set } from 'date-fns';
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
  const { user: session } = useGetUser();
  const [dateError, setDateError] = useState('');
  
  // Debug: Check Google auth status when component mounts
  useEffect(() => {
    if (eventType === 'google') {
      console.log("Google connection status:", { 
        isGoogleConnected, 
        hasProviderToken: !!session?.provider_token,
        hasRefreshToken: !!session?.provider_refresh_token,
        hasGoogleAccessToken: !!session?.google_access_token,
        hasGoogleRefreshToken: !!session?.google_refresh_token,
        session: JSON.stringify(session)
      });
    }
  }, [eventType, session, isGoogleConnected]);
  
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
      
      if (!session) {
        console.error('No user session found');
        setUsers([]);
        return;
      }

      console.log('Searching users with query:', query, 'Session user ID:', session.id);

      const { data, error } = await supabase
        .from('user')
        .select('id, name, email, avatar_url')
        .neq('id', session.id)
        .or(`name.ilike.%${query}%,email.ilike.%${query}%`)
        .limit(10);
      
      if (error) {
        console.error('Error during user search:', error.message);
        throw error;
      }
      
      console.log('User search results:', data?.length || 0, 'users found');
      setUsers(data || []);
    } catch (error) {
      console.error('搜索用户失败:', error);
      toast.error('Failed to search users');
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

  // 处理日期变化
  const handleDateChange = (date, name) => {
    // Clear any previous errors
    setDateError('');
    
    // Validate that date is not in the past for start date
    if (name === 'startDate') {
      const now = new Date();
      // Reset time to midnight for comparison when comparing just dates
      const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const selectedDateMidnight = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      
      if (selectedDateMidnight < todayDate) {
        setDateError(t('cannotSelectPastDate') || 'Cannot select a date in the past');
        return; // Don't update state with invalid date
      }
      
      // If selecting today, also validate the time if a time is already set
      if (isSameDay(date, now) && formData.startTime) {
        const timeComponents = formData.startTime.split(':');
        const selectedDateTime = new Date(
          date.getFullYear(), 
          date.getMonth(), 
          date.getDate(),
          parseInt(timeComponents[0]), 
          parseInt(timeComponents[1])
        );
        
        if (isPast(selectedDateTime)) {
          setDateError(t('cannotSelectPastTime') || 'Cannot select a time in the past');
          // Still update the date, but show the error for time
        }
      }
    }
    
    setFormData((prev) => ({ ...prev, [name]: date }));
  };
  
  // Handle time input changes with validation
  const handleTimeChange = (e) => {
    const { name, value } = e.target;
    
    // Clear any previous errors
    setDateError('');
    
    // For start time changes, validate if the date is today
    if (name === 'startTime' && isSameDay(formData.startDate, new Date())) {
      const now = new Date();
      const timeComponents = value.split(':');
      const selectedDateTime = new Date(
        formData.startDate.getFullYear(), 
        formData.startDate.getMonth(), 
        formData.startDate.getDate(),
        parseInt(timeComponents[0]), 
        parseInt(timeComponents[1])
      );
      
      if (isPast(selectedDateTime)) {
        setDateError(t('cannotSelectPastTime') || 'Cannot select a time in the past');
        // Still update the time value to allow the user to correct it
      }
    }
    
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // 处理表单数据变化
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Use specific time handler for time inputs
    if (name === 'startTime' || name === 'endTime') {
      handleTimeChange(e);
      return;
    }
    
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // 处理复选框变化
  const handleCheckboxChange = (name, checked) => {
    setFormData((prev) => ({ ...prev, [name]: checked }));
  };

  // 创建事件
  const handleCreateEvent = async (e) => {
    if (e) e.preventDefault();
    
    try {
      setIsLoading(true);
      
      // Validate that event time is not in the past
      const now = new Date();
      const startDateTime = formData.isAllDay 
        ? new Date(format(formData.startDate, 'yyyy-MM-dd') + 'T00:00:00')
        : new Date(format(formData.startDate, 'yyyy-MM-dd') + 'T' + formData.startTime + ':00');
      
      // Check if the start date/time is in the past
      if (isPast(startDateTime) && !isSameDay(startDateTime, now)) {
        throw new Error(t('cannotCreatePastEvents') || 'Cannot create events in the past');
      }
      
      // For same-day events, check if the time is in the past
      if (isSameDay(startDateTime, now) && isPast(startDateTime)) {
        throw new Error(t('cannotCreatePastEvents') || 'Cannot create events in the past');
      }
      
      if (eventType === 'task') {
        try {
          // 直接创建 mytasks 记录，不需要先创建任务
          if (session) {
            // 准备 mytasks 数据
            const dueDate = formData.isAllDay 
              ? format(formData.startDate, 'yyyy-MM-dd')
              : format(formData.startDate, 'yyyy-MM-dd') + 'T' + formData.startTime + ':00';
            
            // 检查 user_id 是否是有效的 UUID 格式
            const userId = session.id;
            if (!userId) {
              console.error('Missing user ID:', userId);
              toast.error(t('missingUserId') || 'User ID not found. Please try signing in again.');
              return;
            }
            
            // 临时测试生成日志
            console.log('Current user session:', session);
            
            // 插入 mytasks 记录
            const { data, error } = await supabase.from('mytasks').insert({
              user_id: userId,
              title: formData.title,
              description: formData.description || '',
              status: 'TODO',
              expected_completion_date: dueDate
            }).select();
            
            if (error) {
              console.error('Error details:', error);
              throw new Error(error.message || 'Failed to create mytask');
            }
            
            console.log('Task successfully added to mytasks:', data);
          } else {
            throw new Error(t('notLoggedIn') || 'Not logged in');
          }
        } catch (error) {
          console.error('Error creating mytask:', error);
          toast.error(error.message || t('eventCreationFailed'));
          return; // Stop execution if there's an error
        }
      } else if (eventType === 'personal') {
        // 创建个人日历事件
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
        
        // Check for Google tokens in the user session
        let accessToken = session?.google_access_token || null;
        let refreshToken = session?.google_refresh_token || null;
        
        // Add debug logging
        console.log("Google auth tokens check:", { 
          hasAccessToken: !!accessToken, 
          hasRefreshToken: !!refreshToken
        });
        
        // Check if we have either token
        if (!accessToken && !refreshToken) {
          // Instead of throwing an error, show a toast and return early
          toast.error(t('connectGoogleFirst') || 'Please connect your Google account first');
          setIsLoading(false);
          return;
        }
        
        // Try to refresh the token if we only have a refresh token or if token might be expired
        if ((!accessToken && refreshToken) || (refreshToken && session?.id)) {
          try {
            console.log("Attempting to refresh token with:", { 
              refreshTokenLength: refreshToken?.length || 0,
              userId: session?.id
            });
            
            const response = await fetch('/api/refresh-google-token', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ 
                refresh_token: refreshToken,
                userId: session.id 
              }),
            });
            
            if (response.ok) {
              const data = await response.json();
              accessToken = data.access_token;
              console.log("Successfully refreshed Google token");
            } else {
              const errorText = await response.text();
              console.error("Failed to refresh Google token. Status:", response.status);
              console.error("Error details:", errorText);
              toast.error(`${t('tokenRefreshFailed') || 'Failed to refresh your Google authorization'} (${response.status})`);
              setIsLoading(false);
              return;
            }
          } catch (error) {
            console.error("Error refreshing Google token:", error);
            toast.error(t('tokenRefreshError') || 'Error refreshing your Google authorization');
            setIsLoading(false);
            return;
          }
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
                content: `${session.name || '用户'} ${t('invitedYouToMeeting')}`,
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
                  inviterId: session.id
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
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>{t('createEvent')}</DialogTitle>
          <DialogDescription>
            {t('createEventDescription')}
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <Tabs defaultValue={eventType} onValueChange={setEventType} className="w-full mb-2">
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="task">{t('task')}</TabsTrigger>
              <TabsTrigger value="personal" disabled={!session}>{t('personalCalendar')}</TabsTrigger>
              <TabsTrigger value="google" disabled={!isGoogleConnected}>{t('googleCalendar')}</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="space-y-2">
            <Label htmlFor="title">{t('title')}</Label>
            <Input
              id="title"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              placeholder={t('titlePlaceholder')}
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
              className="resize-none h-20"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="startDate">{t('startDate')}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="startDate"
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      dateError && "border-red-500"
                    )}
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
                    disabled={(date) => isPast(new Date(date.getFullYear(), date.getMonth(), date.getDate())) && !isSameDay(date, new Date())}
                  />
                </PopoverContent>
              </Popover>
              {dateError && <p className="text-xs text-red-500 mt-1">{dateError}</p>}
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
                  className={cn(dateError && "border-red-500")}
                />
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
              
              <div className="border rounded-md overflow-hidden">
                <div className="flex items-center border-b p-2">
                  <input
                    type="text"
                    placeholder={t('searchUsers')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-transparent focus:outline-none"
                  />
                </div>
                
                <div className="max-h-[120px] overflow-y-auto">
                  {isLoadingUsers ? (
                    <div className="p-2 text-sm text-center">{t('loading')}</div>
                  ) : users.length === 0 ? (
                    <div className="p-2 text-sm text-center">{t('noUsersFound')}</div>
                  ) : (
                    <>
                      <div className="p-1">
                        {users.map((user) => (
                          <div
                            key={user.id}
                            onClick={() => selectUser(user)}
                            className="flex items-center gap-2 p-2 cursor-pointer hover:bg-accent rounded-md"
                          >
                            {user.avatar_url ? (
                              <img 
                                src={user.avatar_url} 
                                alt={user.name || user.email} 
                                className="h-6 w-6 rounded-full"
                              />
                            ) : (
                              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                                {(user.name || user.email)?.charAt(0)}
                              </div>
                            )}
                            <div className="flex flex-col text-left">
                              <span className="font-medium">{user.name || 'Unnamed User'}</span>
                              <span className="text-xs text-muted-foreground">{user.email}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="px-2 py-1 text-xs text-muted-foreground border-t">
                        {users.length} {users.length === 1 ? 'user' : 'users'} found
                      </div>
                    </>
                  )}
                </div>
              </div>
              
              {selectedUsers.length > 0 && (
                <div className="mt-2">
                  <Label>{t('selectedParticipants')}</Label>
                  <div className="flex flex-wrap gap-2 mt-1 max-h-[100px] overflow-y-auto p-1 border rounded-md">
                    {selectedUsers.map((user) => (
                      <div 
                        key={user.id} 
                        className="flex items-center gap-1 px-2 py-1 rounded-md bg-primary/10"
                      >
                        {user.name || user.email}
                        <button 
                          type="button"
                          onClick={() => removeUser(user.id)}
                          className="text-sm text-muted-foreground hover:text-foreground"
                          aria-label={`Remove ${user.name || user.email}`}
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
        </div>
        
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => setIsOpen(false)} className="w-full sm:w-auto">
            {t('cancel')}
          </Button>
          <Button 
            type="submit" 
            disabled={isLoading || !formData.title} 
            onClick={handleCreateEvent}
            className="w-full sm:w-auto"
          >
            {isLoading ? t('creating') : t('create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 