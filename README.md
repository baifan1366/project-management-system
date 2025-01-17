This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## UI Components with shadcn/ui

This project uses [shadcn/ui](https://ui.shadcn.com/) for beautifully designed components. To add new components, use the following command:

```bash
npx shadcn@latest add <component-name>
```

For example, to add a button component:
```bash
npx shadcn@latest add button
```

Available components can be found in the [shadcn/ui components](https://ui.shadcn.com/docs/components) documentation.

## Live Demo

The project is deployed and accessible at: [https://team-sync-system.vercel.app/](https://team-sync-system.vercel.app/)

## Environment Setup

To run this project locally, you need to set up the following environment variables in a `.env` file:

```env
# Database Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
```

> Note: Never commit the actual `.env` file to version control. The above is just a template of required variables.

## Supabase Setup

This project uses Supabase as the backend database and authentication service. To set up Supabase:

1. Install Supabase client:
```bash
npm install @supabase/supabase-js
```

2. Import and use Supabase client in your components:
```javascript
import { supabase } from '@/lib/supabase'

// Example query
const { data, error } = await supabase
  .from('your_table')
  .select('*')
```

3. Available Database Tables:
   - `users` - User profiles and authentication
   - `projects` - Project information
   - `tasks` - Task management
   - `comments` - User comments and feedback

For more information about using Supabase, check out the [Supabase documentation](https://supabase.com/docs).

## Redux Setup

This project uses Redux Toolkit for state management. To set up Redux:

1. Install Redux Toolkit and React-Redux:
```bash
npm install @reduxjs/toolkit react-redux
```

2. Create a slice (example):
```javascript
import { createSlice } from '@reduxjs/toolkit'

export const projectSlice = createSlice({
  name: 'projects',
  initialState: {
    projects: [],
    loading: false,
  },
  reducers: {
    setProjects: (state, action) => {
      state.projects = action.payload
    },
    setLoading: (state, action) => {
      state.loading = action.payload
    },
  },
})
```

3. Use Redux in components:
```javascript
import { useSelector, useDispatch } from 'react-redux'
import { setProjects } from './projectSlice'

// In your component
const projects = useSelector((state) => state.projects.projects)
const dispatch = useDispatch()

// Update state
dispatch(setProjects(newProjects))
```

For more information about Redux Toolkit, visit the [official documentation](https://redux-toolkit.js.org/).

## API Routes

The project includes the following API endpoints:

### Projects

```bash
GET /api/projects
# Returns list of all projects

POST /api/projects
# Create a new project
# Body: { title: string, description: string }
```

### Tasks

```bash
GET /api/tasks
# Returns all tasks
# Optional query param: ?projectId=123

POST /api/tasks
# Create a new task
# Body: { title: string, description: string, project_id: number, status: string }
```

Example usage with the API helper:

```javascript
import { api } from '@/lib/api'

// Fetch projects
const projects = await api.projects.list()

// Create a new task
const newTask = await api.tasks.create({
  title: 'New Task',
  description: 'Task description',
  project_id: 1,
  status: 'pending'
})