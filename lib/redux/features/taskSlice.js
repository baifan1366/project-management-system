import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { api } from '@/lib/api'

// Async thunks
export const fetchTasks = createAsyncThunk(
  'tasks/fetchTasks',
  async (projectId = null) => {
    const res = await api.tasks.list(projectId)
    return res;
  }
)

export const createTask = createAsyncThunk(
  'tasks/createTasks',
  async (taskData) => {
    const res = await api.tasks.create(taskData)
    return res;
  }
)

const taskSlice = createSlice({
  name: 'tasks',
  initialState: {
    tasks: [],
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
        state.tasks = action.payload
      })
      .addCase(fetchTasks.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.error.message
      })
      .addCase(createTask.pending, (state) => {
        state.status = 'loading'
      })
      .addCase(createTask.fulfilled, (state, action) => {
        state.tasks.push(action.payload)
      })
      .addCase(createTask.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.error.message
      })
  },
})

export default taskSlice.reducer
