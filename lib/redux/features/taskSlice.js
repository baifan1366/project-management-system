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
  async ({ sectionId, taskId, taskData }, { rejectWithValue }) => {
    try {
      // 如果taskData包含assignee_id且值为'current'，则拒绝该请求
      if (taskData?.assignee_id === 'current') {
        return rejectWithValue('需要提供具体的用户ID，不能使用"current"标识符');
      }
      
      // 如果没有提供sectionId和taskData包含assignee_id或status，可能是从任务看板拖放
      if (!sectionId) {
        try {
          // 尝试通过任务ID直接更新
          const res = await api.teams.teamSectionTasks.updateDirectly(taskId, taskData);
          return res;
        } catch (directError) {
          console.error('直接更新任务失败:', directError);
          // 如果直接更新失败，则在错误消息中提供更多信息
          return rejectWithValue('更新任务失败: 任务ID对应的section未找到');
        }
      }
      
      // 使用常规的section-based API
      const res = await api.teams.teamSectionTasks.update(sectionId, taskId, taskData);
      return res;
    } catch (error) {
      return rejectWithValue(error.message || '更新任务失败');
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

export const { resetTasksState } = taskSlice.actions;
export default taskSlice.reducer
