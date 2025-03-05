import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { api } from '@/lib/api'

// Async thunks
export const fetchTeamUsers = createAsyncThunk(
  'teamUsers/fetchTeamUsers',
  async (teamId, { rejectWithValue }) => {
    try {
      console.log('Redux: 获取团队用户，teamId:', teamId);
      
      if (!teamId) {
        console.error('Redux: teamId 不能为空');
        return rejectWithValue('Team ID is required');
      }

      const res = await api.teams.getTeamUsers(teamId);
      console.log('Redux: 获取团队用户成功:', res);
      
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
      console.log('Redux createTeamUser: 开始执行，数据:', teamUserData);
      
      if (!teamUserData || !teamUserData.team_id || !teamUserData.user_id || !teamUserData.role) {
        console.error('Redux createTeamUser: 无效的输入数据:', teamUserData);
        return rejectWithValue('无效的团队用户数据');
      }

      console.log('Redux createTeamUser: 调用API...');
      const res = await api.teams.createTeamUser(teamUserData);
      
      console.log('Redux createTeamUser: API返回原始数据:', res);
      
      if (!res) {
        console.error('Redux createTeamUser: API返回空数据');
        return rejectWithValue('服务器没有返回响应');
      }

      if (!res.team_id || !res.user_id || !res.role) {
        console.error('Redux createTeamUser: API返回数据格式不正确:', res);
        return rejectWithValue('服务器返回的数据格式不正确');
      }

      console.log('Redux createTeamUser: 执行成功，返回数据:', res);
      return res;
    } catch (error) {
      console.error('Redux createTeamUser: 捕获到错误:', error);
      return rejectWithValue(error.message || '创建团队用户失败');
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
          state.lastFetchTime[teamId] = Date.now();
        }
        if (action.payload && action.payload.length > 0) {
            // 使用第一个用户的 team_id 作为键
            const teamId = action.payload[0].team_id
            state.teamUsers[teamId] = action.payload
        }
        state.error = null;
      })
      .addCase(fetchTeamUsers.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message;
      })
      .addCase(createTeamUser.fulfilled, (state, action) => {
        state.status = 'succeeded';
        if (action.payload && action.payload.team_id) {
          const teamId = action.payload.team_id;
          if (!state.teamUsers[teamId]) {
            state.teamUsers[teamId] = [];
          }
          const userIndex = state.teamUsers[teamId].findIndex(
            u => String(u.user_id) === String(action.payload.user_id)
          );
          if (userIndex === -1) {
            state.teamUsers[teamId].push(action.payload);
          } else {
            state.teamUsers[teamId][userIndex] = action.payload;
          }
        }
        state.error = null;
      })
      .addCase(createTeamUser.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload || action.error.message;
      });
  }
});

export const { clearTeamUsers } = teamUserSlice.actions;
export default teamUserSlice.reducer;
