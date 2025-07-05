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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { checkUserRelationship } from '@/lib/utils/checkUserRelationship';
import { useConfirm } from '@/hooks/use-confirm';

export default function CreateCalendarEvent({ 
  isOpen, 
  setIsOpen, 
  selectedDate = new Date(), 
  onSuccess, 
  isGoogleConnected = false,
  isEditing = false,
  eventToEdit = null
}) {
  const t = useTranslations('Calendar');
  const { confirm } = useConfirm();
  const [eventType, setEventType] = useState(isEditing && eventToEdit ? 
    eventToEdit.type || (eventToEdit.originalEvent ? 'google' : 'task') : 'task'); // 'task', 'google', 'personal'
  const [isLoading, setIsLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const { user: session } = useGetUser();
  const [dateError, setDateError] = useState('');
  
  
  // 事件表单数据
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startDate: selectedDate,
    startTime: format(addHours(new Date().setMinutes(0, 0, 0), 1), 'hh:mm'),
    endDate: selectedDate,
    endTime: format(addHours(new Date().setMinutes(0, 0, 0), 2), 'hh:mm'),
    isAllDay: false,
    location: '',
    reminders: false,
    addGoogleMeet: false, // 是否添加Google Meet视频会议
    inviteParticipants: false, // 是否邀请参与者
    priority: 'MEDIUM',
  });

  // 添加日期时间验证状态
  const [formErrors, setFormErrors] = useState({
    dateError: '',
    timeError: ''
  });

  // Initialize form data when editing an existing event
  useEffect(() => {
    if (isEditing && eventToEdit) {
      // Set event type based on the event being edited
      if (eventToEdit.originalEvent) {
        // Google Calendar event
        setEventType('google');
        
        // Initialize selected users from attendees
        if (eventToEdit.attendees && eventToEdit.attendees.length > 0) {
          // Filter out the current user who is likely the organizer
          const attendees = eventToEdit.attendees
            .filter(attendee => !attendee.self)
            .map(attendee => ({
              id: attendee.email, // Use email as ID since we don't have actual user IDs
              name: attendee.displayName || attendee.email,
              email: attendee.email,
              avatar_url: null // We don't have avatar URLs from Google
            }));
            
          setSelectedUsers(attendees);
          
          if (attendees.length > 0) {
            setFormData(prev => ({
              ...prev,
              inviteParticipants: true
            }));
          }
        }
      } else if (eventToEdit.expected_completion_date) {
        // Task
        setEventType('task');
      } else {
        // Personal calendar event
        setEventType('personal');
      }
      
      // Set form data from event
      setFormData({
        title: eventToEdit.title || eventToEdit.summary || '',
        description: eventToEdit.description || '',
        startDate: eventToEdit.startDate || selectedDate,
        startTime: eventToEdit.startTime || format(new Date().setMinutes(0, 0, 0), 'hh:mm'),
        endDate: eventToEdit.endDate || selectedDate,
        endTime: eventToEdit.endTime || format(addHours(new Date().setMinutes(0, 0, 0), 1), 'hh:mm'),
        isAllDay: eventToEdit.isAllDay || false,
        location: eventToEdit.location || '',
        reminders: eventToEdit.reminders || false,
        addGoogleMeet: eventToEdit.addGoogleMeet || false,
        inviteParticipants: eventToEdit.attendees?.length > 0 || false,
        priority: eventToEdit.priority || 'MEDIUM',
      });
    }
  }, [isEditing, eventToEdit, selectedDate]);

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
      
      
      setUsers(data || []);
    } catch (error) {
      console.error('搜索用户失败:', error);
      toast.error('Failed to search users');
    } finally {
      setIsLoadingUsers(false);
    }
  };

  // 选择用户
  const selectUser = async (user) => {
    // Check if this user is already selected
    if (selectedUsers.some(u => u.id === user.id)) {
      return;
    }

    // Check if this is an external user
    try {
      if (!session) {
        toast.error(t('notLoggedIn') || 'Not logged in');
        return;
      }

      const result = await checkUserRelationship(session.id, user.id);
      
      if (result.isExternal) {
        // Show confirmation dialog for external users
        confirm({
          title: t('externalUserConfirmTitle') || 'Add External User',
          description: t('externalUserConfirmDescription', { name: user.name }) || 
            `${user.name} is not a member of any of your teams. Are you sure you want to invite this external user?`,
          confirmText: t('confirm') || 'Confirm',
          cancelText: t('cancel') || 'Cancel',
          onConfirm: () => {
            // User confirmed, add the user
            setSelectedUsers([...selectedUsers, user]);
          }
        });
      } else {
        // For internal users, add directly
        setSelectedUsers([...selectedUsers, user]);
      }
    } catch (error) {
      console.error('Error checking user relationship:', error);
      toast.error(t('userCheckFailed') || 'Failed to check user details');
    }
  };

  // 移除用户
  const removeUser = (userId) => {
    setSelectedUsers(selectedUsers.filter(user => user.id !== userId));
  };

  // 验证表单数据
  const validateForm = () => {
    const errors = {
      dateError: '',
      timeError: ''
    };
    
    // Parse time string to hours and minutes
    const parseTimeString = (timeStr) => {
      const [hours, minutes] = timeStr.split(':').map(Number);
      return [hours, minutes];
    };
    
    // 创建完整的开始日期时间和结束日期时间
    const [startHour, startMinute] = parseTimeString(formData.startTime);
    const [endHour, endMinute] = parseTimeString(formData.endTime);
    
    const startDateTime = new Date(
      formData.startDate.getFullYear(),
      formData.startDate.getMonth(),
      formData.startDate.getDate(),
      startHour,
      startMinute
    );
    
    const endDateTime = new Date(
      formData.endDate.getFullYear(),
      formData.endDate.getMonth(),
      formData.endDate.getDate(),
      endHour,
      endMinute
    );
    
    // 验证开始日期不是过去的日期
    const now = new Date();
    const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startDateMidnight = new Date(formData.startDate.getFullYear(), formData.startDate.getMonth(), formData.startDate.getDate());
    
    // Always check if the date is in the past, even when editing
    if (startDateMidnight < todayDate) {
      errors.dateError = t('cannotSelectPastDate') || 'Cannot select a date in the past';
    }
    
    // 验证今天的开始时间不是过去的时间 - only check if start date is today
    if (isSameDay(formData.startDate, now) && startDateTime < now) {
      errors.timeError = t('cannotSelectPastTime') || 'Cannot select a time in the past';
    }
    
    // Check for time confusion issues
    const startHour24 = parseInt(formData.startTime.split(':')[0], 10);
    const endHour24 = parseInt(formData.endTime.split(':')[0], 10);
    
    // 验证结束日期时间不早于开始日期时间 - compare full date-times
    if (endDateTime < startDateTime) {
      if (!isSameDay(formData.startDate, formData.endDate)) {
        // Use a more appropriate error message for different days
        errors.timeError = t('endTimeBeforeStartAcrossDays') || 'End date/time must be after start date/time';
      } else {
        errors.timeError = t('endTimeCannotBeBeforeStart') || 'End time cannot be before start time';
      }
    }
    
    setFormErrors(errors);
    return !errors.dateError && !errors.timeError;
  }

  // 处理日期变化
  const handleDateChange = (date, name) => {
    // 当开始日期变化时，如果结束日期在开始日期之前，则自动调整结束日期
    if (name === 'startDate' && formData.endDate < date) {
      setFormData((prev) => ({ 
        ...prev, 
        [name]: date,
        endDate: date 
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: date }));
    }
    
    // 清除之前的所有错误，因为日期变化可能会解决时间相关的问题
    setFormErrors(prev => ({
      dateError: '',
      timeError: ''
    }));
  };
  
  // Handle time input changes with validation
  const handleTimeChange = (e) => {
    const { name, value } = e.target;
    
    setFormData((prev) => ({ ...prev, [name]: value }));
    
    // 当开始时间变化时，如果时间范围变成无效（结束时间在开始时间之前），则自动调整结束时间
    // Only auto-adjust when start and end dates are the same day
    if (name === 'startTime' && formData.startDate && formData.endDate && isSameDay(formData.startDate, formData.endDate)) {
      const [startHour, startMinute] = value.split(':').map(Number);
      const [endHour, endMinute] = formData.endTime.split(':').map(Number);
      
      if (startHour > endHour || (startHour === endHour && startMinute >= endMinute)) {
        // 如果新的开始时间大于等于结束时间，则将结束时间设置为开始时间后的1小时
        const newEndHour = (startHour + 1) % 24;
        setFormData(prev => ({
          ...prev,
          endTime: `${newEndHour.toString().padStart(2, '0')}:${startMinute.toString().padStart(2, '0')}`
        }));
      }
    }
    
    // 清除之前的错误
    setFormErrors(prev => ({
      ...prev,
      timeError: ''
    }));
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

  // 创建或更新事件
  const handleCreateEvent = async (e) => {
    if (e) e.preventDefault();
    
    try {
      // 先验证表单数据
      if (!validateForm()) {
        return; // 如果验证失败，不提交表单
      }
      
      setIsLoading(true);
      
      // Parse time string to get hours and minutes
      const getTimeComponents = (timeStr) => {
        const [hours, minutes] = timeStr.split(':').map(Number);
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      };
      
      // Validate that event time is not in the past
      const now = new Date();
      
      // Get the time string
      const startTimeStr = getTimeComponents(formData.startTime);
      const endTimeStr = getTimeComponents(formData.endTime);
      
      const startDateTime = formData.isAllDay 
        ? new Date(format(formData.startDate, 'yyyy-MM-dd') + 'T00:00:00')
        : new Date(format(formData.startDate, 'yyyy-MM-dd') + 'T' + startTimeStr + ':00');
      
      // Always check if start date/time is in the past, even when editing
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
          // 检查是否是编辑模式
          const isUpdateMode = isEditing && eventToEdit && eventToEdit.id;
          
          // 准备 mytasks 数据
          const startDateTime = formData.isAllDay 
            ? format(formData.startDate, 'yyyy-MM-dd')
            : format(formData.startDate, 'yyyy-MM-dd') + 'T' + startTimeStr + ':00';
          
          const endDateTime = formData.isAllDay
            ? `${format(formData.endDate, 'yyyy-MM-dd')}T23:59:59`
            : `${format(formData.endDate, 'yyyy-MM-dd')}T${endTimeStr}:00`;
          
          if (session) {
            // 检查 user_id 是否是有效的 UUID 格式
            const userId = session.id;
            if (!userId) {
              console.error('Missing user ID:', userId);
              toast.error(t('missingUserId') || 'User ID not found. Please try signing in again.');
              return;
            }
            
            if (isUpdateMode) {
              // 更新现有任务
              
              
              // 准备任务数据
              const taskData = {
                title: formData.title,
                description: formData.description || '',
                expected_start_time: startDateTime,
                expected_completion_date: endDateTime,
                priority: formData.priority || 'MEDIUM',
                updated_at: new Date().toISOString()
              };
              
              const { data, error } = await supabase.from('mytasks')
                .update(taskData)
                .eq('id', eventToEdit.id)
                .select();
              
              if (error) {
                console.error('Error updating task:', error);
                throw new Error(error.message || t('updateTaskFailed') || 'Failed to update task');
              }
              
              
            } else {
              // 创建新任务
              const taskData = {
                user_id: userId,
                title: formData.title,
                description: formData.description || '',
                status: 'TODO',
                priority: formData.priority || 'MEDIUM',
                expected_start_time: startDateTime,
                expected_completion_date: endDateTime
              };
              
              const { data, error } = await supabase.from('mytasks')
                .insert(taskData)
                .select();
              
              if (error) {
                console.error('Error details:', error);
                throw new Error(error.message || t('createTaskFailed') || 'Failed to create task');
              }
              
              
            }
          } else {
            throw new Error(t('notLoggedIn') || 'Not logged in');
          }
        } catch (error) {
          console.error('Error creating/updating task:', error);
          toast.error(error.message || (isEditing ? t('taskUpdateFailed') : t('eventCreationFailed')));
          return; // Stop execution if there's an error
        }
      } else if (eventType === 'personal') {
        // 创建个人日历事件
        if (!session) {
          throw new Error('未登录状态');
        }

        const startDateTime = formData.isAllDay 
          ? `${format(formData.startDate, 'yyyy-MM-dd')}T00:00:00`
          : `${format(formData.startDate, 'yyyy-MM-dd')}T${startTimeStr}:00`;
        
        const endDateTime = formData.isAllDay
          ? `${format(formData.endDate, 'yyyy-MM-dd')}T23:59:59`
          : `${format(formData.endDate, 'yyyy-MM-dd')}T${endTimeStr}:00`;
        
        const personalEventData = {
          title: formData.title,
          description: formData.description,
          start_time: startDateTime,
          end_time: endDateTime,
          is_all_day: formData.isAllDay,
          location: formData.location,
          color: '#9c27b0', // Default purple color
          user_id: session.id
        };
        
        // 检查是否是编辑模式
        const isUpdateMode = isEditing && eventToEdit && eventToEdit.id;
        
        if (isUpdateMode) {
          // 更新现有个人事件
          
          const { error } = await supabase
            .from('personal_calendar_event')
            .update(personalEventData)
            .eq('id', eventToEdit.id);
          
          if (error) {
            console.error('更新个人日历事件失败:', error);
            throw new Error(error.message || '更新个人日历事件失败');
          }
        } else {
          // 创建新的个人事件
          const { error } = await supabase
            .from('personal_calendar_event')
            .insert(personalEventData);
          
          if (error) {
            console.error('创建个人日历事件失败:', error);
            throw new Error(error.message || '创建个人日历事件失败');
          }
        }
      } else if (eventType === 'google') {
        // 创建或更新Google日历事件
        const startDateTime = formData.isAllDay 
          ? format(formData.startDate, 'yyyy-MM-dd')
          : format(formData.startDate, 'yyyy-MM-dd') + 'T' + startTimeStr + ':00';
        
        const endDateTime = formData.isAllDay
          ? format(formData.endDate, 'yyyy-MM-dd')
          : format(formData.endDate, 'yyyy-MM-dd') + 'T' + endTimeStr + ':00';
        
        // Check for Google tokens in the user session
        let accessToken = session?.google_access_token || null;
        let refreshToken = session?.google_refresh_token || null;
        
        // Add debug logging
        
        
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
        
        // Determine if we're creating or updating an event
        const isUpdateOperation = isEditing && eventToEdit && eventToEdit.id;
        const apiPath = isUpdateOperation ? 
          `/api/google-calendar/events/${eventToEdit.id}` : 
          '/api/google-calendar';
        
        const method = isUpdateOperation ? 'PATCH' : 'POST';
        
        // If updating, handle existing conference data
        if (isUpdateOperation && eventToEdit.originalEvent?.conferenceData && !formData.addGoogleMeet) {
          // We're removing the conference data
          eventData.conferenceData = null;
        } else if (isUpdateOperation && eventToEdit.originalEvent?.conferenceData && formData.addGoogleMeet) {
          // We're keeping existing conference data
          eventData.conferenceData = eventToEdit.originalEvent.conferenceData;
        }
        
        const response = await fetch(apiPath, {
          method: method,
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            eventData,
            accessToken,
            refreshToken,
            conferenceDataVersion: formData.addGoogleMeet ? 1 : 0,
            sendNotifications: formData.inviteParticipants,
            sendUpdates: isUpdateOperation ? 'all' : undefined,
            userId: session.id
          }),
        });
        
        if (response.status === 401) {
          throw new Error('Google授权已过期或权限不足，请重新连接Google账号');
        }
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error('创建/更新Google日历事件失败:', errorData);
          
          if (errorData.error && errorData.error.includes('insufficient authentication scopes')) {
            throw new Error('Google Calendar权限不足，请重新登录并授予完整日历访问权限');
          }
          
          throw new Error(errorData.error || '创建/更新Google日历事件失败');
        }
        
        // 获取创建或更新的事件数据，包括Meet链接
        const eventResponseData = await response.json();
        
        // 如果有参与者且有会议链接，创建通知
        if (formData.inviteParticipants && formData.addGoogleMeet && 
            eventResponseData.event.hangoutLink && !isUpdateOperation) {
          const meetLink = eventResponseData.event.hangoutLink;
          
          // 为每个参与者创建通知
          for (const user of selectedUsers) {
            await supabase
              .from('notification')
              .insert({
                user_id: user.id,
                title: `${t('meetingInvitation')}: ${formData.title}`,
                content: `${session.name || '用户'} ${t('invitedYouToMeeting')}`,
                type: 'MEETING_INVITE',
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
        startTime: format(addHours(new Date().setMinutes(0, 0, 0), 1), 'hh:mm'),
        endDate: new Date(),
        endTime: format(addHours(new Date().setMinutes(0, 0, 0), 2), 'hh:mm'),
        isAllDay: false,
        location: '',
        reminders: false,
        addGoogleMeet: false,
        inviteParticipants: false,
        priority: 'MEDIUM',
      });
      
      setSelectedUsers([]);
      setFormErrors({
        dateError: '',
        timeError: ''
      });
      setIsOpen(false);
      
      // 根据事件类型和操作类型显示不同的成功消息
      if (isEditing) {
        if (eventType === 'task') {
          toast.success(t('taskUpdated') || 'Task updated successfully');
        } else if (eventType === 'personal') {
          toast.success(t('personalEventUpdated') || 'Personal event updated successfully');
        } else {
          toast.success(t('eventUpdated') || 'Event updated successfully');
        }
      } else {
        if (eventType === 'task') {
          toast.success(t('taskCreated') || 'Task created successfully');
        } else if (eventType === 'personal') {
          toast.success(t('personalEventCreated') || 'Personal event created successfully');
        } else {
          toast.success(t('eventCreated') || 'Event created successfully');
        }
      }
      
      // 如果有成功回调，调用它
      if (onSuccess) {
        onSuccess();
      }
      
    } catch (error) {
      console.error('Error creating/updating event:', error);
      toast.error(error.message || (isEditing ? t('eventUpdateFailed') : t('eventCreationFailed')));
    } finally {
      setIsLoading(false);
    }
  };
  
  // Add this effect to reset editing state when dialog closes
  useEffect(() => {
    // When dialog closes, reset editing state
    if (!isOpen && isEditing) {
      // We don't need to modify isEditing here as it's passed as prop
      // But we should reset the form if dialog is closed
      setFormData({
        title: '',
        description: '',
        startDate: selectedDate,
        startTime: format(addHours(new Date().setMinutes(0, 0, 0), 1), 'hh:mm'),
        endDate: selectedDate,
        endTime: format(addHours(new Date().setMinutes(0, 0, 0), 2), 'hh:mm'),
        isAllDay: false,
        location: '',
        reminders: false,
        addGoogleMeet: false,
        inviteParticipants: false,
        priority: 'MEDIUM',
      });
      setSelectedUsers([]);
      setFormErrors({
        dateError: '',
        timeError: ''
      });
    }
  }, [isOpen, isEditing, selectedDate]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      // If dialog is closing, make sure to reset editing state in parent component
      if (!open && isEditing) {
        // Call setIsOpen directly to close the dialog
        setIsOpen(false);
      } else {
        setIsOpen(open);
      }
    }}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>{isEditing ? t('editEvent') : t('createEvent')}</DialogTitle>
          <DialogDescription>
            {isEditing ? t('editEventDescription') : t('createEventDescription')}
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <Tabs 
            value={eventType} 
            onValueChange={setEventType} 
            className="w-full mb-2"
            disabled={isEditing} // Disable changing event type when editing
          >
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="task" disabled={isEditing && eventType !== 'task'}>{t('task')}</TabsTrigger>
              <TabsTrigger value="personal" disabled={(isEditing && eventType !== 'personal') || !session}>{t('personalCalendar')}</TabsTrigger>
              <TabsTrigger value="google" disabled={(isEditing && eventType !== 'google') || !isGoogleConnected}>{t('googleCalendar')}</TabsTrigger>
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
              maxLength={50}
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
              maxLength={100}
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
                      formErrors.dateError && "border-red-500"
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
              {formErrors.dateError && <p className="text-xs text-red-500 mt-1">{formErrors.dateError}</p>}
            </div>
            
            {!formData.isAllDay && (
              <div className="space-y-2">
                <Label htmlFor="startTime">{t('startTime')}</Label>
                <Input 
                  id="startTime" 
                  name="startTime" 
                  type="time" 
                  value={formData.startTime} 
                  onChange={handleTimeChange} 
                  className={cn(formErrors.timeError && "border-red-500")}
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
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      formErrors.dateError && "border-red-500"
                    )}
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
                    disabled={(date) => !isEditing && date < formData.startDate}
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
                  onChange={handleTimeChange}
                  className={cn(formErrors.timeError && "border-red-500")}
                />
                {formErrors.timeError && <p className="text-xs text-red-500 mt-1">{formErrors.timeError}</p>}
              </div>
            )}
          </div>
          
          {/* Priority selector for tasks */}
          {eventType === 'task' && (
            <div className="space-y-2">
              <Label htmlFor="priority">{t('priority')}</Label>
              <Select 
                value={formData.priority} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('selectPriority')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">{t('lowPriority')}</SelectItem>
                  <SelectItem value="MEDIUM">{t('mediumPriority')}</SelectItem>
                  <SelectItem value="HIGH">{t('highPriority')}</SelectItem>
                  <SelectItem value="URGENT">{t('urgentPriority')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          
          {(eventType === 'google' || eventType === 'personal') && (
            <div className="space-y-2">
              <Label htmlFor="location">{t('location')}</Label>
              <Input 
                id="location" 
                name="location" 
                value={formData.location} 
                onChange={handleInputChange} 
                placeholder={t('locationPlaceholder')} 
                maxLength={30}
              />
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
                    maxLength={30}
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
          <Button variant="outline" onClick={() => {
            // Reset form and close dialog
            setFormData({
              title: '',
              description: '',
              startDate: selectedDate,
              startTime: format(addHours(new Date().setMinutes(0, 0, 0), 1), 'hh:mm'),
              endDate: selectedDate,
              endTime: format(addHours(new Date().setMinutes(0, 0, 0), 2), 'hh:mm'),
              isAllDay: false,
              location: '',
              reminders: false,
              addGoogleMeet: false,
              inviteParticipants: false,
              priority: 'MEDIUM',
            });
            setSelectedUsers([]);
            setFormErrors({
              dateError: '',
              timeError: ''
            });
            setIsOpen(false);
          }} className="w-full sm:w-auto">
            {t('cancel')}
          </Button>
          <Button 
            type="submit" 
            disabled={isLoading || !formData.title} 
            onClick={handleCreateEvent}
            className="w-full sm:w-auto"
          >
            {isLoading ? (isEditing ? t('updating') : t('creating')) : (isEditing ? t('update') : t('create'))}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 