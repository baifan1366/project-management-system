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
  async ({ teamId, teamCustomFieldId, data }, { getState, rejectWithValue }) => {
    try {
      const userId = getState().auth?.user?.id;
      const response = await api.teamCustomFieldValues.create(teamId, teamCustomFieldId, {
        ...data,
        created_by: userId
      });
      return {
        ...response,
        created_by: userId,
        team_id: teamId,
        team_custom_field_id: teamCustomFieldId
      };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
)

export const updateTeamCustomFieldValue = createAsyncThunk(
  'teamCFValue/updateTeamCustomFieldValue',
  async ({ teamId, teamCustomFieldId, valueId, data }, { getState, rejectWithValue }) => {
    try {
      const userId = getState().auth?.user?.id;
      const oldValues = getState().teamCFValue.items[teamCustomFieldId]?.data
        ?.find(value => value.id === valueId);
      const response = await api.teamCustomFieldValues.update(teamId, teamCustomFieldId, valueId, data);
      return {
        ...response,
        created_by: userId,
        oldValues
      };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
)

export const deleteTeamCustomFieldValue = createAsyncThunk(
  'teamCFValue/deleteTeamCustomFieldValue',
  async ({ teamId, teamCustomFieldId, valueId }, { getState, rejectWithValue }) => {
    try {
      const userId = getState().auth?.user?.id;
      const oldValues = getState().teamCFValue.items[teamCustomFieldId]?.data
        ?.find(value => value.id === valueId);
      await api.teamCustomFieldValues.delete(teamId, teamCustomFieldId, valueId);
      return {
        id: valueId,
        team_custom_field_id: teamCustomFieldId,
        created_by: userId,
        oldValues
      };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
)

// Slice
const teamCFValueSlice = createSlice({
  name: 'teamCFValue',
  initialState: {
    items: {},  // 使用对象存储不同字段的值：{ [teamCustomFieldId]: [...values] }
    status: 'idle',
    error: null
  },
  reducers: {
    clearTeamCFValues: (state) => {
      state.items = {};
      state.status = 'idle';
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // 获取字段值
      .addCase(fetchTeamCustomFieldValue.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(fetchTeamCustomFieldValue.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.items[action.meta.arg.teamCustomFieldId] = {
          data: action.payload.values,
          teamCustomFieldId: action.meta.arg.teamCustomFieldId
        }
        state.error = null
      })
      .addCase(fetchTeamCustomFieldValue.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.error.message
      })
      // 创建字段值
      .addCase(createTeamCustomFieldValue.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(createTeamCustomFieldValue.fulfilled, (state, action) => {
        state.status = 'succeeded'
        const teamCustomFieldId = action.payload.team_custom_field_id
        if (!state.items[teamCustomFieldId]) {
          state.items[teamCustomFieldId] = {
            data: [],
            teamCustomFieldId
          }
        }
        state.items[teamCustomFieldId].data.push(action.payload)
        state.error = null
      })
      .addCase(createTeamCustomFieldValue.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload
      })
      // 更新字段值
      .addCase(updateTeamCustomFieldValue.pending, (state) => {
        state.status = 'loading'
      })
      .addCase(updateTeamCustomFieldValue.fulfilled, (state, action) => {
        state.status = 'succeeded'
        const teamCustomFieldId = action.payload.team_custom_field_id
        if (state.items[teamCustomFieldId]?.data) {
          const index = state.items[teamCustomFieldId].data.findIndex(v => v.id === action.payload.id)
          if (index !== -1) {
            state.items[teamCustomFieldId].data[index] = action.payload
          }
        }
        state.error = null
      })
      .addCase(updateTeamCustomFieldValue.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload
      })
      // 删除字段值
      .addCase(deleteTeamCustomFieldValue.pending, (state) => {
        state.status = 'loading'
      })
      .addCase(deleteTeamCustomFieldValue.fulfilled, (state, action) => {
        state.status = 'succeeded'
        const teamCustomFieldId = action.payload.team_custom_field_id
        if (state.items[teamCustomFieldId]?.data) {
          state.items[teamCustomFieldId].data = state.items[teamCustomFieldId].data.filter(
            item => item.id !== action.payload.id
          )
        }
        state.error = null
      })
      .addCase(deleteTeamCustomFieldValue.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload
      })
  }
})

export default teamCFValueSlice.reducer
