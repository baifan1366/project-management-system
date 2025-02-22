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

const teamSlice = createSlice({
  name: 'teams',
  initialState: {
    teams: [],
    status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
    error: null,
  },
  reducers: {
    updateTeamOrder(state, action) {
      state.teams = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTeams.pending, (state) => {
        state.status = 'loading'
      })
      .addCase(fetchTeams.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.teams = action.payload
      })
      .addCase(fetchTeams.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.error.message
      })
      .addCase(fetchTeamById.pending, (state) => {
        state.status = 'loading'
      })
      .addCase(fetchTeamById.fulfilled, (state, action) => {
        const existingTeam = state.teams.find(team => team.id === action.payload.id);
        if (!existingTeam) {
          state.teams.push(action.payload); // 如果项目不存在，则添加到项目列表
        }
      })
      .addCase(fetchTeamById.rejected, (state, action) => {
        state.error = action.error.message; // 处理错误
      })
      .addCase(createTeam.pending, (state) => {
        state.status = 'loading'
      })
      .addCase(createTeam.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.teams.push(action.payload)
      })
      .addCase(createTeam.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.error.message
      })
      .addCase(updateTeam.pending, (state) => {
        state.status = 'loading'
      })
      .addCase(updateTeam.fulfilled, (state, action) => {
        state.status = 'succeeded'
        const index = state.teams.findIndex(team => team.id === action.payload.id)
        if (index !== -1) {
          state.teams[index] = action.payload
        }
      })
      .addCase(updateTeam.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.error.message
      })
      .addCase(deleteTeam.pending, (state) => {
        state.status = 'loading'
      })
      .addCase(deleteTeam.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.teams = state.teams.filter(team => team.id !== action.payload)
      })
      .addCase(deleteTeam.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.error.message
      })
  },
})

export default teamSlice.reducer
