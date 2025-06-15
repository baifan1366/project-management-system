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
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

/**
 * Modal component for disabling email-based 2FA
 */
export default function DisableEmailModal({ userId, onClose, onDisabled }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const handleDisable = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(`/api/users/${userId}/enable-2fa-email`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to disable email 2FA');
      }
      
      toast.success('Email verification has been disabled');
      
      if (onDisabled) {
        onDisabled();
      }
    } catch (error) {
      console.error('Error disabling email 2FA:', error);
      setError(error.message || 'Failed to disable email 2FA');
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
        
        <div className="py-4">
          <p>
            Are you sure you want to disable email authentication? 
            This will make your account less secure.
          </p>
          
          {error && (
            <div className="mt-4 text-sm text-red-500 font-medium">{error}</div>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDisable} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Disabling...
              </>
            ) : (
              'Disable Email Authentication'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 