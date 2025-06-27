'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import SearchInput from '@/components/search/SearchInput';
import SearchResults from '@/components/search/SearchResults';
import RecentSearches from '@/components/search/RecentSearches';
import SuggestedSearches from '@/components/search/SuggestedSearches';
import { supabase } from '@/lib/supabase';
import { Skeleton } from '@/components/ui/skeleton';
import { useGetUser } from '@/lib/hooks/useGetUser';
import UserProfileDialog from '@/components/chat/UserProfileDialog';
import { useConfirm } from '@/hooks/use-confirm';
import { toast } from 'sonner';
import { useRouter, useSearchParams } from 'next/navigation';
import { useChat } from '@/contexts/ChatContext';

export default function SearchPage() {
  const t = useTranslations();
  const chatT = useTranslations('Chat');
  const locale = useLocale();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  
  const { user: currentUser, isLoading: userLoading } = useGetUser();
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const { confirm } = useConfirm();
  const router = useRouter();
  const { fetchChatSessions } = useChat();
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  
  // Add state for user profile dialog
  const [selectedUser, setSelectedUser] = useState(null);
  const [isUserProfileOpen, setIsUserProfileOpen] = useState(false);

  // Load recent searches and execute initial search
  useEffect(() => {
    // Execute search if there's an initial query from URL
    if (initialQuery) {
      handleSearch(initialQuery);
    }
    
    async function loadRecentSearches() {
      setLoadingHistory(true);
      try {
        if (!currentUser) {
          setLoadingHistory(false);
          return;
        }

        const { data, error } = await supabase
          .from('search_history')
          .select('search_term')
          .eq('user_id', currentUser.id)
          .order('last_searched_at', { ascending: false })
          .limit(10);

        if (error) throw error;
        
        setRecentSearches(data.map(item => item.search_term));
      } catch (error) {
        console.error('Failed to load recent searches:', error);
      } finally {
        setLoadingHistory(false);
      }
    }

    if (!userLoading) {
      loadRecentSearches();
    }
  }, [currentUser, userLoading]);

  // Handle search request
  const handleSearch = async (searchQuery = query) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const userIdParam = currentUser?.id ? `&userId=${currentUser.id}` : '';
      const response = await fetch(`/api/search?query=${encodeURIComponent(searchQuery)}${userIdParam}`);
      
      
      const data = await response.json();
      
      
      if (response.ok) {
        setResults(data.results || []);
        
        // Update recent searches
        if (currentUser) {
          // First check if this search term already exists for this user
          const { data: existingSearch, error: fetchError } = await supabase
            .from('search_history')
            .select('id, count')
            .eq('search_term', searchQuery)
            .eq('user_id', currentUser.id)
            .maybeSingle();
          
          if (fetchError) {
            console.error('Failed to check existing search:', fetchError);
          } else if (existingSearch) {
            // Update existing record
            const { error: updateError } = await supabase
              .from('search_history')
              .update({
                count: existingSearch.count + 1,
                last_searched_at: new Date().toISOString()
              })
              .eq('id', existingSearch.id);
              
            if (updateError) console.error('Failed to update search history:', updateError);
          } else {
            // Insert new record
            const { error: insertError } = await supabase
              .from('search_history')
              .insert({
                search_term: searchQuery,
                user_id: currentUser.id,
                count: 1
              });
              
            if (insertError) console.error('Failed to insert search history:', insertError);
          }
          
          // Reload recent searches
          const { data: recentData } = await supabase
            .from('search_history')
            .select('search_term')
            .eq('user_id', currentUser.id)
            .order('last_searched_at', { ascending: false })
            .limit(10);
          
          if (recentData) {
            setRecentSearches(recentData.map(item => item.search_term));
          }
        }
      } else {
        console.error('Search failed:', data.error);
      }
    } catch (error) {
      console.error('Search request failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClearRecent = async () => {
    try {
      if (!currentUser) return;

      const { error } = await supabase
        .from('search_history')
        .delete()
        .eq('user_id', currentUser.id);

      if (error) throw error;
      
      setRecentSearches([]);
    } catch (error) {
      console.error('Failed to clear search history:', error);
    }
  };
  
  // Create chat with user
  const createChatWithUser = async (user) => {
    if (!currentUser || !user) return;
    
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
              participants.some(p => p.user_id === user.id)) {
            sessionId = chat.session_id;
            break;
          }
        }
      }
      
      // If no existing chat found, create a new one
      if (!sessionId) {
        // Generate a unique timestamp to ensure different chats with the same user don't conflict
        const uniqueTimestamp = Date.now().toString();
        
        // Create new chat session with name
        const chatName = `${user.name} (${uniqueTimestamp.slice(-4)})`;
        
        const { data: session, error: createError } = await supabase
          .from('chat_session')
          .insert({
            type: 'PRIVATE',
            name: chatName,
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
        
        // Add participants
        const participants = [
          { session_id: sessionId, user_id: currentUser.id },
          { session_id: sessionId, user_id: user.id }
        ];
        
        const { error: participantError } = await supabase
          .from('chat_participant')
          .insert(participants);
          
        if (participantError) {
          console.error('Error adding participants to chat:', participantError);
          toast.error(t('errors.chatCreationFailed') || 'Failed to create chat');
          setIsCreatingChat(false);
          return;
        }
        
        // Give the other user a notification
        try {
          await supabase
            .from('notification')
            .insert({
              user_id: user.id,
              title: chatT('newPrivateChat'),
              content: chatT('startedChatWithYou', { name: currentUser.name || currentUser.email }),
              type: 'ADDED_TO_CHAT',
              related_entity_type: 'chat_session',
              related_entity_id: sessionId,
              data: {
                chat_session_id: sessionId,
                chat_type: 'private',
                created_by: currentUser.id,
                creator_name: currentUser.name || currentUser.email
              },
              is_read: false
            });
        } catch (notifyError) {
          console.error('Error creating notification:', notifyError);
          // Continue even if notification fails
        }
      }
      
      // Refresh the chat list
      fetchChatSessions();
      
      // Close the dialog if open
      setIsUserProfileOpen(false);
      
      // Navigate to the chat
      router.push(`/${locale}/chat?session=${sessionId}`);
      
    } catch (error) {
      console.error('Error creating new chat:', error);
      toast.error(t('errors.chatCreationFailed') || 'Failed to create chat');
    } finally {
      setIsCreatingChat(false);
    }
  };
  
  // Handle user click to open profile dialog or show confirmation for external users
  const handleUserClick = (user, metadata = {}) => {
    // Always open the profile dialog first, regardless of external status
    setSelectedUser(user);
    setIsUserProfileOpen(true);
  };

  // 搜索结果骨架屏组件
  const SearchResultsSkeleton = () => (
    <div className="mt-8">
      <Skeleton className="h-7 w-48 mb-6" />
      
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((item) => (
          <div key={item} className="p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-start">
              <Skeleton className="h-5 w-5 mr-3 rounded-full" />
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-16 ml-2" />
                </div>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-5/6 mb-1" />
                <div className="flex items-center mt-3 space-x-3">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // 最近搜索骨架屏组件
  const RecentSearchesSkeleton = () => (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-3">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-16" />
      </div>
      <div className="flex flex-wrap gap-2">
        {[1, 2, 3, 4, 5].map((item) => (
          <Skeleton key={item} className="h-8 w-24 rounded-full" />
        ))}
      </div>
    </div>
  );

  // 推荐搜索骨架屏组件
  const SuggestedSearchesSkeleton = () => (
    <div className="mt-8">
      <Skeleton className="h-6 w-48 mb-3" />
      <div className="flex flex-wrap gap-2">
        {[1, 2, 3, 4, 5].map((item) => (
          <Skeleton key={item} className="h-8 w-28 rounded-full" />
        ))}
      </div>
    </div>
  );

  return (
    <div className="container mx-auto py-6 px-4 max-w-5xl">
      <h1 className="text-2xl font-bold mb-6">{t('search.title')}</h1>
      
      <SearchInput 
        query={query} 
        setQuery={setQuery} 
        onSearch={handleSearch} 
      />
      
      {!query && !results.length ? (
        <div className="mt-8 space-y-8">
          {loadingHistory ? (
            <RecentSearchesSkeleton />
          ) : (
            <RecentSearches 
              searches={recentSearches}
              onSearch={(term) => {
                setQuery(term);
                handleSearch(term);
              }}
              onClear={handleClearRecent}
            />
          )}
          
          {loadingHistory ? (
            <SuggestedSearchesSkeleton />
          ) : (
            <SuggestedSearches 
              onSearch={(term) => {
                setQuery(term);
                handleSearch(term);
              }} 
            />
          )}
        </div>
      ) : (
        loading ? (
          <SearchResultsSkeleton />
        ) : (
          <SearchResults 
            results={results} 
            loading={false}
            query={query}
            onUserClick={handleUserClick}
          />
        )
      )}
      
      {/* User Profile Dialog */}
      <UserProfileDialog
        open={isUserProfileOpen}
        onOpenChange={setIsUserProfileOpen}
        user={selectedUser}
      />
    </div>
  );
} 