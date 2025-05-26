import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'

export const createPaymentIntent = createAsyncThunk(
  'payment/createPaymentIntent',
  async (paymentData, { rejectWithValue }) => {
    try {
      // Validate required fields
      if (!paymentData.amount) {
        return rejectWithValue('Amount is required');
      }
      
      if (!paymentData.userId) {
        return rejectWithValue('userId is required');
      }

      // Additional validation if needed
      if (!paymentData.planId) {
        return rejectWithValue('planId is required');
      }

      console.log('Creating payment intent with data:', paymentData);

      const response = await fetch('/api/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Payment API error response:', errorText);
        
        try {
          // Try to parse the error as JSON
          const errorData = JSON.parse(errorText);
          return rejectWithValue(errorData.error || `Payment failed with status: ${response.status}`);
        } catch (parseError) {
          // If parsing fails, return the raw error text
          return rejectWithValue(`Payment failed: ${errorText || response.statusText}`);
        }
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error in createPaymentIntent:', error);
      return rejectWithValue(error.message || 'Unknown payment error');
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

const initialState = {
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
  },
  finalTotal: null,
  isPaymentValid: false,
  selectedPlanId: null,
  validationTimestamp: null,
};

const paymentSlice = createSlice({
  name: 'payment',
  initialState,
  reducers: {
    setPaymentMetadata: (state, action) => {
      state.metadata = { ...state.metadata, ...action.payload }
    },

    clearPaymentData: (state) => {
      state.paymentIntent = null
      state.paymentDetails = null
      state.error = null
      state.status = 'idle'
    },
    
    setFinalTotal: (state, action) => {
      state.finalTotal = action.payload
    },

    setPaymentValidation: (state, action) => {
      state.isPaymentValid = true;
      state.selectedPlanId = action.payload;
      state.validationTimestamp = Date.now();
    },

    clearPaymentValidation: (state) => {
      state.isPaymentValid = false;
      state.selectedPlanId = null;
      state.validationTimestamp = null;
    },
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
export const { setPaymentMetadata, clearPaymentData, setFinalTotal, setPaymentValidation, clearPaymentValidation } = paymentSlice.actions

// Export reducer
export default paymentSlice.reducer 