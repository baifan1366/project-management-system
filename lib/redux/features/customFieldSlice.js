import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '@/lib/api';

// 获取所有自定义字段
export const fetchCustomFields = createAsyncThunk(
  'customField/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.customFields.list();
      return response;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// 创建自定义字段
export const createCustomField = createAsyncThunk(
  'customField/create',
  async (fieldData, { getState, rejectWithValue }) => {
    try {
      const userId = getState().auth?.user?.id;
      const response = await api.customFields.create({
        ...fieldData,
        created_by: userId
      });
      return {
        ...response,
        created_by: userId
      };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// 更新自定义字段
export const updateCustomField = createAsyncThunk(
  'customField/update',
  async ({ fieldId, fieldData }, { getState, rejectWithValue }) => {
    try {
      const userId = getState().auth?.user?.id;
      const oldValues = getState().customField.fields.find(field => field.id === fieldId);
      const response = await api.customFields.update(fieldId, fieldData);
      return {
        ...response,
        created_by: userId,
        oldValues
      };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// 删除自定义字段
export const deleteCustomField = createAsyncThunk(
  'customField/delete',
  async (fieldId, { getState, rejectWithValue }) => {
    try {
      const userId = getState().auth?.user?.id;
      const oldValues = getState().customField.fields.find(field => field.id === fieldId);
      await api.customFields.delete(fieldId);
      return {
        id: fieldId,
        created_by: userId,
        oldValues
      };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const customFieldSlice = createSlice({
  name: 'customField',
  initialState: {
    fields: [],
    status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
    error: null,
  },
  reducers: {
    clearCustomFields: (state) => {
      state.fields = [];
      state.status = 'idle';
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // 获取所有字段
      .addCase(fetchCustomFields.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchCustomFields.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.fields = action.payload;
      })
      .addCase(fetchCustomFields.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      // 创建字段
      .addCase(createCustomField.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(createCustomField.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.fields.push(action.payload);
        state.error = null;
      })
      .addCase(createCustomField.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      // 更新字段
      .addCase(updateCustomField.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(updateCustomField.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const index = state.fields.findIndex(field => field.id === action.payload.id);
        if (index !== -1) {
          state.fields[index] = action.payload;
        }
        state.error = null;
      })
      .addCase(updateCustomField.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      // 删除字段
      .addCase(deleteCustomField.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(deleteCustomField.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.fields = state.fields.filter(field => field.id !== action.payload.id);
        state.error = null;
      })
      .addCase(deleteCustomField.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });
  },
});

export default customFieldSlice.reducer;
