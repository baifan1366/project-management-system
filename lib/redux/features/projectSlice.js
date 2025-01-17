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
    return await api.projects.create(projectData)
  }
)

const projectSlice = createSlice({
  name: 'projects',
  initialState: {
    items: [],
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
        state.items = action.payload
      })
      .addCase(fetchProjects.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.error.message
      })
      .addCase(createProject.fulfilled, (state, action) => {
        state.items.push(action.payload)
      })
  },
})

export default projectSlice.reducer
