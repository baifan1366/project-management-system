import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { api } from '@/lib/api'

// Async thunks
export const fetchTasks = createAsyncThunk(
  'tasks/fetchTasks',
  async (projectId = null) => {
    return await api.tasks.list(projectId)
  }
)

export const createTask = createAsyncThunk(
  'tasks/createTask',
  async (taskData) => {
    return await api.tasks.create(taskData)
  }
)

const taskSlice = createSlice({
  name: 'tasks',
  initialState: {
    items: [],
    status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchTasks.pending, (state) => {
        state.status = 'loading'
      })
      .addCase(fetchTasks.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.items = action.payload
      })
      .addCase(fetchTasks.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.error.message
      })
      .addCase(createTask.fulfilled, (state, action) => {
        state.items.push(action.payload)
      })
  },
})

export default taskSlice.reducer
