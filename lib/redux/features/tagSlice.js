import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '@/lib/api';

export const fetchAllTags = createAsyncThunk(
    'tags/fetchAllTags',
    async () => {
        const res = await api.tags.list()
        return res;
    }
)

const tagSlice = createSlice({
    name: 'tags',
    initialState: {
        tags: [],
        status: 'idle',
        error: 'null',
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchAllTags.pending, (state) => {
                state.status = 'loading'
            })
            .addCase(fetchAllTags.fulfilled, (state, action) => {
                state.status = 'succeeded'
                state.tags = action.payload
            })
            .addCase(fetchAllTags.rejected, (state, action) => {
                state.status = 'failed'
                state.error = action.error.message
            })
    },
})

export default tagSlice.reducer