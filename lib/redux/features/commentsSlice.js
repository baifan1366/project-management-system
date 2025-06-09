import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '@/lib/api';

// Fetch all comment for a post
export const fetchCommentsByPostId = createAsyncThunk(
  'comments/fetchByPostId',
  async (postId, { rejectWithValue }) => {
    try {
      return await api.teams.posts.comments.getByPostId(postId);
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Fetch a comment by ID
export const fetchCommentById = createAsyncThunk(
  'comments/fetchById',
  async (commentId, { rejectWithValue }) => {
    try {
      return await api.teams.posts.comments.getById(commentId);
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Create a new comment
export const createComment = createAsyncThunk(
  'comments/createComment',
  async (comment, { rejectWithValue }) => {
    try {
      // 验证评论数据
      if (!comment || !comment.post_id || !comment.text || !comment.user_id) {
        console.error('评论数据无效:', comment);
        return rejectWithValue('评论数据无效，缺少必要字段');
      }
      
      const result = await api.teams.posts.comments.createComment(comment);
      return result;
    } catch (error) {
      console.error('创建评论失败:', error);
      return rejectWithValue(error.message || '创建评论失败');
    }
  }
);

const commentsSlice = createSlice({
    name: 'comments',
    initialState: {
        items: [],
        selectedComment: null,
        status: 'idle',
        error: null,
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchCommentsByPostId.pending, (state) => {
                state.status = 'loading';
            })
            .addCase(fetchCommentsByPostId.fulfilled, (state, action) => {
                state.status = 'succeeded';
                state.items = action.payload;
            })
            .addCase(fetchCommentsByPostId.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.payload;
            })
            .addCase(fetchCommentById.pending, (state) => {
                state.status = 'loading';
            })
            .addCase(fetchCommentById.fulfilled, (state, action) => {
                state.status = 'succeeded';
                state.selectedComment = action.payload;
            })
            .addCase(fetchCommentById.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.payload;
            })
            .addCase(createComment.pending, (state) => {
                state.status = 'loading';
            })
            .addCase(createComment.fulfilled, (state, action) => {
                state.status = 'succeeded';
                state.items.push(action.payload);
            })
            .addCase(createComment.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.payload;
            });
    }
})

export const { clearSelectedComment } = commentsSlice.actions;
export default commentsSlice.reducer;