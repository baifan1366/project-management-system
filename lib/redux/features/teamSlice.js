import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { api } from '@/lib/api'

// Async thunks
export const fetchTeams = createAsyncThunk(
  'teams/fetchTeams',
  async () => {
    const res = await api.teams.list()
    return res;
  }
)

export const fetchProjectTeams = createAsyncThunk(
  'teams/fetchProjectTeams',
  async (projectId, { getState }) => {
    const state = getState().teams;
    const projectTeams = state.teams.filter(team => String(team.project_id) === String(projectId));
    const lastFetchTime = state.lastFetchTime[`project_${projectId}`];
    const now = Date.now();
    
    // 检查是否有有效的缓存
    if (projectTeams.length > 0 && 
        lastFetchTime && 
        now - lastFetchTime < state.cacheTimeout && 
        state.status === 'succeeded') {
      return projectTeams;
    }
    
    const res = await api.teams.listByProject(projectId);
    return res;
  }
)

export const fetchTeamById = createAsyncThunk(
  'teams/fetchTeamById', 
  async (teamId, { getState }) => {
    const state = getState().teams;
    const existingTeam = state.teams.find(team => String(team.id) === String(teamId));
    const lastFetchTime = state.lastFetchTime[`team_${teamId}`];
    const now = Date.now();
    
    // 检查是否有有效的缓存
    if (existingTeam && 
        lastFetchTime && 
        now - lastFetchTime < state.cacheTimeout && 
        state.status === 'succeeded') {
      return existingTeam;
    }
    
    const res = await api.teams.getById(teamId);
    return res; 
  }
)

export const createTeam = createAsyncThunk(
  'teams/createTeam',
  async (teamData) => {
    const res = await api.teams.create(teamData)
    return res; //确保返回promise
  }
)

export const updateTeam = createAsyncThunk(
  'teams/updateTeam',
  async ({ teamId, teamData }) => {
    const res = await api.teams.update(teamId, teamData)
    return res;
  }
)

export const deleteTeam = createAsyncThunk(
  'teams/deleteTeam',
  async (teamId) => {
    await api.teams.delete(teamId)
    return teamId;
  }
)

export const updateTeamOrder = createAsyncThunk(
  'teams/updateTeamOrder',
  async (teams, { getState }) => {
    // 保存旧的顺序作为oldValues
    const oldTeams = getState().teams.teams.filter(team => 
      teams.some(newTeam => newTeam.id === team.id)
    );

    const res = await api.teams.updateOrder(teams);

    // 为日志记录添加元数据
    return {
      data: res,
      meta: {
        entityId: teams[0].project_id, // 使用project_id作为实体ID
        oldValues: oldTeams.map(team => ({
          id: team.id,
          order_index: team.order_index
        })),
        newValues: teams.map(team => ({
          id: team.id,
          order_index: team.order_index
        }))
      }
    };
  }
)

export const initializeTeamOrder = createAsyncThunk(
  'teams/initializeTeamOrder',
  async (projectId) => {
    const res = await api.teams.initializeOrder(projectId)
    return res;
  }
)

export const updateTeamStar = createAsyncThunk(
  'teams/updateTeamStar',
  async ({ teamId, star }) => {
    const res = await api.teams.update(teamId, { star })
    return { teamId, star };
  }
);

const teamSlice = createSlice({
  name: 'teams',
  initialState: {
    teams: [],
    status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
    error: null,
    lastFetchTime: {}, // 添加缓存时间戳
    cacheTimeout: 5 * 60 * 1000, // 5分钟缓存
  },
  reducers: {
    clearTeams: (state) => {
      state.teams = [];
      state.status = 'idle';
      state.error = null;
      state.lastFetchTime = {};
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch teams
      .addCase(fetchTeams.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchTeams.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.teams = action.payload;
        state.error = null;
        state.lastFetchTime.all = Date.now();
      })
      .addCase(fetchTeams.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message;
      })
      // Fetch project teams
      .addCase(fetchProjectTeams.pending, (state) => {
        if (state.status !== 'succeeded') {
          state.status = 'loading';
        }
      })
      .addCase(fetchProjectTeams.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const projectId = action.meta.arg;
        // 只更新当前项目的团队
        state.teams = state.teams.filter(team => String(team.project_id) !== String(projectId));
        state.teams = [...state.teams, ...action.payload];
        state.error = null;
        state.lastFetchTime[`project_${projectId}`] = Date.now();
      })
      .addCase(fetchProjectTeams.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message;
      })
      // Fetch teamById
      .addCase(fetchTeamById.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchTeamById.fulfilled, (state, action) => {
        state.status = 'succeeded';
        // 将获取的团队添加到状态中
        const team = action.payload;
        const existingTeam = state.teams.find(t => t.id === team.id);
        if (!existingTeam) {
          state.teams.push(team);
        }
        state.error = null;
      })
      .addCase(fetchTeamById.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message;
      })
      // Create team
      .addCase(createTeam.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(createTeam.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.teams.push(action.payload);
        state.error = null;
      })
      .addCase(createTeam.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message;
      })
      // Update team order
      .addCase(updateTeamOrder.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(updateTeamOrder.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const projectId = action.payload.data[0]?.project_id;
        if (projectId) {
          state.teams = state.teams.filter(team => String(team.project_id) !== String(projectId));
          state.teams = [...state.teams, ...action.payload.data];
        }
        state.error = null;
      })
      .addCase(updateTeamOrder.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message;
      })
      // Initialize team order
      .addCase(initializeTeamOrder.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(initializeTeamOrder.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const projectId = action.meta.arg;
        // 更新特定项目的团队顺序
        state.teams = state.teams.filter(team => String(team.project_id) !== String(projectId));
        state.teams = [...state.teams, ...action.payload];
        state.error = null;
      })
      .addCase(initializeTeamOrder.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message;
      })
      .addCase(updateTeamStar.fulfilled, (state, action) => {
        const { teamId, star } = action.payload;
        const team = state.teams.find(t => t.id === teamId);
        if (team) {
          team.star = star;
        }
      });
  },
});

export const { clearTeams } = teamSlice.actions;
export default teamSlice.reducer;
