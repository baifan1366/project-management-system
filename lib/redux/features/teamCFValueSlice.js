import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { api } from '@/lib/api'

// 异步 thunk actions
export const fetchTeamCustomFieldValue = createAsyncThunk(
  'teamCFValue/fetchTeamCustomFieldValue',
  async ({ teamId, teamCustomFieldId }, { rejectWithValue }) => {
    try {      
      // 参数验证
      if (!teamId || !teamCustomFieldId) {
        console.error('[Redux] 缺少必要参数:', { teamId, teamCustomFieldId });
        return rejectWithValue('缺少必要参数: teamId或teamCustomFieldId');
      }
      
      const response = await api.teams.teamCustomFieldValues.list(
        teamId, 
        teamCustomFieldId
      );
            
      return {
        teamCustomFieldId,
        values: response.data || []
      };
    } catch (error) {
      console.error('[Redux] 获取自定义字段值失败:', error);
      return rejectWithValue(error.message || '获取自定义字段值失败');
    }
  }
)

export const createTeamCustomFieldValue = createAsyncThunk(
  'teamCFValue/createTeamCustomFieldValue',
  async ({ teamId, teamCustomFieldId, data }, { getState, rejectWithValue }) => {
    try {
      const response = await api.teams.teamCustomFieldValues.create(teamId, teamCustomFieldId, {
        ...data,
      });
      return {
        ...response.data,
        team_id: teamId,
        team_custom_field_id: teamCustomFieldId
      };
    } catch (error) {
      console.error('创建自定义字段值失败:', error);
      return rejectWithValue(error.message);
    }
  }
)

export const updateTeamCustomFieldValue = createAsyncThunk(
  'teamCFValue/updateTeamCustomFieldValue',
  async ({ teamId, teamCustomFieldId, valueId, data }, { getState, rejectWithValue }) => {
    try {
      console.log('[Redux] 调用API更新自定义字段值:', { teamId, teamCustomFieldId, valueId, data });
      
      // 参数验证
      if (!teamId || !teamCustomFieldId || !valueId) {
        console.error('[Redux] 缺少必要参数:', { teamId, teamCustomFieldId, valueId });
        return rejectWithValue('缺少必要参数: teamId, teamCustomFieldId或valueId');
      }
      
      // 获取当前状态中的数据
      const userId = getState().auth?.user?.id;
      let oldValues = null;
      
      // 安全获取旧值
      try {
        if (getState().teamCFValue?.items?.[teamCustomFieldId]?.data) {
          oldValues = getState().teamCFValue.items[teamCustomFieldId].data.find(value => value.id === valueId);
        }
      } catch (err) {
        console.warn('[Redux] 获取旧值时出错，将继续更新:', err);
      }
      
      console.log('[Redux] 准备发送更新请求, 旧值:', oldValues);
      
      const response = await api.teams.teamCustomFieldValues.update(teamId, teamCustomFieldId, valueId, data);
      
      console.log('[Redux] 更新字段值成功，结果:', response);
      
      return {
        ...response.data,
        team_custom_field_id: teamCustomFieldId,
        created_by: userId || data.created_by,
        oldValues
      };
    } catch (error) {
      console.error('[Redux] 更新自定义字段值失败:', error);
      return rejectWithValue(error.message || '更新自定义字段值失败');
    }
  }
)

