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
  async ({ teamId, customFieldId, config }) => {
    const response = await api.teamCustomFields.create(teamId, {
      customFieldId,
      config,
      isEnabled: true
    })
    return response.data
  }
)

export const deleteTeamCustomField = createAsyncThunk(
  'teamCF/deleteTeamCustomField',
  async ({ teamId, teamCustomFieldId }) => {
    await api.teamCustomFields.delete(teamId, teamCustomFieldId)
    return teamCustomFieldId
  }
)

// Slice
const teamCFSlice = createSlice({
  name: 'teamCF',
  initialState: {
    items: [],
    loading: false,
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
      .addCase(createTeamCustomField.fulfilled, (state, action) => {
        state.items.push(action.payload)
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
  }
})

export default teamCFSlice.reducer
