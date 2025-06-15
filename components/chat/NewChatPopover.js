'use client';

import { useState, useEffect, useRef, createContext, useContext } from 'react';
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
import ExternalBadge from '@/components/users/ExternalBadge';
import { checkUserRelationship, checkUserRelationshipBatch } from '@/lib/utils/checkUserRelationship';
import { useConfirm } from '@/hooks/use-confirm';

// Context for storing user relationship data
const UserRelationshipsContext = createContext({});

// User item component to show user with external badge if needed
const UserItem = ({ user, onClick }) => {
  const relationships = useContext(UserRelationshipsContext);
  const relationshipData = relationships[user.id] || { isExternal: false, isLoading: true };
  
  return (
    <div
      className="flex items-center gap-3 p-2 hover:bg-accent rounded-md cursor-pointer"
      onClick={onClick}
    >
      <Avatar className="h-8 w-8">
        <AvatarImage src={user.avatar_url} />
        <AvatarFallback>{user.name?.[0]}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <p className="font-medium truncate">{user.name}</p>
          {!relationshipData.isLoading && relationshipData.isExternal && (
            <ExternalBadge className="ml-1 py-0 px-1 text-[10px]" />
          )}
        </div>
        <p className="text-sm text-muted-foreground truncate">
          {user.email}
        </p>
      </div>
    </div>
  );
};