export const deleteTeamCustomFieldValue = createAsyncThunk(
  'teamCFValue/deleteTeamCustomFieldValue',
  async ({ teamId, teamCustomFieldId, valueId }, { getState, rejectWithValue }) => {
    try {
      console.log('调用API删除自定义字段值:', { teamId, teamCustomFieldId, valueId });
      const userId = getState().auth?.user?.id;
      const oldValues = getState().teamCFValue.items[teamCustomFieldId]?.data
        ?.find(value => value.id === valueId);
      await api.teams.teamCustomFieldValues.delete(teamId, teamCustomFieldId, valueId);
      return {
        id: valueId,
        team_custom_field_id: teamCustomFieldId,
        created_by: userId,
        oldValues
      };
    } catch (error) {
      console.error('删除自定义字段值失败:', error);
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
    error: null,
    loadingState: {}  // 跟踪各个字段的加载状态: { [teamCustomFieldId]: boolean }
  },
  reducers: {
    clearTeamCFValues: (state) => {
      state.items = {};
      state.status = 'idle';
      state.error = null;
      state.loadingState = {};
    },
    setLoadingState: (state, action) => {
      const { teamCustomFieldId, loading } = action.payload;
      if (teamCustomFieldId) {
        if (!state.loadingState) {
          state.loadingState = {};
        }
        state.loadingState[teamCustomFieldId] = loading;
      }
    }
  },
  extraReducers: (builder) => {
    builder
      // 获取字段值
      .addCase(fetchTeamCustomFieldValue.pending, (state) => {
        state.status = 'loading';
        state.error = null;
        // 确保state.items存在
        if (!state.items) {
          state.items = {};
        }
      })
      .addCase(fetchTeamCustomFieldValue.fulfilled, (state, action) => {
        state.status = 'succeeded';
        // 确保state.items存在
        if (!state.items) {
          state.items = {};
        }
        
        // 确保使用teamCustomFieldId作为键值
        const teamCustomFieldId = action.meta.arg.teamCustomFieldId;
        if (teamCustomFieldId) {
          state.items[teamCustomFieldId] = {
            data: action.payload.values || [],
            teamCustomFieldId
          };
        }
        state.error = null;
      })
      .addCase(fetchTeamCustomFieldValue.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message;
        // 确保state.items存在
        if (!state.items) {
          state.items = {};
        }
      })
      // 创建字段值
      .addCase(createTeamCustomFieldValue.pending, (state) => {
        state.status = 'loading';
        state.error = null;
        // 确保state.items存在
        if (!state.items) {
          state.items = {};
        }
      })
      .addCase(createTeamCustomFieldValue.fulfilled, (state, action) => {
        state.status = 'succeeded';
        
        // 确保state.items存在
        if (!state.items) {
          state.items = {};
        }
        
        const teamCustomFieldId = action.payload.team_custom_field_id;
        if (teamCustomFieldId) {
          // 初始化items[teamCustomFieldId]如果不存在
          if (!state.items[teamCustomFieldId]) {
            state.items[teamCustomFieldId] = {
              data: [],
              teamCustomFieldId
            };
          }
          // 确保data是数组
          if (!Array.isArray(state.items[teamCustomFieldId].data)) {
            state.items[teamCustomFieldId].data = [];
          }
          // 添加新数据
          state.items[teamCustomFieldId].data.push(action.payload);
        }
        state.error = null;
      })
      .addCase(createTeamCustomFieldValue.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
        // 确保state.items存在
        if (!state.items) {
          state.items = {};
        }
      })
      // 更新字段值
      .addCase(updateTeamCustomFieldValue.pending, (state) => {
        state.status = 'loading';
        // 确保state.items存在
        if (!state.items) {
          state.items = {};
        }
      })
      .addCase(updateTeamCustomFieldValue.fulfilled, (state, action) => {
        state.status = 'succeeded';
        
        // 确保state.items存在
        if (!state.items) {
          state.items = {};
        }
        
        const teamCustomFieldId = action.payload.team_custom_field_id;
        if (teamCustomFieldId) {
          // 确保items[teamCustomFieldId]存在
          if (!state.items[teamCustomFieldId]) {
            state.items[teamCustomFieldId] = {
              data: [],
              teamCustomFieldId
            };
          }
          
          // 确保data是数组
          if (!Array.isArray(state.items[teamCustomFieldId].data)) {
            state.items[teamCustomFieldId].data = [];
          }
          
          const index = state.items[teamCustomFieldId].data.findIndex(v => v.id === action.payload.id);
          if (index !== -1) {
            state.items[teamCustomFieldId].data[index] = action.payload;
          } else {
            // 如果找不到，添加到数组中
            state.items[teamCustomFieldId].data.push(action.payload);
          }
        }
        state.error = null;
      })
      .addCase(updateTeamCustomFieldValue.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
        // 确保state.items存在
        if (!state.items) {
          state.items = {};
        }
      })
      // 删除字段值
      .addCase(deleteTeamCustomFieldValue.pending, (state) => {
        state.status = 'loading';
        // 确保state.items存在
        if (!state.items) {
          state.items = {};
        }
      })
      .addCase(deleteTeamCustomFieldValue.fulfilled, (state, action) => {
        state.status = 'succeeded';
        
        // 确保state.items存在
        if (!state.items) {
          state.items = {};
        }
        
        const teamCustomFieldId = action.payload.team_custom_field_id;
        if (teamCustomFieldId && state.items[teamCustomFieldId]?.data) {
          state.items[teamCustomFieldId].data = state.items[teamCustomFieldId].data.filter(
            item => item.id !== action.payload.id
          );
        }
        state.error = null;
      })
      .addCase(deleteTeamCustomFieldValue.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
        // 确保state.items存在
        if (!state.items) {
          state.items = {};
        }
      })
  }
})

export default teamCFValueSlice.reducer
