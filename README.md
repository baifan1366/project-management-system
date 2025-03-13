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

### Supabase CLI Installation and Setup

1. Install Scoop (Windows Package Manager):
```powershell
# Run in PowerShell
Set-ExecutionPolicy RemoveRestricted -Scope CurrentUser -Force
irm get.scoop.sh | iex
```

2. Install Docker Desktop:
- Visit [Docker Desktop](https://www.docker.com/products/docker-desktop/) to download and install
- Launch Docker Desktop after installation

3. Install Supabase CLI via Scoop:
```bash
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

4. Set up Supabase Access Token:
- Visit [Supabase Dashboard](https://app.supabase.com)
- Click profile picture in top right -> Account
- Generate new token in Access Tokens section
- Set environment variable:
```bash
supabase login
# Enter your access token
```

5. Initialize Supabase project:
```bash
# Run in project root directory
supabase init
```

6. Start local development environment:
```bash
supabase start
```

7. Link to remote project:
```bash
supabase link --project-ref your-project-ref
# project-ref can be found in Supabase project settings
```

8. Database migrations:
```bash
# Create new migration
supabase migration new your_migration_name

# Apply migrations
supabase db push

# Reset database
supabase db reset
```

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

## Internationalization (i18n)

This project uses `next-intl` for internationalization. Currently supported languages:
- English (en)
- Chinese (zh)

### Usage in Components

```javascript
import { useTranslations } from 'next-intl';

export default function MyComponent() {
  const t = useTranslations();
  
  return (
    <div>
      <h1>{t('projects.title')}</h1>
      <button>{t('common.save')}</button>
    </div>
  );
}
```

### Adding New Languages

1. Create a new JSON file in the `messages` directory (e.g., `messages/ja.json`)
2. Add the locale to the supported locales list in `middleware.js`
3. Add the locale to `generateStaticParams` in `app/[locale]/layout.js`

### Language Switching

The `LanguageSwitcher` component is available to switch between languages:

```javascript
import LanguageSwitcher from '@/components/LanguageSwitcher';

// Use in your layout or component
<LanguageSwitcher />
```

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
```

## Drag and Drop

This project implements drag and drop functionality using [@hello-pangea/dnd](https://github.com/hello-pangea/dnd) (based on react-beautiful-dnd).

1. Install dependency:
```bash
npm install @hello-pangea/dnd
```

2. Usage in components:
```javascript
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

function TaskList() {
  const onDragEnd = (result) => {
    // Handle logic after drag ends
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <Droppable droppableId="tasks">
        {(provided) => (
          <div {...provided.droppableProps} ref={provided.innerRef}>
            {/* Draggable items */}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}
```

## Gantt Chart

This project uses [Gantt Chart](https://github.com/frappe/gantt) for project timeline visualization.

1. Install dependency:
```bash
npm install frappe-gantt
```

2. Basic usage example:
```javascript
import { Gantt } from 'frappe-gantt';

function ProjectTimeline() {
  useEffect(() => {
    const tasks = [
      {
        id: '1',
        name: 'Task 1',
        start: '2024-03-01',
        end: '2024-03-05',
        progress: 20
      }
    ];

    const gantt = new Gantt('#gantt', tasks, {
      view_mode: 'Week',
      on_click: (task) => {
        console.log(task);
      }
    });
  }, []);

  return <div id="gantt"></div>;
}