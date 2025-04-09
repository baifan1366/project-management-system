import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { api } from '@/lib/api'

// Async thunks
export const fetchTasksBySectionId = createAsyncThunk(
  'tasks/fetchTasksBySectionId',
  async (sectionId) => {
    const res = await api.teams.teamSectionTasks.listBySectionId(sectionId)
    return res;
  }
)

export const fetchTaskById = createAsyncThunk(
  'tasks/fetchTaskById',
  async (sectionId, taskId) => {
    const res = await api.teams.teamSectionTasks.getById(sectionId, taskId)
    return res;
  }
)

export const createTask = createAsyncThunk(
  'tasks/createTasks',
  async (taskData) => {
    const res = await api.teams.teamSectionTasks.create(taskData)
    return res;
  }
)

export const updateTask = createAsyncThunk(
  'tasks/updateTask',
  async ({ sectionId, taskId, taskData }, { rejectWithValue }) => {
    try {
      const res = await api.teams.teamSectionTasks.update(sectionId, taskId, taskData);
      return res;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
)

export const deleteTask = createAsyncThunk(
  'tasks/deleteTask',
  async ({ sectionId, taskId }) => {
    await api.teams.teamSectionTasks.delete(sectionId, taskId)
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
      .addCase(fetchTasksBySectionId.pending, (state) => {
        state.status = 'loading'
      })
      .addCase(fetchTasksBySectionId.fulfilled, (state, action) => {
        state.tasks = action.payload
        state.status = 'succeeded'
      })
      .addCase(fetchTasksBySectionId.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.error.message
      })
      .addCase(fetchTaskById.pending, (state) => {
        state.status = 'loading'
      })
      .addCase(fetchTaskById.fulfilled, (state, action) => {
        state.tasks = action.payload
        state.status = 'succeeded'
      })
      .addCase(fetchTaskById.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.error.message
      })
      .addCase(createTask.pending, (state) => {
        state.status = 'loading'
      })
      .addCase(createTask.fulfilled, (state, action) => {
        state.status = 'succeeded'
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
