'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import { MessageSquare, Mail, Phone, Globe, Clock, Moon, ChevronRight } from 'lucide-react';
import { useUserStatus } from '@/contexts/UserStatusContext';
import { useChat } from '@/contexts/ChatContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

export default function UserProfileDialog({ open, onOpenChange, user = null }) {
  const t = useTranslations('UserProfile');
  const locale = useLocale();
  const { currentUser } = useUserStatus();
  const { fetchChatSessions } = useChat();
  const router = useRouter();
  const [userData, setUserData] = useState(null);
  const [isCreatingChat, setIsCreatingChat] = useState(false);

  useEffect(() => {
    if (open) {
      // Use provided user if available, otherwise fall back to currentUser
      setUserData(user || currentUser);
    }
  }, [open, user, currentUser]);

  if (!userData) {
    return null;
  }

  // Check if this is the current user's profile
  const isCurrentUser = !user || (currentUser && user.id === currentUser.id);

  // Function to create a new chat directly
  const handleCreateNewChat = async () => {
    if (!currentUser || !userData || isCurrentUser) return;
    
    try {
      setIsCreatingChat(true);
      
      // Check if chat already exists
      const { data: existingChats, error: checkError } = await supabase
        .from('chat_participant')
        .select('session_id, chat_session!inner(*)')
        .eq('user_id', currentUser.id)
        .eq('chat_session.type', 'PRIVATE');
        
      if (checkError) {
        console.error('Error checking existing chats:', checkError);
        toast.error(t('errors.chatCreationFailed') || 'Failed to check existing chats');
        setIsCreatingChat(false);
        return;
      }
      
      let sessionId = null;
      
      // Find if there's already a private chat with this user
      if (existingChats && existingChats.length > 0) {
        for (const chat of existingChats) {
          // Get participants for this session
          const { data: participants, error: partError } = await supabase
            .from('chat_participant')
            .select('user_id')
            .eq('session_id', chat.session_id);
            
          if (partError) continue;
          
          // If this session has exactly 2 participants (current user and target user)
          if (participants?.length === 2 && 
              participants.some(p => p.user_id === userData.id)) {
            sessionId = chat.session_id;
            break;
          }
        }
      }
      
      // If no existing chat found, create a new one
      if (!sessionId) {
        // Create new chat session
        const { data: session, error: createError } = await supabase
          .from('chat_session')
          .insert({
            type: 'PRIVATE',
            created_by: currentUser.id
          })
          .select()
          .single();
          
        if (createError) {
          console.error('Error creating chat session:', createError);
          toast.error(t('errors.chatCreationFailed') || 'Failed to create chat');
          setIsCreatingChat(false);
          return;
        }
        
        sessionId = session.id;
        
        // Add current user as participant
        const { error: currentUserError } = await supabase
          .from('chat_participant')
          .insert({
            session_id: sessionId,
            user_id: currentUser.id,
            role: 'ADMIN'
          });
          
        if (currentUserError) {
          console.error('Error adding current user to chat:', currentUserError);
        }
        
        // Add other user as participant
        const { error: otherUserError } = await supabase
          .from('chat_participant')
          .insert({
            session_id: sessionId,
            user_id: userData.id,
            role: 'MEMBER'
          });
          
        if (otherUserError) {
          console.error('Error adding other user to chat:', otherUserError);
        }
      }
      
      // Refresh the chat list
      fetchChatSessions();
      
      // Close the dialog
      onOpenChange(false);
      
      // Navigate to the chat with correct locale in the path
      router.push(`/${locale}/chat?session=${sessionId}`);
      
    } catch (error) {
      console.error('Error creating new chat:', error);
      toast.error(t('errors.chatCreationFailed') || 'Failed to create chat');
    } finally {
      setIsCreatingChat(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isCurrentUser ? t('title') : t('userProfileTitle', { name: userData.name })}</DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col items-center py-4">
          {/* User Avatar */}
          <div className="w-20 h-20 rounded-full overflow-hidden bg-blue-600 mb-4 flex items-center justify-center text-white font-bold text-2xl">
            {userData.avatar_url ? (
              <img 
                src={userData.avatar_url} 
                alt={userData.name} 
                className="w-full h-full object-cover" 
              />
            ) : (
              <span>{userData.name?.charAt(0) || '?'}</span>
            )}
          </div>
          
          {/* User Name */}
          <h2 className="text-xl font-semibold">{userData.name}</h2>
          
          {/* User Details */}
          <div className="w-full space-y-3 mt-6">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm">{userData.email}</span>
            </div>
            
            {userData.phone && (
              <div className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm">{userData.phone}</span>
              </div>
            )}
            
            {userData.language && userData.language !== 'en' && (
              <div className="flex items-center gap-3">
                <Globe className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm">{userData.language}</span>
              </div>
            )}
            
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm">{userData.timezone || 'UTC+0'} ({userData.hour_format || '24h'})</span>
            </div>
            
            {userData.theme && userData.theme !== 'dark' && (
              <div className="flex items-center gap-3">
                <Moon className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm capitalize">{userData.theme} {t('theme')}</span>
              </div>
            )}
          </div>
        </div>
        
        <DialogFooter className="flex sm:justify-between gap-2">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
          >
            {t('close')}
          </Button>
          
          {/* Only show New Chat button for other users, not current user */}
          {!isCurrentUser && (
            <Button 
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={handleCreateNewChat}
              disabled={isCreatingChat}
            >
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                {isCreatingChat ? t('creating') || 'Creating...' : t('newChat')}
              </div>
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 