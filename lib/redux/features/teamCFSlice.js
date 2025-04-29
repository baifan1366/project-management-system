import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { api } from '@/lib/api'
import { supabase } from '@/lib/supabase'

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

// 修正 getTags 异步 thunk
export const getTags = createAsyncThunk(
  'teamCF/getTags',
  async ({ teamId, teamCFId }, { rejectWithValue }) => {
    try {
      const response = await api.teams.teamCustomFields.getTags(teamId, teamCFId);
      return response;
    } catch (error) {
      console.error('getTags API调用失败:', error);
      return rejectWithValue(error.message);
    }
  }
);

// 添加新的 updateTagIds 异步 thunk
export const updateTagIds = createAsyncThunk(
  'teamCF/updateTagIds',
  async ({ teamId, teamCFId, tagIds, userId }, { rejectWithValue, getState }) => {
    try {
      // 如果没有传入userId，则尝试获取
      let finalUserId = userId;
      if (!finalUserId) {
        // 先从state中获取
        const state = getState();
        if (state.auth?.user?.id) {
          finalUserId = state.auth.user.id;
        } else {
          // 再从supabase获取
          const { user } = useGetUser();
          if (error) throw new Error(error.message);
          finalUserId = user?.id;
        }
      }
      
      // 获取旧的标签IDs用于日志记录
      const teamCF = getState().teamCF.items.find(item => item.id === teamCFId);
      const oldTagIds = teamCF?.tag_ids || [];
      
      const response = await api.teams.teamCustomFields.updateTagIds(teamId, teamCFId, tagIds, finalUserId);
      
      return { 
        teamCFId, 
        tagIds, 
        response,
        userId: finalUserId,
        entityId: teamCFId,
        entityType: 'teamCF',
        old_values: { teamCF } // 添加旧值记录
      };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Slice
const teamCFSlice = createSlice({
  name: 'teamCF',
  initialState: {
    items: [],
    currentItem: null,
    status: 'idle',
    tagsStatus: 'idle', // 添加单独的标签加载状态
    error: null,
    tagsError: null, // 添加单独的标签错误
    tags: []
  },
  reducers: {
    resetTagsStatus: (state) => {
      state.tagsStatus = 'idle';
      state.tagsError = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // 获取团队自定义字段
      .addCase(fetchTeamCustomField.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(fetchTeamCustomField.fulfilled, (state, action) => {
        state.items = action.payload
        state.status = 'succeeded'
        state.error = null
      })
      .addCase(fetchTeamCustomField.rejected, (state, action) => {
        state.status = 'failed'
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
        state.status = 'loading';
        state.error = null;
      })
      .addCase(updateTeamCustomFieldOrder.fulfilled, (state, action) => {
        state.items = action.payload;
        state.status = 'succeeded';
        state.error = null;
      })
      .addCase(updateTeamCustomFieldOrder.rejected, (state, action) => {
        state.status = 'failed';
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
      // 处理 getTags - 使用单独的状态字段
      .addCase(getTags.pending, (state) => {
        state.tagsStatus = 'loading';
        state.tagsError = null;
      })
      .addCase(getTags.fulfilled, (state, action) => {
        state.tagsStatus = 'succeeded';
        state.tags = action.payload;
        state.tagsError = null;
      })
      .addCase(getTags.rejected, (state, action) => {
        state.tagsStatus = 'failed';
        state.tagsError = action.payload;
      })
      // 处理 updateTagIds
      .addCase(updateTagIds.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(updateTagIds.fulfilled, (state, action) => {
        const { teamCFId, tagIds } = action.payload;
        const teamCF = state.items.find(item => item.id === teamCFId);
        if (teamCF) {
          teamCF.tag_ids = tagIds;
        }
        state.status = 'succeeded';
      })
      .addCase(updateTagIds.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });
  }
})

export const { resetTagsStatus } = teamCFSlice.actions;
export default teamCFSlice.reducer
