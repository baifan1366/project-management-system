import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { api } from '@/lib/api'

// 异步 thunk actions
export const fetchTeamCustomFieldValue = createAsyncThunk(
  'teamCFValue/fetchTeamCustomFieldValue',
  async ({ teamId, teamCustomFieldId }, { rejectWithValue }) => {
    try {
      const response = await api.teams.teamCustomFieldValues.list(
        teamId, 
        teamCustomFieldId
      );
      return {
        teamCustomFieldId,
        values: response.data
      };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
)

export const createTeamCustomFieldValue = createAsyncThunk(
  'teamCFValue/createTeamCustomFieldValue',
  async ({ teamId, teamCustomFieldId, data }) => {
    const response = await api.teamCustomFieldValues.create(teamId, teamCustomFieldId, data)
    return response.data
  }
)

export const updateTeamCustomFieldValue = createAsyncThunk(
  'teamCFValue/updateTeamCustomFieldValue',
  async ({ teamId, teamCustomFieldId, valueId, data }) => {
    const response = await api.teamCustomFieldValues.update(teamId, teamCustomFieldId, valueId, data)
    return response.data
  }
)

export const deleteTeamCustomFieldValue = createAsyncThunk(
  'teamCFValue/deleteTeamCustomFieldValue',
  async ({ teamId, teamCustomFieldId, valueId }) => {
    await api.teamCustomFieldValues.delete(teamId, teamCustomFieldId, valueId)
    return valueId
  }
)

// Slice
const teamCFValueSlice = createSlice({
  name: 'teamCFValue',
  initialState: {
    items: {},  // 使用对象存储不同字段的值：{ [teamCustomFieldId]: [...values] }
    loading: false,
    error: null
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      // 获取字段值
      .addCase(fetchTeamCustomFieldValue.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchTeamCustomFieldValue.fulfilled, (state, action) => {
        state.loading = false
        state.items[action.meta.arg.teamCustomFieldId] = {
          data: action.payload.values,
          teamCustomFieldId: action.meta.arg.teamCustomFieldId
        }
      })
      .addCase(fetchTeamCustomFieldValue.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message
      })
      // 创建字段值
      .addCase(createTeamCustomFieldValue.fulfilled, (state, action) => {
        const teamCustomFieldId = action.meta.arg.teamCustomFieldId
        if (!state.items[teamCustomFieldId]) {
          state.items[teamCustomFieldId] = {
            data: [],
            teamCustomFieldId
          }
        }
        state.items[teamCustomFieldId].data.push(action.payload)
      })
      // 更新字段值
      .addCase(updateTeamCustomFieldValue.fulfilled, (state, action) => {
        const teamCustomFieldId = action.meta.arg.teamCustomFieldId
        if (state.items[teamCustomFieldId]?.data) {
          const index = state.items[teamCustomFieldId].data.findIndex(v => v.id === action.payload.id)
          if (index !== -1) {
            state.items[teamCustomFieldId].data[index] = action.payload
          }
        }
      })
      // 删除字段值
      .addCase(deleteTeamCustomFieldValue.fulfilled, (state, action) => {
        const teamCustomFieldId = action.meta.arg.teamCustomFieldId
        if (state.items[teamCustomFieldId]?.data) {
          state.items[teamCustomFieldId].data = state.items[teamCustomFieldId].data.filter(
            item => item.id !== action.payload
          )
        }
      })
  }
})

export default teamCFValueSlice.reducer
