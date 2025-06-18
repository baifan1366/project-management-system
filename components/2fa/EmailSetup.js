'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

/**
 * EmailSetup component for setting up email-based 2FA
 */
export default function EmailSetup({ userId, onSetupComplete, onCancel, locale, userEmail }) {
  const [loading, setLoading] = useState(false);
  
  const enableEmailTwoFactor = async () => {
    setLoading(true);
    
    try {
      const response = await fetch(`/api/users/${userId}/enable-2fa-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to enable email 2FA');
      }
      
      toast.success('Email two-factor authentication has been enabled successfully!');
      
      if (onSetupComplete) {
        onSetupComplete();
      }
    } catch (error) {
      console.error('Error enabling email 2FA:', error);
      toast.error(error.message || 'Failed to enable email 2FA');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Email Authentication</CardTitle>
        <CardDescription>
          Protect your account with email verification codes
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="mb-4">
            With email-based two-factor authentication, we'll send a verification code to your email 
            ({userEmail || 'your registered email'}) each time you log in.
          </p>
          <p>
            This adds an extra layer of security to your account, as even if someone has your password, 
            they won't be able to access your account without access to your email.
          </p>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="ghost" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button onClick={enableEmailTwoFactor} disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Enabling...
            </>
          ) : (
            'Enable Email Authentication'
          )}
        </Button>
      </CardFooter>
    </Card>
  );
} 