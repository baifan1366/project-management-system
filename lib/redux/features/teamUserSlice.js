import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { api } from '@/lib/api'

// Async thunks
export const fetchTeamUsers = createAsyncThunk(
  'teamUsers/fetchTeamUsers',
  async (teamId, { rejectWithValue }) => {
    try {      
      if (!teamId) {
        console.error('Redux: teamId 不能为空');
        return rejectWithValue('Team ID is required');
      }

      const res = await api.teams.getTeamUsers(teamId);      
      return { teamId, users: Array.isArray(res) ? res : [] };
    } catch (error) {
      console.error('Redux: 获取团队用户失败:', error);
      return rejectWithValue(error.message || '获取团队用户失败');
    }
  }
);

export const createTeamUser = createAsyncThunk(
  'teamUsers/createTeamUser',
  async (teamUserData, { rejectWithValue }) => {
    try {
      const response = await api.teams.createTeamUser(teamUserData);
      return response;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const deleteTeamUserByTeamId = createAsyncThunk(
  'teamUsers/deleteTeamUserByTeamId',
  async ({userId, teamId}, {getState}) => {
    const state = getState()
    const teamUserToDelete = state.teamUsers.teamUsers[teamId]?.find(user => user.id === userId);

    const res = await api.teams.deleteTeamUserByTeamId(teamId);
    return {
      ...res,
      userId: userId,
      old_values: teamUserToDelete,
      team_id: teamId,
      entityId: userId
    }
  }
)

const teamUserSlice = createSlice({
  name: 'teamUsers',
  initialState: {
    teamUsers: {},  // 使用对象存储，key为teamId
    status: 'idle',
    error: null,
    lastFetchTime: {}
  },
  reducers: {
    clearTeamUsers: (state, action) => {
      const teamId = action.payload;
      delete state.teamUsers[teamId];
      delete state.lastFetchTime[teamId];
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch team users
      .addCase(fetchTeamUsers.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchTeamUsers.fulfilled, (state, action) => {
        state.status = 'succeeded';
        if (action.payload) {
          const { teamId, users } = action.payload;
          state.teamUsers[teamId] = users;
        }
        state.error = null;
      })
      .addCase(fetchTeamUsers.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message;
      })
      .addCase(createTeamUser.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(createTeamUser.fulfilled, (state, action) => {
        state.status = 'succeeded';
        if (action.payload && action.payload.team_id) {
          const teamId = action.payload.team_id;
          if (!state.teamUsers[teamId]) {
            state.teamUsers[teamId] = [];
          }
          state.teamUsers[teamId].push(action.payload);
        }
        state.error = null;
      })
      .addCase(createTeamUser.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(deleteTeamUserByTeamId.pending, (state) => {
        state.status = 'loading'
      })
      .addCase(deleteTeamUserByTeamId.fulfilled, (state, action) => {
        state.status = 'succeeded';
        if (action.payload && action.payload.id) {
          delete state.teamUsers[action.payload.id];
        }
      })
  }
});

export const { clearTeamUsers } = teamUserSlice.actions;
export default teamUserSlice.reducer;
