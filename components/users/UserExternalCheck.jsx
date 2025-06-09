import { useState, useEffect } from 'react';
import { checkUserRelationship } from '@/lib/utils/checkUserRelationship';
import useGetUser from '@/lib/hooks/useGetUser';
import { useTranslations } from 'next-intl';

// Import a global relationship cache manager - this would be created separately
// but for now we'll just use a simple module-level cache
const relationshipCache = new Map();

/**
 * Get relationship data from cache or API
 * 
 * @param {string} currentUserId - Current user ID
 * @param {string} targetUserId - Target user ID
 * @returns {Promise<Object>} Relationship data
 */
async function getRelationshipData(currentUserId, targetUserId) {
  // Create a cache key
  const cacheKey = `${currentUserId}:${targetUserId}`;
  
  // Check if we have a cached result
  if (relationshipCache.has(cacheKey)) {
    return relationshipCache.get(cacheKey);
  }
  
  // Otherwise, fetch from API
  const result = await checkUserRelationship(currentUserId, targetUserId);
  
  // Cache the result
  relationshipCache.set(cacheKey, result);
  
  return result;
}

/**
 * Component to check and display if a user is external to the current user
 * 
 * @param {Object} props - Component properties
 * @param {string} props.userId - The ID of the user to check
 * @param {string} props.badgeClassName - Optional CSS classes for the badge
 * @param {boolean} props.showIfInternal - Whether to show a badge for internal users too
 * @returns {JSX.Element|null} The badge element or null
 */
export default function UserExternalCheck({ userId, badgeClassName = '', showIfInternal = false }) {
  const t = useTranslations('Users');
  const { user: currentUser } = useGetUser();
  const [relationshipStatus, setRelationshipStatus] = useState({
    isExternal: false,
    isLoading: true
  });

  useEffect(() => {
    const checkStatus = async () => {
      if (!currentUser?.id || !userId) return;
      
      try {
        const result = await getRelationshipData(currentUser.id, userId);
        setRelationshipStatus({
          isExternal: result.isExternal,
          hasRelationship: result.hasRelationship,
          commonTeamCount: result.commonTeamCount,
          isLoading: false
        });
      } catch (error) {
        console.error('Failed to check relationship status:', error);
        setRelationshipStatus({
          isExternal: true, // Default to external on error
          isLoading: false,
          error: error.message
        });
      }
    };

    checkStatus();
  }, [userId, currentUser?.id]);

  // Don't render anything while loading
  if (relationshipStatus.isLoading) return null;
  
  // Don't render anything if it's the current user
  if (userId === currentUser?.id) return null;
  
  // Only show external badge unless showIfInternal is true
  if (!relationshipStatus.isExternal && !showIfInternal) return null;
  
  return (
    <span 
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
        relationshipStatus.isExternal 
          ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
          : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
      } ${badgeClassName}`}
    >
      {relationshipStatus.isExternal ? t('external') : t('internal')}
    </span>
  );
} 