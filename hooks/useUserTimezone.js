'use client';

import { useState, useEffect } from 'react';
import useGetUser from '@/lib/hooks/useGetUser';

/**
 * Convert UTC format timezone to IANA standard timezone name
 * @param {string} utcOffset - Timezone format like "UTC+8"
 * @returns {string} IANA standard timezone name, or system default if conversion fails
 */
const convertToIANATimezone = (utcOffset) => {
  if (!utcOffset || typeof utcOffset !== 'string') {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  }
  
  try {
    // Match UTC+/- format timezone string
    const match = utcOffset.match(/^UTC([+-])(\d+)$/);
    if (!match) {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    }
    
    const sign = match[1]; // + or -
    const hours = parseInt(match[2], 10);
    
    // Common timezone mappings
    const timezoneMap = {
      'UTC+8': 'Asia/Shanghai',    // China Standard Time
      'UTC+0': 'Europe/London',    // Greenwich Mean Time
      'UTC-8': 'America/Los_Angeles', // Pacific Standard Time
      'UTC-5': 'America/New_York',  // Eastern Standard Time
      'UTC+1': 'Europe/Paris',      // Central European Time
      'UTC+9': 'Asia/Tokyo',        // Japan Standard Time
      'UTC+10': 'Australia/Sydney', // Australian Eastern Standard Time
      'UTC+5.5': 'Asia/Kolkata',    // India Standard Time
      'UTC+7': 'Asia/Bangkok',      // Southeast Asia Time
      'UTC+3': 'Europe/Moscow'      // Moscow Standard Time
    };
    
    // Try to get timezone from mapping
    if (timezoneMap[utcOffset]) {
      return timezoneMap[utcOffset];
    }
    
    // If no exact match, try to guess a reasonable timezone based on offset
    if (sign === '+') {
      if (hours >= 8 && hours <= 9) return 'Asia/Shanghai';
      if (hours >= 0 && hours <= 1) return 'Europe/London';
      if (hours >= 5 && hours <= 6) return 'Asia/Dhaka';
      if (hours >= 2 && hours <= 3) return 'Europe/Istanbul';
    } else {
      if (hours >= 7 && hours <= 8) return 'America/Los_Angeles';
      if (hours >= 4 && hours <= 5) return 'America/New_York';
    }
    
    // Default to system timezone
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch (error) {
    console.error('Timezone conversion error:', error);
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  }
};

/**
 * Get hour offset from UTC timezone string
 * @param {string} utcOffset - Timezone format like "UTC+8"
 * @returns {number} Hour offset, like +8 or -5
 */
const getHourOffset = (utcOffset) => {
  if (!utcOffset || typeof utcOffset !== 'string') {
    return 0;
  }
  
  const match = utcOffset.match(/^UTC([+-])(\d+)$/);
  if (!match) return 0;
  
  const sign = match[1] === '+' ? 1 : -1;
  return sign * parseInt(match[2], 10);
};

/**
 * Get user's timezone settings
 * @returns {Object} Object containing user timezone and related functions
 */
export function useUserTimezone() {
  const [userTimezone, setUserTimezone] = useState(null);
  const [utcOffset, setUtcOffset] = useState("");
  const [hourFormat, setHourFormat] = useState('24h'); // Default 24-hour format
  const [loading, setLoading] = useState(true);
  
  // Get user information from the useGetUser hook
  const { user, isLoading } = useGetUser();

  // Get timezone settings from user data
  useEffect(() => {
    const setupUserTimezone = () => {
      try {
        // Wait until useGetUser finishes loading
        if (isLoading) {
          return;
        }
        
        setLoading(true);
        
        if (!user) {
          // Set UTC+8 as default timezone when no user data is available
          setUserTimezone('Asia/Shanghai');
          setUtcOffset("UTC+8");
          setLoading(false);
          return;
        }
        
        // Get timezone from user data
        if (user.timezone) {
          // Save original UTC offset
          setUtcOffset(user.timezone);
          
          // Set time format (12/24 hour)
          if (user.hour_format) {
            setHourFormat(user.hour_format);
          }
          
          // Convert UTC format timezone to IANA standard timezone name
          const ianaTimezone = convertToIANATimezone(user.timezone);
          setUserTimezone(ianaTimezone);
        } else {
          // If user hasn't set timezone, use UTC+8 as default
          setUserTimezone('Asia/Shanghai');
          setUtcOffset("UTC+8");
        }
      } catch (error) {
        console.error('Error getting timezone:', error);
        setUserTimezone('Asia/Shanghai');
        setUtcOffset("UTC+8");
      } finally {
        setLoading(false);
      }
    };
    
    setupUserTimezone();
  }, [user, isLoading]);
  
  /**
   * Manually adjust time using UTC offset instead of relying on timeZone parameter
   * @param {Date|string} dateInput - Date object or date string
   * @returns {Date} Adjusted date object
   */
  const adjustTimeByOffset = (dateInput) => {
    if (!dateInput) return new Date();
    
    const date = new Date(dateInput);
    
    // If no UTC offset specified, use UTC+8 as default for displaying to users
    // This ensures users in UTC+8 timezone see correct times even without profile settings
    const userUtcOffset = utcOffset || "UTC+8";
    
    try {
      // Get hour offset from UTC timezone string
      const offsetHours = getHourOffset(userUtcOffset);
      
      // Create new UTC date
      const utcDate = new Date(date.toUTCString());
      
      // Adjust hours based on offset
      utcDate.setUTCHours(utcDate.getUTCHours() + offsetHours);
      
      return utcDate;
    } catch (error) {
      console.error('Time adjustment error:', error);
      // If error occurs, apply UTC+8 offset directly as fallback
      const fallbackDate = new Date(date.toUTCString());
      fallbackDate.setUTCHours(fallbackDate.getUTCHours() + 8);
      return fallbackDate;
    }
  };
  
  // Format time to user timezone's local time string
  const formatToUserTimezone = (timestamp, options = {}) => {
    if (!timestamp) return '';
    
    try {
      // Manually adjust time using UTC offset
      const adjustedDate = adjustTimeByOffset(timestamp);
      
      // Default time display options
      const defaultOptions = { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: hourFormat === '12h' // Use 12/24 hour format based on user preference
      };
      
      // Don't use timeZone parameter as we've already manually adjusted the time
      return adjustedDate.toLocaleTimeString(undefined, { ...defaultOptions, ...options });
    } catch (error) {
      console.error('Format time error:', error);
      return new Date(timestamp).toLocaleTimeString();
    }
  };
  
  // Format full date and time
  const formatDateToUserTimezone = (timestamp, options = {}) => {
    if (!timestamp) return '';
    
    try {
      // Manually adjust time using UTC offset
      const adjustedDate = adjustTimeByOffset(timestamp);
      
      // Default date and time display options
      const defaultOptions = { 
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit', 
        minute: '2-digit',
        hour12: hourFormat === '12h' // Use 12/24 hour format based on user preference
      };
      
      // Don't use timeZone parameter as we've already manually adjusted the time
      return adjustedDate.toLocaleString(undefined, { ...defaultOptions, ...options });
    } catch (error) {
      console.error('Format date-time error:', error);
      return new Date(timestamp).toLocaleString();
    }
  };

  return {
    userTimezone,
    utcOffset,
    hourFormat,
    loading,
    formatToUserTimezone,
    formatDateToUserTimezone,
    adjustTimeByOffset
  };
} 