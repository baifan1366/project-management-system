import { configureStore } from '@reduxjs/toolkit'
import { loggerMiddleware } from './middleware/loggerMiddleware'
import projectReducer from './features/projectSlice'
import taskReducer from './features/taskSlice'
import teamReducer from './features/teamSlice'
import planReducer from './features/planSlice'
import teamUserReducer from './features/teamUserSlice'
import teamUserInvReducer from './features/teamUserInvSlice'
import teamCFReducer from './features/teamCFSlice'
import teamCFValueReducer from './features/teamCFValueSlice'
import customFieldReducer from './features/customFieldSlice'

export const store = configureStore({
  reducer: {
    projects: projectReducer,
    tasks: taskReducer,
    teams: teamReducer,
    plans: planReducer,
    teamUsers: teamUserReducer,
    teamUserInvitations: teamUserInvReducer,
    teamCF: teamCFReducer,
    teamCustomFieldValues: teamCFValueReducer,
    customFields: customFieldReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(loggerMiddleware)
})
