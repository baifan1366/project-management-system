import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { supabase } from '../supabase';

// JWT secret key (should be in environment variables in production)
// Try to use JWT_SECRET first, but fall back to NEXT_PUBLIC_JWT_SECRET if needed
const JWT_SECRET = process.env.JWT_SECRET || process.env.NEXT_PUBLIC_JWT_SECRET;

// For debugging
if (!JWT_SECRET) {
  console.warn('Neither JWT_SECRET nor NEXT_PUBLIC_JWT_SECRET is defined in environment variables');
}

/**
 * Get the current authenticated user from the JWT token in cookies
 * @returns {Promise<Object|null>} The user object or null if not authenticated
 */
export async function getCurrentUser() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

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
      console.log(decoded);
      
      // Get user from database
      const { data: user, error } = await supabase
        .from('user')
        .select('*')
        .eq('id', decoded.userId)
        .single();

      if (error || !user) {
        console.error('Error fetching user:', error);
        return null;
      }

      // Get user subscription
      const { data: subscription } = await supabase
        .from('user_subscription_plan')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      // Remove sensitive data
      delete user.verification_token;
      delete user.verification_token_expires;
      delete user.reset_password_token;
      delete user.reset_password_expires;
      delete user.mfa_secret;
      delete user.password_hash;

      return {
        user,
        subscription: subscription?.[0] || null
      };
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