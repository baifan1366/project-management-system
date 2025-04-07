import { useState } from 'react';
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

export default function InviteUserPopover({ sessionId, onInvite }) {
  const t = useTranslations('Chat');
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

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

  // 邀请用户
  const inviteUsers = async () => {
    if (selectedUsers.length === 0) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error(t('errors.userNotLoggedIn'));
        return;
      }

      toast.loading(t('inviting'));

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
        toast.error(t('invitationFailed'));
        throw participantError;
      }

      toast.success(t('invitationSent'));

      // 重置状态并关闭 popover
      setSelectedUsers([]);
      setSearchQuery('');
      setIsOpen(false);

      // 通知父组件更新
      if (onInvite) {
        onInvite();
      }
    } catch (error) {
      console.error('Error inviting users:', error);
      toast.error(t('invitationFailed'));
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
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
      <PopoverContent className="w-80 p-0" align="end">
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
            ) : searchQuery ? (
              <div className="text-center py-4 text-sm text-muted-foreground">
                {t('noResults')}
              </div>
            ) : null}
          </div>
        </ScrollArea>

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