'use client';

import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import Cookies from 'js-cookie';
import { fetchCurrentUser } from '../redux/features/usersSlice';

// Create a shared loading flag outside the hook to track global loading state
// This prevents multiple simultaneous API calls when the hook is used in multiple components
let isUserFetchInProgress = false;

// Global cache to store user data and reduce API calls
const USER_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
let lastFetchTime = 0;
let cachedUserData = null;

/**
 * Custom hook to handle authentication state
 * Checks Redux state first, then cache, then makes API call if needed
 */
export function useGetUser() {
  const dispatch = useDispatch();
  const { currentUser, status, error } = useSelector((state) => state.users);
  const [localLoading, setLocalLoading] = useState(false);
  
  useEffect(() => {
    // If we already have a user in Redux, no need to fetch
    if (currentUser) return;
    
    // If we're already loading in Redux, no need to fetch
    if (status === 'loading') return;
    
    // If another component is already fetching, don't start a new fetch
    if (isUserFetchInProgress) return;
    
    // Check if we have cached data that's still valid
    const now = Date.now();
    if (cachedUserData && (now - lastFetchTime < USER_CACHE_DURATION)) {
      return;
    }
    
    const fetchUserData = async () => {
      // Check for authentication token in cookies
      const token = Cookies.get('auth_token');
      
      // If no token exists, user is not logged in
      if (!token) {
        // Reset the loading state and return immediately
        isUserFetchInProgress = false;
        return;
      }
      
      try {
        // Mark that fetch is in progress to prevent other hook instances from also fetching
        isUserFetchInProgress = true;
        setLocalLoading(true);
        
        // Set timeout to prevent infinite loading
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Request timeout')), 10000); // Reduced from 30s to 10s
        });
        
        // Race the fetch against the timeout
        await Promise.race([
          dispatch(fetchCurrentUser()),
          timeoutPromise
        ]);
        
        // Update cache timestamp
        lastFetchTime = Date.now();
      } catch (err) {
        console.error('Error fetching user:', err);
        // Errors are already handled by the thunk and stored in the Redux state
      } finally {
        // Reset the flags when done, regardless of success or failure
        isUserFetchInProgress = false;
        setLocalLoading(false);
      }
    };
    
    fetchUserData();
    
    // Cleanup function to reset loading state if component unmounts during fetch
    return () => {
      if (isUserFetchInProgress) {
        isUserFetchInProgress = false;
        setLocalLoading(false);
      }
    };
  }, [currentUser, status, dispatch]);
  
  return {
    user: currentUser,
    isAuthenticated: !!currentUser,
    isLoading: status === 'loading' || isUserFetchInProgress || localLoading,
    error
  };
}

export default useGetUser; 