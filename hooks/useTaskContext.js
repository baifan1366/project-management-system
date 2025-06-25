'use client';

import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

/**
 * Custom hook for fetching context information about a task
 * Provides details about which project and team a task belongs to,
 * which section it's in, and who it's assigned to
 */
export function useTaskContext() {
  const [taskContextMap, setTaskContextMap] = useState({});
  const [isLoading, setIsLoading] = useState({});
  const [error, setError] = useState({});

  /**
   * Fetch context information for a specific task
   * @param {number|string} taskId - The task ID to fetch context for
   */
  const fetchTaskContext = useCallback(async (taskId) => {
    if (!taskId || taskContextMap[taskId]) return;

    setIsLoading(prev => ({ ...prev, [taskId]: true }));
    setError(prev => ({ ...prev, [taskId]: null }));

    try {
      // First get the task itself to ensure it exists
      const { data: taskData, error: taskError } = await supabase
        .from('task')
        .select('*')
        .eq('id', taskId)
        .single();
      
      if (taskError) throw taskError;
      if (!taskData) throw new Error('Task not found');

      // Find which section contains this task
      const { data: sections, error: sectionError } = await supabase
        .from('section')
        .select('*')
        .contains('task_ids', [taskId]);
      
      if (sectionError) throw sectionError;
      const section = sections && sections.length > 0 ? sections[0] : null;
      
      let team = null;
      let project = null;
      let assignees = [];
      
      // If we found a section, get the team it belongs to
      if (section) {
        const { data: teamData, error: teamError } = await supabase
          .from('team')
          .select('*, project:project_id(*)')
          .eq('id', section.team_id)
          .single();
        
        if (teamError) throw teamError;
        
        team = teamData;
        project = teamData.project;
        
        // Get assignees (if task has any)
        if (taskData.tag_values && taskData.tag_values['2']) {
          const assigneeIds = Array.isArray(taskData.tag_values['2']) 
            ? taskData.tag_values['2'] 
            : [taskData.tag_values['2']];
            
          if (assigneeIds.length > 0) {
            const { data: assigneeData, error: assigneeError } = await supabase
              .from('user')
              .select('id, name, avatar_url')
              .in('id', assigneeIds);
              
            if (assigneeError) throw assigneeError;
            assignees = assigneeData || [];
          }
        }
      }

      // Update the task context map with all the data we've collected
      setTaskContextMap(prev => ({
        ...prev, 
        [taskId]: {
          task: taskData,
          section,
          team,
          project,
          assignees
        }
      }));
    } catch (err) {
      console.error('Error fetching task context:', err);
      setError(prev => ({ ...prev, [taskId]: err.message }));
    } finally {
      setIsLoading(prev => ({ ...prev, [taskId]: false }));
    }
  }, [taskContextMap]);

  /**
   * Clear context information for a specific task
   * @param {number|string} taskId - The task ID to clear context for
   */
  const clearTaskContext = useCallback((taskId) => {
    setTaskContextMap(prev => {
      const newMap = { ...prev };
      delete newMap[taskId];
      return newMap;
    });
    
    setIsLoading(prev => {
      const newLoading = { ...prev };
      delete newLoading[taskId];
      return newLoading;
    });
    
    setError(prev => {
      const newError = { ...prev };
      delete newError[taskId];
      return newError;
    });
  }, []);

  return {
    taskContextMap,
    isLoading,
    error,
    fetchTaskContext,
    clearTaskContext
  };
}

export default useTaskContext; 