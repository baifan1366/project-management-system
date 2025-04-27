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
    async ({teamId, sectionId}) => {
        const res = await api.teams.teamSection.getSectionById(teamId, sectionId)
        return res;
    }
)

export const createSection = createAsyncThunk(
    'sections/createSection',
    async ({ teamId, sectionData }, thunkAPI) => {
        try {
            
            const response = await api.teams.teamSection.create(teamId, sectionData);
            
            if (!response) {
                throw new Error('No response from API when creating section');
            }
            
            // 添加额外信息以供日志使用
            return {
                ...response,
                teamId,
                entityType: 'sections',
                action: 'createSection'
            };
        } catch (error) {
            console.error('创建部门失败:', error);
            return thunkAPI.rejectWithValue(error.message || '创建部门失败');
        }
    }
)

export const updateSection = createAsyncThunk(
    'sections/updateSection',
    async (section, teamId) => {
        const res = await api.teams.teamSection.update(section, teamId)
        return res;
    }
)

export const updateTaskIds = createAsyncThunk(
    'sections/updateTaskIds',
    async ({ sectionId, teamId, newTaskIds }, { getState, rejectWithValue }) => {
        try {
            // 获取更新前的部分数据，记录旧值
            const state = getState();
            const oldSection = state.sections.sections.find(section => section.id === sectionId);
            const oldTaskIds = oldSection ? oldSection.task_ids || [] : [];
            const numericTeamId = Number(teamId);
            
            // 调用API，修正参数格式
            const response = await api.teams.teamSection.updateTaskIds(
                sectionId, 
                numericTeamId, 
                newTaskIds
            );
            
            if (!response) throw new Error('No response from API');
            
            // 添加额外信息以供loggerMiddleware使用
            return {
                ...response,
                sectionId,
                teamId: numericTeamId,
                task_ids: newTaskIds,
                entityId: sectionId,
                entityType: 'sections',
                action: 'updateTaskIds',
                old_values: {
                    task_ids: oldTaskIds
                }
            };
        } catch (error) {
            console.error('更新任务IDs失败:', error);
            return rejectWithValue(error.message || '更新任务IDs失败');
        }
    }
)

export const deleteSection = createAsyncThunk(
    'sections/deleteSection',
    async ({teamId, sectionId}, { getState, rejectWithValue }) => {
        try {
            // 获取当前部分的数据以记录旧值
            const state = getState();
            const oldValues = state.sections.sections.find(section => section.id === sectionId);
            
            // 调用API删除部分
            const res = await api.teams.teamSection.delete(teamId, sectionId);
            
            // 返回结果，添加额外的审计信息
            return {
                ...res,
                sectionId,
                teamId,
                entityId: sectionId,
                entityType: 'sections',
                action: 'deleteSection',
                old_values: oldValues,
                new_values: null
            };
        } catch (error) {
            console.error('删除部分失败:', error);
            return rejectWithValue(error.message || '删除部分失败');
        }
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
            .addCase(updateTaskIds.pending, (state) => {
                state.status = 'loading'
            })
            .addCase(updateTaskIds.fulfilled, (state, action) => {
                state.status = 'succeeded'
                // 确保action.payload存在
                if (action.payload) {
                    const section = state.sections.find(section => section.id === action.payload.id);
                    if (section) {
                        section.task_ids = action.payload.task_ids;
                    }
                }
            })
            .addCase(updateTaskIds.rejected, (state, action) => {
                state.status = 'failed'
                state.error = action.error.message
            })
            .addCase(deleteSection.pending, (state) => {
                state.status = 'loading'
            })
            .addCase(deleteSection.fulfilled, (state, action) => {
                state.status = 'succeeded'
                // 使用返回的删除信息，包括null的new_values
                if (action.payload && action.payload.sectionId) {
                    state.sections = state.sections.filter(section => section.id !== action.payload.sectionId)
                }
            })
            .addCase(deleteSection.rejected, (state, action) => {
                state.status = 'failed'
                state.error = action.error.message
            })
    }
})

export default sectionSlice.reducer