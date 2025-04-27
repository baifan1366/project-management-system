import jwt from 'jsonwebtoken';
import { supabase } from '@/lib/supabase';

// JWT secret key (should be in environment variables in production)
// Try to use JWT_SECRET first, but fall back to NEXT_PUBLIC_JWT_SECRET if needed
const JWT_SECRET = process.env.JWT_SECRET || process.env.NEXT_PUBLIC_JWT_SECRET;
const JWT_EXPIRY = '7d'; // Token expiry time

/**
 * Generate a JWT token for a user
 * @param {string} userId - The user ID to generate a token for
 * @returns {string} - The JWT token
 */
export async function generateTokenForUser(userId) {
  try {
    // Get user data from the database
    const { data: user, error } = await supabase
      .from('user')
      .select('email, name')
      .eq('id', userId)
      .single();
    
    if (error || !user) {
      console.error('Error getting user for token generation:', error);
      throw new Error('User not found');
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: userId,
        email: user.email,
        name: user.name
      }, 
      JWT_SECRET, 
      { expiresIn: JWT_EXPIRY }
    );
    
    return token;
  } catch (error) {
    console.error('Error generating token for user:', error);
    throw error;
  }
}

/**
 * Verify a JWT token and return the user data
 * @param {string} token - The JWT token to verify
 * @returns {Object} - The decoded token data
 */
export function verifyToken(token) {
  try {
    if (!JWT_SECRET) {
      throw new Error('JWT secret is not defined');
    }
    
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    console.error('Error verifying token:', error);
    throw error;
  }
} 