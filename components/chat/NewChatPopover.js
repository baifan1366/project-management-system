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
import useGetUser from '@/lib/hooks/useGetUser';

export default function NewChatPopover() {
  const t = useTranslations('Chat');
  const { chatMode, createAIChatSession, setCurrentSession, setChatMode } = useChat();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [recentContacts, setRecentContacts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const { user: currentUser } = useGetUser();

  // 加载最近联系人
  useEffect(() => {
    const loadRecentContacts = async () => {
      try {
        if (!currentUser) {
          console.log('未找到有效的用户，无法加载联系人');
          return;
        }

        console.log('正在加载用户ID为', currentUser.id, '的最近联系人');

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
          .eq('user_id', currentUser.id)
          .eq('chat_session.type', 'PRIVATE')
          .order('joined_at', { ascending: false })
          .limit(10); // Increased limit to get more contacts before deduplication

        if (error) {
          console.error('获取聊天参与者数据错误:', error);
          throw error;
        }

        console.log('获取到的原始数据:', data);

        // 安全地提取联系人
        const contacts = [];
        const userIdSet = new Set(); // Set to track unique user IDs
        
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
              p => p && p.user && p.user.id && p.user.id !== currentUser.id
            );
            
            if (otherParticipants.length > 0) {
              const otherUser = otherParticipants[0].user;
              
              // Only add the user if we haven't seen their ID before
              if (!userIdSet.has(otherUser.id)) {
                console.log('找到联系人:', otherUser.name);
                contacts.push(otherUser);
                userIdSet.add(otherUser.id); // Mark this user ID as seen
              } else {
                console.log('跳过重复联系人:', otherUser.name);
              }
            }
          }
        }

        console.log('处理后的联系人列表 (已去重):', contacts);
        setRecentContacts(contacts);
      } catch (error) {
        console.error('加载最近联系人时出错:', error);
        // 确保即使出错也不会影响UI
        setRecentContacts([]);
      }
    };

    if (isOpen && currentUser) {
      loadRecentContacts();
    }
  }, [isOpen, currentUser]);

  // 搜索用户
  const searchUsers = async (query) => {
    if (!query.trim() || !currentUser) {
      setSearchResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('user')
        .select('*')
        .neq('id', currentUser.id)
        .or(`name.ilike.%${query}%,email.ilike.%${query}%`)
        .limit(10);

      if (error) throw error;
      
      // Ensure no duplicate users in search results
      const uniqueUsers = Array.from(
        new Map(data.map(user => [user.id, user])).values()
      );
      
      setSearchResults(uniqueUsers);
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
      // Check if this user is already selected
      const isSelected = prev.some(u => u.id === user.id);
      
      if (isSelected) {
        // If already selected, remove the user
        return prev.filter(u => u.id !== user.id);
      } else {
        // If not selected, add the user (avoid duplicates)
        // First check if the user is already in the array (extra safety check)
        if (prev.find(u => u.id === user.id)) {
          return prev; // User already exists, don't add again
        }
        return [...prev, user];
      }
    });
  };

  // 创建新聊天
  const createChat = async () => {
    if (selectedUsers.length === 0 || !currentUser) return;

    try {
      console.log('开始创建聊天，已选择的用户:', selectedUsers.map(u => u.name).join(', '));

      // Generate a unique timestamp to ensure different chats with the same user don't conflict
      const uniqueTimestamp = Date.now().toString();

      // 创建聊天会话 - Include timestamp in name for uniqueness
      const chatName = selectedUsers.length === 1 
        ? `${selectedUsers[0].name} (${uniqueTimestamp.slice(-4)})` // Add last 4 digits of timestamp for uniqueness
        : `${selectedUsers.map(u => u.name).join(', ')}`;
        
      const { data: chatSession, error: chatError } = await supabase
        .from('chat_session')
        .insert([{
          type: selectedUsers.length === 1 ? 'PRIVATE' : 'GROUP',
          name: chatName,
          created_by: currentUser.id
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
        { session_id: chatSession.id, user_id: currentUser.id },
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

      // 给其他参与者发送通知
      try {
        const chatType = selectedUsers.length === 1 ? 'private' : 'group';
        const chatName = selectedUsers.length === 1 
          ? currentUser.name || currentUser.email 
          : `${selectedUsers.map(u => u.name).join(', ')}`;
          
        // 为每个参与者创建通知（除了自己）
        for (const user of selectedUsers) {
          await supabase
            .from('notification')
            .insert({
              user_id: user.id,
              title: selectedUsers.length === 1 ? t('newPrivateChat') : t('newGroupChat'),
              content: selectedUsers.length === 1 
                ? t('startedChatWithYou', { name: currentUser.name || currentUser.email })
                : t('addedYouToGroup', { name: currentUser.name || currentUser.email, groupName: chatName }),
              type: 'SYSTEM',
              related_entity_type: 'chat_session',
              related_entity_id: chatSession.id,
              data: {
                chat_session_id: chatSession.id,
                chat_type: chatType,
                created_by: currentUser.id,
                creator_name: currentUser.name || currentUser.email
              },
              is_read: false
            });
        }
        console.log('已向所有参与者发送聊天创建通知');
      } catch (notifyError) {
        console.error('发送通知失败:', notifyError);
        // 通知发送失败不影响主流程
      }

      // 获取完整的会话对象，包括参与者
      const { data: fullSession, error: fetchError } = await supabase
        .from('chat_session')
        .select(`
          *,
          participants:chat_participant(
            user:user_id (
              id,
              name,
              avatar_url,
              email,
              is_online,
              last_seen_at
            )
          )
        `)
        .eq('id', chatSession.id)
        .single();

      if (!fetchError && fullSession) {
        // 处理会话数据，确保包含正确的参与者信息
        const processedSession = {
          ...fullSession,
          // 过滤当前用户，只显示其他参与者
          participants: fullSession.participants
            .filter(p => p.user.id !== currentUser.id)
            .map(p => p.user),
          // 设置总参与者数量，包括当前用户和所有邀请的用户
          participantsCount: fullSession.participants.length,
          // Make sure created_by is preserved
          created_by: fullSession.created_by || currentUser.id
        };

        // 如果当前在AI模式，切换到normal模式
        if (chatMode === 'ai') {
          setChatMode('normal');
        }
        
        // 使用处理过的会话数据
        try {
          setCurrentSession(processedSession);
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
                {recentContacts.map((user, index) => (
                  <div
                    key={`${user.id}-${index}`}
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