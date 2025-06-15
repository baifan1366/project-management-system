'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

/**
 * Modal component for disabling TOTP-based 2FA
 */
export default function DisableTOTPModal({ userId, onClose, onDisabled }) {
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState('');
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  
  const handleDisable = async () => {
    if (!password) {
      setError('Password is required to disable 2FA');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(`/api/users/${userId}/disable-2fa-totp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password,
          token: token || undefined // Only send if provided
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to disable 2FA');
      }
      
      toast.success('Two-factor authentication has been disabled');
      
      if (onDisabled) {
        onDisabled();
      }
    } catch (error) {
      console.error('Error disabling 2FA:', error);
      setError(error.message || 'Failed to disable 2FA');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Disable Two-Factor Authentication</DialogTitle>
          <DialogDescription>
            This will disable the authenticator app verification for your account.
            You will no longer need to enter a verification code when logging in.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="password">Enter your password to confirm</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="token">Verification code (optional)</Label>
            <Input
              id="token"
              value={token}
              onChange={(e) => setToken(e.target.value.trim())}
              placeholder="6-digit code from your app"
              maxLength={6}
              className="text-center text-lg tracking-widest"
            />
            <p className="text-sm text-muted-foreground">
              This is optional, but it provides an extra layer of security.
            </p>
          </div>
          
          {error && (
            <div className="text-sm text-red-500 font-medium">{error}</div>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDisable} disabled={loading || !password}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Disabling...
              </>
            ) : (
              'Disable 2FA'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 