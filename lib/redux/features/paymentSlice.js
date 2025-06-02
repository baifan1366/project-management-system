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

// New thunk for fetching session details
export const fetchSessionDetails = createAsyncThunk(
  'payment/fetchSessionDetails',
  async (sessionId, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/payment-status?session_id=${sessionId}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        return rejectWithValue(`Failed to fetch session: ${errorText}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching session details:', error);
      return rejectWithValue(error.message || 'Unknown session error');
    }
  }
);

const initialState = {
  status: 'idle',
  error: null,
  paymentIntent: null,
  paymentDetails: null,
  sessionId: null,
  sessionDetails: null,
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
      state.sessionId = null
      state.sessionDetails = null
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
    
    // New reducer to store session ID
    setSessionId: (state, action) => {
      state.sessionId = action.payload;
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
      // Handle session details fetching
      .addCase(fetchSessionDetails.pending, (state) => {
        state.status = 'loading'
      })
      .addCase(fetchSessionDetails.fulfilled, (state, action) => {
        state.sessionDetails = action.payload;
        // If the session contains a payment intent, store it too
        if (action.payload.payment_intent) {
          state.paymentIntent = {
            clientSecret: null, // Not available from session
            id: action.payload.payment_intent
          };
        }
        state.status = 'succeeded';
      })
      .addCase(fetchSessionDetails.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Failed to fetch session details';
      })
  }
})

// Export actions
export const { 
  setPaymentMetadata, 
  clearPaymentData, 
  setFinalTotal, 
  setPaymentValidation, 
  clearPaymentValidation,
  setSessionId
} = paymentSlice.actions

// Export reducer
export default paymentSlice.reducer 