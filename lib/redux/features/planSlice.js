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
  async (_, { rejectWithValue }) => {
    try {
      // 获取当前用户会话
      const { user:session , error:sessionError } = useGetUser();
      if (sessionError) throw sessionError;
      
      // 如果没有会话或用户，返回默认值
      if (!session) {
        return { isLoggedIn: false, plan: null };
      }
      
      // 查询用户的订阅计划，包含关联的 subscription_plan 数据
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
        .eq('user_id', session.id)
        .single();
      
      if (error) {
        console.log('Error fetching user subscription:', error);
        return { isLoggedIn: true, plan: null };
      }
      
      console.log(data)
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
        // Separate plans by billing interval while maintaining order
        state.plans.monthly = action.payload.filter(
          plan => plan.billing_interval === 'MONTHLY'
        )
        state.plans.yearly = action.payload.filter(
          plan => plan.billing_interval === 'YEARLY'
        )
        state.status = 'succeeded'
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
