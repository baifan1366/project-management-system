import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { api } from '@/lib/api'

// Async thunks
export const fetchProjects = createAsyncThunk(
  'projects/fetchProjects',
  async () => {
    return await api.projects.list()
  }
)

export const createProject = createAsyncThunk(
  'projects/createProject',
  async (projectData) => {
    const res = await api.projects.create(projectData)
    return res; //确保返回promise
  }
)

const projectSlice = createSlice({
  name: 'projects',
  initialState: {
    projects: [],
    status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchProjects.pending, (state) => {
        state.status = 'loading'
      })
      .addCase(fetchProjects.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.projects = action.payload
      })
      .addCase(fetchProjects.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.error.message
      })
      .addCase(createProject.pending, (state) => {
        state.status = 'loading'
      })
      .addCase(createProject.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.projects.push(action.payload)
      })
      .addCase(createProject.rejected, (state, action) => {
        state.status = 'failed'
        status.error = action.error.message
      })
  },
})

export default projectSlice.reducer
