import { cookies } from 'next/headers';
import { headers } from 'next/headers';
import jwt from 'jsonwebtoken';
import { supabase } from '../supabase';

// JWT secret key (should be in environment variables in production)
// Try to use JWT_SECRET first, but fall back to NEXT_PUBLIC_JWT_SECRET if needed
const JWT_SECRET = process.env.JWT_SECRET || process.env.NEXT_PUBLIC_JWT_SECRET;

// For debugging
if (!JWT_SECRET) {
  console.warn('Neither JWT_SECRET nor NEXT_PUBLIC_JWT_SECRET is defined in environment variables');
}

// Simple in-memory cache with expiration
const userCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

/**
 * Get the current authenticated user from the JWT token in cookies or Authorization header
 * @param {boolean} noCache - If true, bypass cache and fetch fresh data
 * @returns {Promise<Object|null>} The user object or null if not authenticated
 */
export async function getCurrentUser(noCache = false) {
  try {
    // Try to get token from Authorization header first, then fall back to cookies
    const headersList = await headers();
    let token = headersList.get('Authorization')?.replace('Bearer ', '');
    
    // If no token in headers, check cookies
    if (!token) {
      const cookieStore = await cookies();
      token = cookieStore.get('auth_token')?.value;
    }

    if (!token) {
      return null;
    }

    if (!JWT_SECRET) {
      console.error('JWT secret is not defined. Cannot verify token.');
      return null;
    }

    // Verify token
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const userId = decoded.userId;
      
      // Check cache first (unless noCache is true)
      if (!noCache) {
      const cachedUser = userCache.get(userId);
      if (cachedUser && cachedUser.expiry > Date.now()) {
        return cachedUser.data;
        }
      }
      
      // Set a timeout for the Supabase requests
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database request timeout')), 5000)
      );

      // Get user from database with timeout
      const userPromise = supabase
        .from('user')
        .select('*')
        .eq('id', userId)
        .single();
        
      const { data: user, error } = await Promise.race([userPromise, timeoutPromise])
        .catch(err => {
          console.error('Error or timeout fetching user:', err);
          return { data: null, error: err };
        });

      if (error || !user) {
        console.error('Error fetching user:', error);
        return null;
      }

      // Get user subscription with timeout
      const subscriptionPromise = supabase
        .from('user_subscription_plan')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);
        
      const { data: subscription } = await Promise.race([subscriptionPromise, timeoutPromise])
        .catch(err => {
          console.error('Error or timeout fetching subscription:', err);
          return { data: null, error: err };
        });

      // Remove sensitive data
      delete user.verification_token;
      delete user.verification_token_expires;
      delete user.reset_password_token;
      delete user.reset_password_expires;
      delete user.mfa_secret;
      delete user.password_hash;

      const userData = {
        user,
        subscription: subscription?.[0] || null
      };
      
      // Store in cache
      userCache.set(userId, {
        data: userData,
        expiry: Date.now() + CACHE_TTL
      });

      return userData;
    } catch (tokenError) {
      // Handle token verification errors specifically
      if (tokenError.name === 'TokenExpiredError') {
        console.error('Auth token has expired. User needs to login again.');
      } else {
        console.error('Token verification failed:', tokenError.message);
      }
      return null;
    }
  } catch (error) {
    console.error('Auth error:', error);
    return null;
  }
}

/**
 * Check if the current user is authenticated
 * @returns {Promise<boolean>} True if authenticated, false otherwise
 */
export async function isAuthenticated() {
  const user = await getCurrentUser();
  return !!user;
}

/**
 * Get the JWT token from cookies
 * @returns {Promise<string|null>} The JWT token or null if not found
 */
export async function getAuthToken() {
  const cookieStore = await cookies();
  return cookieStore.get('auth_token')?.value || null;
}

/**
 * Get the user ID from the JWT token
 * @returns {Promise<string|null>} The user ID or null if not authenticated
 */
export async function getUserId() {
  try {
    const token = await getAuthToken();
    
    if (!token) {
      return null;
    }

    if (!JWT_SECRET) {
      console.error('JWT secret is not defined. Cannot verify token.');
      return null;
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded.userId;
  } catch (error) {
    console.error('Error getting user ID:', error);
    return null;
  }
}

/**
 * Update user's last seen timestamp and online status
 * @param {string} userId - The user ID
 * @returns {Promise<boolean>} True if successful, false otherwise
 */
export async function updateUserActivity(userId) {
  try {
    if (!userId) return false;

    const { error } = await supabase
      .from('user')
      .update({
        last_seen_at: new Date().toISOString(),
        is_online: true
      })
      .eq('id', userId);

    return !error;
  } catch (error) {
    console.error('Error updating user activity:', error);
    return false;
  }
}

/**
 * Set user offline
 * @param {string} userId - The user ID
 * @returns {Promise<boolean>} True if successful, false otherwise
 */
export async function setUserOffline(userId) {
  try {
    if (!userId) return false;

    const { error } = await supabase
      .from('user')
      .update({
        is_online: false
      })
      .eq('id', userId);

    return !error;
  } catch (error) {
    console.error('Error setting user offline:', error);
    return false;
  }
} 