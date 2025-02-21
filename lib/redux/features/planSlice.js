import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { api } from '@/lib/api'

// Async thunks
export const fetchPlans = createAsyncThunk(
  'plans/fetchPlans',
  async () => {
    const res = await api.plans.list()
    return res
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

const planSlice = createSlice({
  name: 'plans',
  initialState: {
    plans: [],
    status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
    error: null,
    currentPlan: null
  },
  reducers: {
    setCurrentPlan(state, action) {
      state.currentPlan = action.payload
    },
    clearError(state) {
      state.error = null
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch plans
      .addCase(fetchPlans.pending, (state) => {
        state.status = 'loading'
      })
      .addCase(fetchPlans.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.plans = action.payload
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
        const existingPlan = state.plans.find(plan => plan.id === action.payload.id)
        if (!existingPlan) {
          state.plans.push(action.payload)
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
        state.plans.push(action.payload)
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
        const index = state.plans.findIndex(plan => plan.id === action.payload.id)
        if (index !== -1) {
          state.plans[index] = action.payload
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
        state.plans = state.plans.filter(plan => plan.id !== action.payload)
      })
      .addCase(deletePlan.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.error.message
      })
  }
})

// Actions
export const { setCurrentPlan, clearError } = planSlice.actions

// Selectors
export const selectAllPlans = (state) => state.plans.plans
export const selectPlanById = (state, planId) => 
  state.plans.plans.find(plan => plan.id === planId)
export const selectCurrentPlan = (state) => state.plans.currentPlan
export const selectPlanStatus = (state) => state.plans.status
export const selectPlanError = (state) => state.plans.error

export default planSlice.reducer
