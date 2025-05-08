import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '@/lib/api';

// 获取团队所有页面
export const getPagesByTeamId = createAsyncThunk(
    'pages/getPagesByTeamId',
    async (teamId) => {
        const res = await api.teams.teamPages.getPagesByTeamId(teamId)
        return res;
    }
)

// 页面reducer
const pageSlice = createSlice({
    name: 'pages',
    initialState: {
        pages: [],
        status: 'idle',
        error: null,
    },
    reducers: {
        resetPagesState: (state) => {
            state.pages = [];
            state.status = 'idle';
            state.error = null;
        }
    },
    extraReducers: (builder) => {
        builder
            // 处理获取团队页面
            .addCase(getPagesByTeamId.pending, (state) => {
                state.status = 'loading'
            })
            .addCase(getPagesByTeamId.fulfilled, (state, action) => {
                state.status = 'succeeded'
                state.pages = action.payload
            })
            .addCase(getPagesByTeamId.rejected, (state, action) => {
                state.status = 'failed'
                state.error = action.error.message
            })
    }
});

export const { resetPagesState } = pageSlice.actions;

export default pageSlice.reducer; 