'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus, Search, Users, X } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { supabase } from '@/lib/supabase';
import { useChat } from '@/contexts/ChatContext';
import { toast } from 'sonner';

export default function NewChatPopover() {
  const t = useTranslations('Chat');
  const { chatMode, createAIChatSession, setCurrentSession, setChatMode } = useChat();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [recentContacts, setRecentContacts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // 加载最近联系人
  useEffect(() => {
    const loadRecentContacts = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          console.log('未找到有效的会话，无法加载联系人');
          return;
        }

        console.log('正在加载用户ID为', session.user.id, '的最近联系人');

        const { data, error } = await supabase
          .from('chat_participant')
          .select(`
            chat_session:chat_session (
              id,
              type,
              name,
              participants:chat_participant(
                user:user(*)
              )
            )
          `)
          .eq('user_id', session.user.id)
          .eq('chat_session.type', 'PRIVATE')
          .order('joined_at', { ascending: false })
          .limit(5);

        if (error) {
          console.error('获取聊天参与者数据错误:', error);
          throw error;
        }

        console.log('获取到的原始数据:', data);

        // 安全地提取联系人
        const contacts = [];
        if (Array.isArray(data)) {
          for (const item of data) {
            if (!item || !item.chat_session) {
              console.log('跳过无效的聊天会话项', item);
              continue;
            }
            
            if (!Array.isArray(item.chat_session.participants)) {
              console.log('会话没有有效的参与者列表', item.chat_session);
              continue;
            }
            
            const otherParticipants = item.chat_session.participants.filter(
              p => p && p.user && p.user.id && p.user.id !== session.user.id
            );
            
            if (otherParticipants.length > 0) {
              const otherUser = otherParticipants[0].user;
              console.log('找到联系人:', otherUser.name);
              contacts.push(otherUser);
            }
          }
        }

        console.log('处理后的联系人列表:', contacts);
        setRecentContacts(contacts);
      } catch (error) {
        console.error('加载最近联系人时出错:', error);
        // 确保即使出错也不会影响UI
        setRecentContacts([]);
      }
    };

    if (isOpen) {
      loadRecentContacts();
    }
  }, [isOpen]);

  // 搜索用户
  const searchUsers = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from('user')
        .select('*')
        .neq('id', session.user.id)
        .or(`name.ilike.%${query}%,email.ilike.%${query}%`)
        .limit(10);

      if (error) throw error;
      setSearchResults(data);
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 处理搜索输入
  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    searchUsers(query);
  };

  // 选择/取消选择用户
  const toggleUser = (user) => {
    setSelectedUsers(prev => {
      const isSelected = prev.some(u => u.id === user.id);
      if (isSelected) {
        return prev.filter(u => u.id !== user.id);
      } else {
        return [...prev, user];
      }
    });
  };

  // 创建新聊天
  const createChat = async () => {
    if (selectedUsers.length === 0) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error('用户未登录，无法创建聊天');
        toast.error(t('errors.userNotLoggedIn'));
        return;
      }

      console.log('开始创建聊天，已选择的用户:', selectedUsers.map(u => u.name).join(', '));

      // 创建聊天会话
      const { data: chatSession, error: chatError } = await supabase
        .from('chat_session')
        .insert([{
          type: selectedUsers.length === 1 ? 'PRIVATE' : 'GROUP',
          name: selectedUsers.length === 1 ? null : `${selectedUsers.map(u => u.name).join(', ')}`,
          created_by: session.user.id
        }])
        .select()
        .single();

      if (chatError) {
        console.error('创建聊天会话失败:', chatError);
        toast.error(t('errors.connectionFailed'));
        throw chatError;
      }

      console.log('成功创建聊天会话:', chatSession);

      // 添加参与者
      const participants = [
        { session_id: chatSession.id, user_id: session.user.id },
        ...selectedUsers.map(user => ({
          session_id: chatSession.id,
          user_id: user.id
        }))
      ];

      console.log('正在添加聊天参与者:', participants.length, '人');

      const { error: participantError } = await supabase
        .from('chat_participant')
        .insert(participants);

      if (participantError) {
        console.error('添加聊天参与者失败:', participantError);
        toast.error(t('invitationFailed'));
        throw participantError;
      }

      console.log('聊天创建成功，正在切换到新会话');
      toast.success(selectedUsers.length === 1 ? t('chatCreated') : t('groupCreated'));

      // 获取完整的会话对象，包括参与者
      const { data: fullSession, error: fetchError } = await supabase
        .from('chat_session')
        .select('*')
        .eq('id', chatSession.id)
        .single();

      if (!fetchError && fullSession) {
        // 如果当前在AI模式，切换到normal模式
        if (chatMode === 'ai') {
          setChatMode('normal');
        }
        
        // 直接在这里设置当前会话，提供更好的用户体验
        try {
          setCurrentSession(fullSession);
        } catch (err) {
          console.error('设置当前会话失败:', err);
        }
      }

      // 重置状态并关闭 popover
      setSelectedUsers([]);
      setSearchQuery('');
      setIsOpen(false);
    } catch (error) {
      console.error('创建聊天时发生错误:', error);
      toast.error(t('errors.connectionFailed'));
    }
  };

  // 处理新建聊天按钮点击
  const handleNewChatClick = async () => {
    // 如果是 AI 聊天模式，清空当前对话但不立即创建新会话
    if (chatMode === 'ai') {
      // 取消选择当前会话，让 AIChatBot 组件显示空白对话界面
      setCurrentSession(null);
      
      // 触发重置对话ID事件
      const resetEvent = new CustomEvent('reset-ai-conversation');
      window.dispatchEvent(resetEvent);
      console.log('发送重置AI对话ID事件');
      
      // 发送一个自定义事件通知 AIChatBot 组件清空消息
      const clearEvent = new CustomEvent('ai-chat-clear');
      window.dispatchEvent(clearEvent);
      console.log('发送清空AI聊天事件');
      
      return;
    }
    
    // 如果是普通聊天模式，则打开选择用户的 popover
    setIsOpen(true);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button 
          className="flex items-center gap-2 w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          onClick={chatMode === 'ai' ? handleNewChatClick : undefined}
        >
          <Plus className="h-5 w-5" />
          <span>{chatMode === 'ai' ? t('newAIChat') : t('newChat')}</span>
        </Button>
      </PopoverTrigger>
      {chatMode !== 'ai' && (
        <PopoverContent className="w-80 p-0" align="start">
          <div className="p-4 border-b">
            <div className="flex items-center gap-2 mb-3">
              {selectedUsers.map(user => (
                <Badge
                  key={user.id}
                  variant="secondary"
                  className="flex items-center gap-1"
                >
                  {user.name}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => toggleUser(user)}
                  />
                </Badge>
              ))}
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder={t('searchUsers')}
                value={searchQuery}
                onChange={handleSearchChange}
                className="pl-9 pr-4"
              />
            </div>
          </div>

          <ScrollArea className="max-h-[300px] overflow-y-auto">
            {searchQuery ? (
              // 搜索结果
              <div className="p-2">
                {isLoading ? (
                  <div className="text-center py-4 text-sm text-muted-foreground">
                    {t('searching')}...
                  </div>
                ) : searchResults.length > 0 ? (
                  searchResults.map(user => (
                    <div
                      key={user.id}
                      className="flex items-center gap-3 p-2 hover:bg-accent rounded-md cursor-pointer"
                      onClick={() => toggleUser(user)}
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.avatar_url} />
                        <AvatarFallback>{user.name?.[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{user.name}</p>
                        <p className="text-sm text-muted-foreground truncate">
                          {user.email}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-sm text-muted-foreground">
                    {t('noResults')}
                  </div>
                )}
              </div>
            ) : (
              // 最近联系人
              <div className="p-2">
                <div className="flex items-center gap-2 p-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  {t('recentContacts')}
                </div>
                {recentContacts.map(user => (
                  <div
                    key={user.id}
                    className="flex items-center gap-3 p-2 hover:bg-accent rounded-md cursor-pointer"
                    onClick={() => toggleUser(user)}
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.avatar_url} />
                      <AvatarFallback>{user.name?.[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{user.name}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {user.email}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {selectedUsers.length > 0 && (
            <div className="p-4 border-t">
              <Button
                className="w-full"
                onClick={createChat}
              >
                {selectedUsers.length === 1
                  ? t('startChat')
                  : t('createGroup')}
              </Button>
            </div>
          )}
        </PopoverContent>
      )}
    </Popover>
  );
} 