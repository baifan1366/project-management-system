import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '@/lib/api';

export const getSectionByTeamId = createAsyncThunk(
    'sections/getSectionByTeamId',
    async (teamId) => {
        const res = await api.teams.teamSection.getSectionByTeamId(teamId)
        return res;
    }
)

export const getSectionById = createAsyncThunk(
    'sections/getSectionById',
    async (teamId, sectionId) => {
        const res = await api.teams.teamSection.getSectionById(teamId, sectionId)
        return res;
    }
)

export const createSection = createAsyncThunk(
    'sections/createSection',
    async (section, teamId) => {
        const res = await api.teams.teamSection.create(section, teamId)
        return res;
    }
)

export const updateSection = createAsyncThunk(
    'sections/updateSection',
    async (section, teamId) => {
        const res = await api.teams.teamSection.update(section, teamId)
        return res;
    }
)

export const deleteSection = createAsyncThunk(
    'sections/deleteSection',
    async (sectionId, teamId) => {
        const res = await api.teams.teamSection.delete(sectionId, teamId)
        return res;
    }
)

const sectionSlice = createSlice({
    name: 'sections',
    initialState: {
        sections: [],
        status: 'idle',
        error: null,
    },
    extraReducers: (builder) => {
        builder
            .addCase(getSectionByTeamId.pending, (state) => {
                state.status = 'loading'
            })
            .addCase(getSectionByTeamId.fulfilled, (state, action) => {
                state.status = 'succeeded'
                state.sections = action.payload
            })
            .addCase(getSectionByTeamId.rejected, (state, action) => {
                state.status = 'failed'
                state.error = action.error.message
            })
            .addCase(getSectionById.pending, (state) => {
                state.status = 'loading'
            })
            .addCase(getSectionById.fulfilled, (state, action) => {
                state.status = 'succeeded'
                state.sections = action.payload
            })
            .addCase(getSectionById.rejected, (state, action) => {
                state.status = 'failed'
                state.error = action.error.message
            })
            .addCase(createSection.pending, (state) => {
                state.status = 'loading'
            })
            .addCase(createSection.fulfilled, (state, action) => {
                state.status = 'succeeded'
                state.sections.push(action.payload)
            })
            .addCase(createSection.rejected, (state, action) => {
                state.status = 'failed'
                state.error = action.error.message
            })
            .addCase(updateSection.pending, (state) => {
                state.status = 'loading'
            })
            .addCase(updateSection.fulfilled, (state, action) => {
                state.status = 'succeeded'
                const index = state.sections.findIndex(section => section.id === action.payload.id)
                if (index !== -1) {
                    state.sections[index] = action.payload
                }   
            })
            .addCase(updateSection.rejected, (state, action) => {
                state.status = 'failed'
                state.error = action.error.message
            })
            .addCase(deleteSection.pending, (state) => {
                state.status = 'loading'
            })
            .addCase(deleteSection.fulfilled, (state, action) => {
                state.status = 'succeeded'
                state.sections = state.sections.filter(section => section.id !== action.payload.id)
            })
            .addCase(deleteSection.rejected, (state, action) => {
                state.status = 'failed'
                state.error = action.error.message
            })
    }
})

export default sectionSlice.reducer