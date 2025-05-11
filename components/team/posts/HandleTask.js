'use client';

import { useState, useCallback, useEffect } from 'react';
import { createTask, updateTask, deleteTask, fetchTaskById } from '@/lib/redux/features/taskSlice';
import { createPost, updatePost, deletePost, fetchPostById, togglePostPin, addReaction, addComment } from '@/lib/redux/features/postsSlice';
import { useDispatch, useSelector } from 'react-redux';
import { fetchAllTags, getTagByName } from '@/lib/redux/features/tagSlice';
import { toast } from 'sonner';

export default function HandleTask({ teamId }) {
  const dispatch = useDispatch();
  const [selectedTask, setSelectedTask] = useState(null);
  const [selectedPost, setSelectedPost] = useState(null);
  const [tagIds, setTagIds] = useState({
    name: null,
    description: null,
    dueDate: null,
    assignee: null
  });
  const user = useSelector(state => state.users.currentUser);

  // Fetch tag IDs on component mount
  useEffect(() => {
    const fetchTagIds = async () => {
      try {
        // Get all important tag IDs for task handling
        const [nameTag, descriptionTag, dueDateTag, assigneeTag] = await Promise.all([
          dispatch(getTagByName("Name")).unwrap(),
          dispatch(getTagByName("Description")).unwrap(),
          dispatch(getTagByName("Due Date")).unwrap(),
          dispatch(getTagByName("Assignee")).unwrap()
        ]);

        setTagIds({
          name: nameTag,
          description: descriptionTag,
          dueDate: dueDateTag,
          assignee: assigneeTag
        });
      } catch (error) {
        console.error('Failed to fetch tag IDs:', error);
      }
    };

    fetchTagIds();
  }, [dispatch]);

  // Create a new task
  const CreateTask = useCallback(async ({ sectionId, title, description, dueDate, assignee }) => {
    try {
      // Prepare tag values
      const tagValues = {};
      
      // Add task title as Name tag value
      if (tagIds.name && title) {
        tagValues[tagIds.name] = title;
      }
      
      // Add task description as Description tag value
      if (tagIds.description && description) {
        tagValues[tagIds.description] = description;
      }
      
      // Add due date as DueDate tag value
      if (tagIds.dueDate && dueDate) {
        tagValues[tagIds.dueDate] = dueDate;
      }
      
      // Add assignee as Assignee tag value
      if (tagIds.assignee && assignee) {
        tagValues[tagIds.assignee] = assignee;
      }
      
      // Create task with tag values
      const newTask = {
        section_id: sectionId,
        tag_values: tagValues,
        status: 'TODO',
        likes: [],
        comments: []
      };
      
      const result = await dispatch(createTask(newTask)).unwrap();
      
      if (result) {
        toast.success('Task created successfully');
        return result;
      } else {
        toast.error('Failed to create task');
        return null;
      }
    } catch (error) {
      console.error('Error creating task:', error);
      toast.error('Error creating task');
      return null;
    }
  }, [dispatch, tagIds]);

  // Create a new post
  const CreatePost = useCallback(async ({ title, description, teamId, sectionId, tags = [] }) => {
    try {
      if (!user?.id) {
        toast.error('User not authenticated');
        return null;
      }
      
      const newPost = {
        title,
        description,
        team_id: teamId,
        section_id: sectionId,
        tags,
        created_by: user.id,
        is_pinned: false,
        reactions: {},
        comments: []
      };
      
      const result = await dispatch(createPost(newPost)).unwrap();
      
      if (result) {
        toast.success('Post created successfully');
        return result;
      } else {
        toast.error('Failed to create post');
        return null;
      }
    } catch (error) {
      console.error('Error creating post:', error);
      toast.error('Error creating post');
      return null;
    }
  }, [dispatch, user]);

  // Update an existing task
  const UpdateTask = useCallback(async ({ taskId, title, description, dueDate, assignee, status, likes, comments }) => {
    try {
      // First fetch the current task to preserve existing tag values
      const existingTask = await dispatch(fetchTaskById(taskId)).unwrap();
      
      if (!existingTask) {
        toast.error('Task not found');
        return null;
      }
      
      // Get existing tag values or initialize empty object
      const tagValues = existingTask.tag_values || {};
      
      // Update task title (Name tag)
      if (tagIds.name && title !== undefined) {
        tagValues[tagIds.name] = title;
      }
      
      // Update task description (Description tag)
      if (tagIds.description && description !== undefined) {
        tagValues[tagIds.description] = description;
      }
      
      // Update due date (DueDate tag)
      if (tagIds.dueDate && dueDate !== undefined) {
        tagValues[tagIds.dueDate] = dueDate;
      }
      
      // Update assignee (Assignee tag)
      if (tagIds.assignee && assignee !== undefined) {
        tagValues[tagIds.assignee] = assignee;
      }
      
      // Create updated task object
      const updatedTask = {
        id: taskId,
        tag_values: tagValues
      };
      
      // Add status if provided
      if (status) {
        updatedTask.status = status;
      }
      
      // Add likes if provided
      if (likes) {
        updatedTask.likes = likes;
      }
      
      // Add comments if provided
      if (comments) {
        updatedTask.comments = comments;
      }
      
      const result = await dispatch(updateTask(updatedTask)).unwrap();
      
      if (result) {
        toast.success('Task updated successfully');
        return result;
      } else {
        toast.error('Failed to update task');
        return null;
      }
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error('Error updating task');
      return null;
    }
  }, [dispatch, tagIds]);

  // Update an existing post
  const UpdatePost = useCallback(async ({ postId, title, description, sectionId, tags }) => {
    try {
      const updatedPost = {
        id: postId
      };
      
      // Only include fields that are provided
      if (title !== undefined) updatedPost.title = title;
      if (description !== undefined) updatedPost.description = description;
      if (sectionId !== undefined) updatedPost.section_id = sectionId;
      if (tags !== undefined) updatedPost.tags = tags;
      
      // Add updated timestamp
      updatedPost.updated_at = new Date().toISOString();
      
      const result = await dispatch(updatePost(updatedPost)).unwrap();
      
      if (result) {
        toast.success('Post updated successfully');
        return result;
      } else {
        toast.error('Failed to update post');
        return null;
      }
    } catch (error) {
      console.error('Error updating post:', error);
      toast.error('Error updating post');
      return null;
    }
  }, [dispatch]);

  // Delete a task
  const DeleteTask = useCallback(async (taskId) => {
    try {
      await dispatch(deleteTask(taskId)).unwrap();
      toast.success('Task deleted successfully');
      return true;
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error('Error deleting task');
      return false;
    }
  }, [dispatch]);

  // Delete a post
  const DeletePost = useCallback(async (postId) => {
    try {
      await dispatch(deletePost(postId)).unwrap();
      toast.success('Post deleted successfully');
      return true;
    } catch (error) {
      console.error('Error deleting post:', error);
      toast.error('Error deleting post');
      return false;
    }
  }, [dispatch]);

  // Select a task to view/edit
  const selectTask = useCallback(async (taskId) => {
    try {
      const task = await dispatch(fetchTaskById(taskId)).unwrap();
      setSelectedTask(task);
      return task;
    } catch (error) {
      console.error('Error selecting task:', error);
      return null;
    }
  }, [dispatch]);

  // Select a post to view/edit
  const selectPost = useCallback(async (postId) => {
    try {
      const post = await dispatch(fetchPostById(postId)).unwrap();
      setSelectedPost(post);
      return post;
    } catch (error) {
      console.error('Error selecting post:', error);
      return null;
    }
  }, [dispatch]);

  // Toggle pin status of a post
  const TogglePostPin = useCallback(async (postId) => {
    try {
      // The API now handles getting the current pin status and toggling it
      const result = await dispatch(togglePostPin(postId)).unwrap();
      
      if (result) {
        toast.success(result.is_pinned ? 'Post pinned' : 'Post unpinned');
        return result;
      } else {
        toast.error('Failed to update pin status');
        return null;
      }
    } catch (error) {
      console.error('Error toggling pin status:', error);
      toast.error('Error updating pin status');
      return null;
    }
  }, [dispatch]);

  // Like a task (toggle)
  const LikeTask = useCallback(async ({ taskId, userId }) => {
    try {
      // Fetch current task to get existing likes
      const task = await dispatch(fetchTaskById(taskId)).unwrap();
      
      if (!task) {
        toast.error('Task not found');
        return null;
      }
      
      // Get current likes or initialize empty array
      const currentLikes = task.likes || [];
      
      // Check if user already liked the task
      const userLikeIndex = currentLikes.indexOf(userId);
      let updatedLikes;
      
      if (userLikeIndex !== -1) {
        // User already liked, remove the like
        updatedLikes = [...currentLikes];
        updatedLikes.splice(userLikeIndex, 1);
      } else {
        // User hasn't liked, add the like
        updatedLikes = [...currentLikes, userId];
      }
      
      // Update the task with new likes
      const updatedTask = {
        id: taskId,
        likes: updatedLikes
      };
      
      const result = await dispatch(updateTask(updatedTask)).unwrap();
      
      if (result) {
        toast.success(userLikeIndex !== -1 ? 'Like removed' : 'Post liked');
        return result;
      } else {
        toast.error('Failed to update likes');
        return null;
      }
    } catch (error) {
      console.error('Error updating task likes:', error);
      toast.error('Error updating likes');
      return null;
    }
  }, [dispatch]);

  // Add reaction to a post
  const ReactToPost = useCallback(async ({ postId, emoji }) => {
    try {
      if (!user?.id) {
        toast.error('User not authenticated');
        return null;
      }
      
      const result = await dispatch(addReaction({
        postId,
        userId: user.id,
        emoji
      })).unwrap();
      
      if (result) {
        // No toast here as it would be too noisy for reactions
        return result;
      } else {
        toast.error('Failed to update reaction');
        return null;
      }
    } catch (error) {
      console.error('Error updating reaction:', error);
      toast.error('Error updating reaction');
      return null;
    }
  }, [dispatch, user]);

  // Add comment to a task
  const AddComment = useCallback(async ({ taskId, userId, userName, comment }) => {
    try {
      // Fetch current task to get existing comments
      const task = await dispatch(fetchTaskById(taskId)).unwrap();
      
      if (!task) {
        toast.error('Task not found');
        return null;
      }
      
      // Get current comments or initialize empty array
      const currentComments = task.comments || [];
      
      // Create new comment object
      const newComment = {
        id: Date.now().toString(), // Generate unique ID
        user_id: userId,
        user_name: userName,
        content: comment,
        created_at: new Date().toISOString()
      };
      
      // Add new comment to comments array
      const updatedComments = [...currentComments, newComment];
      
      // Update task with new comments
      const updatedTask = {
        id: taskId,
        comments: updatedComments
      };
      
      const result = await dispatch(updateTask(updatedTask)).unwrap();
      
      if (result) {
        toast.success('Comment added');
        return result;
      } else {
        toast.error('Failed to add comment');
        return null;
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Error adding comment');
      return null;
    }
  }, [dispatch]);

  // Add comment to a post
  const CommentOnPost = useCallback(async ({ postId, content }) => {
    try {
      if (!user?.id) {
        toast.error('User not authenticated');
        return null;
      }
      
      const result = await dispatch(addComment({
        postId,
        userId: user.id,
        userName: user.name || 'Anonymous',
        content
      })).unwrap();
      
      if (result) {
        toast.success('Comment added');
        return result;
      } else {
        toast.error('Failed to add comment');
        return null;
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Error adding comment');
      return null;
    }
  }, [dispatch, user]);

  return {
    CreateTask,
    UpdateTask,
    DeleteTask,
    selectTask,
    selectedTask,
    LikeTask,
    AddComment,
    CreatePost,
    UpdatePost,
    DeletePost,
    selectPost,
    selectedPost,
    TogglePostPin,
    ReactToPost,
    CommentOnPost
  };
} 