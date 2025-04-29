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

// New thunk to fetch tasks by their IDs from section's task_ids
export const fetchTasksByIds = createAsyncThunk(
  'tasks/fetchTasksByIds',
  async (taskIds, { rejectWithValue }) => {
    try {
      if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
        return rejectWithValue('需要提供有效的任务ID数组');
      }
      
      // Fetch tasks one by one and collect them
      const tasks = await Promise.all(
        taskIds.map(taskId => api.teams.teamSectionTasks.getById(taskId))
      );
      
      return tasks;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
)

export const fetchAllTasks = createAsyncThunk(
  'tasks/fetchAllTasks',
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.teams.teamSectionTasks.listAllTasks()
      return res;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
)

export const fetchTaskById = createAsyncThunk(
  'tasks/fetchTaskById',
  async (sectionId, taskId) => {
    const res = await api.teams.teamSectionTasks.getById(sectionId, taskId)
    return res;
  }
)

export const fetchTasksByUserId = createAsyncThunk(
  'tasks/fetchTasksByUserId',
  async (userId, { rejectWithValue }) => {
    try {
      // 确保userId不是'current'，我们现在需要明确的用户ID
      if (!userId || userId === 'current') {
        return rejectWithValue('需要提供有效的用户ID');
      }
      
      const res = await api.teams.teamSectionTasks.listByUserId(userId)
      return res;
    } catch (error) {
      return rejectWithValue(error.message);
    }
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
  async ({ taskId, taskData, oldTask }) => {
    
    // 确保包含 updated_at
    const updatedTaskData = {
      ...taskData,
      updated_at: new Date().toISOString()
    };
    
    const res = await api.teams.teamSectionTasks.updateDirectly(taskId, updatedTaskData);
    return {
      ...res,
      old_values: oldTask || {}
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
  reducers: {
    resetTasksState: (state) => {
      state.tasks = [];
      state.status = 'idle';
      state.error = null;
    }
  },
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
      .addCase(fetchAllTasks.pending, (state) => {
        state.status = 'loading'
      })
      .addCase(fetchAllTasks.fulfilled, (state, action) => {
        state.tasks = action.payload
        state.status = 'succeeded'
      })
      .addCase(fetchAllTasks.rejected, (state, action) => {
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
      .addCase(fetchTasksByUserId.pending, (state) => {
        state.status = 'loading'
      })
      .addCase(fetchTasksByUserId.fulfilled, (state, action) => {
        state.tasks = action.payload
        state.status = 'succeeded'
      })
      .addCase(fetchTasksByUserId.rejected, (state, action) => {
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
        const updatedTask = action.payload;
        if (updatedTask && updatedTask.id) {
          const index = state.tasks.findIndex(task => task.id === updatedTask.id);
          if (index !== -1) {
            state.tasks[index] = updatedTask;
          } else {
            // 如果在现有任务中找不到，将其添加到任务列表中
            state.tasks.push(updatedTask);
          }
        }
        state.status = 'succeeded';
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
      .addCase(fetchTasksByIds.pending, (state) => {
        state.status = 'loading'
      })
      .addCase(fetchTasksByIds.fulfilled, (state, action) => {
        // Merge the fetched tasks with existing tasks, avoiding duplicates
        const existingIds = new Set(state.tasks.map(task => task.id));
        const newTasks = action.payload.filter(task => !existingIds.has(task.id));
        
        state.tasks = [...state.tasks, ...newTasks];
        state.status = 'succeeded';
      })
      .addCase(fetchTasksByIds.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload || action.error.message;
      })
  },
})

export const { resetTasksState } = taskSlice.actions;
export default taskSlice.reducer
