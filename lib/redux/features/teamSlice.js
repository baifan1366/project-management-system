import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { api } from '@/lib/api'

// 异步 Thunk Actions
export const fetchProjectTeams = createAsyncThunk(
  'teams/fetchProjectTeams',
  async (projectId) => {
    return await api.teams.listByProject(projectId)
  }
)

export const createTeam = createAsyncThunk(
  'teams/createTeam',
  async (teamData) => {
    return await api.teams.create(teamData)
  }
)

export const updateTeam = createAsyncThunk(
  'teams/updateTeam',
  async ({ teamId, teamData }) => {
    return await api.teams.update(teamId, teamData)
  }
)

export const deleteTeam = createAsyncThunk(
  'teams/deleteTeam',
  async (teamId) => {
    await api.teams.delete(teamId)
    return teamId
  }
)

export const updateTeamOrder = createAsyncThunk(
  'teams/updateOrder',
  async (teams) => {
    return await api.teams.updateOrder(teams)
  }
)

export const initializeTeamOrder = createAsyncThunk(
  'teams/initializeOrder',
  async (projectId) => {
    return await api.teams.initializeOrder(projectId)
  }
)

// 创建 Slice
const teamSlice = createSlice({
  name: 'teams',
  initialState: {
    teams: [],
    status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
    error: null,
  },
  reducers: {
    clearTeams: (state) => {
      state.teams = []
      state.status = 'idle'
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchProjectTeams
      .addCase(fetchProjectTeams.pending, (state) => {
        state.status = 'loading'
      })
      .addCase(fetchProjectTeams.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.teams = action.payload
        state.error = null
      })
      .addCase(fetchProjectTeams.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.error.message
      })
      // createTeam
      .addCase(createTeam.fulfilled, (state, action) => {
        state.teams.push(action.payload)
      })
      // updateTeam
      .addCase(updateTeam.fulfilled, (state, action) => {
        const index = state.teams.findIndex(team => team.id === action.payload.id)
        if (index !== -1) {
          state.teams[index] = action.payload
        }
      })
      // deleteTeam
      .addCase(deleteTeam.fulfilled, (state, action) => {
        state.teams = state.teams.filter(team => team.id !== action.payload)
      })
      // updateTeamOrder
      .addCase(updateTeamOrder.fulfilled, (state, action) => {
        state.teams = action.payload
      })
      // initializeTeamOrder
      .addCase(initializeTeamOrder.fulfilled, (state, action) => {
        state.teams = action.payload
      })
  },
})

export const { clearTeams } = teamSlice.actions
export default teamSlice.reducer