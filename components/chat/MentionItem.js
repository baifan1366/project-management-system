'use client';

import { useState, useEffect } from 'react';
import { User, Briefcase, ListChecks, Mail, Phone } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useDispatch, useSelector } from 'react-redux';
import { fetchUserById } from '@/lib/redux/features/usersSlice';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

/**
 * MentionItem component
 * Displays a mention in a message with the appropriate styling
 * Shows a popover with user details on hover for user mentions
 */
const MentionItem = ({ 
  type, 
  id, 
  name,
  projectName = null,
  showIcon = true,
  className
}) => {
  const t = useTranslations('Chat');
  const dispatch = useDispatch();
  const [isHovering, setIsHovering] = useState(false);
  const [userData, setUserData] = useState(null);
  
  // Get users from Redux store
  const users = useSelector(state => state.users.users);
  const user = users.find(u => u.id === id);
  
  // Fetch user data when hovering over a user mention
  useEffect(() => {
    if (type === 'user' && isHovering && !user) {
      // Only attempt to fetch if we have an id to fetch
      if (id) {
        try {
          dispatch(fetchUserById(id));
        } catch (error) {
          console.error('Error fetching user data:', error);
        }
      }
    }
  }, [type, id, isHovering, user, dispatch]);
  
  // Update local state when user data is available in Redux
  useEffect(() => {
    if (user) {
      setUserData(user);
    }
  }, [user]);
  
  // Determine the styling based on mention type
  const getTypeStyles = () => {
    switch (type) {
      case 'user':
        return "bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-800/70 dark:text-blue-100 dark:hover:bg-blue-700/90";
      case 'project':
        return "bg-orange-100 text-orange-800 hover:bg-orange-200 dark:bg-orange-800/70 dark:text-orange-100 dark:hover:bg-orange-700/90";
      case 'task':
        return "bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-800/70 dark:text-green-100 dark:hover:bg-green-700/90";
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600";
    }
  };

  // Get the appropriate icon
  const getIcon = () => {
    switch (type) {
      case 'user':
        return <User className="h-3 w-3" />;
      case 'project':
        return <Briefcase className="h-3 w-3" />;
      case 'task':
        return <ListChecks className="h-3 w-3" />;
      default:
        return null;
    }
  };

  // Determine the link URL
  const getLinkUrl = () => {
    switch (type) {
      case 'user':
        return `/profile/${id}`;
      case 'project':
        return `/projects/${id}`;
      case 'task':
        return `/tasks/${id}`;
      default:
        return '#';
    }
  };

  // Format the display text
  const getDisplayText = () => {
    switch (type) {
      case 'user':
        return `@${name}`;
      case 'project':
        return `#${name}`;
      case 'task':
        return projectName ? `${name} (${projectName})` : name;
      default:
        return name;
    }
  };

  // Render user popover content
  const renderUserPopover = () => {
    if (type !== 'user') return null;
    
    return (
      <Popover open={isHovering} onOpenChange={setIsHovering}>
        <PopoverTrigger asChild>
          <span 
            className={cn(
              "inline-flex items-center gap-1 py-0.5 px-1.5 rounded text-xs font-medium",
              getTypeStyles(),
              className
            )}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
          >
            {showIcon && getIcon()}
            <span>{getDisplayText()}</span>
          </span>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3" side="top">
          {userData ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3">
                {userData.avatar_url ? (
                  <img 
                    src={userData.avatar_url} 
                    alt={userData.name} 
                    className="w-10 h-10 rounded-full"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                    <User className="w-6 h-6 text-gray-500" />
                  </div>
                )}
                <div>
                  <h4 className="font-medium">{userData.name}</h4>
                </div>
              </div>
              
              {userData.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4" />
                  <span>{userData.email}</span>
                </div>
              )}
              
              {userData.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4" />
                  <span>{userData.phone}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center py-2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
            </div>
          )}
        </PopoverContent>
      </Popover>
    );
  };

  // For non-user mentions, use the standard Link
  if (type !== 'user') {
    return (
      <Link href={getLinkUrl()}>
        <span 
          className={cn(
            "inline-flex items-center gap-1 py-0.5 px-1.5 rounded text-xs font-medium",
            getTypeStyles(),
            className
          )}
        >
          {showIcon && getIcon()}
          <span>{getDisplayText()}</span>
        </span>
      </Link>
    );
  }

  // For user mentions, use the popover
  return renderUserPopover();
};

export default MentionItem; 