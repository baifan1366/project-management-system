import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { api } from '@/lib/api'

// Async thunks
export const fetchDefaults = createAsyncThunk(
    'defaults/fetchDefaults',
    async () => {
        const res = await api.defaults.list()
        return res
    }
)

export const fetchDefaultByName = createAsyncThunk(
    'defaults/fetchDefaultByName',
    async (name) => {
        const res = await api.defaults.getByName(name)
        return res
    }
)  

export const updateDefault = createAsyncThunk(
    'defaults/updateDefault',
    async ({ name, defaultData }, { getState, rejectWithValue }) => {
        try {
            // 先从当前 state 中获取旧数据
            const currentState = getState();
            const oldItem = currentState.defaults.data.find(item => item.id === defaultData.id);
            
            // 确保 oldItem 存在
            if (!oldItem) {
                return rejectWithValue('找不到要更新的项目');
            }
            
            // 保存旧值
            const oldValues = {
                qty: oldItem.qty,
                updated_at: oldItem.updated_at,
                edited_by: oldItem.edited_by
            };
            
            // 构建要更新的数据，不包含old_values字段
            const updatePayload = {
                ...defaultData,
                // 确保old_values不作为更新数据的一部分发送
                old_values: undefined
            };            
            const res = await api.defaults.update(name, updatePayload);
            
            // 在返回结果中手动添加old_values和entityId
            return {
                ...res,
                old_values: oldValues,
                entityId: defaultData.id, // 添加entityId用于action_log
                userId: defaultData.edited_by // 使用defaultData中的edited_by作为userId
            };
        } catch (error) {
            console.error('更新失败:', error);
            return rejectWithValue(error.message);
        }
    }
)

const defaultSlice = createSlice({
    name: 'defaults',
    initialState: {
        data: [],
        status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
        error: null,
    },
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(fetchDefaults.pending, (state) => {
                state.status = 'loading'
            })
            .addCase(fetchDefaults.fulfilled, (state, action) => {
                state.status = 'succeeded'
                state.data = action.payload
            })
            .addCase(fetchDefaults.rejected, (state, action) => {
                state.status = 'failed'
                state.error = action.error.message
            })  
            .addCase(fetchDefaultByName.pending, (state) => {   
                state.status = 'loading'
            })
            .addCase(fetchDefaultByName.fulfilled, (state, action) => {
                state.status = 'succeeded'
                const existingIndex = state.data.findIndex(item => item.id === action.payload.id)
                if (existingIndex >= 0) {
                    state.data[existingIndex] = action.payload
                } else {
                    state.data.push(action.payload)
                }
            })
            .addCase(fetchDefaultByName.rejected, (state, action) => {
                state.status = 'failed'
                state.error = action.error.message
            })  
            .addCase(updateDefault.pending, (state) => {
                state.status = 'loading'
            })
            .addCase(updateDefault.fulfilled, (state, action) => {
                state.status = 'succeeded'
                
                // 从payload中获取entityId
                const entityId = action.payload.entityId;
                const userId = action.payload.userId;
                
                // 查找并更新数据
                const existingIndex = state.data.findIndex(item => item.id === entityId);
                
                if (existingIndex >= 0) {
                    // 只移除old_values，保留其他所有字段
                    const { old_values, ...restData } = action.payload;
                    state.data[existingIndex] = restData;
                } else {
                    // 只移除old_values，保留其他所有字段
                    const { old_values, ...restData } = action.payload;
                    state.data.push(restData);
                }
                
                // 关键修改：将entityId添加到action对象本身
                // 日志中间件可能直接从action对象而不是payload中读取这些属性
                action.entityId = entityId;
                action.userId = userId;
            })  
            .addCase(updateDefault.rejected, (state, action) => {   
                state.status = 'failed'
                state.error = action.error.message
            })
    }
})

export default defaultSlice.reducer