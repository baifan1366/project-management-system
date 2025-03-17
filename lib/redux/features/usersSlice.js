import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '@/lib/api';

// 异步thunk用于更新用户资料
export const updateUserProfile = createAsyncThunk(
  'users/updateProfile',
  async ({ userId, profileData }, { rejectWithValue }) => {
    try {
      const response = await api.users.updateProfile(userId, profileData);
      return response;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// 异步thunk用于更新用户偏好设置
export const updateUserPreference = createAsyncThunk(
  'users/updatePreference',
  async ({ userId, preferenceData }, { rejectWithValue }) => {
    try {
      const response = await api.users.updatePreference(userId, preferenceData);
      return response;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// 异步thunk用于绑定第三方账号
export const connectProvider = createAsyncThunk(
  'users/connectProvider',
  async ({ userId, provider, providerId }, { rejectWithValue }) => {
    try {
      const response = await api.users.connectProvider(userId, { provider, providerId });
      return response;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// 异步thunk用于解绑第三方账号
export const disconnectProvider = createAsyncThunk(
  'users/disconnectProvider',
  async ({ userId, provider }, { rejectWithValue }) => {
    try {
      const response = await api.users.disconnectProvider(userId, { provider });
      return response;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const initialState = {
  currentUser: null,
  status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
  error: null,
};

const usersSlice = createSlice({
  name: 'users',
  initialState,
  reducers: {
    setUser: (state, action) => {
      state.currentUser = action.payload;
      state.status = 'succeeded';
    },
    clearUser: (state) => {
      state.currentUser = null;
      state.status = 'idle';
    },
    updateUserData: (state, action) => {
      if (state.currentUser) {
        state.currentUser = { ...state.currentUser, ...action.payload };
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // 处理更新用户资料
      .addCase(updateUserProfile.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(updateUserProfile.fulfilled, (state, action) => {
        state.status = 'succeeded';
        if (state.currentUser) {
          state.currentUser = { ...state.currentUser, ...action.payload.data };
        }
      })
      .addCase(updateUserProfile.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      // 处理更新用户偏好设置
      .addCase(updateUserPreference.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(updateUserPreference.fulfilled, (state, action) => {
        state.status = 'succeeded';
        if (state.currentUser) {
          state.currentUser = { ...state.currentUser, ...action.payload.data };
        }
      })
      .addCase(updateUserPreference.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      // 处理绑定第三方账号
      .addCase(connectProvider.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(connectProvider.fulfilled, (state, action) => {
        state.status = 'succeeded';
        if (state.currentUser) {
          state.currentUser = { 
            ...state.currentUser, 
            provider: action.payload.data.provider,
            provider_id: action.payload.data.provider_id
          };
        }
      })
      .addCase(connectProvider.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      // 处理解绑第三方账号
      .addCase(disconnectProvider.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(disconnectProvider.fulfilled, (state) => {
        state.status = 'succeeded';
        if (state.currentUser) {
          state.currentUser = { 
            ...state.currentUser, 
            provider: 'local',
            provider_id: null
          };
        }
      })
      .addCase(disconnectProvider.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });
  },
});

export const { setUser, clearUser, updateUserData } = usersSlice.actions;

export default usersSlice.reducer;
