# Project Management System

A comprehensive, full-featured project management application built with Next.js, React, and Supabase.

## Features

- **Project Dashboard**: Visualize and manage project progress, tasks, and timelines.
- **Task Management**: Create, assign, and track tasks with deadlines and priorities.
- **Team Collaboration**: Manage team members, roles, and permissions.
- **Calendar Integration**: Schedule meetings, deadlines, and events.
- **Chat Functionality**: Real-time communication between team members.
- **Gantt Charts**: Visualize project timelines and dependencies.
- **Internationalization**: Multi-language support for global teams.
- **Document Management**: Store and share project-related documents.
- **Activity Tracking**: Monitor project activity and user contributions.
- **Subscription Management**: Different subscription tiers with varying features.
- **Admin Dashboard**: Comprehensive admin controls for managing the platform.

## Tech Stack

- **Frontend**: Next.js, React 19, TailwindCSS
- **Backend**: Next.js API routes, Supabase
- **Database**: PostgreSQL (via Supabase)
- **Authentication**: Supabase Auth
- **State Management**: Redux Toolkit
- **UI Components**: Radix UI, Shadcn/UI
- **Styling**: TailwindCSS
- **Payments**: Stripe
- **File Storage**: Supabase Storage
- **Rich Text Editing**: Tiptap
- **Charts**: Chart.js, React-Chartjs-2
- **Drag and Drop**: @hello-pangea/dnd
- **Internationalization**: next-intl
- **Form Handling**: react-hook-form with Zod validation
- **Date Handling**: date-fns
- **AI Integration**: OpenAI, HuggingFace
- **3D Visualization**: Three.js, React Three Fiber

## Getting Started

### Prerequisites

- Node.js (v18 or later)
- npm or yarn
- Supabase account

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/project-management-system.git
   cd project-management-system
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

3. Set up environment variables:
   Create a `.env.local` file in the root directory with the following variables:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   NEXT_PUBLIC_SITE_URL=your_site_url
   STRIPE_SECRET_KEY=your_stripe_secret_key
   STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
   OPENAI_API_KEY=your_openai_api_key
   HUGGINGFACE_API_KEY=your_huggingface_api_key
   ```

4. Set up the database:
   - Run the SQL scripts in the `db` directory to set up your Supabase database schema
   - Start with `supabasev2.sql`, then run additional migration scripts as needed

5. Run the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## Database Structure

The application uses Supabase (PostgreSQL) with the following main tables:
- Users
- Projects
- Tasks
- Teams
- Comments
- Calendar Events
- Notifications
- Activity Logs
- Subscriptions
- Documents

Database migration scripts are available in the `db/migrations` directory.

## Internationalization

The application supports multiple languages through next-intl. Language files are located in the `messages` directory.

Currently supported languages:
- English (en)
- Chinese (zh)
- Malay (my)

## API Endpoints

The application provides various API endpoints for:
- User authentication and management
- Project and task operations
- Team management
- Calendar events
- Notifications
- Activity tracking
- Subscription handling

API routes are defined in the `app/api` directory.

## Deployment

The application can be deployed to various platforms:

### Vercel
```bash
vercel
```

### Netlify
```bash
netlify deploy
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Next.js Team
- Supabase Team
- Tailwind CSS Team
- All open-source libraries used in this project

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/baifan1366/project-management-system)