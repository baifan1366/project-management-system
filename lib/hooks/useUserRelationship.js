import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import useGetUser from './useGetUser';

/**
 * Hook to check if a user has a relationship with the current user
 * (i.e., they share at least one team)
 * 
 * @param {string} targetUserId - The ID of the user to check relationship with
 * @returns {Object} Relationship data and status
 */
export default function useUserRelationship(targetUserId) {
  const [relationshipData, setRelationshipData] = useState({
    hasRelationship: false,
    isExternal: true,
    commonTeamCount: 0,
    isLoading: false,
    error: null
  });
  const { user: currentUser } = useGetUser();

  useEffect(() => {
    const checkRelationship = async () => {
      // Skip if no targetUserId or if it's the current user
      if (!targetUserId || !currentUser || targetUserId === currentUser.id) {
        return;
      }

      setRelationshipData(prev => ({ ...prev, isLoading: true, error: null }));

      try {
        const response = await fetch(`/api/users/relationship?targetUserId=${targetUserId}&userId=${currentUser.id}`);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to check relationship');
        }

        const data = await response.json();
        setRelationshipData({
          hasRelationship: data.hasRelationship,
          isExternal: data.isExternal,
          commonTeamCount: data.commonTeamCount,
          isLoading: false,
          error: null
        });
      } catch (error) {
        console.error('Error checking user relationship:', error);
        setRelationshipData({
          hasRelationship: false,
          isExternal: true,
          commonTeamCount: 0,
          isLoading: false,
          error: error.message
        });
      }
    };

    checkRelationship();
  }, [targetUserId, currentUser]);

  return relationshipData;
} 