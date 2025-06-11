import { useState, createContext, useContext } from 'react';
import { useTranslations } from 'next-intl';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, UserPlus, X } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { supabase } from '@/lib/supabase';
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

export default function InviteUserPopover({ sessionId, onInvite, inDropdown = false }) {
  const t = useTranslations('Chat');
  const [isOpen, setIsOpen] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useGetUser();
  const { confirm } = useConfirm();
  const [relationships, setRelationships] = useState({});
  
  // Helper function to check relationships in batch
  const checkRelationshipsForUsers = async (users) => {
    if (!users?.length || !user?.id) return;
    
    try {
      const userIds = users.map(user => user.id);
      const relationshipData = await checkUserRelationshipBatch(user.id, userIds);
      
      setRelationships(prev => ({
        ...prev,
        ...relationshipData
      }));
    } catch (error) {
      console.error('Error checking relationships for users:', error);
    }
  };
  
  // 搜索用户
  const searchUsers = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsLoading(true);
    try {
      if (!user) return;

      // 获取已经在会话中的用户ID
      const { data: existingParticipants } = await supabase
        .from('chat_participant')
        .select('user_id')
        .eq('session_id', sessionId);

      const existingUserIds = existingParticipants.map(p => p.user_id);

      // 搜索不在会话中的用户
      const { data, error } = await supabase
        .from('user')
        .select('*')
        .not('id', 'in', `(${existingUserIds.join(',')})`)
        .or(`name.ilike.%${query}%,email.ilike.%${query}%`)
        .limit(10);

      if (error) throw error;
      setSearchResults(data);
      
      // Check relationships for search results in batch
      await checkRelationshipsForUsers(data);
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
      const result = await checkUserRelationship(user.id, user.id);
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
      // confirm({
      //   title: t('externalUserConfirmTitle') || 'Add External User',
      //   description: t('externalUserConfirmDescription', { name: user.name }) || `${user.name} is not a member of any of your teams. Are you sure you want to invite this external user?`,
      //   confirmText: t('confirm') || 'Confirm',
      //   cancelText: t('cancel') || 'Cancel',
      //   preventClose: true,
      //   onConfirm: () => {
          setSelectedUsers(prev => {
            // First check if the user is already in the array (extra safety check)
            if (prev.find(u => u.id === user.id)) {
              return prev; // User already exists, don't add again
            }
            // Add the user
            return [...prev, user];
          });
      //     // Reset confirmation dialog state
      //     setIsConfirmDialogOpen(false);
      //   },
      //   onCancel: () => {
      //     // Reset confirmation dialog state
      //     setIsConfirmDialogOpen(false);
      //   }
      // });
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

  // 邀请用户
  const inviteUsers = async () => {
    if (selectedUsers.length === 0) return;

    try {
      // 创建加载toast并获取它的ID
      const toastId = toast.loading(t('inviting'));

      // 添加新参与者
      const participants = selectedUsers.map(user => ({
        session_id: sessionId,
        user_id: user.id,
        role: 'MEMBER'
      }));

      const { error: participantError } = await supabase
        .from('chat_participant')
        .insert(participants);

      if (participantError) {
        // 更新toast为错误状态
        toast.error(t('invitationFailed'), { id: toastId });
        throw participantError;
      }

      // 立即刷新当前会话信息 - 获取最新的会话详情
      const { data: sessionData, error: sessionError } = await supabase
        .from('chat_session')
        .select(`
          id,
          type,
          name,
          team_id,
          created_at,
          updated_at,
          created_by,
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
        .eq('id', sessionId)
        .single();

      if (sessionError) {
        console.error('Error refreshing session data:', sessionError);
      }

      // 处理会话数据，确保包含正确的参与者数量
      if (sessionData) {
        // 保存原始的参与者列表
        const allParticipants = sessionData.participants || [];
        
        // 过滤出其他参与者（非当前用户）
        sessionData.participants = allParticipants
          .filter(p => p.user.id !== user?.id)
          .map(p => p.user);
          
        // 设置参与者总数量
        sessionData.participantsCount = allParticipants.length;
        
        // 确保created_by字段被保留
        
      }

      // 更新toast为成功状态
      toast.success(t('invitationSent'), { id: toastId });

      // 重置状态并关闭 popover
      setSelectedUsers([]);
      setSearchQuery('');
      setIsOpen(false);

      // 通知父组件更新 - 同时传递最新的会话信息
      if (onInvite) {
        onInvite(sessionData);
      }
    } catch (error) {
      console.error('Error inviting users:', error);
      // 这里不需要再次显示错误toast，因为已经在上面处理了
    }
  };

  // Save popover state when confirmation dialog opens
  const onPopoverOpenChange = (open) => {
    // Only allow closing if confirmation dialog is not open
    if (!isConfirmDialogOpen || open) {
      setIsOpen(open);
    }
  };

  // 如果在下拉菜单中，直接渲染内容而不是Popover
  if (inDropdown) {
    return (
      <div className="p-2 w-full">
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

        <UserRelationshipsContext.Provider value={relationships}>
          <ScrollArea className="max-h-[200px] overflow-y-auto mt-2">
            <div className="p-1">
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
              ) : searchQuery ? (
                <div className="text-center py-4 text-sm text-muted-foreground">
                  {t('noResults')}
                </div>
              ) : null}
            </div>
          </ScrollArea>
        </UserRelationshipsContext.Provider>

        {selectedUsers.length > 0 && (
          <div className="mt-3">
            <Button
              className="w-full"
              onClick={inviteUsers}
              size="sm"
            >
              {t('inviteSelected')}
            </Button>
          </div>
        )}
      </div>
    );
  }

  // 标准的 Popover 实现
  return (
    <Popover open={isOpen} onOpenChange={onPopoverOpenChange}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon"
          className="hover:bg-accent/50 rounded-full"
          title={t('inviteUsers')}
        >
          <UserPlus className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end" onInteractOutside={(e) => {
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
              ) : searchQuery ? (
                <div className="text-center py-4 text-sm text-muted-foreground">
                  {t('noResults')}
                </div>
              ) : null}
            </div>
          </ScrollArea>
        </UserRelationshipsContext.Provider>

        {selectedUsers.length > 0 && (
          <div className="p-4 border-t">
            <Button
              className="w-full"
              onClick={inviteUsers}
            >
              {t('inviteSelected')}
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
} 