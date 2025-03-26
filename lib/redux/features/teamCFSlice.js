import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { api } from '@/lib/api'

// 异步 thunk actions
export const fetchTeamCustomField = createAsyncThunk(
  'teamCF/fetchTeamCustomField',
  async (teamId, { rejectWithValue }) => {
    try {
      // 使用 api.js 中定义的函数而不是直接使用 fetch
      const response = await api.teams.teamCustomFields.list(teamId);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
)

export const updateTeamCustomFieldOrder = createAsyncThunk(
  'teamCF/updateTeamCustomFieldOrder',
  async ({ teamId, orderedFields }, { rejectWithValue }) => {
    try {
      const response = await api.teams.teamCustomFields.updateOrder(teamId, orderedFields);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
)

export const createTeamCustomField = createAsyncThunk(
  'teamCF/createTeamCustomField',
  async ({ team_id, custom_field_id, order_index = {}, created_by }, { getState, rejectWithValue }) => {
    try {
      // 验证必要参数
      if (!team_id || !created_by) {
        return rejectWithValue('缺少必要参数: team_id 或 created_by');
      }

      // 确保在 API 请求中传递 created_by
      const response = await api.teams.teamCustomFields.create(team_id, {
        customFieldId: custom_field_id,
        order_index: order_index,
        created_by: created_by,
      });

      return response.data;  // 直接返回后端响应的数据，而不是自己构建
    } catch (error) {
      console.error('创建失败：', error);
      return rejectWithValue(error.message || '创建团队自定义字段失败');
    }
  }
)

export const deleteTeamCustomField = createAsyncThunk(
  'teamCF/deleteTeamCustomField',
  async ({ teamId, teamCustomFieldId }) => {
    await api.teams.teamCustomFields.delete(teamId, teamCustomFieldId)
    return teamCustomFieldId
  }
)

// 添加新的异步 thunk action
export const fetchTeamCustomFieldById = createAsyncThunk(
  'teamCF/fetchTeamCustomFieldById',
  async ({ teamId, teamCFId }, { rejectWithValue }) => {
    try {
      const response = await api.teams.teamCustomFields.getById(teamId, teamCFId);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
)

// Slice
const teamCFSlice = createSlice({
  name: 'teamCF',
  initialState: {
    items: [],
    currentItem: null, // 添加新的状态字段
    status: 'idle',
    error: null
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      // 获取团队自定义字段
      .addCase(fetchTeamCustomField.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchTeamCustomField.fulfilled, (state, action) => {
        state.items = action.payload
        state.loading = false
        state.error = null
      })
      .addCase(fetchTeamCustomField.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message
      })
      // 创建团队自定义字段
      .addCase(createTeamCustomField.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(createTeamCustomField.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items.push(action.payload);
        state.error = null;
      })
      .addCase(createTeamCustomField.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      // 删除团队自定义字段
      .addCase(deleteTeamCustomField.fulfilled, (state, action) => {
        state.items = state.items.filter(item => item.id !== action.payload)
      })
      // 更新团队自定义字段顺序
      .addCase(updateTeamCustomFieldOrder.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateTeamCustomFieldOrder.fulfilled, (state, action) => {
        state.items = action.payload;
        state.loading = false;
        state.error = null;
      })
      .addCase(updateTeamCustomFieldOrder.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message;
      })
      // 添加新的 case
      .addCase(fetchTeamCustomFieldById.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchTeamCustomFieldById.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.currentItem = action.payload;
        state.error = null;
      })
      .addCase(fetchTeamCustomFieldById.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
  }
})

export default teamCFSlice.reducer
