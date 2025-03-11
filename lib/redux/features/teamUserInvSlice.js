import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { supabase } from '@/lib/supabase';
import { api } from '@/lib/api';

// 初始状态
const initialState = {
  invitations: [],
  status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
  error: null,
  currentInvitation: null
};

// 创建团队邀请
export const createTeamUserInv = createAsyncThunk(
  'teamUserInv/create',
  async ({ teamId, userEmail, role }, { getState }) => {
    try {      
      const response = await api.teams.teamInvitations.create({
        teamId,
        userEmail,
        role,
      });
      
      return {
        id: response.id,
        team_id: teamId,
        user_email: userEmail,
        role: role,
      };
    } catch (error) {
      throw error;
    }
  }
);

// 获取团队的所有邀请
export const fetchTeamInvitations = createAsyncThunk(
  'teamUserInv/fetchByTeam',
  async (teamId, { rejectWithValue }) => {
    try {
      const { data, error } = await supabase
        .from('user_team_invitation')
        .select('*')
        .eq('team_id', teamId);

      if (error) throw error;
      return data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// 更新邀请状态
export const updateInvitationStatus = createAsyncThunk(
  'teamUserInv/updateStatus',
  async ({ invitationId, status }, { rejectWithValue }) => {
    try {
      const { data, error } = await supabase
        .from('user_team_invitation')
        .update({ status })
        .eq('id', invitationId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// 删除邀请
export const deleteInvitation = createAsyncThunk(
  'teamUserInv/delete',
  async (invitationId, { rejectWithValue }) => {
    try {
      const { error } = await supabase
        .from('user_team_invitation')
        .delete()
        .eq('id', invitationId);

      if (error) throw error;
      return invitationId;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchTeamUsersInv = createAsyncThunk(
  'teamUsersInv/fetchTeamUsersInv',
  async ({ teamId, userEmail }) => {
    const response = await fetch(`/api/teams/teamUsersInv?teamId=${teamId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch invitation');
    }
    return response.json();
  }
);

const teamUserInvSlice = createSlice({
  name: 'teamUserInv',
  initialState,
  reducers: {
    clearInvitations: (state) => {
      state.invitations = [];
      state.status = 'idle';
      state.error = null;
    },
    setCurrentInvitation: (state, action) => {
      state.currentInvitation = action.payload;
    }
  },
  extraReducers: (builder) => {
    builder
      // 创建邀请
      .addCase(createTeamUserInv.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(createTeamUserInv.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.invitations.push(action.payload);
      })
      .addCase(createTeamUserInv.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      // 获取邀请列表
      .addCase(fetchTeamInvitations.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchTeamInvitations.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.invitations = action.payload;
      })
      .addCase(fetchTeamInvitations.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      // 获取团队邀请
      .addCase(fetchTeamUsersInv.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchTeamUsersInv.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.invitations = action.payload;
      })
      .addCase(fetchTeamUsersInv.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      // 更新邀请状态
      .addCase(updateInvitationStatus.fulfilled, (state, action) => {
        const index = state.invitations.findIndex(inv => inv.id === action.payload.id);
        if (index !== -1) {
          state.invitations[index] = action.payload;
        }
      })
      // 删除邀请
      .addCase(deleteInvitation.fulfilled, (state, action) => {
        state.invitations = state.invitations.filter(inv => inv.id !== action.payload);
      });
  }
});

export const { clearInvitations, setCurrentInvitation } = teamUserInvSlice.actions;

export default teamUserInvSlice.reducer;

// 选择器
export const selectAllInvitations = (state) => state.teamUserInv.invitations;
export const selectInvitationStatus = (state) => state.teamUserInv.status;
export const selectInvitationError = (state) => state.teamUserInv.error;
export const selectCurrentInvitation = (state) => state.teamUserInv.currentInvitation;
