import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { api } from '@/lib/api'
import { supabase } from '@/lib/supabase'
import useGetUser from '@/lib/hooks/useGetUser'

// Async thunks
export const fetchPlans = createAsyncThunk(
  'plans/fetchPlans',
  async () => {
    const response = await fetch('/api/plan')
    const data = await response.json()
    return data.plans
  }
)

export const fetchPlanById = createAsyncThunk(
  'plans/fetchPlanById',
  async (planId) => {
    const res = await api.plans.getById(planId)
    if (!res) {
      throw new Error('Plan not found')
    }
    return res
  }
)

export const createPlan = createAsyncThunk(
  'plans/createPlan',
  async (planData) => {
    const res = await api.plans.create(planData)
    return res
  }
)

export const updatePlan = createAsyncThunk(
  'plans/updatePlan',
  async ({ planId, planData }) => {
    const res = await api.plans.update(planId, planData)
    return res
  }
)

export const deletePlan = createAsyncThunk(
  'plans/deletePlan',
  async (planId) => {
    await api.plans.delete(planId)
    return planId
  }
)

export const fetchCurrentUserPlan = createAsyncThunk(
  'plans/fetchCurrentUserPlan',
  async (userData, { rejectWithValue }) => {
    try {
      // If no user, return default value
      if (!userData || !userData.user) {
        return { isLoggedIn: false, plan: null };
      }
      
      // Query user's subscription plan
      const { data, error } = await supabase
        .from('user_subscription_plan')
        .select(`
          plan_id,
          status,
          subscription_plan (
            id,
            name,
            type,
            price,
            billing_interval
          )
        `)
        .eq('user_id', userData.user.id)
        .single();
      
      if (error) {
        console.log('Error fetching user subscription:', error);
        return { isLoggedIn: true, plan: null };
      }
      
      return { isLoggedIn: true, plan: data };
    } catch (err) {
      console.error('Error fetching current user plan:', err);
      return rejectWithValue(err.message);
    }
  }
);

const planSlice = createSlice({
  name: 'plans',
  initialState: {
    plans: {
      monthly: [],
      yearly: []
    },
    status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
    error: null,
    currentPlan: null,
    selectedInterval: 'monthly'
  },
  reducers: {
    setCurrentPlan(state, action) {
      state.currentPlan = action.payload
    },
    clearError(state) {
      state.error = null
    },
    setSelectedInterval: (state, action) => {
      state.selectedInterval = action.payload
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch plans
      .addCase(fetchPlans.pending, (state) => {
        state.status = 'loading'
      })
      .addCase(fetchPlans.fulfilled, (state, action) => {
        // 分离计划并保持顺序
        const monthlyPlans = action.payload.filter(
          plan => plan.billing_interval === 'MONTHLY'
        );
        const yearlyPlans = action.payload.filter(
          plan => plan.billing_interval === 'YEARLY'
        );
        
        // 获取没有计费周期的计划（通常是免费计划）
        const noIntervalPlans = action.payload.filter(
          plan => !plan.billing_interval
        );
        
        // 将没有计费周期的计划添加到两个数组中
        state.plans.monthly = [...monthlyPlans, ...noIntervalPlans];
        state.plans.yearly = [...yearlyPlans, ...noIntervalPlans];
        state.status = 'succeeded';
      })
      .addCase(fetchPlans.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.error.message
      })
      // Fetch plan by id
      .addCase(fetchPlanById.pending, (state) => {
        state.status = 'loading'
      })
      .addCase(fetchPlanById.fulfilled, (state, action) => {
        state.status = 'succeeded'
        const existingPlan = state.plans.monthly.find(plan => plan.id === action.payload.id) || state.plans.yearly.find(plan => plan.id === action.payload.id)
        if (!existingPlan) {
          if (action.payload.billing_interval === 'MONTHLY') {
            state.plans.monthly.push(action.payload)
          } else {
            state.plans.yearly.push(action.payload)
          }
        }
      })
      .addCase(fetchPlanById.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.error.message
      })
      // Create plan
      .addCase(createPlan.pending, (state) => {
        state.status = 'loading'
      })
      .addCase(createPlan.fulfilled, (state, action) => {
        state.status = 'succeeded'
        if (action.payload.billing_interval === 'MONTHLY') {
          state.plans.monthly.push(action.payload)
        } else {
          state.plans.yearly.push(action.payload)
        }
      })
      .addCase(createPlan.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.error.message
      })
      // Update plan
      .addCase(updatePlan.pending, (state) => {
        state.status = 'loading'
      })
      .addCase(updatePlan.fulfilled, (state, action) => {
        state.status = 'succeeded'
        if (action.payload.billing_interval === 'MONTHLY') {
          const index = state.plans.monthly.findIndex(plan => plan.id === action.payload.id)
          if (index !== -1) {
            state.plans.monthly[index] = action.payload
          }
        } else {
          const index = state.plans.yearly.findIndex(plan => plan.id === action.payload.id)
          if (index !== -1) {
            state.plans.yearly[index] = action.payload
          }
        }
      })
      .addCase(updatePlan.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.error.message
      })
      // Delete plan
      .addCase(deletePlan.pending, (state) => {
        state.status = 'loading'
      })
      .addCase(deletePlan.fulfilled, (state, action) => {
        state.status = 'succeeded'
        if (action.payload.billing_interval === 'MONTHLY') {
          state.plans.monthly = state.plans.monthly.filter(plan => plan.id !== action.payload.id)
        } else {
          state.plans.yearly = state.plans.yearly.filter(plan => plan.id !== action.payload.id)
        }
      })
      .addCase(deletePlan.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.error.message
      })
  }
})

// Actions
export const { setCurrentPlan, clearError, setSelectedInterval } = planSlice.actions

// Selectors
export const selectAllPlans = (state) => state.plans.plans
export const selectPlanById = (state, planId) => 
  state.plans.plans.monthly.find(plan => plan.id === planId) ||
  state.plans.plans.yearly.find(plan => plan.id === planId)
export const selectCurrentPlan = (state) => state.plans.currentPlan
export const selectPlanStatus = (state) => state.plans.status
export const selectPlanError = (state) => state.plans.error

export default planSlice.reducer
