'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { User, Briefcase, ListChecks } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { supabase } from '@/lib/supabase';
import { 
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator
} from '@/components/ui/command';
import { Avatar } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

/**
 * Debounce function to limit how often a function is called
 * @param {Function} func - The function to debounce
 * @param {number} wait - The debounce delay in milliseconds
 * @return {Function} - The debounced function with a cancel method
 */
const debounce = (func, wait) => {
  let timeout;
  const debounced = function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
  
  // Add cancel method to the debounced function
  debounced.cancel = function() {
    clearTimeout(timeout);
  };
  
  return debounced;
};

/**
 * MentionSelector component
 * Shows a dropdown of users, projects, and tasks when @ is typed
 * @param {Object} props - Component props
 * @param {boolean} props.isOpen - Whether the mention selector is open
 * @param {string} props.searchText - The search text (without the @ symbol)
 * @param {Function} props.onSelect - Callback when a mention is selected
 * @param {Function} props.onClose - Callback to close the mention selector
 * @param {Object} props.position - Position of the selector {top, left}
 * @param {number} props.sessionId - ID of the current chat session
 */
const MentionSelector = ({ 
  isOpen, 
  searchText, 
  onSelect, 
  onClose, 
  position = { top: 0, left: 0 },
  sessionId
}) => {
  const t = useTranslations('Chat');
  const [results, setResults] = useState({
    users: [],
    projects: [],
    tasks: []
  });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const commandRef = useRef(null);
  
  // Create a debounced fetch function
  const debouncedFetch = useCallback(
    debounce(async (query) => {
      if (!query) return;
      
      setLoading(true);
      try {
        // Search for users, projects, and tasks
        const url = `/api/search?query=${encodeURIComponent(query)}&type=mention${sessionId ? `&sessionId=${sessionId}` : ''}`;
        const response = await fetch(url);
        if (!response.ok) {
          console.error('Search API error:', { status: response.status, statusText: response.statusText });
          // Don't throw, instead set empty results and continue
          setResults({
            users: [],
            projects: [],
            tasks: []
          });
          return;
        }
        
        const data = await response.json();
        
        if (data.error) {
          console.error('Search API returned error:', data.error);
          setResults({
            users: [],
            projects: [],
            tasks: []
          });
          return;
        }
        
        setResults({
          users: data.results.filter(item => item.type === 'user') || [],
          projects: data.results.filter(item => item.type === 'project') || [],
          tasks: data.results.filter(item => item.type === 'task') || []
        });
      } catch (error) {
        console.error('Error fetching mention suggestions:', error);
        // Set empty results on error
        setResults({
          users: [],
          projects: [],
          tasks: []
        });
      } finally {
        setLoading(false);
      }
    }, 300), // 300ms debounce delay
    [sessionId] // Add sessionId to dependencies
  );

  // Fetch results when searchText changes
  useEffect(() => {
    if (!isOpen || !searchText) return;
    debouncedFetch(searchText);
    
    // Cleanup function to cancel pending debounced calls when component unmounts
    return () => debouncedFetch.cancel();
  }, [isOpen, searchText, debouncedFetch]);


  // Filter displayed results based on active tab
  const getFilteredResults = () => {
    if (activeTab === 'all') {
      return {
        users: results.users,
        projects: results.projects,
        tasks: results.tasks
      };
    }
    
    return {
      users: activeTab === 'users' ? results.users : [],
      projects: activeTab === 'projects' ? results.projects : [],
      tasks: activeTab === 'tasks' ? results.tasks : []
    };
  };

  const filteredResults = getFilteredResults();
  const hasResults = 
    filteredResults.users.length > 0 || 
    filteredResults.projects.length > 0 || 
    filteredResults.tasks.length > 0;

  if (!isOpen) return null;

  return (
    <div 
      className="absolute z-50"
      style={{
            bottom: `55px`, 
            left: `0px`,
            maxWidth: '95vw',
            }}
    >
      <Command ref={commandRef} className="rounded-lg border shadow-md w-72 max-w-full">
        <div className="flex items-center px-1 border-b">
          <div className="flex space-x-1 p-1 flex-wrap">
            <button
              onClick={() => setActiveTab('all')}
              className={cn(
                "px-2 py-1 text-xs rounded-md",
                activeTab === 'all' 
                  ? "bg-primary text-primary-foreground" 
                  : "text-muted-foreground hover:bg-accent"
              )}
            >
              {t('all')}
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={cn(
                "px-2 py-1 text-xs rounded-md flex items-center gap-1",
                activeTab === 'users' 
                  ? "bg-primary text-primary-foreground" 
                  : "text-muted-foreground hover:bg-accent"
              )}
            >
              <User className="h-3 w-3" />
              {t('users')}
            </button>
            <button
              onClick={() => setActiveTab('projects')}
              className={cn(
                "px-2 py-1 text-xs rounded-md flex items-center gap-1",
                activeTab === 'projects' 
                  ? "bg-primary text-primary-foreground" 
                  : "text-muted-foreground hover:bg-accent"
              )}
            >
              <Briefcase className="h-3 w-3" />
              {t('projects')}
            </button>
            <button
              onClick={() => setActiveTab('tasks')}
              className={cn(
                "px-2 py-1 text-xs rounded-md flex items-center gap-1",
                activeTab === 'tasks' 
                  ? "bg-primary text-primary-foreground" 
                  : "text-muted-foreground hover:bg-accent"
              )}
            >
              <ListChecks className="h-3 w-3" />
              {t('tasks')}
            </button>
          </div>
        </div>
        
        <CommandList>
          {loading ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              {t('loading')}...
            </div>
          ) : !hasResults ? (
            <CommandEmpty>{t('noResults')}</CommandEmpty>
          ) : (
            <>
              {filteredResults.users.length > 0 && (
                <CommandGroup heading={t('users')}>
                  {filteredResults.users.map(user => (
                    <CommandItem
                      key={`user-${user.id}`}
                      onSelect={() => onSelect({
                        type: 'user',
                        id: user.id,
                        name: user.name,
                        displayText: `@${user.name}`
                      })}
                      className="flex items-center gap-2"
                    >
                      <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center overflow-hidden">
                        {user.avatar_url ? (
                          <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xs text-blue-600">{user.name.charAt(0)}</span>
                        )}
                      </div>
                      <span>{user.name}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              
              {filteredResults.projects.length > 0 && (
                <>
                  {filteredResults.users.length > 0 && <CommandSeparator />}
                  <CommandGroup heading={t('projects')}>
                    {filteredResults.projects.map(project => (
                      <CommandItem
                        key={`project-${project.id}`}
                        onSelect={() => onSelect({
                          type: 'project',
                          id: project.id,
                          name: project.project_name,
                          displayText: `#${project.project_name}`
                        })}
                        className="flex items-center gap-2"
                      >
                        <Briefcase className="h-4 w-4 text-orange-500" />
                        <span>{project.project_name}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}
              
              {filteredResults.tasks.length > 0 && (
                <>
                  {(filteredResults.users.length > 0 || filteredResults.projects.length > 0) && 
                    <CommandSeparator />
                  }
                  <CommandGroup heading={t('tasks')}>
                    {filteredResults.tasks.map(task => (
                      <CommandItem
                        key={`task-${task.id}`}
                        onSelect={() => onSelect({
                          type: 'task',
                          id: task.id,
                          name: task.title,
                          projectName: task.project_name,
                          displayText: `${task.title} (${task.project_name})`
                        })}
                        className="flex items-center gap-2"
                      >
                        <ListChecks className="h-4 w-4 text-green-500" />
                        <div className="flex flex-col">
                          <span>{task.title}</span>
                          <span className="text-xs text-muted-foreground">{task.project_name}</span>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}
            </>
          )}
        </CommandList>
      </Command>
    </div>
  );
};

export default MentionSelector; 