import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { api } from '@/lib/api'

export const getLabelByTeamId = createAsyncThunk(
  'label/getLabelByTeamId',
  async (teamId) => {
    
    
    // 获取标签数据 - API层已处理扁平化逻辑
    const res = await api.teams.label.getLabelByTeamId(teamId);
    
    
    // 直接返回API层处理好的数据
    return res;
  }
)

export const updateLabel = createAsyncThunk(
  'label/updateLabel',
  async ({ teamId, label, userId, entityId }) => {
    
    
    // 直接传递给API层，API层会处理扁平化
    const res = await api.teams.label.updateLabel(teamId, label);
    
    
    // 添加用户ID和实体ID
    return {
      ...res,
      userId: userId,
      entityId: entityId
    };
  }
)

const teamLabelSlice = createSlice({
  name: 'teamLabel',
  initialState: {
    label: {},
    status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
    error: null,
  },
  extraReducers: (builder) => {
    builder
      .addCase(getLabelByTeamId.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(getLabelByTeamId.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.label = action.payload;
      })
      .addCase(getLabelByTeamId.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message;
      })
      .addCase(updateLabel.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(updateLabel.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.label = action.payload;
      })
      .addCase(updateLabel.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
  },
})

export default teamLabelSlice.reducer