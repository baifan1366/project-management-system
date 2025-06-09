/**
 * Utility function to check if a user has a relationship with another user
 * (i.e., they share at least one team)
 * 
 * @param {string} userId - The ID of the current user
 * @param {string} targetUserId - The ID of the user to check relationship with
 * @returns {Promise<Object>} Relationship data including hasRelationship, isExternal, and commonTeamCount
 */
export async function checkUserRelationship(userId, targetUserId) {
  try {
    // Skip if either ID is missing or if they're the same user
    if (!userId || !targetUserId || userId === targetUserId) {
      return {
        hasRelationship: userId === targetUserId, // Same user has a relationship with themselves
        isExternal: false,
        commonTeamCount: 0
      };
    }

    // Call the API endpoint
    const response = await fetch('/api/users/checkRelationship', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId, targetUserId }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to check relationship');
    }

    // Return the relationship data
    return await response.json();
  } catch (error) {
    console.error('Error checking user relationship:', error);
    
    // Return a default value in case of error
    return {
      hasRelationship: false,
      isExternal: true,
      commonTeamCount: 0,
      error: error.message
    };
  }
}

/**
 * Utility function to check relationships with multiple users in a single request
 * This batches multiple relationship checks for better performance
 * 
 * @param {string} userId - The ID of the current user
 * @param {string[]} targetUserIds - Array of user IDs to check relationships with
 * @returns {Promise<Object>} Object mapping user IDs to their relationship data
 */
export async function checkUserRelationshipBatch(userId, targetUserIds) {
  try {
    // Validate input
    if (!userId || !Array.isArray(targetUserIds) || targetUserIds.length === 0) {
      return {};
    }
    
    // For a single user, use the regular function
    if (targetUserIds.length === 1) {
      const result = await checkUserRelationship(userId, targetUserIds[0]);
      return { [targetUserIds[0]]: result };
    }
    
    // Call the batch API endpoint
    const response = await fetch('/api/users/checkRelationshipBatch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId, targetUserIds }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to check relationships');
    }

    // Return the batch relationship data
    return await response.json();
  } catch (error) {
    console.error('Error checking user relationships in batch:', error);
    
    // Return default values for all users in case of error
    return Object.fromEntries(
      targetUserIds.map(targetId => [
        targetId, 
        {
          hasRelationship: false,
          isExternal: true,
          commonTeamCount: 0,
          error: error.message
        }
      ])
    );
  }
}

/**
 * Create a badge element for an external user
 * 
 * @param {boolean} isExternal - Whether the user is external
 * @param {string} className - Optional additional CSS classes
 * @returns {JSX.Element|null} The badge element or null if not external
 */
export function renderExternalBadge(isExternal, className = '') {
  if (!isExternal) return null;
  
  return (
    <span className={`inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 ${className}`}>
      外部成员
    </span>
  );
} 