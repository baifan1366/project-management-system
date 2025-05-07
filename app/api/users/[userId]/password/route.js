import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { supabase } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth/auth';

// Password validation function
function isValidPassword(password) {
    // At least 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special character
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])[A-Za-z\d!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]{8,}$/;
    return passwordRegex.test(password);
  }
  

/**
 * API endpoint to update user password
 * @param {Request} request - The request object
 * @param {Object} params - Route parameters
 * @param {string} params.userId - The user ID
 */
export async function PATCH(request, { params }) {
  try {
    // Get the userId from the route parameters
    const { userId } = params;
    
    // Get current authenticated user
    const userData = await getCurrentUser();
    
    // Check if user is authenticated
    if (!userData || !userData.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Check if user is trying to update their own password
    if (userData.user.id !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized to update this user' },
        { status: 403 }
      );
    }
    
    // Parse request body
    const data = await request.json();
    const { currentPassword, newPassword } = data;
    
    // Validate input
    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Current password and new password are required' },
        { status: 400 }
      );
    }
    
    // Validate new password strength
    if (!isValidPassword(newPassword)) {
      return NextResponse.json(
        { error: 'New password must be at least 8 characters long and include uppercase, lowercase, number, and special character' },
        { status: 400 }
      );
    }
    
    // Get user data including password hash
    const { data: user, error: userError } = await supabase
      .from('user')
      .select('id, password_hash')
      .eq('id', userId)
      .single();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Verify current password
    const isPasswordCorrect = await bcrypt.compare(currentPassword, user.password_hash);
    
    if (!isPasswordCorrect) {
      return NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: 401 }
      );
    }
    
    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);
    
    // Update the password in the database
    const { error: updateError } = await supabase
      .from('user')
      .update({
        password_hash: passwordHash,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);
    
    if (updateError) {
      console.error('Error updating password:', updateError);
      return NextResponse.json(
        { error: 'Failed to update password' },
        { status: 500 }
      );
    }
    
    // If using Supabase Auth, also update it there
    if (supabase.auth && supabase.auth.admin) {
      const { error: authUpdateError } = await supabase.auth.admin.updateUserById(
        userId,
        { password: newPassword }
      );
      
      if (authUpdateError) {
        console.error('Auth password update error:', authUpdateError);
        // We continue because the main user table was updated successfully
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'Password updated successfully'
    });
  } catch (error) {
    console.error('Password update error:', error);
    return NextResponse.json(
      { error: 'Failed to update password' },
      { status: 500 }
    );
  }
}