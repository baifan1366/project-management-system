import { useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useRouter } from 'next/navigation';
import { 
  loginUser, 
  signupUser, 
  logoutUser, 
  sendVerificationEmail,
  requestPasswordReset,
  resetPassword,
  resetAuthState
} from '@/lib/redux/features/usersSlice';

/**
 * Custom hook for authentication
 * @returns {Object} Authentication methods and state
 */
export function useAuth() {
  const dispatch = useDispatch();
  const router = useRouter();
  
  const { 
    currentUser, 
    subscription,
    status, 
    error, 
    verificationSent,
    passwordResetRequested,
    passwordResetSuccess
  } = useSelector((state) => state.users);
  
  // Helper to determine if user is authenticated
  const isAuthenticated = !!currentUser;
  
  // Helper to determine if user's email is verified
  const isEmailVerified = currentUser?.email_verified;
  
  // Token refresh function
  const refreshToken = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        return { success: true };
      } else {
        // If token refresh failed with 401, user needs to login again
        if (response.status === 401) {
          // Clear local user state if token refresh failed
          // This will trigger a redirect to login in the protected routes
          dispatch(logoutUser());
          return { success: false, error: 'Session expired. Please login again.' };
        }
        return { success: false, error: data.error || 'Failed to refresh token' };
      }
    } catch (error) {
      console.error('Token refresh error:', error);
      return { success: false, error: error.message || 'Failed to refresh token' };
    }
  }, [dispatch]);
  
  // Login user
  const login = async (credentials) => {
    try {
      const resultAction = await dispatch(loginUser(credentials));
      
      if (loginUser.fulfilled.match(resultAction)) {
        return { success: true, data: resultAction.payload };
      } else {
        return { success: false, error: resultAction.payload || 'Login failed' };
      }
    } catch (error) {
      return { success: false, error: error.message || 'Login failed' };
    }
  };
  
  // Sign up user
  const signup = async (userData) => {
    try {
      const resultAction = await dispatch(signupUser(userData));
      
      if (signupUser.fulfilled.match(resultAction)) {
        return { success: true, data: resultAction.payload };
      } else {
        return { success: false, error: resultAction.payload || 'Signup failed' };
      }
    } catch (error) {
      return { success: false, error: error.message || 'Signup failed' };
    }
  };
  
  // Logout user
  const logout = async () => {
    try {
      const resultAction = await dispatch(logoutUser());
      
      if (logoutUser.fulfilled.match(resultAction)) {
        router.push('/login');
        return { success: true };
      } else {
        return { success: false, error: resultAction.payload || 'Logout failed' };
      }
    } catch (error) {
      return { success: false, error: error.message || 'Logout failed' };
    }
  };
  
  // Send verification email
  const resendVerification = async (email) => {
    try {
      const resultAction = await dispatch(sendVerificationEmail(email));
      
      if (sendVerificationEmail.fulfilled.match(resultAction)) {
        return { success: true, data: resultAction.payload };
      } else {
        return { success: false, error: resultAction.payload || 'Failed to send verification email' };
      }
    } catch (error) {
      return { success: false, error: error.message || 'Failed to send verification email' };
    }
  };
  
  // Request password reset
  const forgotPassword = async (email) => {
    try {
      const resultAction = await dispatch(requestPasswordReset(email));
      
      if (requestPasswordReset.fulfilled.match(resultAction)) {
        return { success: true, data: resultAction.payload };
      } else {
        return { success: false, error: resultAction.payload || 'Failed to request password reset' };
      }
    } catch (error) {
      return { success: false, error: error.message || 'Failed to request password reset' };
    }
  };
  
  // Reset password
  const resetUserPassword = async (data) => {
    try {
      const resultAction = await dispatch(resetPassword(data));
      
      if (resetPassword.fulfilled.match(resultAction)) {
        return { success: true, data: resultAction.payload };
      } else {
        return { success: false, error: resultAction.payload || 'Failed to reset password' };
      }
    } catch (error) {
      return { success: false, error: error.message || 'Failed to reset password' };
    }
  };
  
  // Reset authentication state (clear errors, etc.)
  const reset = () => {
    dispatch(resetAuthState());
  };
  
  // Auto-logout on window close/refresh
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (isAuthenticated) {
        // Update online status
        fetch('/api/users/online-status', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            userId: currentUser.id,
            status: false 
          }),
          // Use keepalive to ensure the request completes even when page is unloading
          keepalive: true
        }).catch(err => console.error('Failed to update offline status:', err));
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isAuthenticated, currentUser]);
  
  // Auto token refresh - every 6 days (token valid for 7 days)
  useEffect(() => {
    if (!isAuthenticated) return;
    
    // Refresh token after 6 days to prevent expiration at 7 days
    const REFRESH_INTERVAL = 6 * 24 * 60 * 60 * 1000; // 6 days in milliseconds
    
    const tokenRefreshTimer = setTimeout(() => {
      refreshToken().catch(err => {
        console.error('Failed to refresh token:', err);
      });
    }, REFRESH_INTERVAL);
    
    return () => {
      clearTimeout(tokenRefreshTimer);
    };
  }, [isAuthenticated, refreshToken]);
  
  return {
    user: currentUser,
    subscription,
    isAuthenticated,
    isEmailVerified,
    status,
    error,
    verificationSent,
    passwordResetRequested,
    passwordResetSuccess,
    login,
    signup,
    logout,
    resendVerification,
    forgotPassword,
    resetPassword: resetUserPassword,
    reset,
    refreshToken, // Expose refreshToken for manual refresh if needed
  };
} 