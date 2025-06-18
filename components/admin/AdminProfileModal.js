'use client';

import { useState, useEffect, useRef } from 'react';
import { FaUser, FaEnvelope, FaLock, FaTimes, FaPencilAlt, FaCamera } from 'react-icons/fa';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

/**
 * Modal component for displaying admin profile information with inline editing capability
 * @param {Object} props
 * @param {boolean} props.isOpen - Controls whether the modal is visible
 * @param {Function} props.onClose - Function to call when the modal is closed
 * @param {Object} props.adminData - The admin user data to display
 * @param {Function} props.onProfileUpdate - Function to call when profile is updated
 */
const AdminProfileModal = ({ isOpen, onClose, adminData, onProfileUpdate }) => {
  const [editField, setEditField] = useState(null);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    username: '',
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  
  // Update form data when adminData changes
  useEffect(() => {
    if (adminData) {
      setFormData({
        full_name: adminData.name || adminData.full_name || '',
        email: adminData.email || '',
        username: adminData.username || '',
        current_password: '',
        new_password: '',
        confirm_password: ''
      });
    }
  }, [adminData]);
  
  if (!isOpen) return null;
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };
  
  // Helper function to extract error message from Supabase error
  const getErrorMessage = (error) => {
    if (!error) return 'Unknown error occurred';
    
    // Check for specific error patterns in the message
    const errorMessage = error.message || error.toString();
    
    if (errorMessage.includes('row-level security policy')) {
      return 'Permission denied. The storage bucket may not be properly configured. Please contact an administrator.';
    } else if (errorMessage.includes('storage/object-not-found')) {
      return 'Storage bucket not found. Please ensure "admin-avatars" bucket exists in Supabase.';
    } else if (errorMessage.includes('413') || errorMessage.includes('too large')) {
      return 'File is too large. Maximum size is 5MB.';
    } else if (errorMessage.includes('429')) {
      return 'Too many requests. Please try again later.';
    } else if (errorMessage.includes('401') || errorMessage.includes('403')) {
      return 'Authentication error. You may not have permission to upload files.';
    }
    
    return errorMessage;
  };
  
  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Validate file type
    const fileType = file.type;
    if (!fileType.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }
    
    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast.error('Image size should not exceed 5MB');
      return;
    }
    
    toast.promise(
      async () => {
        setUploading(true);
        try {
          // Create a unique file name
          const fileExt = file.name.split('.').pop();
          const fileName = `admin_${adminData.id}_${Date.now()}.${fileExt}`;
          const filePath = `${fileName}`;
          
          
          
          // Upload to Supabase Storage
          const { error: uploadError, data: uploadData } = await supabase.storage
            .from('admin-avatars')
            .upload(filePath, file, {
              upsert: true,
              contentType: fileType
            });
            
          if (uploadError) {
            console.error('Upload error details:', uploadError);
            throw new Error(getErrorMessage(uploadError));
          }
          
          
          
          // Get the public URL
          const { data: { publicUrl } } = supabase.storage
            .from('admin-avatars')
            .getPublicUrl(filePath);
          
          
          
          // Update the admin user record
          const { error: updateError } = await supabase
            .from('admin_user')
            .update({ avatar_url: publicUrl })
            .eq('id', adminData.id);
            
          if (updateError) {
            console.error('Database update error:', updateError);
            throw new Error(getErrorMessage(updateError));
          }
          
          // Update local state and parent component
          if (onProfileUpdate) {
            onProfileUpdate({ ...adminData, avatar_url: publicUrl });
          }
          
          return publicUrl;
        } finally {
          setUploading(false);
        }
      },
      {
        loading: 'Uploading avatar...',
        success: 'Avatar updated successfully',
        error: (err) => `${err.message || 'Failed to upload avatar'}`
      }
    );
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate passwords match if changing password
    if (formData.new_password && formData.new_password !== formData.confirm_password) {
      toast.error('New passwords do not match');
      return;
    }
    
    toast.promise(
      async () => {
        // Update admin profile
        const updateData = {
          full_name: formData.full_name,
          email: formData.email,
          username: formData.username,
        };
        
        // Handle password update if provided
        if (formData.new_password && formData.current_password) {
          // Here you would implement password verification and update
          // This is just a placeholder - actual implementation would verify current password
          // updateData.password_hash = await hashPassword(formData.new_password);
        }
        
        const { error } = await supabase
          .from('admin_user')
          .update(updateData)
          .eq('id', adminData.id);
          
        if (error) throw new Error(getErrorMessage(error));
        
        // Update parent component
        if (onProfileUpdate) {
          onProfileUpdate({ ...adminData, ...updateData });
        }
        
        setEditField(null);
        return updateData;
      },
      {
        loading: 'Updating profile...',
        success: 'Profile updated successfully',
        error: (err) => `${err.message || 'Failed to update profile'}`
      }
    );
  };

  const toggleEditField = (field) => {
    setEditField(editField === field ? null : field);
  };
  
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" onClick={onClose}>
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>
        
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen"></span>&#8203;
        
        <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-sm sm:w-full">
          <div className="absolute top-0 right-0 pt-2 pr-2">
            <button
              type="button"
              className="text-gray-400 hover:text-gray-500 focus:outline-none"
              onClick={() => {
                setEditField(null);
                onClose();
              }}
            >
              <FaTimes className="h-4 w-4" />
            </button>
          </div>
          
          <div className="bg-white dark:bg-gray-800 px-4 pt-4 pb-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white text-center mb-4">
              Admin Profile
            </h3>
            
            <div className="flex flex-col space-y-3">
              <div className="flex justify-center mb-2">
                <div className="relative">
                  {adminData?.avatar_url ? (
                    <img 
                      src={adminData.avatar_url} 
                      alt="Admin Avatar" 
                      className="w-16 h-16 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xl font-semibold">
                      {adminData?.name?.charAt(0).toUpperCase() || adminData?.username?.charAt(0).toUpperCase() || 'A'}
                    </div>
                  )}
                  
                  <button 
                    type="button"
                    onClick={handleAvatarClick}
                    disabled={uploading}
                    className="absolute bottom-0 right-0 bg-indigo-600 rounded-full p-1 text-white hover:bg-indigo-700 focus:outline-none"
                  >
                    {uploading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <FaCamera className="h-3 w-3" />
                    )}
                  </button>
                  
                  <input 
                    type="file"
                    ref={fileInputRef}
                    onChange={handleAvatarUpload}
                    accept="image/*"
                    className="hidden"
                  />
                </div>
              </div>

              {/* Full Name Field */}
              <div className="bg-gray-100 dark:bg-gray-700 rounded-md p-3">
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-500 dark:text-gray-400">Full Name</div>
                  <button 
                    type="button" 
                    onClick={() => toggleEditField('full_name')}
                    className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400"
                  >
                    <FaPencilAlt className="h-3 w-3" />
                  </button>
                </div>
                
                {editField === 'full_name' ? (
                  <input
                    type="text"
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleChange}
                    className="mt-1 w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm dark:bg-gray-700 dark:text-white"
                    autoFocus
                  />
                ) : (
                  <div className="text-base font-medium text-gray-900 dark:text-white mt-1">
                    {formData.full_name}
                  </div>
                )}
              </div>
              
              {/* Email Field */}
              <div className="bg-gray-100 dark:bg-gray-700 rounded-md p-3">
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-500 dark:text-gray-400">Email</div>
                  <button 
                    type="button" 
                    onClick={() => toggleEditField('email')}
                    className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400"
                  >
                    <FaPencilAlt className="h-3 w-3" />
                  </button>
                </div>
                
                {editField === 'email' ? (
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="mt-1 w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm dark:bg-gray-700 dark:text-white"
                    autoFocus
                  />
                ) : (
                  <div className="text-base font-medium text-gray-900 dark:text-white mt-1">
                    {formData.email}
                  </div>
                )}
              </div>
              
              {/* Username Field */}
              <div className="bg-gray-100 dark:bg-gray-700 rounded-md p-3">
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-500 dark:text-gray-400">Username</div>
                  <button 
                    type="button" 
                    onClick={() => toggleEditField('username')}
                    className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400"
                  >
                    <FaPencilAlt className="h-3 w-3" />
                  </button>
                </div>
                
                {editField === 'username' ? (
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    className="mt-1 w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm dark:bg-gray-700 dark:text-white"
                    autoFocus
                  />
                ) : (
                  <div className="text-base font-medium text-gray-900 dark:text-white mt-1">
                    {formData.username}
                  </div>
                )}
              </div>
              
              {/* Password Field */}
              <div className="bg-gray-100 dark:bg-gray-700 rounded-md p-3">
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-500 dark:text-gray-400">Password</div>
                  <button 
                    type="button" 
                    onClick={() => toggleEditField('password')}
                    className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400"
                  >
                    <FaPencilAlt className="h-3 w-3" />
                  </button>
                </div>
                
                {editField === 'password' ? (
                  <div className="mt-2 space-y-2">
                    <input
                      type="password"
                      name="current_password"
                      placeholder="Current Password"
                      value={formData.current_password}
                      onChange={handleChange}
                      className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm dark:bg-gray-700 dark:text-white"
                    />
                    <input
                      type="password"
                      name="new_password"
                      placeholder="New Password"
                      value={formData.new_password}
                      onChange={handleChange}
                      className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm dark:bg-gray-700 dark:text-white"
                    />
                    <input
                      type="password"
                      name="confirm_password"
                      placeholder="Confirm New Password"
                      value={formData.confirm_password}
                      onChange={handleChange}
                      className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm dark:bg-gray-700 dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={handleSubmit}
                      className="mt-2 w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-3 py-1 bg-indigo-600 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none"
                    >
                      Update Password
                    </button>
                  </div>
                ) : (
                  <div className="text-base font-medium text-gray-900 dark:text-white mt-1">
                    ••••••••
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 text-right">
            {editField && editField !== 'password' && (
              <button
                type="button"
                onClick={handleSubmit}
                className="inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-1 mr-2 bg-indigo-600 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none"
              >
                Save
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-1 bg-white dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminProfileModal; 