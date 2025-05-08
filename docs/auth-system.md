# Custom Authentication System

This document outlines the custom authentication system implemented in the Project Management System. The system moves away from direct Supabase Auth usage to a more controlled JWT-based authentication flow while still leveraging Supabase as the database provider.

## Features

- Custom JWT-based authentication
- Email/password authentication with validation
- OAuth authentication (Google, GitHub)
- Email verification
- Password reset functionality
- Session management via secure HTTP-only cookies
- React hooks for easy integration with frontend components
- Redux state management for auth state

## Components

### Backend API Routes

1. **`/api/auth`** - Main authentication endpoint
   - `POST` - Handles login, signup, and logout actions

2. **`/api/auth/verify`** - Email verification
   - `GET` - Verifies email with token
   - `POST` - Resends verification email

3. **`/api/auth/reset-password`** - Password reset
   - `POST` - Requests password reset
   - `PUT` - Resets password with token

4. **`/api/auth/me`** - User information
   - `GET` - Returns current user data

5. **`/api/auth/google`** & **`/api/auth/github`** - OAuth endpoints
   - `GET` - Initiates OAuth flow

6. **`/api/auth/callback`** - OAuth callback handler
   - `GET` - Processes OAuth provider callbacks

### Frontend Components

1. **Redux Store**  
   - `usersSlice.js` - Manages authentication state

2. **React Hooks**
   - `useAuth.js` - Custom hook for authentication actions

3. **Middleware**
   - `middleware.js` - Protects routes and handles authentication

## Authentication Flow

### Email/Password Login

1. User submits credentials via login form
2. Server validates credentials against database
3. If valid, server generates a JWT token with user information
4. Token is stored in an HTTP-only cookie
5. User information and subscription data are returned to the client

### Signup Process

1. User submits registration information
2. Server validates inputs and checks for existing email
3. New user is created in Supabase Auth and in our database
4. Verification token is generated and stored
5. User receives email verification link

### OAuth Login

1. User clicks OAuth provider button (Google/GitHub)
2. User is redirected to provider's authentication page
3. After successful authentication, provider redirects to callback URL
4. Server processes OAuth data, creates/updates user record
5. JWT token is issued and stored in cookie
6. User is redirected to the application

## Security Measures

- Passwords are hashed using bcrypt
- JWT secrets stored in environment variables
- HTTP-only cookies prevent client-side access to tokens
- CSRF protection via sameSite cookie attribute
- Input validation for all user-provided data

## Database Schema

The user table has been extended with:

```sql
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "reset_password_token" VARCHAR(255);
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "reset_password_expires" TIMESTAMP;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "password_hash" VARCHAR(255);
```

## Dependencies

- `jsonwebtoken` - For JWT token generation and verification
- `bcryptjs` - For password hashing
- `cookies` (Next.js) - For cookie management

## Usage Examples

### Login User

```javascript
const { login } = useAuth();
const result = await login({ email, password });
if (result.success) {
  // User logged in successfully
}
```

### Register User

```javascript
const { signup } = useAuth();
const result = await signup({ name, email, password, confirmPassword });
if (result.success) {
  // User registered successfully
}
```

### Get Current User

```javascript
const { user, isAuthenticated } = useAuth();
if (isAuthenticated) {
  // Access user data
}
``` 