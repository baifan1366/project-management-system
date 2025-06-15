'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from 'sonner';
import Image from 'next/image';

/**
 * TOTPSetup component for setting up TOTP-based 2FA
 */
export default function TOTPSetup({ userId, onSetupComplete, onCancel, locale }) {
  const [loading, setLoading] = useState(false);
  const [setupStep, setSetupStep] = useState('start'); // start, qrCode, verify
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  
  // Generate QR code and secret
  const generateSetup = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(`/api/users/${userId}/enable-2fa-totp`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate 2FA setup');
      }
      
      setQrCode(data.qrCode);
      setSecret(data.secret);
      setSetupStep('qrCode');
    } catch (error) {
      console.error('Error generating 2FA setup:', error);
      toast.error('Failed to generate 2FA setup');
      setError(error.message || 'Failed to generate 2FA setup');
    } finally {
      setLoading(false);
    }
  };
  
  // Verify the token and enable 2FA
  const verifyAndEnable = async () => {
    if (!token || token.length !== 6 || !/^\d+$/.test(token)) {
      setError('Please enter a valid 6-digit code');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(`/api/users/${userId}/enable-2fa-totp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to verify code');
      }
      
      toast.success('Two-factor authentication has been enabled successfully!');
      
      // Reset state and notify parent component
      setToken('');
      setQrCode('');
      setSecret('');
      setSetupStep('start');
      
      if (onSetupComplete) {
        onSetupComplete();
      }
    } catch (error) {
      console.error('Error verifying 2FA code:', error);
      setError(error.message || 'Failed to verify code');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Set Up Two-Factor Authentication</CardTitle>
        <CardDescription>
          Protect your account with an authenticator app
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {setupStep === 'start' && (
          <div className="space-y-4">
            <p>
              Two-factor authentication adds an extra layer of security to your account. 
              In addition to your password, you'll need a code from an authenticator app like 
              Google Authenticator, Microsoft Authenticator, or Authy.
            </p>
            <Button onClick={generateSetup} disabled={loading}>
              {loading ? 'Setting up...' : 'Set Up Two-Factor Authentication'}
            </Button>
          </div>
        )}
        
        {setupStep === 'qrCode' && (
          <div className="space-y-6">
            <div className="space-y-2">
              <p className="text-sm">
                1. Scan this QR code with your authenticator app:
              </p>
              <div className="flex justify-center p-4 bg-white">
                {qrCode && (
                  <Image 
                    src={qrCode} 
                    alt="QR Code for 2FA" 
                    width={200} 
                    height={200} 
                    priority
                  />
                )}
              </div>
            </div>
            
            <div className="space-y-2">
              <p className="text-sm">
                2. Or manually enter this secret key into your app:
              </p>
              <p className="font-mono bg-gray-100 dark:bg-gray-800 p-2 rounded text-center">
                {secret}
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="token">
                3. Enter the 6-digit code from your authenticator app:
              </Label>
              <Input
                id="token"
                value={token}
                onChange={(e) => setToken(e.target.value.trim())}
                placeholder="6-digit code"
                maxLength={6}
                className="text-center text-lg tracking-widest"
              />
              {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
            </div>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="flex justify-between">
        {setupStep === 'qrCode' ? (
          <>
            <Button variant="ghost" onClick={() => {
              setSetupStep('start');
              setToken('');
              setError('');
            }} disabled={loading}>
              Back
            </Button>
            <Button onClick={verifyAndEnable} disabled={loading || token.length !== 6}>
              {loading ? 'Verifying...' : 'Verify and Enable'}
            </Button>
          </>
        ) : (
          <Button variant="ghost" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
        )}
      </CardFooter>
    </Card>
  );
} 