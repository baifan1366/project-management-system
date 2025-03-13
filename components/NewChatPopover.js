'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus, Search, Users, X } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { supabase } from '@/lib/supabase';

export default function NewChatPopover() {
  const t = useTranslations('Chat');
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
        if (!session) return;

        const { data, error } = await supabase
          .from('chat_participant')
          .select(`
            chat_session (
              id,
              type,
              participants:chat_participant(
                user:user(*)
              )
            )
          `)
          .eq('user_id', session.user.id)
          .eq('chat_session.type', 'PRIVATE')
          .order('joined_at', { ascending: false })
          .limit(5);

        if (error) throw error;

        const contacts = data
          .map(item => {
            const otherParticipant = item.chat_session.participants
              .find(p => p.user.id !== session.user.id)?.user;
            return otherParticipant;
          })
          .filter(Boolean);

        setRecentContacts(contacts);
      } catch (error) {
        console.error('Error loading recent contacts:', error);
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
      if (!session) return;

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

      if (chatError) throw chatError;

      // 添加参与者
      const participants = [
        { session_id: chatSession.id, user_id: session.user.id },
        ...selectedUsers.map(user => ({
          session_id: chatSession.id,
          user_id: user.id
        }))
      ];

      const { error: participantError } = await supabase
        .from('chat_participant')
        .insert(participants);

      if (participantError) throw participantError;

      // 重置状态并关闭 popover
      setSelectedUsers([]);
      setSearchQuery('');
      setIsOpen(false);
    } catch (error) {
      console.error('Error creating chat:', error);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button className="flex items-center gap-2 w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
          <Plus className="h-5 w-5" />
          <span>{t('newChat')}</span>
        </Button>
      </PopoverTrigger>
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
    </Popover>
  );
} 