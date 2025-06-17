import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '@/lib/api';
import { createNotification } from './notificationSlice';

// Fetch all posts for a team
export const fetchPostsByTeamId = createAsyncThunk(
  'posts/fetchByTeamId',
  async (teamId, { rejectWithValue }) => {
    try {
      return await api.teams.posts.getByTeamId(teamId);
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Fetch a post by ID
export const fetchPostById = createAsyncThunk(
  'posts/fetchById',
  async (postId, { rejectWithValue }) => {
    try {
      return await api.teams.posts.getById(postId);
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Create a new post
export const createPost = createAsyncThunk(
  'posts/create',
  async (post, { rejectWithValue, dispatch }) => {
    try {
      const response = await api.teams.posts.create(post);
      
      // 检查帖子类型，如果是公告则发送通知
      if (post.type === 'announcement') {
        dispatch(createNotification({
          user_id: post.created_by,
          type: 'TEAM_ANNOUNCEMENT',
          title: 'Team Announcement',
          content: `You have a new announcement: ${post.title}`,
          data: {},
          is_read: false
        }));
      }
      
      return response;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Update a post
export const updatePost = createAsyncThunk(
  'posts/update',
  async (post, { rejectWithValue }) => {
    try {
      return await api.teams.posts.update(post);
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Delete a post
export const deletePost = createAsyncThunk(
  'posts/delete',
  async (postId, { rejectWithValue }) => {
    try {
      await api.teams.posts.delete(postId);
      return postId;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Toggle post pin status
export const togglePostPin = createAsyncThunk(
  'posts/togglePin',
  async (postId, { rejectWithValue }) => {
    try {
      return await api.teams.posts.togglePin(postId);
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Add reaction to post
export const addReaction = createAsyncThunk(
  'posts/addReaction',
  async ({ postId, userId, emoji }, { rejectWithValue }) => {
    try {
      return await api.teams.posts.addReaction(postId, userId, emoji);
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Add comment to post
export const addComment = createAsyncThunk(
  'posts/addComment',
  async ({ postId, userId, userName, content }, { rejectWithValue }) => {
    try {
      return await api.teams.posts.addComment(postId, userId, userName, content);
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Add attachment to post
export const addAttachment = createAsyncThunk(
  'posts/addAttachment',
  async ({ postId, attachmentId }, { rejectWithValue }) => {
    try {
      return await api.teams.posts.addAttachment(postId, attachmentId);
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Remove attachment from post
export const removeAttachment = createAsyncThunk(
  'posts/removeAttachment',
  async ({ postId, attachmentId }, { rejectWithValue }) => {
    try {
      return await api.teams.posts.removeAttachment(postId, attachmentId);
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const postsSlice = createSlice({
  name: 'posts',
  initialState: {
    items: [],
    selectedPost: null,
    status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
    error: null,
  },
  reducers: {
    clearSelectedPost: (state) => {
      state.selectedPost = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch posts by team ID
      .addCase(fetchPostsByTeamId.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchPostsByTeamId.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload;
      })
      .addCase(fetchPostsByTeamId.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      
      // Fetch post by ID
      .addCase(fetchPostById.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchPostById.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.selectedPost = action.payload;
      })
      .addCase(fetchPostById.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      
      // Create post
      .addCase(createPost.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(createPost.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items.unshift(action.payload);
      })
      .addCase(createPost.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      
      // Update post
      .addCase(updatePost.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(updatePost.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const index = state.items.findIndex(post => post.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
        if (state.selectedPost && state.selectedPost.id === action.payload.id) {
          state.selectedPost = action.payload;
        }
      })
      .addCase(updatePost.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      
      // Delete post
      .addCase(deletePost.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(deletePost.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = state.items.filter(post => post.id !== action.payload);
        if (state.selectedPost && state.selectedPost.id === action.payload) {
          state.selectedPost = null;
        }
      })
      .addCase(deletePost.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      
      // Toggle post pin
      .addCase(togglePostPin.fulfilled, (state, action) => {
        const index = state.items.findIndex(post => post.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
        if (state.selectedPost && state.selectedPost.id === action.payload.id) {
          state.selectedPost = action.payload;
        }
      })
      
      // Add reaction
      .addCase(addReaction.fulfilled, (state, action) => {
        const index = state.items.findIndex(post => post.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
        if (state.selectedPost && state.selectedPost.id === action.payload.id) {
          state.selectedPost = action.payload;
        }
      })
      
      // Add comment
      .addCase(addComment.fulfilled, (state, action) => {
        const index = state.items.findIndex(post => post.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
        if (state.selectedPost && state.selectedPost.id === action.payload.id) {
          state.selectedPost = action.payload;
        }
      })
      
      // Add attachment
      .addCase(addAttachment.fulfilled, (state, action) => {
        const index = state.items.findIndex(post => post.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
        if (state.selectedPost && state.selectedPost.id === action.payload.id) {
          state.selectedPost = action.payload;
        }
      })
      
      // Remove attachment
      .addCase(removeAttachment.fulfilled, (state, action) => {
        const index = state.items.findIndex(post => post.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
        if (state.selectedPost && state.selectedPost.id === action.payload.id) {
          state.selectedPost = action.payload;
        }
      });
  },
});

export const { clearSelectedPost } = postsSlice.actions;
export default postsSlice.reducer; 