"use client";

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Search, X, ChevronDown, Link, FileText, Image as ImageIcon } from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ChatSearch({ 
  isOpen, 
  onOpenChange, 
  messages = [], 
  hourFormat = '24h',
  adjustTimeByOffset
}) {
  const t = useTranslations('Chat');
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchType, setSearchType] = useState('all');
  const [isSearching, setIsSearching] = useState(false);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);

  // Function to extract links from message content
  const extractLinks = (content) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return content.match(urlRegex) || [];
  };

  // Function to search messages
  const searchMessages = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    
    try {
      // Get messages from the current session
      let filteredMessages = [...messages];
      
      if (searchType === 'media') {
        // Filter for messages with image attachments
        filteredMessages = filteredMessages.filter(msg => 
          msg.attachments?.some(att => att.is_image)
        );
      } else if (searchType === 'links') {
        // Filter for messages containing links
        filteredMessages = filteredMessages.filter(msg => 
          extractLinks(msg.content).length > 0
        );
      } else if (searchType === 'files') {
        // Filter for messages with non-image attachments
        filteredMessages = filteredMessages.filter(msg => 
          msg.attachments?.some(att => !att.is_image)
        );
      } else {
        // Text search in 'all' mode
        filteredMessages = filteredMessages.filter(msg => 
          msg.content.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }
      
      setSearchResults(filteredMessages);
      setCurrentSearchIndex(0);
      
      // Scroll to the first result if found
      if (filteredMessages.length > 0) {
        scrollToMessage(filteredMessages[0].id);
      }
    } catch (error) {
      console.error('Error searching messages:', error);
    } finally {
      setIsSearching(false);
    }
  };
  
  // Function to scroll to a specific message
  const scrollToMessage = (messageId) => {
    const messageElement = document.getElementById(`message-${messageId}`);
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      // Add highlight effect
      messageElement.classList.add('bg-amber-100', 'dark:bg-amber-800/30');
      setTimeout(() => {
        messageElement.classList.remove('bg-amber-100', 'dark:bg-amber-800/30');
      }, 2000);
    }
  };
  
  // Navigate through search results
  const navigateSearchResults = (direction) => {
    if (searchResults.length === 0) return;
    
    let newIndex;
    if (direction === 'next') {
      newIndex = (currentSearchIndex + 1) % searchResults.length;
    } else {
      newIndex = (currentSearchIndex - 1 + searchResults.length) % searchResults.length;
    }
    
    setCurrentSearchIndex(newIndex);
    scrollToMessage(searchResults[newIndex].id);
  };
  
  // Reset search state when dialog closes
  const handleOpenChange = (open) => {
    if (!open) {
      setSearchQuery('');
      setSearchResults([]);
      setCurrentSearchIndex(0);
      setSearchType('all');
    }
    onOpenChange(open);
  };
  
  // Trigger search on query change or search type change
  useEffect(() => {
    if (isOpen) {
      const delaySearch = setTimeout(() => {
        searchMessages();
      }, 300);
      
      return () => clearTimeout(delaySearch);
    }
  }, [searchQuery, searchType, isOpen, messages]);
  
  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('searchChat')}</DialogTitle>
          <DialogDescription>{t('searchChatDescription')}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col space-y-4">
          <div className="flex items-center space-x-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder={t('searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-accent/50 rounded-md text-sm"
                autoFocus
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground hover:text-foreground"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>
          
          <Tabs defaultValue="all" value={searchType} onValueChange={setSearchType}>
            <TabsList className="grid grid-cols-4">
              <TabsTrigger value="all" className="text-xs">{t('all')}</TabsTrigger>
              <TabsTrigger value="media" className="text-xs">
                <ImageIcon className="h-4 w-4 mr-1" />
                {t('media')}
              </TabsTrigger>
              <TabsTrigger value="files" className="text-xs">
                <FileText className="h-4 w-4 mr-1" />
                {t('files')}
              </TabsTrigger>
              <TabsTrigger value="links" className="text-xs">
                <Link className="h-4 w-4 mr-1" />
                {t('links')}
              </TabsTrigger>
            </TabsList>
          </Tabs>
          
          <div className="border rounded-md max-h-72 overflow-y-auto">
            {isSearching ? (
              <div className="p-4 text-center">
                <div className="inline-block animate-spin mr-2">
                  <svg className="h-5 w-5 text-muted-foreground" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
                {t('searching')}
              </div>
            ) : searchResults.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                {searchQuery ? t('noResults') : t('enterSearchTerm')}
              </div>
            ) : (
              <div className="divide-y">
                {searchResults.map((result, index) => (
                  <div 
                    key={result.id}
                    className={`p-3 hover:bg-accent cursor-pointer ${index === currentSearchIndex ? 'bg-accent/80 border-l-4 border-blue-500' : ''}`}
                    onClick={() => {
                      setCurrentSearchIndex(index);
                      scrollToMessage(result.id);
                      handleOpenChange(false);
                    }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm">{result.user?.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {adjustTimeByOffset && new Date(result.created_at) ? 
                          adjustTimeByOffset(new Date(result.created_at)).toLocaleString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit', 
                            minute: '2-digit',
                            hour12: hourFormat === '12h'
                          }) : 
                          new Date(result.created_at).toLocaleString()
                        }
                      </span>
                    </div>
                    
                    {/* Render content based on result type */}
                    {searchType === 'media' && result.attachments?.some(att => att.is_image) ? (
                      <div className="grid grid-cols-3 gap-1 mt-1">
                        {result.attachments.filter(att => att.is_image).map(att => (
                          <div key={att.id} className="aspect-square rounded overflow-hidden bg-muted">
                            <img 
                              src={att.file_url}
                              alt={att.file_name}
                              className="h-full w-full object-cover"
                            />
                          </div>
                        ))}
                      </div>
                    ) : searchType === 'files' && result.attachments?.some(att => !att.is_image) ? (
                      <div className="space-y-1 mt-1">
                        {result.attachments.filter(att => !att.is_image).map(att => (
                          <div key={att.id} className="flex items-center text-xs">
                            <FileText className="h-3 w-3 mr-1 flex-shrink-0" />
                            <span className="truncate">{att.file_name}</span>
                          </div>
                        ))}
                      </div>
                    ) : searchType === 'links' ? (
                      <div className="space-y-1 mt-1">
                        {extractLinks(result.content).map((link, i) => (
                          <div key={i} className="flex items-center text-xs text-blue-500">
                            <Link className="h-3 w-3 mr-1 flex-shrink-0" />
                            <span className="truncate">{link}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground line-clamp-2">{result.content}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {searchResults.length > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {t('resultCount', { current: currentSearchIndex + 1, total: searchResults.length })}
              </span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => navigateSearchResults('prev')}
                  className="p-1 rounded-full hover:bg-accent text-muted-foreground hover:text-foreground"
                  disabled={searchResults.length <= 1}
                >
                  <ChevronDown className="h-5 w-5 rotate-180" />
                </button>
                <button
                  onClick={() => navigateSearchResults('next')}
                  className="p-1 rounded-full hover:bg-accent text-muted-foreground hover:text-foreground"
                  disabled={searchResults.length <= 1}
                >
                  <ChevronDown className="h-5 w-5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
} 