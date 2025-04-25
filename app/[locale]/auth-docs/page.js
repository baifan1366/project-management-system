'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function AuthDocumentation() {
  const t = useTranslations('auth');

  const authFlows = [
    {
      id: 'login',
      title: 'Login Flow',
      description: 'Standard email/password authentication with secure JWT token handling',
      steps: [
        'User submits email and password via login form',
        'Credentials are validated against the database',
        'If valid, server generates a JWT token with user information',
        'Token is stored in an HTTP-only cookie',
        'User information and subscription data are returned to client'
      ]
    },
    {
      id: 'signup',
      title: 'Signup Flow',
      description: 'New user registration with email verification',
      steps: [
        'User submits registration information',
        'Server validates inputs and checks for existing email',
        'New user is created in database',
        'Verification email is sent to user',
        'User must verify email before full access is granted'
      ]
    },
    {
      id: 'forgot-password',
      title: 'Password Reset Flow',
      description: 'Secure password recovery process',
      steps: [
        'User requests password reset via email',
        'Server generates a secure reset token',
        'Reset link is sent to user email',
        'User clicks link and sets new password',
        'Password is updated and user can log in with new credentials'
      ]
    },
    {
      id: 'oauth',
      title: 'OAuth Authentication',
      description: 'Third-party authentication via providers like Google and GitHub',
      steps: [
        'User clicks OAuth provider button',
        'User is redirected to provider authentication page',
        'After successful authentication, provider redirects to callback URL',
        'Server processes OAuth data and creates/updates user record',
        'JWT token is issued and stored in cookie'
      ]
    }
  ];

  const securityMeasures = [
    'Passwords are hashed using bcrypt',
    'JWT secrets stored in environment variables',
    'HTTP-only cookies prevent client-side access to tokens',
    'CSRF protection via sameSite cookie attribute',
    'Email verification required for sensitive operations',
    'Password strength requirements enforced',
    'Rate limiting on authentication attempts',
    'Token expiration and refresh mechanisms'
  ];

  return (
    <div className="container mx-auto py-10 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold tracking-tight mb-2">Authentication Documentation</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Complete guide to the authentication system implemented in the Project Management System
          </p>
        </div>

        <ScrollArea className="h-[calc(100vh-12rem)]">
          <div className="space-y-12">
            {/* Authentication Overview Section */}
            <section>
              <h2 className="text-2xl font-bold mb-4 border-b pb-2">Authentication Overview</h2>
              <p className="mb-4">
                Our authentication system uses JWT-based authentication while leveraging Supabase as the 
                database provider. This approach gives us complete control over the authentication flow
                while maintaining security and scalability.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <div className="bg-muted/40 rounded-lg p-6">
                  <h3 className="font-semibold mb-2">Key Features</h3>
                  <ul className="space-y-1 list-disc list-inside text-sm">
                    <li>Custom JWT-based authentication</li>
                    <li>Email/password authentication with validation</li>
                    <li>OAuth authentication (Google, GitHub)</li>
                    <li>Email verification</li>
                    <li>Password reset functionality</li>
                    <li>Session management via secure HTTP-only cookies</li>
                  </ul>
                </div>
                
                <div className="bg-muted/40 rounded-lg p-6">
                  <h3 className="font-semibold mb-2">Implementation Components</h3>
                  <ul className="space-y-1 list-disc list-inside text-sm">
                    <li>Backend API routes for authentication</li>
                    <li>Redux state management for auth state</li>
                    <li>React hooks for easy frontend integration</li>
                    <li>Middleware for route protection</li>
                    <li>Email service for verification and reset</li>
                    <li>Database schema for user data</li>
                  </ul>
                </div>
              </div>
            </section>
            
            {/* Authentication Flows Section */}
            <section id="flows">
              <h2 className="text-2xl font-bold mb-4 border-b pb-2">Authentication Flows</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {authFlows.map((flow) => (
                  <Card key={flow.id} id={flow.id} className="overflow-hidden">
                    <CardHeader className="bg-muted/50 pb-3">
                      <CardTitle>{flow.title}</CardTitle>
                      <CardDescription>{flow.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <ol className="space-y-2 list-decimal list-inside text-sm">
                        {flow.steps.map((step, index) => (
                          <li key={index}>{step}</li>
                        ))}
                      </ol>
                    </CardContent>
                    <CardFooter className="bg-muted/20 border-t px-6 py-3">
                      <Link 
                        href={`/${flow.id === 'login' ? 'login' : 
                               flow.id === 'signup' ? 'signup' : 
                               flow.id === 'forgot-password' ? 'forgot-password' : '#'}`}
                        className="text-sm text-primary hover:underline"
                      >
                        View {flow.title} Page
                      </Link>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </section>
            
            {/* Security Measures Section */}
            <section id="security">
              <h2 className="text-2xl font-bold mb-4 border-b pb-2">Security Measures</h2>
              <p className="mb-4">
                Our authentication system implements several security best practices to protect user data and prevent unauthorized access.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Security Implementations</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 list-disc list-inside text-sm">
                      {securityMeasures.map((measure, index) => (
                        <li key={index}>{measure}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Database Schema</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm mb-4">The user table has been extended with:</p>
                    <pre className="bg-muted/50 p-3 rounded text-xs overflow-x-auto">
                      {`ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "reset_password_token" VARCHAR(255);
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "reset_password_expires" TIMESTAMP;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "password_hash" VARCHAR(255);`}
                    </pre>
                  </CardContent>
                </Card>
              </div>
            </section>
            
            {/* Usage Examples Section */}
            <section id="examples">
              <h2 className="text-2xl font-bold mb-4 border-b pb-2">Usage Examples</h2>
              
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Login User</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="bg-muted/50 p-3 rounded text-xs overflow-x-auto">
                      {`const { login } = useAuth();
const result = await login({ email, password });
if (result.success) {
  // User logged in successfully
}`}
                    </pre>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Register User</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="bg-muted/50 p-3 rounded text-xs overflow-x-auto">
                      {`const { signup } = useAuth();
const result = await signup({ name, email, password, confirmPassword });
if (result.success) {
  // User registered successfully
}`}
                    </pre>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Get Current User</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="bg-muted/50 p-3 rounded text-xs overflow-x-auto">
                      {`const { user, isAuthenticated } = useAuth();
if (isAuthenticated) {
  // Access user data
}`}
                    </pre>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Reset Password</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="bg-muted/50 p-3 rounded text-xs overflow-x-auto">
                      {`const { forgotPassword } = useAuth();
const result = await forgotPassword({ email });
if (result.success) {
  // Password reset email sent
}

// Later, when user clicks reset link:
const { resetPassword } = useAuth();
const result = await resetPassword({ token, password, confirmPassword });
if (result.success) {
  // Password reset successful
}`}
                    </pre>
                  </CardContent>
                </Card>
              </div>
            </section>
          </div>
        </ScrollArea>
        
        <div className="mt-10 flex justify-center">
          <Link href="/login">
            <Button>Go to Login Page</Button>
          </Link>
        </div>
      </div>
    </div>
  );
} 