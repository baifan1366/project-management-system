import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getSubscriptionUsage } from '@/lib/subscriptionService';

// Async thunk to fetch user subscription data
export const fetchSubscription = createAsyncThunk(
  'subscription/fetchSubscription',
  async (userId, { rejectWithValue }) => {
    try {
      const subscriptionData = await getSubscriptionUsage(userId);
      if (!subscriptionData) {
        // Handle case where user might not have a subscription record yet
        return null;
      }
      return subscriptionData;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const subscriptionSlice = createSlice({
  name: 'subscription',
  initialState: {
    subscriptionData: null,
    status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
    error: null,
    limitExceeded: {
      show: false,
      actionType: null,
      origin: null,
      limitInfo: null
    }
  },
  reducers: {
    limitExceeded: (state, action) => {
      state.limitExceeded = {
        show: true,
        limitInfo: {
          reason: action.payload.reason,
        },
        actionType: action.payload.feature,
      };
    },
    clearLimitExceeded: (state) => {
      state.limitExceeded = {
        show: false,
        actionType: null,
        origin: null,
        limitInfo: null
      };
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSubscription.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchSubscription.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.subscriptionData = action.payload;
      })
      .addCase(fetchSubscription.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });
  }
});

export const { limitExceeded, clearLimitExceeded } = subscriptionSlice.actions;
export default subscriptionSlice.reducer;