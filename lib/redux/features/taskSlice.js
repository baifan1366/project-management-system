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

export const updateTask = createAsyncThunk(
  'tasks/updateTask',
  async (taskData) => {
    const res = await api.tasks.update(taskData)
    return res;
  }
)

export const deleteTask = createAsyncThunk(
  'tasks/deleteTask',
  async (taskId) => {
    await api.tasks.delete(taskId)
    return taskId;
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
      .addCase(updateTask.pending, (state) => {
        state.status = 'loading'
      })
      .addCase(updateTask.fulfilled, (state, action) => {
        const index = state.tasks.findIndex(task => task.id === action.payload.id)
        if (index !== -1) {
          state.tasks[index] = action.payload
        }
        state.status = 'succeeded'
      })
      .addCase(updateTask.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.error.message
      })
      .addCase(deleteTask.pending, (state) => {
        state.status = 'loading'
      })
      .addCase(deleteTask.fulfilled, (state, action) => {
        state.tasks = state.tasks.filter(task => task.id !== action.payload)
        state.status = 'succeeded'
      })
      .addCase(deleteTask.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.error.message
      })
  },
})

export default taskSlice.reducer
