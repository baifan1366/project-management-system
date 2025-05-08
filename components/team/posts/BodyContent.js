'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { getSectionByTeamId } from '@/lib/redux/features/sectionSlice';
import { fetchTasksBySectionId, fetchAllTasks } from '@/lib/redux/features/taskSlice';
import { fetchAllTags, getTagByName } from '@/lib/redux/features/tagSlice';
import { useDispatch } from 'react-redux';

// Empty constants to avoid recreating objects each render
const EMPTY_OBJECT = {};
const EMPTY_ARRAY = [];

export default function BodyContent({ projectId, teamId, teamCFId }) {
    const dispatch = useDispatch();
    const [posts, setPosts] = useState([]);
    const [sections, setSections] = useState([]);
    const [isLoaded, setIsLoaded] = useState(false);
    const [assigneeTagId, setAssigneeTagId] = useState(null);
    const [nameTagId, setNameTagId] = useState(null);
    const [descriptionTagId, setDescriptionTagId] = useState(null);
    const [dueDateTagId, setDueDateTagId] = useState(null);

    // Fetch tag IDs for data mapping
    useEffect(() => {
        async function fetchTagIds() {
            try {
                // Get Assignee tag ID
                const assigneeTag = await dispatch(getTagByName("Assignee")).unwrap();
                if (assigneeTag) {
                    setAssigneeTagId(assigneeTag);
                    console.log('Retrieved Assignee tag ID:', assigneeTag);
                }

                // Get Name tag ID
                const nameTag = await dispatch(getTagByName("Name")).unwrap();
                if (nameTag) {
                    setNameTagId(nameTag);
                    console.log('Retrieved Name tag ID:', nameTag);
                }
                
                // Get Description tag ID
                const descriptionTag = await dispatch(getTagByName("Description")).unwrap();
                if (descriptionTag) {
                    setDescriptionTagId(descriptionTag);
                    console.log('Retrieved Description tag ID:', descriptionTag);
                }
                
                // Get DueDate tag ID
                const dueDateTag = await dispatch(getTagByName("Due Date")).unwrap();
                if (dueDateTag) {
                    setDueDateTagId(dueDateTag);
                    console.log('Retrieved DueDate tag ID:', dueDateTag);
                }
            } catch (error) {
                console.error('Failed to fetch tag IDs:', error);
            }
        }

        fetchTagIds();
    }, [dispatch]);

    // Load data with useCallback for stable reference
    const loadData = useCallback(async (forceReload = false) => {
        if (!teamId || (isLoaded && !forceReload)) return;
        
        try {
            if (!isLoaded) {
                setIsLoaded(true);
            }
            
            // Get all tags
            const tagsData = await dispatch(fetchAllTags()).unwrap();
            
            // Get all sections for this team
            const sectionsData = await dispatch(getSectionByTeamId(teamId)).unwrap();
            setSections(sectionsData);
            
            // Prepare to collect all posts
            const allPosts = [];
            
            // Process each section
            for (let i = 0; i < sectionsData.length; i++) {
                const section = sectionsData[i];
                if (section && section.id) {
                    // Get tasks for this section
                    const sectionTasks = await dispatch(fetchTasksBySectionId(section.id)).unwrap();
                    
                    // Process each task in the section
                    sectionTasks.forEach(task => {
                        // Extract task content based on tag values
                        let taskTitle = 'Untitled Task';
                        let taskDescription = '';
                        let dueDate = null;
                        let assignee = null;
                        
                        // If task has tag values, extract them
                        if (task.tag_values) {
                            // Extract title
                            if (nameTagId && task.tag_values[nameTagId]) {
                                taskTitle = task.tag_values[nameTagId];
                            } else {
                                // Fallback to looking for Name tag
                                const nameTag = tagsData.find(tag => tag.name === "Name");
                                if (nameTag && task.tag_values[nameTag.id]) {
                                    taskTitle = task.tag_values[nameTag.id];
                                }
                            }
                            
                            // Extract description
                            if (descriptionTagId && task.tag_values[descriptionTagId]) {
                                taskDescription = task.tag_values[descriptionTagId];
                            } else {
                                // Fallback to looking for Description tag
                                const descTag = tagsData.find(tag => tag.name === "Description");
                                if (descTag && task.tag_values[descTag.id]) {
                                    taskDescription = task.tag_values[descTag.id];
                                }
                            }
                            
                            // Extract due date
                            if (dueDateTagId && task.tag_values[dueDateTagId]) {
                                dueDate = task.tag_values[dueDateTagId];
                            } else {
                                // Fallback to looking for DueDate tag
                                const dateTag = tagsData.find(tag => tag.name === "Due Date");
                                if (dateTag && task.tag_values[dateTag.id]) {
                                    dueDate = task.tag_values[dateTag.id];
                                }
                            }
                            
                            // Extract assignee
                            if (assigneeTagId && task.tag_values[assigneeTagId]) {
                                assignee = task.tag_values[assigneeTagId];
                            } else {
                                // Fallback to looking for Assignee tag or using ID "2" as legacy
                                const assignTag = tagsData.find(tag => tag.name === "Assignee");
                                if (assignTag && task.tag_values[assignTag.id]) {
                                    assignee = task.tag_values[assignTag.id];
                                } else if (task.tag_values["2"]) {
                                    assignee = task.tag_values["2"];
                                }
                            }
                        }
                        
                        // Create post object from task data
                        allPosts.push({
                            id: task.id.toString(),
                            title: taskTitle,
                            description: taskDescription,
                            dueDate: dueDate,
                            // Format assignee properly
                            assignee: assignee ? (
                                Array.isArray(assignee) ? 
                                { 
                                    avatar: '/avatar-placeholder.png',
                                    assignees: assignee
                                } : 
                                { 
                                    avatar: '/avatar-placeholder.png',
                                    assignee: assignee 
                                }
                            ) : (task.assignee_id ? { avatar: '/avatar-placeholder.png' } : null),
                            section: section.name,
                            sectionId: section.id,
                            created_at: task.created_at,
                            updated_at: task.updated_at,
                            tags: [], // Placeholder for tags
                            likes: task.likes || [],
                            comments: task.comments || [],
                            tag_values: task.tag_values // Keep original tag values for reference
                        });
                    });
                }
            }
            
            // Set posts data
            setPosts(allPosts);
            
            if (forceReload) {
                console.log('Posts data reload completed');
            }
            
        } catch (error) {
            console.error('Failed to load data:', error);
        }
    }, [teamId, dispatch, isLoaded, nameTagId, assigneeTagId, descriptionTagId, dueDateTagId]);

    // Automatically load data when component mounts or teamId changes
    useEffect(() => {
        if (teamId) {
            loadData();
        }
    }, [teamId, loadData]);

    // Use useMemo to cache return values
    const returnData = useMemo(() => {
        return {
            loadData,
            posts: posts.length > 0 ? posts : EMPTY_ARRAY,
            sections: sections.length > 0 ? sections : EMPTY_ARRAY,
            // Return tag IDs for other components to use
            assigneeTagId,
            nameTagId,
            descriptionTagId,
            dueDateTagId
        };
    }, [posts, sections, loadData, assigneeTagId, nameTagId, descriptionTagId, dueDateTagId]);

    return returnData;
} 