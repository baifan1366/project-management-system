import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { api } from '@/lib/api'

// 添加缓存时间常量
const CACHE_DURATION = 5 * 60 * 1000; // 5分钟缓存

// Async thunks
export const fetchTasks = createAsyncThunk(
  'tasks/fetchTasks',
  async (projectId = null, { getState, rejectWithValue }) => {
    try {
      const state = getState().tasks;
      const now = Date.now();
      const cacheKey = projectId ? `project_${projectId}` : 'all';
      
      // 检查是否有正在进行的相同请求
      if (state.currentRequest === cacheKey) {
        return null;
      }

      const lastFetchTime = state.lastFetchTime[cacheKey];
      const hasCachedData = projectId 
        ? state.tasks.some(task => String(task.project_id) === String(projectId))
        : state.tasks.length > 0;

      // 检查缓存是否有效
      if (lastFetchTime && 
          now - lastFetchTime < CACHE_DURATION && 
          hasCachedData &&
          state.status === 'succeeded') {
        return null;
      }

      const res = await api.tasks.list(projectId);
      return { tasks: res, projectId };
    } catch (error) {
      return rejectWithValue(error.message);
    }
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
  async (taskId, taskData) => {
    const res = await api.tasks.update(taskId, taskData)
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
    lastFetchTime: {},
    cacheTimeout: CACHE_DURATION,
    currentRequest: null
  },
  reducers: {
    clearTasks: (state) => {
      state.tasks = [];
      state.status = 'idle';
      state.error = null;
      state.lastFetchTime = {};
      state.currentRequest = null;
    },
    invalidateCache: (state, action) => {
      const { key } = action.payload;
      if (key) {
        delete state.lastFetchTime[key];
      } else {
        state.lastFetchTime = {};
      }
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTasks.pending, (state, action) => {
        const projectId = action.meta.arg;
        const requestKey = projectId ? `project_${projectId}` : 'all';
        if (state.currentRequest !== requestKey) {
          state.status = 'loading';
          state.currentRequest = requestKey;
        }
      })
      .addCase(fetchTasks.fulfilled, (state, action) => {
        if (action.payload) {
          const { tasks, projectId } = action.payload;
          const cacheKey = projectId ? `project_${projectId}` : 'all';
          
          if (projectId) {
            // 只更新特定项目的任务
            state.tasks = state.tasks.filter(task => 
              String(task.project_id) !== String(projectId)
            ).concat(tasks);
          } else {
            state.tasks = tasks;
          }
          
          state.lastFetchTime[cacheKey] = Date.now();
        }
        state.status = 'succeeded';
        state.currentRequest = null;
        state.error = null;
      })
      .addCase(fetchTasks.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message;
        state.currentRequest = null;
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
