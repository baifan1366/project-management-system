import { configureStore } from '@reduxjs/toolkit'
import { loggerMiddleware } from './middleware/loggerMiddleware'
import projectReducer from './features/projectSlice'
import taskReducer from './features/taskSlice'
import planReducer from './features/planSlice'

export const store = configureStore({
  reducer: {
    projects: projectReducer,
    tasks: taskReducer,
    plans: planReducer
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(loggerMiddleware)
})
