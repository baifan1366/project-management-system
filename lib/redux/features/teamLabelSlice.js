import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { api } from '@/lib/api'

export const getLabelByTeamId = createAsyncThunk(
  'label/getLabelByTeamId',
  async (teamId) => {
    const res = await api.teams.label.getLabelByTeamId(teamId);
    return res;
  }
)

export const updateLabel = createAsyncThunk(
  'label/updateLabel',
  async ({ teamId, label, userId, entityId }) => {
    const res = await api.teams.label.updateLabel(teamId, label);
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