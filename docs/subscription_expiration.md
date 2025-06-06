# Subscription Expiration Handler

This document explains how to fix the "Failed to process expiration" error that occurs when testing subscription expiration functionality.

## Error Description

When running `window.testSubscriptionExpiration("expire", 0)` in the browser console, you might encounter this error:

```
Subscription test result: {
  error: 'Failed to process expiration', 
  details: {
    message: 'Error: HTTP error! status: 404', 
    details: 'Error: HTTP error! status: 404', 
    hint: '', 
    code: ''
  }
}
```

This error occurs because the stored procedure `handle_subscription_expiration` hasn't been deployed to your Supabase database.

## Solution Options

There are several ways to fix this issue:

### Option 1: Use the Fallback Implementation

The application includes a fallback implementation that automatically handles expiration even without the stored procedure. The system will automatically use the fallback implementation when the stored procedure isn't available.

To test it, simply run `window.testSubscriptionExpiration("expire", 0)` again in the browser console. It should now work correctly without errors.

### Option 2: Deploy the Stored Procedure (Recommended)

For better performance and data consistency, it's recommended to deploy the stored procedure:

1. **Using the Supabase Dashboard:**
   - Log in to your Supabase dashboard
   - Go to the SQL Editor
   - Open and run the file `scripts/apply-function.sql`

2. **Using the Deployment Script:**
   - Install dependencies: `npm install @supabase/supabase-js dotenv`
   - Run: `npm run db:deploy-expiration`

3. **Using Supabase CLI:**
   - If you have Supabase CLI installed, run:
   - `supabase db execute --file scripts/apply-function.sql`

## Verifying the Fix

After applying one of the solutions above, you can verify that it works by:

1. Opening your browser console in the application
2. Running: `window.testSubscriptionExpiration("expire", 0)`
3. You should see a success message without errors
4. Check your subscription status in the application to confirm it's been updated to "EXPIRED"
5. Verify that the free plan has been activated

## Troubleshooting

If you're still experiencing issues:

1. Check the browser console and server logs for specific error messages
2. Verify that your Supabase database is properly connected
3. Ensure you have the correct permissions to create functions in the database
4. Try using the `resetToActive` test function and then trying the expiration test again:
   ```js
   window.testSubscriptionExpiration("resetToActive").then(() => 
     window.testSubscriptionExpiration("expire", 0)
   )
   ```

## Manual Database Updates

If all else fails, you can manually update the database:

```sql
-- Set an active subscription to expired
UPDATE user_subscription_plan 
SET status = 'EXPIRED', updated_at = NOW() 
WHERE user_id = 'YOUR_USER_ID' AND status = 'ACTIVE';

-- Activate the free plan
UPDATE user_subscription_plan 
SET status = 'ACTIVE', start_date = NOW(), end_date = NULL, updated_at = NOW() 
WHERE user_id = 'YOUR_USER_ID' AND plan_id = 1;
``` 