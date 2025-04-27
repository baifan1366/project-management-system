'use client';

import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import Cookies from 'js-cookie';
import { fetchCurrentUser } from '../redux/features/usersSlice';

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
    
    // If we're already loading, do nothing
    if (status === 'loading') return;
    
    const fetchUserData = async () => {
      // Check for authentication token in cookies
      const token = Cookies.get('auth_token');
      
      // If no token exists, user is not logged in
      if (!token) return;
      
      // Dispatch the fetchCurrentUser thunk to update Redux state
      await dispatch(fetchCurrentUser());
    };
    
    fetchUserData();
  }, [currentUser, status, dispatch]);
  
  return {
    user: currentUser,
    isAuthenticated: !!currentUser,
    isLoading: status === 'loading',
    error
  };
}

export default useGetUser; 