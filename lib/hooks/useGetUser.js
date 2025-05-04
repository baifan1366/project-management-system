'use client';

import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import Cookies from 'js-cookie';
import { fetchCurrentUser } from '../redux/features/usersSlice';

// Create a shared loading flag outside the hook to track global loading state
// This prevents multiple simultaneous API calls when the hook is used in multiple components
let isUserFetchInProgress = false;

/**
 * Custom hook to handle authentication state
 * Checks Redux state first, then cookies if no user is found
 */
export function useGetUser() {
  const dispatch = useDispatch();
  const { currentUser, status, error } = useSelector((state) => state.users);
  
  useEffect(() => {
    // If we already have a user in Redux, no need to fetch
    if (currentUser) return;
    
    // If we're already loading in Redux, do nothing
    if (status === 'loading') return;
    
    // If another component is already fetching, don't start a new fetch
    if (isUserFetchInProgress) return;
    
    const fetchUserData = async () => {
      // Check for authentication token in cookies
      const token = Cookies.get('auth_token');
      
      // If no token exists, user is not logged in
      if (!token) return;
      
      try {
        // Mark that fetch is in progress to prevent other hook instances from also fetching
        isUserFetchInProgress = true;
        
        // Dispatch the fetchCurrentUser thunk to update Redux state
        await dispatch(fetchCurrentUser());
      } finally {
        // Reset the flag when done, regardless of success or failure
        isUserFetchInProgress = false;
      }
    };
    
    fetchUserData();
  }, [currentUser, status, dispatch]);
  
  return {
    user: currentUser,
    isAuthenticated: !!currentUser,
    isLoading: status === 'loading' || isUserFetchInProgress,
    error
  };
}

export default useGetUser; 