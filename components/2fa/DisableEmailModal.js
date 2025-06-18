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
 * Modal component for disabling email-based 2FA
 */
export default function DisableEmailModal({ userId, onClose, onDisabled }) {
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [error, setError] = useState('');
  const [isCodeSent, setIsCodeSent] = useState(false);
  
  const handleSendVerificationCode = async () => {
    if (!password) {
      setError('Password is required to proceed');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      // Request a verification code to be sent to user's email
      const response = await fetch(`/api/users/${userId}/email-2fa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send_disable_code', password })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to send verification code');
      }
      
      toast.success('Verification code sent to your email');
      setIsCodeSent(true);
    } catch (error) {
      console.error('Error sending verification code:', error);
      setError(error.message || 'Failed to send verification code');
    } finally {
      setLoading(false);
    }
  };
  
  const handleDisable = async () => {
    if (!password) {
      setError('Password is required to disable email authentication');
      return;
    }
    
    if (!verificationCode) {
      setError('Verification code is required to disable email authentication');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(`/api/users/${userId}/enable-2fa-email`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password,
          verificationCode
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to disable email authentication');
      }
      
      toast.success('Email authentication has been disabled');
      
      if (onDisabled) {
        onDisabled();
      }
    } catch (error) {
      console.error('Error disabling email 2FA:', error);
      setError(error.message || 'Failed to disable email authentication');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Disable Email Authentication</DialogTitle>
          <DialogDescription>
            This will disable email verification codes when logging in.
            You will only need your password to access your account.
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
              disabled={isCodeSent && loading}
            />
          </div>
          
          {isCodeSent ? (
            <div className="space-y-2">
              <Label htmlFor="verificationCode">Email Verification Code</Label>
              <Input
                id="verificationCode"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.trim())}
                placeholder="Enter verification code from email"
                maxLength={6}
                className="text-center text-lg tracking-widest"
              />
              <p className="text-sm text-muted-foreground">
                Enter the 6-digit verification code sent to your email.
              </p>
            </div>
          ) : null}
          
          {error && (
            <div className="text-sm text-red-500 font-medium">{error}</div>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          {!isCodeSent ? (
            <Button variant="primary" onClick={handleSendVerificationCode} disabled={loading || !password}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending code...
                </>
              ) : (
                'Send Verification Code'
              )}
            </Button>
          ) : (
            <Button variant="destructive" onClick={handleDisable} disabled={loading || !password || !verificationCode}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Disabling...
                </>
              ) : (
                'Disable Email Authentication'
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 