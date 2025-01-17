import { configureStore } from '@reduxjs/toolkit'
import projectReducer from './features/projectSlice'
import taskReducer from './features/taskSlice'

export const store = configureStore({
  reducer: {
    projects: projectReducer,
    tasks: taskReducer,
  },
})
