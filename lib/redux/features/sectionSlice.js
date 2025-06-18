import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '@/lib/api';

export const getSectionByTeamId = createAsyncThunk(
    'sections/getSectionByTeamId',
    async (teamId) => {
        if (!teamId) {
            throw new Error('teamId is required');
        }
        const res = await api.teams.teamSection.getSectionByTeamId(teamId);
        return res;
    }
)

export const getSectionById = createAsyncThunk(
    'sections/getSectionById',
    async (params) => {
        // 检查参数格式，支持两种调用方式
        let teamId, sectionId;
        
        if (typeof params === 'object' && params !== null) {
            // 如果传入对象格式 {teamId, sectionId}
            teamId = params.teamId;
            sectionId = params.sectionId;
        } else {
            // 如果只传入sectionId参数
            sectionId = params;
        }
        
        if (!teamId || !sectionId) {
            throw new Error('teamId and sectionId are required');
        }
        
        const res = await api.teams.teamSection.getSectionById(teamId, sectionId);
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
    async ({ sectionId, teamId, sectionData }, { getState }) => {
        try {
            // 获取更新前的部分数据，记录旧值
            const state = getState();
            // 确保类型匹配 - 将 sectionId 转换为数字进行比较
            const numericSectionId = Number(sectionId);
            // 尝试多种方式找到旧的 section
            let oldSection = state.sections.sections.find(section => section.id === numericSectionId);
            
            // 如果没找到，尝试字符串比较
            if (!oldSection) {
                oldSection = state.sections.sections.find(section => String(section.id) === String(sectionId));
            }
            
            const res = await api.teams.teamSection.update(sectionId, teamId, sectionData)

            return {
                ...res,
                old_values: {
                    oldSection
                }
            };
        } catch (error) {
            console.error('更新任务失败:', error);
        }
    }
)

export const updateTaskIds = createAsyncThunk(
    'sections/updateTaskIds',
    async ({ sectionId, teamId, newTaskIds }, { getState, rejectWithValue }) => {
        try {
            // 获取更新前的部分数据，记录旧值
            const state = getState();
            const oldSection = state.sections.sections.find(section => section.id === sectionId);
            
            // 调用API，修正参数格式
            const response = await api.teams.teamSection.updateTaskIds(
                sectionId, 
                teamId, 
                newTaskIds
            );
            
            if (!response) throw new Error('No response from API');
            
            // 添加额外信息以供loggerMiddleware使用
            return {
                ...response,
                sectionId,
                teamId,
                task_ids: newTaskIds,
                entityId: sectionId,
                entityType: 'sections',
                action: 'updateTaskIds',
                old_values: {
                    oldSection
                }
            };
        } catch (error) {
            console.error('更新任务IDs失败:', error);
            return rejectWithValue(error.message || '更新任务IDs失败');
        }
    }
)

export const updateTaskOrder = createAsyncThunk(
    'sections/updateTaskOrder',
    async ({ sectionId, teamId, newTaskIds }, { getState, rejectWithValue }) => {
        try {
            // 获取更新前的部分数据，记录旧值
            const state = getState();
            const oldSection = state.sections.sections.find(section => section.id === sectionId);
            
            // 调用API，修正参数格式
            const response = await api.teams.teamSection.updateTaskOrder(
                sectionId, 
                teamId, 
                newTaskIds
            );
            
            if (!response) throw new Error('No response from API');
            
            // 添加额外信息以供loggerMiddleware使用
            return {
                ...response,
                sectionId,
                teamId,
                task_ids: newTaskIds,
                entityId: sectionId,
                entityType: 'sections',
                action: 'updateTaskOrder',
                old_values: {
                    oldSection
                }
            };
        } catch (error) {
            console.error('更新任务IDs失败:', error);
            return rejectWithValue(error.message || '更新任务IDs失败');
        }
    }
)

export const updateSectionOrder = createAsyncThunk(
    'sections/updateSectionOrder',
    async ({ teamId, sectionIds, userId }, { getState, rejectWithValue }) => {
        try {
            // 获取更新前的部分数据，记录旧值
            const state = getState();
            const oldSections = state.sections.sections;
            
            // 调用API更新分区顺序
            const response = await api.teams.teamSection.updateSectionOrder(
                teamId, 
                sectionIds
            );
            
            if (!response) throw new Error('No response from API');
            
            // 添加额外信息以供日志使用
            return {
                ...response,
                teamId,
                sectionIds,
                userId: userId,
                entityId: teamId,
                entityType: 'sections',
                action: 'updateSectionOrder',
                old_values: {
                    oldSections
                }
            };
        } catch (error) {
            console.error('更新分区顺序失败:', error);
            return rejectWithValue(error.message || '更新分区顺序失败');
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
    reducers: {
        resetSectionsState: (state) => {
            state.sections = [];
            state.status = 'idle';
            state.error = null;
        }
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
            .addCase(updateTaskOrder.pending, (state) => {
                state.status = 'loading'
            })
            .addCase(updateTaskOrder.fulfilled, (state, action) => {
                state.status = 'succeeded'
                // 确保action.payload存在
                if (action.payload) {
                    const section = state.sections.find(section => section.id === action.payload.id);
                    if (section) {
                        section.task_ids = action.payload.task_ids;
                    }
                }
            })
            .addCase(updateTaskOrder.rejected, (state, action) => {
                state.status = 'failed'
                state.error = action.error.message
            })
            .addCase(updateSectionOrder.pending, (state) => {
                state.status = 'loading'
            })
            .addCase(updateSectionOrder.fulfilled, (state, action) => {
                state.status = 'succeeded'
                // 更新分区列表为服务器返回的排序结果
                if (action.payload) {
                    // 接收到的payload应该是排序好的分区数组
                    state.sections = action.payload;
                }
            })
            .addCase(updateSectionOrder.rejected, (state, action) => {
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

export const { resetSectionsState } = sectionSlice.actions;
export default sectionSlice.reducer