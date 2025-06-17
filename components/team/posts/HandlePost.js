'use client';

import { useState, useCallback } from 'react';
import { createPost, updatePost, deletePost, fetchPostById, togglePostPin, addReaction, addComment } from '@/lib/redux/features/postsSlice';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

export default function HandlePost({ teamId }) {
  const dispatch = useDispatch();
  const t = useTranslations('PostsView');
  const [selectedPost, setSelectedPost] = useState(null);
  const user = useSelector(state => state.users.currentUser);

  // 创建新帖子
  const CreatePost = useCallback(async ({ title, description, type, teamId }) => {
    try {
      if (!user?.id) {
        toast.error('用户未认证');
        return null;
      }
      
      const newPost = {
        title,
        description,
        team_id: teamId,
        type: type, // 包含帖子类型
        created_by: user.id,
        created_at: new Date().toISOString(), // 添加创建时间
        is_pinned: false,
        reactions: {},
        attachment_id: [] // 使用新的attachment_id字段
      };
      
      const result = await dispatch(createPost(newPost)).unwrap();
      
      if (result) {
        toast.success(t('postCreated'));
        return result;
      } else {
        toast.error(t('createPostFailed'));
        return null;
      }
    } catch (error) {
      console.error('创建帖子错误:', error);
      toast.error(t('createPostError'));
      return null;
    }
  }, [dispatch, user]);

  // 更新现有帖子
  const UpdatePost = useCallback(async ({ postId, title, description }) => {
    try {
      const updatedPost = {
        id: postId
      };
      
      // 只包含提供的字段
      if (title !== undefined) updatedPost.title = title;
      if (description !== undefined) updatedPost.description = description;
      
      // 添加更新时间戳
      updatedPost.updated_at = new Date().toISOString();
      
      const result = await dispatch(updatePost(updatedPost)).unwrap();
      
      if (result) {
        toast.success(t('postUpdated'));
        return result;
      } else {
        toast.error(t('updatePostFailed'));
        return null;
      }
    } catch (error) {
      console.error('更新帖子错误:', error);
      toast.error(t('updatePostError'));
      return null;
    }
  }, [dispatch]);

  // 删除帖子
  const DeletePost = useCallback(async (postId) => {
    try {
      await dispatch(deletePost(postId)).unwrap();
      toast.success(t('postDeleted'));
      return true;
    } catch (error) {
      console.error('删除帖子错误:', error);
      toast.error(t('deletePostError'));
      return false;
    }
  }, [dispatch]);

  // 选择帖子查看/编辑
  const selectPost = useCallback(async (postId) => {
    try {
      const post = await dispatch(fetchPostById(postId)).unwrap();
      setSelectedPost(post);
      return post;
    } catch (error) {
      console.error('选择帖子错误:', error);
      return null;
    }
  }, [dispatch]);

  // 切换帖子置顶状态
  const TogglePostPin = useCallback(async (postId) => {
    try {
      const result = await dispatch(togglePostPin(postId)).unwrap();
      
      if (result) {
        toast.success(result.is_pinned ? t('postPinned') : t('postUnpinned'));
        return result;
      } else {
        toast.error(t('updatePinStatusFailed'));
        return null;
      }
    } catch (error) {
      console.error('切换置顶状态错误:', error);
      toast.error(t('updatePinStatusError'));
      return null;
    }
  }, [dispatch]);

  // 对帖子添加反应
  const ReactToPost = useCallback(async ({ postId, emoji }) => {
    try {
      if (!user?.id) {
        toast.error('用户未认证');
        return null;
      }
      
      const result = await dispatch(addReaction({
        postId,
        userId: user.id,
        emoji
      })).unwrap();
      
      if (result) {
        return result;
      } else {
        toast.error(t('updateReactionFailed'));
        return null;
      }
    } catch (error) {
      console.error('更新反应错误:', error);
      toast.error(t('updateReactionError'));
      return null;
    }
  }, [dispatch, user]);

  // 对帖子添加评论
  const CommentOnPost = useCallback(async ({ postId, content }) => {
    try {
      if (!user?.id) {
        toast.error(t('userNotAuthenticated'));
        return null;
      }
      
      const result = await dispatch(addComment({
        postId,
        userId: user.id,
        userName: user.name || '匿名',
        content
      })).unwrap();
      
      if (result) {
        toast.success(t('commentAdded'));
        return result;
      } else {
        toast.error(t('addCommentFailed'));
        return null;
      }
    } catch (error) {
      console.error('添加评论错误:', error);
      toast.error(t('addCommentError'));
      return null;
    }
  }, [dispatch, user]);

  // 添加附件
  const AddAttachment = useCallback(async ({ postId, attachmentId }) => {
    try {
      if (!user?.id) {
        toast.error('用户未认证');
        return null;
      }
      
      // 使用PATCH请求添加附件到帖子
      const response = await fetch(`/api/teams/posts`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'addAttachment',
          postId,
          attachmentId
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '添加附件失败');
      }
      
      const result = await response.json();
      
      if (result) {
        toast.success(t('attachmentAdded'));
        return result;
      } else {
        toast.error(t('addAttachmentFailed'));
        return null;
      }
    } catch (error) {
      console.error('添加附件错误:', error);
      toast.error(t('addAttachmentError'));
      return null;
    }
  }, [user]);

  // 移除附件
  const RemoveAttachment = useCallback(async ({ postId, attachmentId }) => {
    try {
      if (!user?.id) {
        toast.error('用户未认证');
        return null;
      }
      
      // 使用PATCH请求从帖子移除附件
      const response = await fetch(`/api/teams/posts`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'removeAttachment',
          postId,
          attachmentId
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '移除附件失败');
      }
      
      const result = await response.json();
      
      if (result) {
        toast.success(t('attachmentRemoved'));
        return result;
      } else {
        toast.error(t('removeAttachmentFailed'));
        return null;
      }
    } catch (error) {
      console.error('移除附件错误:', error);
      toast.error(t('removeAttachmentError'));
      return null;
    }
  }, [user]);

  return {
    CreatePost,
    UpdatePost,
    DeletePost,
    selectPost,
    selectedPost,
    TogglePostPin,
    ReactToPost,
    CommentOnPost,
    AddAttachment,
    RemoveAttachment
  };
} 