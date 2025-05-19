import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET posts by team ID
export async function GET(request) {
  try {
    // Extract teamId from the URL query params
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('teamId');
    const postId = searchParams.get('postId');

    if (postId) {
      // Fetch a single post
      const { data, error } = await supabase
        .from('team_post')
        .select('*')
        .eq('id', postId)
        .single();

      if (error) throw error;
      return NextResponse.json(data);
    } else if (teamId) {
      // Fetch all posts for a team
      const { data, error } = await supabase
        .from('team_post')
        .select('*')
        .eq('team_id', teamId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return NextResponse.json(data);
    } else {
      return NextResponse.json({ error: 'Missing teamId or postId parameter' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error fetching posts:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST a new post
export async function POST(request) {
  try {
    const post = await request.json();
    
    // 确保使用正确的字段
    if (!post.comment_id && post.comments) {
      post.comment_id = [];
      delete post.comments;
    }
    
    if (!post.attachment_id && post.attachments) {
      post.attachment_id = [];
      delete post.attachments;
    }
    
    // 移除tags字段如果存在
    if (post.tags) {
      delete post.tags;
    }
    
    const { data, error } = await supabase
      .from('team_post')
      .insert(post)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error creating post:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT/update a post
export async function PUT(request) {
  try {
    const post = await request.json();
    const { id, ...updateData } = post;
    
    if (!id) {
      return NextResponse.json({ error: 'Post ID is required' }, { status: 400 });
    }
    
    // 确保使用正确的字段
    if (updateData.comments) {
      updateData.comment_id = updateData.comment_id || [];
      delete updateData.comments;
    }
    
    if (updateData.attachments) {
      updateData.attachment_id = updateData.attachment_id || [];
      delete updateData.attachments;
    }
    
    // 移除tags字段如果存在
    if (updateData.tags) {
      delete updateData.tags;
    }

    const { data, error } = await supabase
      .from('team_post')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating post:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE a post
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const postId = searchParams.get('postId');
    
    if (!postId) {
      return NextResponse.json({ error: 'Post ID is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('team_post')
      .delete()
      .eq('id', postId);

    if (error) throw error;
    return NextResponse.json({ success: true, id: postId });
  } catch (error) {
    console.error('Error deleting post:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH - For partial updates like toggle pin, reactions, comments
export async function PATCH(request) {
  try {
    const data = await request.json();
    const { action, postId } = data;
    
    if (!postId) {
      return NextResponse.json({ error: 'Post ID is required' }, { status: 400 });
    }

    switch (action) {
      case 'togglePin': {
        // First get the current pin status
        const { data: post, error: fetchError } = await supabase
          .from('team_post')
          .select('is_pinned')
          .eq('id', postId)
          .single();

        if (fetchError) throw fetchError;

        // Toggle the pin status
        const { data: updatedPost, error: updateError } = await supabase
          .from('team_post')
          .update({ is_pinned: !post.is_pinned })
          .eq('id', postId)
          .select()
          .single();

        if (updateError) throw updateError;
        return NextResponse.json(updatedPost);
      }
      
      case 'addReaction': {
        const { userId, emoji } = data;
        
        if (!userId || !emoji) {
          return NextResponse.json({ error: 'userId and emoji are required' }, { status: 400 });
        }
        
        // First get the current post to access its reactions
        const { data: post, error: fetchError } = await supabase
          .from('team_post')
          .select('reactions')
          .eq('id', postId)
          .single();

        if (fetchError) throw fetchError;

        // Update the reactions object
        const currentReactions = post.reactions || {};
        const emojiReactions = currentReactions[emoji] || [];
        
        // Toggle the reaction - add if not present, remove if present
        let updatedEmojiReactions;
        if (emojiReactions.includes(userId)) {
          updatedEmojiReactions = emojiReactions.filter(id => id !== userId);
        } else {
          updatedEmojiReactions = [...emojiReactions, userId];
        }

        // Create updated reactions object
        const updatedReactions = {
          ...currentReactions,
          [emoji]: updatedEmojiReactions
        };

        // If array is empty, remove the emoji key
        if (updatedEmojiReactions.length === 0) {
          delete updatedReactions[emoji];
        }

        // Update the post with new reactions
        const { data: updatedPost, error: updateError } = await supabase
          .from('team_post')
          .update({ reactions: updatedReactions })
          .eq('id', postId)
          .select()
          .single();

        if (updateError) throw updateError;
        return NextResponse.json(updatedPost);
      }
      
      case 'addComment': {
        const { userId, userName, content } = data;
        
        if (!userId || !userName || !content) {
          return NextResponse.json({ error: 'userId, userName, and content are required' }, { status: 400 });
        }
        
        // 首先在comments表中插入新评论
        const { data: newComment, error: commentError } = await supabase
          .from('comment')
          .insert({
            user_id: userId,
            content: content,
            created_at: new Date().toISOString()
          })
          .select()
          .single();
          
        if (commentError) throw commentError;
        
        // 然后获取当前帖子以更新comment_id数组
        const { data: post, error: fetchError } = await supabase
          .from('team_post')
          .select('comment_id')
          .eq('id', postId)
          .single();

        if (fetchError) throw fetchError;

        // 更新评论ID数组
        const updatedCommentIds = [...(post.comment_id || []), newComment.id];

        // 更新帖子的comment_id字段
        const { data: updatedPost, error: updateError } = await supabase
          .from('team_post')
          .update({ comment_id: updatedCommentIds })
          .eq('id', postId)
          .select()
          .single();

        if (updateError) throw updateError;
        
        // 返回更新后的帖子和新评论信息
        return NextResponse.json({
          ...updatedPost,
          newComment
        });
      }
      
      case 'addAttachment': {
        const { attachmentId } = data;
        
        if (!attachmentId) {
          return NextResponse.json({ error: 'attachmentId is required' }, { status: 400 });
        }
        
        // 获取当前帖子以更新attachment_id数组
        const { data: post, error: fetchError } = await supabase
          .from('team_post')
          .select('attachment_id')
          .eq('id', postId)
          .single();

        if (fetchError) throw fetchError;

        // 更新附件ID数组
        const updatedAttachmentIds = [...(post.attachment_id || []), attachmentId];

        // 更新帖子的attachment_id字段
        const { data: updatedPost, error: updateError } = await supabase
          .from('team_post')
          .update({ attachment_id: updatedAttachmentIds })
          .eq('id', postId)
          .select()
          .single();

        if (updateError) throw updateError;
        return NextResponse.json(updatedPost);
      }
      
      case 'removeAttachment': {
        const { attachmentId } = data;
        
        if (!attachmentId) {
          return NextResponse.json({ error: 'attachmentId is required' }, { status: 400 });
        }
        
        // 获取当前帖子以更新attachment_id数组
        const { data: post, error: fetchError } = await supabase
          .from('team_post')
          .select('attachment_id')
          .eq('id', postId)
          .single();

        if (fetchError) throw fetchError;

        // 从数组中移除指定的附件ID
        const updatedAttachmentIds = (post.attachment_id || []).filter(id => id !== attachmentId);

        // 更新帖子的attachment_id字段
        const { data: updatedPost, error: updateError } = await supabase
          .from('team_post')
          .update({ attachment_id: updatedAttachmentIds })
          .eq('id', postId)
          .select()
          .single();

        if (updateError) throw updateError;
        return NextResponse.json(updatedPost);
      }
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error updating post:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
