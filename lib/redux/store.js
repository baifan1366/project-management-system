import { configureStore } from '@reduxjs/toolkit'
import { loggerMiddleware } from './middleware/loggerMiddleware'
import projectReducer from './features/projectSlice'
import taskReducer from './features/taskSlice'
import teamReducer from './features/teamSlice'
import planReducer from './features/planSlice'

export const store = configureStore({
  reducer: {
    projects: projectReducer,
    tasks: taskReducer,
    teams: teamReducer,
    plans: planReducer
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(loggerMiddleware)
})
