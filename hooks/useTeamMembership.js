'use client';

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import useGetUser from '@/lib/hooks/useGetUser';

/**
 * Custom hook to check if the current user is a member of a specific team
 * @param {number|string} teamId - Optional team ID to check membership for
 * @returns {Object} Membership status and related methods
 */
export function useTeamMembership(initialTeamId = null) {
  const [teamId, setTeamId] = useState(initialTeamId);
  const [isMember, setIsMember] = useState(null);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState(null);
  const { user } = useGetUser();

  /**
   * Check if the current user is a member of the team
   * @param {number|string} teamIdToCheck - Team ID to check membership for
   */
  const checkTeamMembership = useCallback(async (teamIdToCheck) => {
    if (!user || !user.id || !teamIdToCheck) {
      setIsMember(false);
      return false;
    }

    setIsChecking(true);
    setError(null);

    try {
      // Query the user_team table to see if there's an entry for this user and team
      const { data, error: queryError } = await supabase
        .from('user_team')
        .select('*')
        .eq('user_id', user.id)
        .eq('team_id', teamIdToCheck);

      if (queryError) throw queryError;

      // User is a member if we got any results
      const membershipStatus = data && data.length > 0;
      setIsMember(membershipStatus);
      return membershipStatus;
    } catch (err) {
      console.error('Error checking team membership:', err);
      setError(err.message);
      setIsMember(false);
      return false;
    } finally {
      setIsChecking(false);
    }
  }, [user]);

  /**
   * Check if a user is a member of the team that owns a specific task
   * @param {string} userId - User ID to check
   * @param {number|string} taskId - Task ID to check membership for
   * @returns {Object} Object containing isMember status and teamId if found
   */
  const checkTaskTeamMembership = useCallback(async (userId, taskId) => {
    if (!userId || !taskId) {
      return { isMember: false, teamId: null };
    }

    setIsChecking(true);
    setError(null);

    try {
      // First find which section contains this task
      const { data: sections, error: sectionError } = await supabase
        .from('section')
        .select('team_id')
        .contains('task_ids', [taskId]);
      
      if (sectionError) throw sectionError;
      
      // If no section found, user can't be a member
      if (!sections || sections.length === 0) {
        setIsMember(false);
        return { isMember: false, teamId: null };
      }
      
      // Get the team ID from the section
      const teamId = sections[0].team_id;
      
      // Now check if the user is a member of this team
      const { data: teamMembers, error: teamError } = await supabase
        .from('user_team')
        .select('*')
        .eq('user_id', userId)
        .eq('team_id', teamId);
        
      if (teamError) throw teamError;
      
      // User is a member if we got any results
      const membershipStatus = teamMembers && teamMembers.length > 0;
      setTeamId(teamId);
      setIsMember(membershipStatus);
      
      return { isMember: membershipStatus, teamId };
    } catch (err) {
      console.error('Error checking task team membership:', err);
      setError(err.message);
      setIsMember(false);
      return { isMember: false, teamId: null };
    } finally {
      setIsChecking(false);
    }
  }, []);

  // Automatically check membership when teamId and user change
  useEffect(() => {
    if (teamId && user) {
      checkTeamMembership(teamId);
    }
  }, [teamId, user, checkTeamMembership]);

  /**
   * Check membership for a different team ID
   * @param {number|string} newTeamId - Team ID to check membership for
   */
  const checkForTeam = useCallback((newTeamId) => {
    setTeamId(newTeamId);
    return checkTeamMembership(newTeamId);
  }, [checkTeamMembership]);

  return {
    teamId,
    isMember,
    isChecking,
    error,
    checkTeamMembership: checkForTeam,
    checkTaskTeamMembership
  };
}

export default useTeamMembership; 