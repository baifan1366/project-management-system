import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'

export const createPaymentIntent = createAsyncThunk(
  'payment/createPaymentIntent',
  async (paymentData, { rejectWithValue }) => {
    try {
      // 验证必需的字段
      if (!paymentData.amount || !paymentData.userId) {
        throw new Error('Missing required payment information');
      }

      const response = await fetch('/api/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(errorData.error || 'Payment failed');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchPaymentStatus = createAsyncThunk(
  'payment/fetchPaymentStatus',
  async (paymentIntentId) => {
    const response = await fetch(`/api/payment-status?payment_intent=${paymentIntentId}`)
    const data = await response.json()
    return data
  }
)

const paymentSlice = createSlice({
  name: 'payment',
  initialState: {
    status: 'idle',
    error: null,
    paymentIntent: null,
    paymentDetails: null,
    metadata: {
      planId: null,
      userId: null,
      planName: null,
      amount: null,
      quantity: 1
    }
  },
  reducers: {
    setPaymentMetadata: (state, action) => {
      state.metadata = { ...state.metadata, ...action.payload }
    },
    clearPaymentData: (state) => {
      state.paymentIntent = null
      state.paymentDetails = null
      state.error = null
      state.status = 'idle'
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(createPaymentIntent.pending, (state) => {
        state.status = 'loading'
      })
      .addCase(createPaymentIntent.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.paymentIntent = action.payload
      })
      .addCase(createPaymentIntent.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.error.message
      })
      .addCase(fetchPaymentStatus.fulfilled, (state, action) => {
        state.paymentDetails = action.payload
      })
  }
})

// Export actions
export const { setPaymentMetadata, clearPaymentData } = paymentSlice.actions

// Export reducer
export default paymentSlice.reducer 