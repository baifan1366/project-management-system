import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '@/lib/api';

export const fetchAllTags = createAsyncThunk(
    'tags/fetchAllTags',
    async () => {
        const res = await api.tags.list()
        return res;
    }
)

export const getTagById = createAsyncThunk(
    'tags/getTagById',
    async (tagId) => {
        const res = await api.tags.getById(tagId)
        return {
            ...res,
            entityId: res.id || res._id,  // 显式添加 entityId 字段
            entityType: 'tags'            // 显式指定实体类型
        };
    }
)

export const createTag = createAsyncThunk(
    'tags/createTag',
    async (data, { getState }) => {
        const res = await api.tags.create(data)
        console.log('创建标签返回数据:', res);
        
        // 添加明确的元数据，帮助日志中间件识别这个实体
        return {
            ...res,
            entityId: res.id || res._id,  // 显式添加 entityId 字段
            entityType: 'tags'            // 显式指定实体类型
        };
    }
)

const tagSlice = createSlice({
    name: 'tags',
    initialState: {
        tags: [],
        currentTag: null,
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
            .addCase(getTagById.pending, (state) => {
                state.status = 'loading'
            })
            .addCase(getTagById.fulfilled, (state, action) => {
                state.status = 'succeeded'
                state.currentTag = action.payload
            })
            .addCase(getTagById.rejected, (state, action) => {
                state.status = 'failed'
                state.error = action.error.message
            })
            .addCase(createTag.pending, (state) => {
                state.status = 'loading'
            })
            .addCase(createTag.fulfilled, (state, action) => {
                state.status = 'succeeded'
                state.tags.push(action.payload)
            })
            .addCase(createTag.rejected, (state, action) => {
                state.status = 'failed'
                state.error = action.error.message
            })
    },
})

export default tagSlice.reducer