'use client';

import { useState, useEffect, useRef } from 'react';
import { FaUser, FaEnvelope, FaLock, FaTimes, FaPencilAlt, FaCamera, FaEye, FaEyeSlash } from 'react-icons/fa';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import bcrypt from 'bcryptjs';

/**
 * Modal component for displaying admin profile information with inline editing capability
 * @param {Object} props
 * @param {boolean} props.isOpen - Controls whether the modal is visible
 * @param {Function} props.onClose - Function to call when the modal is closed
 * @param {Object} props.adminData - The admin user data to display
 * @param {Function} props.onProfileUpdate - Function to call when profile is updated
 */
const AdminProfileModal = ({ isOpen, onClose, adminData = {}, onProfileUpdate }) => {
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
  const [currentPasswordVerified, setCurrentPasswordVerified] = useState(false);
  const [currentPasswordError, setCurrentPasswordError] = useState('');
  const [currentPasswordChecking, setCurrentPasswordChecking] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Update form data when adminData changes or modal opens
  useEffect(() => {
    if (adminData && isOpen) {
      setFormData({
        full_name: adminData.name || adminData.full_name || '',
        email: adminData.email || '',
        username: adminData.username || '',
        current_password: '',
        new_password: '',
        confirm_password: ''
      });
    }
  }, [adminData, isOpen]);
  
  useEffect(() => {
    if (!isOpen) {
      // Reset all form state when modal closes
      setEditField(null);
      setCurrentPasswordVerified(false);
      setCurrentPasswordError('');
      setCurrentPasswordChecking(false);
      setShowCurrentPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);
      setFormData({
        full_name: '',
        email: '',
        username: '',
        current_password: '',
        new_password: '',
        confirm_password: ''
      });
    }
  }, [isOpen]);
  
  // Don't render the modal if it's not open
  if (!isOpen) return null;
  
  // Don't render if adminData is missing critical information
  if (!adminData || (!adminData.id && isOpen)) {
    console.error("AdminProfileModal: Missing required adminData.id");
    toast.error("Could not load admin profile data");
    onClose();
    return null;
  }
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const togglePasswordVisibility = (passwordField) => {
    switch (passwordField) {
      case 'current_password':
        setShowCurrentPassword(!showCurrentPassword);
        break;
      case 'new_password':
        setShowNewPassword(!showNewPassword);
        break;
      case 'confirm_password':
        setShowConfirmPassword(!showConfirmPassword);
        break;
      default:
        break;
    }
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
    
    // Ensure we have a valid adminData.id
    if (!adminData?.id) {
      toast.error('Cannot upload avatar: missing admin ID');
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
            const updatedAdminData = { ...adminData, avatar_url: publicUrl };
            onProfileUpdate(updatedAdminData);
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
    
    // Ensure we have a valid adminData.id
    if (!adminData?.id) {
      toast.error('Cannot update profile: missing admin ID');
      return;
    }
    
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
          // 1. 获取当前管理员的 password_hash
          const { data: adminRecord, error: fetchError } = await supabase
            .from('admin_user')
            .select('password_hash')
            .eq('id', adminData.id)
            .single();
          if (fetchError || !adminRecord) {
            throw new Error('Failed to verify current password. Please try again.');
          }
          // 2. 验证 current_password
          const isMatch = await bcrypt.compare(formData.current_password, adminRecord.password_hash);
          if (!isMatch) {
            throw new Error('Current password is incorrect.');
          }
          // 3. Hash the new password before saving
          const salt = await bcrypt.genSalt(10);
          updateData.password_hash = await bcrypt.hash(formData.new_password, salt);
        }
        const { error } = await supabase
          .from('admin_user')
          .update(updateData)
          .eq('id', adminData.id);
        if (error) throw new Error(getErrorMessage(error));
        
        // Create updated admin data object with the new values
        const updatedAdminData = { 
          ...adminData, 
          full_name: formData.full_name,
          name: formData.full_name, // Update both name and full_name for consistency
          email: formData.email,
          username: formData.username
        };
        
        // Update parent component and Redux state via callback
        // This is crucial to keep the Redux store in sync and prevent logout issues
        if (onProfileUpdate) {
          onProfileUpdate(updatedAdminData);
        }
        
        setEditField(null);
        setCurrentPasswordVerified(false);
        setCurrentPasswordError('');
        setCurrentPasswordChecking(false);
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
  
  // Add truncateText helper if not present
  const truncateText = (text, maxLength = 20) => {
    if (!text) return '';
    return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
  };
  
  return (
    <div className="fixed inset-0 z-[9999] overflow-y-auto">
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
                      {(adminData?.name || adminData?.full_name || adminData?.username || '')?.charAt(0)?.toUpperCase() || 'A'}
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
                    {truncateText(formData.username, 20)}
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
                    <div className="flex items-center space-x-2">
                      <div className="relative w-full">
                        <input
                          type={showCurrentPassword ? "text" : "password"}
                          name="current_password"
                          placeholder="Current Password"
                          value={formData.current_password}
                          onChange={e => {
                            handleChange(e);
                            setCurrentPasswordVerified(false);
                            setCurrentPasswordError('');
                          }}
                          className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm dark:bg-gray-700 dark:text-white"
                          disabled={currentPasswordVerified}
                        />
                        <button
                          type="button"
                          onClick={() => togglePasswordVisibility('current_password')}
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        >
                          {showCurrentPassword ? (
                            <FaEyeSlash size={14} title="Hide password" />
                          ) : (
                            <FaEye size={14} title="Show password" />
                          )}
                        </button>
                      </div>
                      <button
                        type="button"
                        disabled={currentPasswordVerified || currentPasswordChecking || !formData.current_password}
                        className={`px-2 py-1 rounded text-xs font-medium ${currentPasswordVerified ? 'bg-green-500 text-white' : 'bg-indigo-600 text-white hover:bg-indigo-700'} ${currentPasswordChecking ? 'opacity-50' : ''}`}
                        onClick={async () => {
                          setCurrentPasswordChecking(true);
                          setCurrentPasswordError('');
                          try {
                            const { data: adminRecord, error: fetchError } = await supabase
                              .from('admin_user')
                              .select('password_hash')
                              .eq('id', adminData.id)
                              .single();
                            if (fetchError || !adminRecord) {
                              setCurrentPasswordError('Failed to verify password.');
                              setCurrentPasswordVerified(false);
                            } else {
                              const isMatch = await bcrypt.compare(formData.current_password, adminRecord.password_hash);
                              if (isMatch) {
                                setCurrentPasswordVerified(true);
                                setCurrentPasswordError('');
                              } else {
                                setCurrentPasswordVerified(false);
                                setCurrentPasswordError('Current password is incorrect.');
                              }
                            }
                          } catch (err) {
                            setCurrentPasswordError('Verification failed.');
                            setCurrentPasswordVerified(false);
                          } finally {
                            setCurrentPasswordChecking(false);
                          }
                        }}
                      >
                        {currentPasswordVerified ? 'Verified' : (currentPasswordChecking ? 'Verifying...' : 'Verify')}
                      </button>
                    </div>
                    {currentPasswordError && <p className="text-xs text-red-600 mt-1">{currentPasswordError}</p>}
                    {currentPasswordVerified && (
                      <>
                        <div className="relative">
                          <input
                            type={showNewPassword ? "text" : "password"}
                            name="new_password"
                            placeholder="New Password"
                            value={formData.new_password}
                            onChange={handleChange}
                            className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm dark:bg-gray-700 dark:text-white"
                          />
                          <button
                            type="button"
                            onClick={() => togglePasswordVisibility('new_password')}
                            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                          >
                            {showNewPassword ? (
                              <FaEyeSlash size={14} title="Hide password" />
                            ) : (
                              <FaEye size={14} title="Show password" />
                            )}
                          </button>
                        </div>
                        <div className="relative">
                          <input
                            type={showConfirmPassword ? "text" : "password"}
                            name="confirm_password"
                            placeholder="Confirm New Password"
                            value={formData.confirm_password}
                            onChange={handleChange}
                            className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm dark:bg-gray-700 dark:text-white"
                          />
                          <button
                            type="button"
                            onClick={() => togglePasswordVisibility('confirm_password')}
                            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                          >
                            {showConfirmPassword ? (
                              <FaEyeSlash size={14} title="Hide password" />
                            ) : (
                              <FaEye size={14} title="Show password" />
                            )}
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={handleSubmit}
                          className="mt-2 w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-3 py-1 bg-indigo-600 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none"
                        >
                          Update Password
                        </button>
                      </>
                    )}
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