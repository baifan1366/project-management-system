import { configureStore } from '@reduxjs/toolkit'
import { loggerMiddleware } from './middleware/loggerMiddleware'
import projectReducer from './features/projectSlice'
import taskReducer from './features/taskSlice'

export const store = configureStore({
  reducer: {
    projects: projectReducer,
    tasks: taskReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(loggerMiddleware)
})
