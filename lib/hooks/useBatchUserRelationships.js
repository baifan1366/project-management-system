import { useState, useEffect } from 'react';
import { checkUserRelationshipBatch } from '@/lib/utils/checkUserRelationship';
import useGetUser from './useGetUser';

/**
 * Hook to check relationships with multiple users in a single batch request
 * 
 * @param {string[]} userIds - Array of user IDs to check relationships with
 * @returns {Object} Object containing relationship data for all requested users
 */
export default function useBatchUserRelationships(userIds = []) {
  const [relationshipsData, setRelationshipsData] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const { user: currentUser } = useGetUser();

  useEffect(() => {
    const checkRelationships = async () => {
      // Skip if no user IDs provided or current user not available
      if (!userIds.length || !currentUser?.id) {
        return;
      }
      
      // Filter out current user ID and deduplicate
      const uniqueUserIds = [...new Set(userIds.filter(id => id !== currentUser.id))];
      
      // Skip if no unique user IDs left
      if (!uniqueUserIds.length) {
        return;
      }
      
      setIsLoading(true);
      
      try {
        // Check all relationships in a single batch call
        const results = await checkUserRelationshipBatch(currentUser.id, uniqueUserIds);
        
        setRelationshipsData(prev => ({
          ...prev,
          ...results
        }));
      } catch (error) {
        console.error('Error fetching batch user relationships:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkRelationships();
  }, [userIds, currentUser?.id]);
  
  return {
    relationships: relationshipsData,
    isLoading,
    // Helper function to get a specific user's relationship data
    getRelationship: (userId) => relationshipsData[userId] || { 
      isExternal: true, 
      hasRelationship: false,
      commonTeamCount: 0,
      isLoading 
    }
  };
} 