export default function NewChatPopover({ className, buttonContent }) {
  const t = useTranslations('Chat');
  const { chatMode, createAIChatSession, setCurrentSession, setChatMode, fetchMessages } = useChat();
  const [isOpen, setIsOpen] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [recentContacts, setRecentContacts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const { user: currentUser } = useGetUser();
  const { confirm } = useConfirm();
  const [relationships, setRelationships] = useState({});

  // Save popover state when confirmation dialog opens
  const onPopoverOpenChange = (open) => {
    // Only allow closing if confirmation dialog is not open
    if (!isConfirmDialogOpen || open) {
      setIsOpen(open);
    }
  };

  // Helper function to check relationships in batch
  const checkRelationshipsForUsers = async (users) => {
    if (!users?.length || !currentUser?.id) return;
    
    try {
      const userIds = users.map(user => user.id);
      const relationshipData = await checkUserRelationshipBatch(currentUser.id, userIds);
      
      setRelationships(prev => ({
        ...prev,
        ...relationshipData
      }));
    } catch (error) {
      console.error('Error checking relationships for users:', error);
    }
  };

  // 加载最近联系人
  useEffect(() => {
    const loadRecentContacts = async () => {
      try {
        if (!currentUser) {
          
          return;
        }

        

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

        

        // 安全地提取联系人
        const contacts = [];
        const userIdSet = new Set(); // Set to track unique user IDs
        
        if (Array.isArray(data)) {
          for (const item of data) {
            if (!item || !item.chat_session) {
              
              continue;
            }
            
            if (!Array.isArray(item.chat_session.participants)) {
              
              continue;
            }
            
            const otherParticipants = item.chat_session.participants.filter(
              p => p && p.user && p.user.id && p.user.id !== currentUser.id
            );
            
            if (otherParticipants.length > 0) {
              const otherUser = otherParticipants[0].user;
              
              // Only add the user if we haven't seen their ID before
              if (!userIdSet.has(otherUser.id)) {
                
                contacts.push(otherUser);
                userIdSet.add(otherUser.id); // Mark this user ID as seen
              } else {
                
              }
            }
          }
        }


        setRecentContacts(contacts);
        
        // Check relationships for recent contacts in batch
        await checkRelationshipsForUsers(contacts);
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
      
      // Check relationships for search results in batch
      await checkRelationshipsForUsers(uniqueUsers);
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
  const toggleUser = async (user) => {
    // Check if this user is already selected
    const isSelected = selectedUsers.some(u => u.id === user.id);
    
    if (isSelected) {
      // If already selected, simply remove the user
      setSelectedUsers(prev => prev.filter(u => u.id !== user.id));
      return;
    }
    
    // Get the relationship data from context, or fetch it if not available
    let isExternal = relationships[user.id]?.isExternal;
    
    if (isExternal === undefined) {
      // If relationship data isn't already available, fetch it
      const result = await checkUserRelationship(currentUser.id, user.id);
      isExternal = result.isExternal;
      
      // Update the relationships state
      setRelationships(prev => ({
        ...prev,
        [user.id]: result
      }));
    }
    
    if (isExternal) {
      // Prevent popover from closing
      setIsConfirmDialogOpen(true);
      
      // Show confirmation dialog for external users
      confirm({
        title: t('externalUserConfirmTitle') || 'Add External User',
        description: t('externalUserConfirmDescription', { name: user.name }) || `${user.name} is not a member of any of your teams. Are you sure you want to start a chat with this external user?`,
        confirmText: t('confirm') || 'Confirm',
        cancelText: t('cancel') || 'Cancel',
        preventClose: true,
        onConfirm: () => {
          setSelectedUsers(prev => {
            // First check if the user is already in the array (extra safety check)
            if (prev.find(u => u.id === user.id)) {
              return prev; // User already exists, don't add again
            }
            // Add the user and then create the chat immediately
            const newSelectedUsers = [...prev, user];
            
            return newSelectedUsers;
          });
          // Reset confirmation dialog state
          setIsConfirmDialogOpen(false);
        },
        onCancel: () => {
          // Reset confirmation dialog state
          setIsConfirmDialogOpen(false);
        }
      });
    } else {
      // For internal users, add without confirmation
      setSelectedUsers(prev => {
        // First check if the user is already in the array (extra safety check)
        if (prev.find(u => u.id === user.id)) {
          return prev; // User already exists, don't add again
        }
        return [...prev, user];
      });
    }
  };

  // 创建新聊天
  const createChat = async () => {
    if (selectedUsers.length === 0 || !currentUser) return;

    try {

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

      

      // 添加参与者
      const participants = [
        { session_id: chatSession.id, user_id: currentUser.id },
        ...selectedUsers.map(user => ({
          session_id: chatSession.id,
          user_id: user.id
        }))
      ];

      

      const { error: participantError } = await supabase
        .from('chat_participant')
        .insert(participants);

      if (participantError) {
        console.error('添加聊天参与者失败:', participantError);
        toast.error(t('invitationFailed'));
        throw participantError;
      }

      
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

  // 创建新的AI聊天
  const handleAIChatClick = async () => {
    try {
      // First clear the current session to ensure messages are cleared
      setCurrentSession(null);
      
      // Pass true to force creating a new session instead of reusing existing ones
      const aiSession = await createAIChatSession(true);
      
      // Set the current session to the new AI session
      setCurrentSession(aiSession);
      
      // Load fresh messages for this session (this will be empty for a new session)
      if (aiSession && aiSession.id) {
        fetchMessages(aiSession.id);
      }
      
      if (chatMode === 'normal') {
        setChatMode('ai');
      }
      
      setIsOpen(false);
      setSelectedUsers([]);
    } catch (error) {
      console.error('Error creating AI chat:', error);
      toast.error('Failed to create AI chat');
    }
  };
  
  // 处理新建聊天按钮点击
  const handleNewChatClick = async () => {
    if (chatMode === 'ai') {
      handleAIChatClick();
    } else {
      setIsOpen(true);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={onPopoverOpenChange}>
      <PopoverTrigger asChild>
        <Button 
          variant="default" 
          onClick={handleNewChatClick}
          className={className || "w-full"}
        >
          {buttonContent || (
            <>
              <Plus className="mr-2 h-4 w-4" /> {t('newChat')}
            </>
          )}
        </Button>
      </PopoverTrigger>
      {chatMode !== 'ai' && (
        <PopoverContent className="w-80 p-0" align="start" onInteractOutside={(e) => {
          // Prevent closing the popover when interacting with confirm dialog
          if (e.target.closest('[role="dialog"]')) {
            e.preventDefault();
          }
        }}>
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

          <UserRelationshipsContext.Provider value={relationships}>
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
                      <UserItem 
                        key={user.id} 
                        user={user} 
                        onClick={() => toggleUser(user)} 
                      />
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
                    <UserItem 
                      key={`${user.id}-${index}`} 
                      user={user} 
                      onClick={() => toggleUser(user)} 
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          </UserRelationshipsContext.Provider>

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