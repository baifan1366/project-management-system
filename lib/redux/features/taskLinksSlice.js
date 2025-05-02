import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '@/lib/api';

// Async thunk for fetching task links
export const fetchTaskLink = createAsyncThunk(
  'taskLinks/fetchTaskLink',
  async (_, { rejectWithValue }) => {
    try {
      const result = await api.tasklinks.fetch();
      // 确保返回数组，避免未定义
      return Array.isArray(result) ? result : [];
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Async thunk for creating a task link
export const createTaskLink = createAsyncThunk(
  'taskLinks/createTaskLink',
  async (linkData, { rejectWithValue }) => {
    try {
      // 确保必要的字段存在
      if (!linkData.source_task_id || !linkData.target_task_id) {
        throw new Error('源任务ID和目标任务ID是必需的');
      }
      const result = await api.tasklinks.create(linkData);
      return result;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Async thunk for deleting a task link
export const deleteTaskLink = createAsyncThunk(
  'taskLinks/deleteTaskLink',
  async ({user_id, linkId}, { rejectWithValue, getState }) => {
    try {
      console.log(`开始删除链接: linkId=${linkId}, userId=${user_id}`);
      
      // 先获取要删除的链接数据，作为 old_values
      const state = getState();
      const oldTaskLink = state.taskLinks.links.find(link => 
        link.id.toString() === linkId.toString()
      );
      
      if (!oldTaskLink) {
        console.warn(`在状态中未找到链接: linkId=${linkId}`);
      }
      
      // 删除链接
      console.log(`调用 API 删除链接: linkId=${linkId}`);
      const result = await api.tasklinks.delete(user_id, linkId);
      console.log(`API 删除链接成功:`, result);
      
      // 返回成功信息和旧数据
      return {
        linkId: Number(linkId),
        entityId: linkId,
        old_values: result.deleted_data || oldTaskLink,
        new_values: { message: "deleteTaskLink successful" },
        userId: user_id
      };
    } catch (error) {
      console.error(`删除链接失败: linkId=${linkId}`, error);
      return rejectWithValue(error.message);
    }
  }
);

const taskLinksSlice = createSlice({
  name: 'taskLinks',
  initialState: {
    links: [],
    loading: false,
    error: null,
  },
  reducers: {
    // 添加清空链接的reducer
    clearLinks: (state) => {
      state.links = [];
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTaskLink.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTaskLink.fulfilled, (state, action) => {
        state.loading = false;
        // 确保links是数组
        state.links = Array.isArray(action.payload) ? action.payload : [];
      })
      .addCase(fetchTaskLink.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Create link
      .addCase(createTaskLink.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createTaskLink.fulfilled, (state, action) => {
        state.loading = false;
        if (Array.isArray(state.links)) {
          state.links.push(action.payload);
        } else {
          state.links = [action.payload];
        }
      })
      .addCase(createTaskLink.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Delete link
      .addCase(deleteTaskLink.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteTaskLink.fulfilled, (state, action) => {
        state.loading = false;
        console.log("删除链接成功, payload:", action.payload);
        state.links = state.links.filter(link => link.id !== action.payload.linkId);
      })
      .addCase(deleteTaskLink.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        console.error("删除链接失败:", action.payload);
      });
  },
});

// 导出清空链接的action
export const { clearLinks } = taskLinksSlice.actions;

export default taskLinksSlice.reducer;
