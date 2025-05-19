# User Status System

This document explains how the user online status system works and how to set it up.

## Overview

The system uses a heartbeat mechanism to track user online status, which is more reliable than just using the `beforeunload` event which doesn't fire when browsers are forcibly closed.

## Components

1. **User Heartbeats Table**: Stores the last heartbeat time for each user
2. **Database Triggers**: Automatically update user status when heartbeats are received
3. **Client-side Heartbeat**: Sends regular heartbeats while the user is active
4. **Inactive User Check**: A scheduled job that marks users as offline if they haven't sent a heartbeat recently

## Setup Instructions

### 1. Database Setup

Apply the migration in `db/migrations/create_user_heartbeats_table.sql` to create:
- The `user_heartbeats` table
- The trigger function to update user status
- The function to check for inactive users

### 2. Client-side Implementation

The `UserStatusContext` component handles sending regular heartbeats to the server while the user is active.

### 3. Scheduled Job Setup

To detect users who have gone offline without properly closing their browser (e.g., browser crash, network issues), you need to set up a scheduled job:

If your Supabase instance has the pg_cron extension enabled, you can set up the cron job directly in the database:

```sql
-- Check if pg_cron extension is available and create the job
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule('* * * * *', 'SELECT check_inactive_users()');
  END IF;
END $$;
```

## How It Works

1. When a user logs in or navigates to the site, the client starts sending heartbeats every 30 seconds
2. Each heartbeat updates the `user_heartbeats` table
3. A database trigger automatically updates the user's online status in the `user` table
4. The scheduled job checks for users who haven't sent a heartbeat in the last 2 minutes and marks them as offline
5. The system continues to work even if users close their browser without triggering the `beforeunload` event

## Configuration

You can adjust these parameters based on your needs:

- Heartbeat frequency: Currently set to 30 seconds in `UserStatusContext.js`
- Inactive threshold: Currently set to 2 minutes in the `check_inactive_users()` function 