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
  async (projectId) => {
    const res = await api.teams.listByProject(projectId)
    return res;
  }
)

export const fetchTeamById = createAsyncThunk(
  'teams/fetchTeamById', 
  async (teamId) => {
    const res = await api.teams.getById(teamId); // 调用 API 方法获取项目
    if (!res) {
      throw new Error('Team not found');
    }
    return res; // 返回项目数据
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

const teamSlice = createSlice({
  name: 'teams',
  initialState: {
    teams: [],
    status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
    error: null,
  },
  reducers: {
    clearTeams: (state) => {
      state.teams = [];
      state.status = 'idle';
      state.error = null;
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
      })
      .addCase(fetchTeams.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message;
      })
      // Fetch project teams
      .addCase(fetchProjectTeams.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchProjectTeams.fulfilled, (state, action) => {
        state.status = 'succeeded';
        // 替换当前项目的团队
        const projectId = action.meta.arg; // 获取projectId参数
        state.teams = state.teams.filter(team => String(team.project_id) !== String(projectId));
        state.teams = [...state.teams, ...action.payload];
        state.error = null;
      })
      .addCase(fetchProjectTeams.rejected, (state, action) => {
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
      });
  },
});

export const { clearTeams } = teamSlice.actions;
export default teamSlice.reducer;
