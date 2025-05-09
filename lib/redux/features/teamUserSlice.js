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

// 删除团队的所有成员
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

// 删除单个团队成员
export const removeTeamUser = createAsyncThunk(
  'teamUsers/removeTeamUser',
  async ({teamId, userId, createdBy}, { rejectWithValue, getState }) => {
    try {
      if (!teamId || !userId) {
        console.error('Redux: teamId和userId不能为空');
        return rejectWithValue('Team ID and User ID are required');
      }

      const state = getState();
      const teamUserToRemove = state.teamUsers.teamUsers[teamId]?.find(
        teamUser => String(teamUser.user.id) === String(userId)
      );

      // 调用API删除单个团队成员
      const result = await api.teams.removeTeamUser(teamId, userId, createdBy);
      
      return {
        ...result,
        teamId,
        userId,
        old_values: teamUserToRemove
      };
    } catch (error) {
      console.error('Redux: 删除团队成员失败:', error);
      return rejectWithValue(error.message || '删除团队成员失败');
    }
  }
);

// 更新团队成员角色
export const updateTeamUser = createAsyncThunk(
  'teamUsers/updateTeamUser',
  async ({teamId, userId, role, createdBy}, { rejectWithValue, getState }) => {
    try {
      if (!teamId || !userId || !role) {
        console.error('Redux: teamId、userId和role不能为空');
        return rejectWithValue('Team ID, User ID and role are required');
      }

      const state = getState();
      const teamUserToUpdate = state.teamUsers.teamUsers[teamId]?.find(
        teamUser => String(teamUser.user.id) === String(userId)
      );

      console.log('找到要更新的团队成员:', teamUserToUpdate);

      // 调用API更新团队成员角色
      const result = await api.teams.updateTeamUser(teamId, userId, role, createdBy);
      
      // 不覆盖API返回的entityId，保留result原有的所有字段
      return {
        ...result,
        teamId,
        userId,
        role,
        old_values: teamUserToUpdate
      };
    } catch (error) {
      console.error('Redux: 更新团队成员角色失败:', error);
      return rejectWithValue(error.message || '更新团队成员角色失败');
    }
  }
);

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
        if (action.payload && action.payload.team_id) {
          delete state.teamUsers[action.payload.team_id];
        }
      })
      // 处理删除单个团队成员
      .addCase(removeTeamUser.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(removeTeamUser.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const { teamId, userId } = action.payload;
        
        // 如果该团队存在成员列表，则从中删除对应的成员
        if (state.teamUsers[teamId]) {
          state.teamUsers[teamId] = state.teamUsers[teamId].filter(
            teamUser => String(teamUser.user.id) !== String(userId)
          );
        }
        
        state.error = null;
      })
      .addCase(removeTeamUser.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      // 处理更新团队成员角色
      .addCase(updateTeamUser.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(updateTeamUser.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const { teamId, userId, role } = action.payload;
        
        // 更新团队成员的角色
        if (state.teamUsers[teamId]) {
          state.teamUsers[teamId] = state.teamUsers[teamId].map(teamUser => {
            if (String(teamUser.user.id) === String(userId)) {
              return { ...teamUser, role };
            }
            return teamUser;
          });
        }
        
        state.error = null;
      })
      .addCase(updateTeamUser.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });
  }
});

export const { clearTeamUsers } = teamUserSlice.actions;
export default teamUserSlice.reducer;
