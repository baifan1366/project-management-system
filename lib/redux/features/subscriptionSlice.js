import { createSlice } from '@reduxjs/toolkit';

const subscriptionSlice = createSlice({
  name: 'subscription',
  initialState: {
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
        actionType: action.payload.actionType,
        origin: action.payload.origin,
        limitInfo: action.payload.limitInfo
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
  }
});

export const { limitExceeded, clearLimitExceeded } = subscriptionSlice.actions;
export default subscriptionSlice.reducer;