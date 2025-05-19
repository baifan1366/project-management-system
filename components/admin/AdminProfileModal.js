'use client';

import { useState, useEffect } from 'react';
import { FaUser, FaEnvelope, FaLock, FaTimes } from 'react-icons/fa';

/**
 * Modal component for displaying admin profile information and allowing profile updates
 * @param {Object} props
 * @param {boolean} props.isOpen - Controls whether the modal is visible
 * @param {Function} props.onClose - Function to call when the modal is closed
 * @param {Object} props.adminData - The admin user data to display
 */
const AdminProfileModal = ({ isOpen, onClose, adminData }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    username: '',
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  
  // Update form data when adminData changes or editing mode is toggled
  useEffect(() => {
    if (adminData && isEditing) {
      setFormData({
        full_name: adminData.name || '',
        email: adminData.email || '',
        username: adminData.username || '',
        current_password: '',
        new_password: '',
        confirm_password: ''
      });
    }
  }, [adminData, isEditing]);
  
  if (!isOpen) return null;
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate passwords match if changing password
    if (formData.new_password && formData.new_password !== formData.confirm_password) {
      alert('New passwords do not match');
      return;
    }
    
    try {
      // Here you would implement the API call to update the profile
      // const response = await updateAdminProfile(formData);
      
      // For now, just simulate success
      alert('Profile updated successfully');
      setIsEditing(false);
    } catch (error) {
      alert('Failed to update profile');
      console.error('Error updating profile:', error);
    }
  };
  
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" onClick={onClose}>
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>
        
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen"></span>&#8203;
        
        <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md sm:w-full">
          <div className="absolute top-0 right-0 pt-4 pr-4">
            <button
              type="button"
              className="text-gray-400 hover:text-gray-500 focus:outline-none"
              onClick={() => {
                setIsEditing(false);
                onClose();
              }}
            >
              <FaTimes className="h-5 w-5" />
            </button>
          </div>
          
          <div className="bg-white dark:bg-gray-800 px-6 pt-5 pb-6">
            <div className="text-center sm:text-left">
              <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-5">
                Admin Profile
              </h3>
              
              {isEditing ? (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Full Name
                    </label>
                    <input
                      type="text"
                      name="full_name"
                      id="full_name"
                      value={formData.full_name}
                      onChange={handleChange}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      id="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Username
                    </label>
                    <input
                      type="text"
                      name="username"
                      id="username"
                      value={formData.username}
                      onChange={handleChange}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  
                  <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                    <h4 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-3">Change Password</h4>
                    
                    <div className="space-y-3">
                      <div>
                        <label htmlFor="current_password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Current Password
                        </label>
                        <input
                          type="password"
                          name="current_password"
                          id="current_password"
                          value={formData.current_password}
                          onChange={handleChange}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="new_password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          New Password
                        </label>
                        <input
                          type="password"
                          name="new_password"
                          id="new_password"
                          value={formData.new_password}
                          onChange={handleChange}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="confirm_password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Confirm New Password
                        </label>
                        <input
                          type="password"
                          name="confirm_password"
                          id="confirm_password"
                          value={formData.confirm_password}
                          onChange={handleChange}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                        />
                      </div>
                    </div>
                  </div>
                </form>
              ) : (
                <>
                  <div className="flex items-center justify-center sm:justify-start mb-8">
                    <div className="w-20 h-20 rounded-full bg-indigo-500 flex items-center justify-center text-white text-2xl font-semibold">
                      {adminData?.name?.charAt(0).toUpperCase() || adminData?.username?.charAt(0).toUpperCase() || 'A'}
                    </div>
                    <div className="ml-4 text-center sm:text-left">
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white uppercase">
                        {adminData?.name || adminData?.username}
                      </h2>
                    </div>
                  </div>

                  <div className="space-y-0 divide-y divide-gray-200 dark:divide-gray-700">
                    <div className="py-4 flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Email</span>
                      <span className="text-sm text-gray-900 dark:text-white">{adminData?.email}</span>
                    </div>
                    
                    <div className="py-4 flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Username</span>
                      <span className="text-sm text-gray-900 dark:text-white">{adminData?.username}</span>
                    </div>
                    
                    <div className="py-4 flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Last Login</span>
                      <span className="text-sm text-gray-900 dark:text-white">{adminData?.last_login || 'N/A'}</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-700 px-4 py-4 sm:px-6 sm:flex sm:flex-row-reverse gap-2">
            {isEditing ? (
              <>
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-800 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm"
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Edit Profile
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-800 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm"
                >
                  Close
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminProfileModal; 