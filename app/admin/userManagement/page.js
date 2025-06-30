'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { FaBell, FaSearch, FaFilter, FaUserPlus, FaEdit, FaTrash, FaUserLock, FaUserCheck, FaSort, FaCopy } from 'react-icons/fa';
import { useSelector, useDispatch } from 'react-redux';
import AccessRestrictedModal from '@/components/admin/accessRestrictedModal';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import bcrypt from 'bcryptjs';

// Add generateSecurePassword function
const generateSecurePassword = () => {
  const length = 16; // Increased length for better security
  const uppercaseChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercaseChars = 'abcdefghijklmnopqrstuvwxyz';
  const numberChars = '0123456789';
  const specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  
  // Ensure at least one of each type
  let password = '';
  password += uppercaseChars[Math.floor(Math.random() * uppercaseChars.length)];
  password += lowercaseChars[Math.floor(Math.random() * lowercaseChars.length)];
  password += numberChars[Math.floor(Math.random() * numberChars.length)];
  password += specialChars[Math.floor(Math.random() * specialChars.length)];
  
  // Fill the rest with random characters from all types
  const allChars = uppercaseChars + lowercaseChars + numberChars + specialChars;
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
};

// Phone validation function
const validatePhone = (phone) => {
  // Allow empty phone numbers (optional field)
  if (!phone) return { valid: true, message: '' };
  
  // Basic phone validation: minimum 7 digits, can contain +, -, (), and spaces
  const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,4}[-\s.]?[0-9]{1,9}$/;
  
  if (!phoneRegex.test(phone)) {
    return { valid: false, message: 'Please enter a valid phone number' };
  }
  
  // Check minimum digits (excluding non-numeric characters)
  const digitsOnly = phone.replace(/\D/g, '');
  if (digitsOnly.length < 7) {
    return { valid: false, message: 'Phone number must have at least 7 digits' };
  }
  
  return { valid: true, message: '' };
};

// Add a comprehensive email validation function
const validateEmail = (email) => {
  // Check if email is empty
  if (!email || email.trim() === '') {
    return { valid: false, message: 'Email is required.' };
  }
  
  // Basic format validation
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email)) {
    return { valid: false, message: 'Please enter a valid email address.' };
  }
  
  // Get domain part
  const domainPart = email.split('@')[1];
  
  // Check for common invalid domains
  const invalidDomains = ['example.com', 'test.com', 'localhost', 'domain.com'];
  if (invalidDomains.includes(domainPart.toLowerCase())) {
    return { valid: false, message: 'Please use a real email domain.' };
  }
  
  // Check for excessive repetition of characters in domain
  const repeatedCharsMatch = domainPart.match(/(.)\1{5,}/);
  if (repeatedCharsMatch) {
    return { valid: false, message: 'Invalid email domain: excessive character repetition.' };
  }
  
  // Check domain part length constraints
  if (domainPart.length > 253) {
    return { valid: false, message: 'Email domain is too long.' };
  }
  
  // Check each domain part length
  const domainParts = domainPart.split('.');
  if (domainParts.some(part => part.length > 63)) {
    return { valid: false, message: 'Invalid email domain structure.' };
  }
  
  // Check top-level domain (TLD)
  const tld = domainParts[domainParts.length - 1];
  if (tld.length < 2) {
    return { valid: false, message: 'Invalid top-level domain.' };
  }
  
  // Check for suspicious TLDs or invalid TLDs
  const validTLDs = ['com', 'org', 'net', 'edu', 'gov', 'mil', 'io', 'co', 'uk', 'ca', 'au', 'de', 'jp', 'fr', 'it', 'ru', 'br', 'in', 'info', 'biz', 'me', 'tv', 'cc', 'ws', 'name', 'mobi', 'asia'];
  if (!validTLDs.includes(tld.toLowerCase()) && tld.length < 3) {
    return { valid: false, message: 'Invalid or suspicious top-level domain.' };
  }
  
  // Check for consecutive dots
  if (domainPart.includes('..')) {
    return { valid: false, message: 'Invalid email domain: consecutive dots are not allowed.' };
  }
  
  // Check for hyphens at the beginning or end of domain parts
  if (domainParts.some(part => part.startsWith('-') || part.endsWith('-'))) {
    return { valid: false, message: 'Invalid email domain: hyphens cannot be at the start or end of a domain part.' };
  }
  
  // All checks passed
  return { valid: true, message: '' };
};

// Helper function to truncate text and add ellipsis
const truncateText = (text, maxLength = 20) => {
  if (!text) return '';
  return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
};

// Add this function for full name validation (copied from adminManagement)
const validateFullName = (name) => {
  // 2-50 chars, no spaces, not empty, can have special chars
  return /^[^\s]{2,50}$/.test(name);
};

export default function UserManagement() {
  const router = useRouter();
  
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [sortOption, setSortOption] = useState('created_at_desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [usersPerPage] = useState(10);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [loading, setLoading] = useState(true);
  const [adminData, setAdminData] = useState(null);
  const [processing, setProcessing] = useState(false);
  const dispatch = useDispatch();
  const permissions = useSelector((state) => state.admin.permissions);
  
  // Add validation error states
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [phoneError, setPhoneError] = useState('');

  // initialize the page
  useEffect(() => {
    const initializeUserManagement = async () => {
      try {
        setLoading(true);
        // Fetch users
        await fetchUsers();

      } catch (error) {
        console.error('Error initializing:', error);
      } finally {
        setLoading(false);
      }
    };
    
    initializeUserManagement();
  }, [dispatch, router, filter, sortOption]);
  
  // Add function to verify permission access
  const hasPermission = (permissionName) => {
    return permissions.includes(permissionName);
  };

  // Fetch users from database
  const fetchUsers = async () => {
    try {
      const parts = sortOption.split('_');
      const sortOrder = parts.pop();
      const sortBy = parts.join('_');
      let query = supabase
        .from('user')
        .select('*')
        .order(sortBy, { ascending: sortOrder === 'asc' });
      
      // Apply filter if not 'all'
      if (filter === 'verified') {
        query = query.eq('email_verified', true);
      } else if (filter === 'unverified') {
        query = query.eq('email_verified', false);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      setUsers(data || []);
      
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };
  
  // Handle filter change
  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
    setCurrentPage(1);
  };

  const handleSortChange = (newSortOption) => {
    setSortOption(newSortOption);
    setCurrentPage(1);
  };
  
  // Handle search
  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };
  
  // Open modal
  const openModal = (type, user = null) => {
    setModalType(type);
    setSelectedUser(user);
    
    // Initialize form state values with the user data if editing
    if (type === 'edit' && user) {
      setName(user.name || '');
      setEmail(user.email || '');
      setPhone(user.phone || '');
      setIsEmailVerified(user.email_verified || false);
      // Reset error states
      setNameError('');
      setEmailError('');
      setPhoneError('');
    } else {
      // Reset form values for other modal types
      setName('');
      setEmail('');
      setPhone('');
      setIsEmailVerified(false);
      // Reset error states
      setNameError('');
      setEmailError('');
      setPhoneError('');
    }
    
    setIsModalOpen(true);
  };
  
  // Close modal
  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedUser(null);
    // Reset form values and errors
    setName('');
    setEmail('');
    setPhone('');
    setIsEmailVerified(false);
    setNameError('');
    setEmailError('');
    setPhoneError('');
  };
  
  // Add function to hash password
  const hashPassword = async (password) => {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  };

  // Add function to send email
  const sendEmail = async (type, { to, name, password, locale }) => {
    try {
      const response = await fetch('/api/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type,
          to,
          name,
          password,
          locale,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to send email');
      }
      
      return data;
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  };
  
  // Edit user
  const editUser = async (userData) => {
    try {
      setProcessing(true);
      // Store original user data for activity logging
      const originalUserData = { ...selectedUser };
      
      // Validate email format first
      const emailValidation = validateEmail(userData.email);
      if (!emailValidation.valid) {
        toast.error(emailValidation.message);
        return;
      }
      
      // Check if email is being changed
      if (userData.email && userData.email !== originalUserData.email) {
        // Check if the new email already exists for a different user
        const { data: existingUsers, error: checkError } = await supabase
          .from('user')
          .select('id')
          .eq('email', userData.email)
          .neq('id', selectedUser.id); // Exclude the current user
        
        if (checkError) {
          console.error('Error checking existing user:', checkError);
          toast.error(`Error checking existing user: ${checkError.message}`);
          throw checkError;
        }
        
        if (existingUsers && existingUsers.length > 0) {
          toast.error('A user with this email address already exists');
          return;
        }
      }
      
      // Check if phone is being changed
      if (userData.phone && userData.phone !== originalUserData.phone) {
        // Check if the new phone already exists for a different user
        const { data: existingPhones, error: phoneCheckError } = await supabase
          .from('user')
          .select('id')
          .eq('phone', userData.phone)
          .neq('id', selectedUser.id); // Exclude the current user
        
        if (phoneCheckError) {
          console.error('Error checking existing phone:', phoneCheckError);
          toast.error(`Error checking existing phone: ${phoneCheckError.message}`);
          throw phoneCheckError;
        }
        
        if (existingPhones && existingPhones.length > 0) {
          toast.error('A user with this phone number already exists');
          return;
        }
      }
      
      // Handle checkbox inputs that come as 'on' or undefined
      if ('notifications_enabled' in userData) {
        userData.notifications_enabled = userData.notifications_enabled === 'on';
      }
      
      // Remove update_password from userData since it's not a database column
      const { update_password, ...dataToUpdate } = userData;
      
      // If password update is requested, generate and hash new password
      let newPassword = null;
      if (update_password) {
        newPassword = generateSecurePassword();
        dataToUpdate.password_hash = await hashPassword(newPassword);
      }
      
      // Add updated_at timestamp
      dataToUpdate.updated_at = new Date().toISOString();
      
      const { data, error } = await supabase
        .from('user')
        .update(dataToUpdate)
        .eq('id', selectedUser.id)
        .select()
        .single();
      
      if (error) {
        console.error('Supabase error:', error);
        
        // Handle specific database errors
        if (error.code === '23505') {
          if (error.message.includes('email')) {
            toast.error('A user with this email address already exists');
          } else if (error.message.includes('phone')) {
            toast.error('A user with this phone number already exists');
          } else {
            toast.error(`Database constraint violation: ${error.message}`);
          }
          error.isHandled = true;
        } else {
          toast.error(`Failed to update user: ${error.message}`);
        }
        throw error;
      }
      
      // If password was updated, send email notification
      if (newPassword) {
        try {
          await sendEmail('password_update', {
            to: data.email,
            name: data.name || data.email,
            password: newPassword,
            locale: data.language || 'en'
          });
          toast.success('Password updated and sent to user via email');
        } catch (emailError) {
          console.error('Error sending password update email:', emailError);
          toast.error('User updated but failed to send password notification email');
          throw emailError;
        }
      }
      
      // Update local data
      setUsers(users.map(user => 
        user.id === selectedUser.id ? { ...user, ...dataToUpdate } : user
      ));
      
      // Create a detailed changes log for admin activity
      const changes = {};
      Object.keys(dataToUpdate).forEach(key => {
        if (key !== 'updated_at' && dataToUpdate[key] !== originalUserData[key]) {
          changes[key] = {
            from: originalUserData[key],
            to: dataToUpdate[key]
          };
        }
      });
      
      // Log activity with detailed changes
      if (adminData && Object.keys(changes).length > 0) {
        await supabase.from('admin_activity_log').insert({
          admin_id: adminData.id,
          action: 'update_user',
          entity_type: 'user',
          entity_id: selectedUser.id,
          details: {
            changes: changes,
            updated_fields: Object.keys(changes),
            user_email: data.email,
            user_name: data.name
          },
          ip_address: '127.0.0.1',
          user_agent: navigator.userAgent
        });
      }
      
      toast.success(`User "${data.name || data.email}" updated successfully`);
      closeModal();
      
    } catch (error) {
      console.error('Error updating user:', error);
      // Don't double-toast errors that are already handled
      if (!error.isHandled) {
        toast.error(`Failed to update user: ${error.message}`);
      }
    } finally {
      setProcessing(false);
    }
  };
  
  // Delete user
  const deleteUser = async () => {
    try {
      setProcessing(true);
      const confirmationInput = document.getElementById('delete-confirmation');
      const confirmationValue = confirmationInput.value.trim();
      const fullNameOrEmail = selectedUser.name || selectedUser.email;
      const expectedValue = fullNameOrEmail.length > 15 ? fullNameOrEmail.substring(0, 15) : fullNameOrEmail;
      
      if (confirmationValue !== expectedValue) {
        toast.error('Confirmation text does not match. Please try again.');
        setProcessing(false);
        return;
      }
      
      const { error } = await supabase
        .from('user')
        .delete()
        .eq('id', selectedUser.id);
      
      if (error) {
        toast.error(`Failed to delete user: ${error.message}`);
        throw error;
      }
      
      // Update local data
      setUsers(users.filter(user => user.id !== selectedUser.id));
      
      // Log activity
      if (adminData) {
        await supabase.from('admin_activity_log').insert({
          admin_id: adminData.id,
          action: 'delete_user',
          entity_type: 'user',
          entity_id: selectedUser.id,
          ip_address: '127.0.0.1',
          user_agent: navigator.userAgent
        });
      }
      
      toast.success(`User deleted successfully`);
      closeModal();
      
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error(`Failed to delete user: ${error.message}`);
    } finally {
      setProcessing(false);
    }
  };
  
  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };
  
  // Filter users by search query
  const filteredUsers = users.filter(user => {
    const searchLower = searchQuery.toLowerCase();
    return (
      user.name?.toLowerCase().includes(searchLower) ||
      user.email?.toLowerCase().includes(searchLower)
    );
  });
  
  // Pagination
  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
  
  // Add user
  const addUser = async (userData) => {
    try {
      setProcessing(true);
      
      // Validate email format first
      const emailValidation = validateEmail(userData.email);
      if (!emailValidation.valid) {
        toast.error(emailValidation.message);
        return;
      }
      
      // Then check if email already exists
      const { data: existingUsers, error: checkError } = await supabase
        .from('user')
        .select('id')
        .eq('email', userData.email);
      
      if (checkError) {
        console.error('Error checking existing user:', checkError);
        toast.error(`Error checking existing user: ${checkError.message}`);
        throw checkError;
      }
      
      if (existingUsers && existingUsers.length > 0) {
        toast.error('A user with this email address already exists');
        return;
      }
      
      // If phone is provided, check for duplicate phone
      if (userData.phone) {
        const { data: existingPhones, error: phoneCheckError } = await supabase
          .from('user')
          .select('id')
          .eq('phone', userData.phone);
          
        if (phoneCheckError) {
          console.error('Error checking existing phone:', phoneCheckError);
          toast.error(`Error checking existing phone: ${phoneCheckError.message}`);
          throw phoneCheckError;
        }
        
        if (existingPhones && existingPhones.length > 0) {
          toast.error('A user with this phone number already exists');
          return;
        }
      }
      
      // Generate a proper UUID (follows RFC4122 format)
      const id = crypto.randomUUID ? crypto.randomUUID() : 
        'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          const r = Math.random() * 16 | 0;
          const v = c === 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
      
      // Generate a secure password
      const password = generateSecurePassword();
      
      // Hash the password
      const password_hash = await hashPassword(password);
      
      // Add the ID and hashed password to the user data
      const userDataWithId = {
        ...userData,
        id,
        password_hash,
        theme: 'system',
        language: 'en',
        notifications_enabled: true
      };
      
      
      
      // Insert directly using Supabase client
      const { data, error } = await supabase
        .from('user')
        .insert([userDataWithId])
        .select()
        .single();
      
      if (error) {
        console.error('Supabase error:', error);
        
        // Handle specific database errors
        if (error.code === '23505') {
          if (error.message.includes('email')) {
            toast.error('A user with this email address already exists');
          } else if (error.message.includes('phone')) {
            toast.error('A user with this phone number already exists');
          } else {
            toast.error(`Database constraint violation: ${error.message}`);
          }
          error.isHandled = true;
        } else {
          toast.error(`Failed to add user: ${error.message}`);
        }
        throw error;
      }
      
      // If user creation was successful, create a free subscription for them
      if (data) {
        try {
          const subResponse = await fetch('/api/subscription/create-free', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: data.id,
              email: data.email,
              name: data.name,
            }),
          });

          if (!subResponse.ok) {
            const subErrorData = await subResponse.json();
            toast.error(`User created, but failed to add free subscription: ${subErrorData.error || 'Unknown error'}`);
          }
        } catch (subError) {
          console.error('Error creating subscription:', subError);
          toast.error('User created, but an error occurred while creating the subscription.');
        }
      }
      
      // Send account creation email with the plain text password
      try {
        await sendEmail('account_creation', {
          to: data.email,
          name: data.name || data.email,
          password: password,
          locale: data.language || 'en'
        });
      } catch (emailError) {
        console.error('Error sending account creation email:', emailError);
        toast.error('User created but failed to send email notification');
      }
      
      // Update local data
      setUsers([data, ...users]);
      
      // Log activity
      if (adminData) {
        await supabase.from('admin_activity_log').insert({
          admin_id: adminData.id,
          action: 'create_user',
          entity_type: 'user',
          entity_id: data.id,
          details: { created_fields: Object.keys(userDataWithId) },
          ip_address: '127.0.0.1',
          user_agent: navigator.userAgent
        });
      }
      
      toast.success(`User "${data.name || data.email}" created successfully`);
      closeModal();
      
    } catch (error) {
      console.error('Error adding user:', error);
      // Don't double-toast errors that are already handled above
      if (!error.isHandled) {
        toast.error(`Failed to add user: ${error.message}`);
      }
    } finally {
      setProcessing(false);
    }
  };
  
  // Copy full name to clipboard and show toast
  const handleCopyName = (name) => {
    if (!name) return;
    navigator.clipboard.writeText(name).then(() => {
      toast.success('Full name copied to clipboard!');
    }).catch(() => {
      toast.error('Failed to copy name.');
    });
  };
  
  useEffect(() => {
    if (isModalOpen && modalType === 'delete' && selectedUser) {
      const expectedValue = selectedUser.name || selectedUser.email;
      console.log('Delete confirmation expected value:', expectedValue);
    }
  }, [isModalOpen, modalType, selectedUser]);
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
        {/* Main Content */}
        <div className="w-full p-6">
          {/* Top Controls Skeleton */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              {/* Filter Icon */}
              <div className="flex items-center text-gray-400">
                <div className="h-5 w-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              </div>
              
              {/* Filter Dropdown */}
              <div className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md h-9 w-32 animate-pulse">
                <div className="h-full flex items-center px-3">
                  <span className="text-gray-400 animate-pulse">All Users</span>
                </div>
              </div>
              
              {/* Search Bar */}
              <div className="relative">
                <div className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md h-9 w-64 animate-pulse">
                  <div className="h-full flex items-center px-9">
                    <span className="text-gray-400 animate-pulse">Search users...</span>
                  </div>
                </div>
                <div className="absolute left-3 top-2.5 text-gray-400">
                  <div className="h-4 w-4 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
                </div>
              </div>
            </div>
            
            {/* Add New User Button */}
            <div className="bg-indigo-600 rounded-md h-9 w-36 animate-pulse flex items-center justify-center">
              <span className="text-white animate-pulse">Add New User</span>
            </div>
          </div>
          
          {/* Users Table Skeleton */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    {["User", "Email", "Status", "Registered", "Actions"].map((header) => (
                      <th key={header} className="px-4 py-3 text-left">
                        <div className="h-4 w-20 bg-gray-200 dark:bg-gray-600 rounded animate-pulse"></div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((row) => (
                    <tr key={row} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse mr-3"></div>
                          <div>
                            <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2"></div>
                            <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="h-4 w-36 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="h-5 w-24 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-right">
                        <div className="flex justify-end space-x-3">
                          <div className="h-4 w-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                          <div className="h-4 w-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Pagination Skeleton */}
            <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 flex items-center justify-between border-t border-gray-200 dark:border-gray-700">
              <div className="flex-1 flex justify-between items-center">
                <div className="h-8 w-24 bg-gray-200 dark:bg-gray-600 rounded animate-pulse"></div>
                <div className="h-5 w-32 bg-gray-200 dark:bg-gray-600 rounded animate-pulse"></div>
                <div className="h-8 w-24 bg-gray-200 dark:bg-gray-600 rounded animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div>
      {hasPermission('view_users') ? (
      <div>
      {/* User Management Content */}
      <div className="p-6">
        {/* Top Controls */}
        <div className="flex flex-col md:flex-row justify-between mb-6 gap-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Filter */}
            <div className="flex items-center space-x-2">
              <FaFilter className="text-gray-400" />
              <select 
                className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md py-1.5 px-3 text-sm"
                value={filter}
                onChange={(e) => handleFilterChange(e.target.value)}
              >
                <option value="all">All Users</option>
                <option value="verified">Verified</option>
                <option value="unverified">Unverified</option>
              </select>
            </div>
            
            {/* Sort */}
            <div className="flex items-center space-x-2">
              <FaSort className="text-gray-400" />
              <select 
                className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md py-1.5 px-3 text-sm"
                value={sortOption}
                onChange={(e) => handleSortChange(e.target.value)}
              >
                <option value="created_at_desc">Newest First</option>
                <option value="created_at_asc">Oldest First</option>
                <option value="name_asc">Name (A-Z)</option>
                <option value="name_desc">Name (Z-A)</option>
              </select>
            </div>
            
            {/* Search */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search users..."
                className="pl-9 pr-4 py-1.5 w-full md:w-64 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md text-sm"
                value={searchQuery}
                onChange={handleSearch}
              />
              <FaSearch className="absolute left-3 top-2 text-gray-400" />
            </div>
          </div>
          
          {/* Add User Button */}
          {hasPermission('add_users') && (
          <button
            onClick={() => openModal('add')}
            className="flex items-center justify-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm"
          >
            <FaUserPlus className="mr-2" />
            Add New User
          </button>
          )}
        </div>
        
        {/* Users Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Registered
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {currentUsers.length > 0 ? (
                  currentUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-750 cursor-pointer" onClick={() => openModal('details', user)}>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-300 font-semibold mr-3">
                            {user.name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || 'U'}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white" title={user.name || 'Unnamed User'}>
                              {truncateText(user.name, 20) || 'Unnamed User'}
                            </div>
                            {user.phone && (
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {user.phone}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {user.email}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        {user.email_verified ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-800/30 dark:text-green-300">
                            <FaUserCheck className="mr-1" />
                            Verified
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-800/30 dark:text-yellow-300">
                            <FaUserLock className="mr-1" />
                            Unverified
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(user.created_at)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-right" onClick={(e) => e.stopPropagation()}>
                        {hasPermission('edit_users') && (
                        <button
                          onClick={() => openModal('edit', user)}
                          className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 mr-3"
                        >
                          <FaEdit />
                        </button>
                        )}
                        {hasPermission('delete_users') && (
                        <button
                          onClick={() => openModal('delete', user)}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                        >
                          <FaTrash />
                        </button>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="px-4 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                      {searchQuery
                        ? 'No users match your search criteria'
                        : 'No users found'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {filteredUsers.length > usersPerPage && (
            <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 flex items-center justify-between border-t border-gray-200 dark:border-gray-700">
              <div className="flex-1 flex justify-between items-center">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className={`relative inline-flex items-center px-4 py-2 text-sm font-medium rounded-md ${
                    currentPage === 1
                      ? 'text-gray-400 bg-gray-100 dark:text-gray-500 dark:bg-gray-800 cursor-not-allowed'
                      : 'text-gray-700 bg-white hover:bg-gray-50 dark:text-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700'
                  }`}
                >
                  Previous
                </button>
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className={`relative inline-flex items-center px-4 py-2 text-sm font-medium rounded-md ${
                    currentPage === totalPages
                      ? 'text-gray-400 bg-gray-100 dark:text-gray-500 dark:bg-gray-800 cursor-not-allowed'
                      : 'text-gray-700 bg-white hover:bg-gray-50 dark:text-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700'
                  }`}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>): (
      <div className="min-h-screen flex items-center justify-center">
        <AccessRestrictedModal />
      </div>
      )}
      
      {/* Add User Modal */}
      {isModalOpen && modalType === 'add' && (
        <div className='fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50'>
          <div className='bg-white dark:bg-gray-800 rounded-lg shadow-lg w-full max-w-md p-6'>
            <div className='flex justify-between items-center mb-4'>
              <h2 className='text-xl font-semibold text-gray-800 dark:text-white'>Add New User</h2>
              <button
                onClick={closeModal}
                className='text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              >
                &times;
              </button>
            </div>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              
              // Validate inputs
              let hasError = false;
              
              if (!name || name.trim() === '') {
                setNameError('Full name is required.');
                hasError = true;
              } else if (name.length > 50) {
                setNameError('Full name must be maximum 50 characters.');
                hasError = true;
              }
              
              // Use the validateEmail function
              const emailValidation = validateEmail(email);
              if (!emailValidation.valid) {
                setEmailError(emailValidation.message);
                hasError = true;
              }
              
              // Validate phone if provided
              if (phone && phone.trim() !== '') {
                const phoneValidation = validatePhone(phone);
                if (!phoneValidation.valid) {
                  setPhoneError(phoneValidation.message);
                  hasError = true;
                }
              }
              
              if (hasError) {
                return;
              }
              
              const userData = {
                name: name,
                email: email,
                phone: phone || null,
                email_verified: true,
                created_at: new Date().toISOString()
              };
              
              addUser(userData);
            }}>
              <div className='space-y-4'>
                <div>
                  <label htmlFor='name' className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                    Full Name
                  </label>
                  <input
                    type='text'
                    id='name'
                    name='name'
                    value={name}
                    className={`w-full px-3 py-2 border rounded-md text-sm shadow-sm
                      placeholder-gray-400 dark:placeholder-gray-500 dark:bg-gray-700 dark:text-white
                      focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500
                      ${nameError ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                    placeholder='Enter user name'
                    onChange={(e) => {
                      setName(e.target.value);
                      setNameError('');
                      if (e.target.value.length > 50 || e.target.value.length < 1) {
                        setNameError('Full name must be 1-50 characters.');
                      }
                    }}
                    onBlur={(e) => {
                      if (!e.target.value || e.target.value.trim() === '' || e.target.value.length > 50 || e.target.value.length < 1) {
                        setNameError('Full name must be 1-50 characters.');
                      }
                    }}
                  />
                  <p className="text-xs text-red-600 mt-1" style={{minHeight: '1.25em'}}>{nameError}</p>
                </div>
                
                <div>
                  <label htmlFor='email' className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                    Email
                  </label>
                  <input
                    type='text'
                    id='email'
                    name='email'
                    value={email}
                    className={`w-full px-3 py-2 border rounded-md text-sm shadow-sm
                      placeholder-gray-400 dark:placeholder-gray-500 dark:bg-gray-700 dark:text-white
                      focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500
                      ${emailError ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                    placeholder='Enter email address'
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setEmailError('');
                      
                      // Validate email as user types
                      if (e.target.value && e.target.value.trim() !== '') {
                        const validation = validateEmail(e.target.value);
                        if (!validation.valid) {
                          setEmailError(validation.message);
                        }
                      }
                    }}
                    onBlur={(e) => {
                      // Use validateEmail function
                      const validation = validateEmail(e.target.value);
                      if (!validation.valid) {
                        setEmailError(validation.message);
                      }
                    }}
                  />
                  <p className="text-xs text-red-600 mt-1" style={{minHeight: '1.25em'}}>{emailError}</p>
                </div>
                
                <div>
                  <label htmlFor='phone' className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                    Phone (optional)
                  </label>
                  <input
                    type='text'
                    id='phone'
                    name='phone'
                    value={phone}
                    className={`w-full px-3 py-2 border rounded-md text-sm shadow-sm
                      placeholder-gray-400 dark:placeholder-gray-500 dark:bg-gray-700 dark:text-white
                      focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500
                      ${phoneError ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                    placeholder='Enter phone number'
                    onChange={(e) => {
                      setPhone(e.target.value);
                      setPhoneError('');
                    }}
                    onBlur={(e) => {
                      if (e.target.value && e.target.value.trim() !== '') {
                        const phoneValidation = validatePhone(e.target.value);
                        if (!phoneValidation.valid) {
                          setPhoneError(phoneValidation.message);
                        }
                      }
                    }}
                  />
                  <p className="text-xs text-red-600 mt-1" style={{minHeight: '1.25em'}}>{phoneError}</p>
                </div>
              </div>
              
              <div className='mt-6 flex justify-end space-x-3'>
                <button
                  type='button'
                  onClick={closeModal}
                  className='px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium
                    text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600'
                  disabled={processing}
                >
                  Cancel
                </button>
                
                <button
                  type='submit'
                  disabled={processing}
                  className='px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium
                    text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2
                    focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400 disabled:cursor-not-allowed'
                >
                  {processing ? (
                    <>
                      <span className="inline-block animate-spin h-4 w-4 border-t-2 border-b-2 border-white rounded-full mr-2"></span>
                      Adding...
                    </>
                  ) : 'Add User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {isModalOpen && modalType === 'edit' && selectedUser && (
        <div className='fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50'>
          <div className='bg-white dark:bg-gray-800 rounded-lg shadow-lg w-full max-w-md p-6'>
            <div className='flex justify-between items-center mb-4'>
              <h2 className='text-xl font-semibold text-gray-800 dark:text-white'>Edit User</h2>
              <button
                onClick={closeModal}
                className='text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              >
                &times;
              </button>
            </div>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              
              // Validate inputs
              let hasError = false;
              
              if (!name || name.trim() === '') {
                setNameError('Full name is required.');
                hasError = true;
              } else if (name.length > 50) {
                setNameError('Full name must be maximum 50 characters.');
                hasError = true;
              }
              
              // Use the validateEmail function
              const emailValidation = validateEmail(email);
              if (!emailValidation.valid) {
                setEmailError(emailValidation.message);
                hasError = true;
              }
              
              // Validate phone if provided
              if (phone && phone.trim() !== '') {
                const phoneValidation = validatePhone(phone);
                if (!phoneValidation.valid) {
                  setPhoneError(phoneValidation.message);
                  hasError = true;
                }
              }
              
              if (hasError) {
                return;
              }
              
              const userData = {
                name: name,
                email: email,
                phone: phone || null,
                email_verified: isEmailVerified,
                update_password: e.target.querySelector('[name="update_password"]').checked,
                updated_at: new Date().toISOString()
              };
              
              editUser(userData);
            }}>
              <div className='space-y-4'>
                <div>
                  <label htmlFor='edit-name' className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                    Full Name
                  </label>
                  <input
                    type='text'
                    id='edit-name'
                    name='name'
                    value={name}
                    className={`w-full px-3 py-2 border rounded-md text-sm shadow-sm
                      placeholder-gray-400 dark:placeholder-gray-500 dark:bg-gray-700 dark:text-white
                      focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500
                      ${nameError ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                    placeholder='Enter user name'
                    onChange={(e) => {
                      setName(e.target.value);
                      setNameError('');
                      if (e.target.value.length > 50 || e.target.value.length < 1) {
                        setNameError('Full name must be 1-50 characters.');
                      }
                    }}
                    onBlur={(e) => {
                      if (!e.target.value || e.target.value.trim() === '' || e.target.value.length > 50 || e.target.value.length < 1) {
                        setNameError('Full name must be 1-50 characters.');
                      }
                    }}
                  />
                  <p className="text-xs text-red-600 mt-1" style={{minHeight: '1.25em'}}>{nameError}</p>
                </div>
                
                <div>
                  <label htmlFor='edit-email' className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                    Email
                  </label>
                  <input
                    type='text'
                    id='edit-email'
                    name='email'
                    value={email}
                    className={`w-full px-3 py-2 border rounded-md text-sm shadow-sm
                      placeholder-gray-400 dark:placeholder-gray-500 dark:bg-gray-700 dark:text-white
                      focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500
                      ${emailError ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                    placeholder='Enter email address'
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setEmailError('');
                      
                      // Validate email as user types
                      if (e.target.value && e.target.value.trim() !== '') {
                        const validation = validateEmail(e.target.value);
                        if (!validation.valid) {
                          setEmailError(validation.message);
                        }
                      }
                    }}
                    onBlur={(e) => {
                      // Use validateEmail function
                      const validation = validateEmail(e.target.value);
                      if (!validation.valid) {
                        setEmailError(validation.message);
                      }
                    }}
                  />
                  <p className="text-xs text-red-600 mt-1" style={{minHeight: '1.25em'}}>{emailError}</p>
                </div>
                
                <div>
                  <label htmlFor='edit-phone' className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                    Phone (optional)
                  </label>
                  <input
                    type='text'
                    id='edit-phone'
                    name='phone'
                    value={phone}
                    className={`w-full px-3 py-2 border rounded-md text-sm shadow-sm
                      placeholder-gray-400 dark:placeholder-gray-500 dark:bg-gray-700 dark:text-white
                      focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500
                      ${phoneError ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                    placeholder='Enter phone number'
                    onChange={(e) => {
                      setPhone(e.target.value);
                      setPhoneError('');
                    }}
                    onBlur={(e) => {
                      if (e.target.value && e.target.value.trim() !== '') {
                        const phoneValidation = validatePhone(e.target.value);
                        if (!phoneValidation.valid) {
                          setPhoneError(phoneValidation.message);
                        }
                      }
                    }}
                  />
                  <p className="text-xs text-red-600 mt-1" style={{minHeight: '1.25em'}}>{phoneError}</p>
                </div>
                
                <div>
                  <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                    Verification Status
                  </label>
                  <div className='flex items-center space-x-4'>
                    <label className='inline-flex items-center'>
                      <input
                        type='radio'
                        name='email_verified'
                        value='true'
                        defaultChecked={selectedUser.email_verified === true}
                        className='h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500'
                      />
                      <span className='ml-2 text-sm text-gray-700 dark:text-gray-300'>Verified</span>
                    </label>
                    
                    <label className='inline-flex items-center'>
                      <input
                        type='radio'
                        name='email_verified'
                        value='false'
                        defaultChecked={selectedUser.email_verified !== true}
                        className='h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500'
                      />
                      <span className='ml-2 text-sm text-gray-700 dark:text-gray-300'>Unverified</span>
                    </label>
                  </div>
                </div>
                
                <div>
                  <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                    Notification Preferences
                  </label>
                  <div className='flex items-center'>
                    <input
                      type='checkbox'
                      id='edit-notifications'
                      name='notifications_enabled'
                      defaultChecked={selectedUser.notifications_enabled !== false}
                      className='h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500'
                    />
                    <label htmlFor='edit-notifications' className='ml-2 text-sm text-gray-700 dark:text-gray-300'>
                      Enable email notifications
                    </label>
                  </div>
                </div>
                
                <div>
                  <label className='flex items-center space-x-2'>
                    <input
                      type='checkbox'
                      name='update_password'
                      className='h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500'
                    />
                    <span className='text-sm text-gray-700 dark:text-gray-300'>
                      Generate and send new password to user
                    </span>
                  </label>
                </div>
                
                <div className='pt-3 border-t border-gray-200 dark:border-gray-700'>
                  <p className='text-xs text-gray-500 dark:text-gray-400'>
                    User ID: {selectedUser.id}<br />
                    Created: {formatDate(selectedUser.created_at)}<br />
                    Last Updated: {formatDate(selectedUser.updated_at)}
                  </p>
                </div>
              </div>
              
              <div className='mt-6 flex justify-end space-x-3'>
                <button
                  type='button'
                  onClick={closeModal}
                  disabled={processing}
                  className='px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium
                    text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600'
                >
                  Cancel
                </button>
                
                <button
                  type='submit'
                  disabled={processing}
                  className='px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium
                    text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2
                    focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400 disabled:cursor-not-allowed'
                >
                  {processing ? (
                    <>
                      <span className="inline-block animate-spin h-4 w-4 border-t-2 border-b-2 border-white rounded-full mr-2"></span>
                      Saving...
                    </>
                  ) : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete User Modal */}
      {isModalOpen && modalType === 'delete' && selectedUser && (
        <div className='fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50'>
          <div className='bg-white dark:bg-gray-800 rounded-lg shadow-lg w-full max-w-md p-6'>
            <div className='flex justify-between items-center mb-4'>
              <h2 className='text-xl font-semibold text-gray-800 dark:text-white'>Delete User</h2>
              <button
                onClick={closeModal}
                className='text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              >
                &times;
              </button>
            </div>
            
            <div className='space-y-4'>
              <div className='flex items-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-100 dark:border-red-800'>
                <div className='flex-shrink-0 mr-3 text-red-500 dark:text-red-400'>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h3 className='text-sm font-medium text-red-800 dark:text-red-200'>Warning: This action cannot be undone</h3>
                  <p className='mt-1 text-sm text-red-700 dark:text-red-300'>
                    You are about to permanently delete this user account and all associated data.
                  </p>
                </div>
              </div>
              
              <div className='p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600'>
                <h4 className='text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>User Details</h4>
                <div className='flex items-center mb-2'>
                  <div className='w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-300 font-semibold mr-3'>
                    {selectedUser.name?.charAt(0).toUpperCase() || selectedUser.email?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div>
                    <p className='text-sm font-medium text-gray-900 dark:text-white' title={selectedUser.name || 'Unnamed User'}>
                      {truncateText(selectedUser.name, 20) || 'Unnamed User'}
                    </p>
                    <p className='text-xs text-gray-500 dark:text-gray-400'>{selectedUser.email}</p>
                  </div>
                </div>
                <p className='text-xs text-gray-500 dark:text-gray-400'>
                  Registered: {formatDate(selectedUser.created_at)}
                </p>
              </div>
              
              <div className='p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-100 dark:border-yellow-800'>
                <p className='text-sm text-yellow-700 dark:text-yellow-300'>
                  To confirm deletion, please type the user's name (or the first 15 characters if it is too long) below:
                </p>
                <input
                  type='text'
                  id='delete-confirmation'
                  className='mt-2 w-full px-3 py-2 border border-yellow-300 dark:border-yellow-700 rounded-md text-sm
                    placeholder-yellow-500 dark:placeholder-yellow-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                    focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500'
                  placeholder={`Type ${selectedUser.name || selectedUser.email} to confirm`}
                />
              </div>
            </div>
            
            <div className='mt-6 flex justify-end space-x-3'>
              <button
                type='button'
                onClick={closeModal}
                disabled={processing}
                className='px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium
                  text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600'
              >
                Cancel
              </button>
              
              <button
                type='button'
                onClick={deleteUser}
                disabled={processing}
                className='px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium
                  text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2
                  focus:ring-offset-2 focus:ring-red-500 disabled:bg-red-400 disabled:cursor-not-allowed'
              >
                {processing ? (
                  <>
                    <span className="inline-block animate-spin h-4 w-4 border-t-2 border-b-2 border-white rounded-full mr-2"></span>
                    Deleting...
                  </>
                ) : 'Delete User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Details Modal */}
      {isModalOpen && modalType === 'details' && selectedUser && (
        <div className='fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50'>
          <div className='bg-white dark:bg-gray-800 rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] flex flex-col p-6 overflow-hidden'>
            <div className='flex justify-between items-center mb-4'>
              <h2 className='text-xl font-semibold text-gray-800 dark:text-white'>User Details</h2>
              <button
                onClick={closeModal}
                className='text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              >
                &times;
              </button>
            </div>
            
            <div className='space-y-6 overflow-y-auto pr-2'>
              {/* User Header with Avatar */}
              <div className='flex items-center'>
                <div className='w-16 h-16 rounded-full bg-indigo-100 dark:bg-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-300 text-xl font-semibold mr-4'>
                  {selectedUser.name?.charAt(0).toUpperCase() || selectedUser.email?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div>
                  <h3 className='text-lg font-medium text-gray-900 dark:text-white' title={selectedUser.name || 'Unnamed User'}>
                    {truncateText(selectedUser.name, 20) || 'Unnamed User'}
                    {selectedUser.name && (
                      <button
                        type='button'
                        className='ml-2 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700'
                        onClick={() => handleCopyName(selectedUser.name)}
                        title='Copy full name'
                      >
                        <FaCopy className='inline-block text-gray-500 dark:text-gray-300' />
                      </button>
                    )}
                  </h3>
                  <p className='text-sm text-gray-500 dark:text-gray-400'>{selectedUser.email}</p>
                </div>
                <div className='ml-auto'>
                  {selectedUser.email_verified ? (
                    <span className='inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 dark:bg-green-800/30 dark:text-green-300'>
                      <FaUserCheck className='mr-1' />
                      Verified
                    </span>
                  ) : (
                    <span className='inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-800/30 dark:text-yellow-300'>
                      <FaUserLock className='mr-1' />
                      Unverified
                    </span>
                  )}
                </div>
              </div>
              
              {/* User Details Grid */}
              <div className='grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg border border-gray-200 dark:border-gray-600'>
                <div>
                  <h4 className='text-sm font-medium text-gray-500 dark:text-gray-300 uppercase mb-2'>Basic Information</h4>
                  <div className='space-y-3'>
                    <div>
                      <p className='text-xs text-gray-500 dark:text-gray-400'>ID</p>
                      <p className='text-sm font-medium text-gray-900 dark:text-white break-all'>{selectedUser.id}</p>
                    </div>
                    <div>
                      <p className='text-xs text-gray-500 dark:text-gray-400'>Name</p>
                      <p className='text-sm font-medium text-gray-900 dark:text-white' title={selectedUser.name || 'Not provided'}>
                        {truncateText(selectedUser.name, 20) || 'Not provided'}
                      </p>
                    </div>
                    <div>
                      <p className='text-xs text-gray-500 dark:text-gray-400'>Email</p>
                      <p className='text-sm font-medium text-gray-900 dark:text-white'>{selectedUser.email}</p>
                    </div>
                    <div>
                      <p className='text-xs text-gray-500 dark:text-gray-400'>Phone</p>
                      <p className='text-sm font-medium text-gray-900 dark:text-white'>{selectedUser.phone || 'Not provided'}</p>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className='text-sm font-medium text-gray-500 dark:text-gray-300 uppercase mb-2'>Account Information</h4>
                  <div className='space-y-3'>
                    <div>
                      <p className='text-xs text-gray-500 dark:text-gray-400'>Registered</p>
                      <p className='text-sm font-medium text-gray-900 dark:text-white'>{formatDate(selectedUser.created_at)}</p>
                    </div>
                    <div>
                      <p className='text-xs text-gray-500 dark:text-gray-400'>Last Updated</p>
                      <p className='text-sm font-medium text-gray-900 dark:text-white'>{formatDate(selectedUser.updated_at) || 'Never updated'}</p>
                    </div>
                    <div>
                      <p className='text-xs text-gray-500 dark:text-gray-400'>Last Login</p>
                      <p className='text-sm font-medium text-gray-900 dark:text-white'>{formatDate(selectedUser.last_seen_at) || 'Never logged in'}</p>
                    </div>
                    <div>
                      <p className='text-xs text-gray-500 dark:text-gray-400'>Status</p>
                      <p className='text-sm font-medium text-gray-900 dark:text-white'>
                        {selectedUser.is_online ? (
                          <span className='inline-flex items-center text-green-600 dark:text-green-400'>
                            <span className='w-2 h-2 bg-green-500 rounded-full mr-1.5'></span>
                            Online
                          </span>
                        ) : (
                          <span className='inline-flex items-center text-gray-600 dark:text-gray-400'>
                            <span className='w-2 h-2 bg-gray-400 rounded-full mr-1.5'></span>
                            Offline
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Settings & Preferences */}
              <div className='bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg border border-gray-200 dark:border-gray-600'>
                <h4 className='text-sm font-medium text-gray-500 dark:text-gray-300 uppercase mb-2'>Settings & Preferences</h4>
                <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                  <div>
                    <p className='text-xs text-gray-500 dark:text-gray-400'>Theme</p>
                    <p className='text-sm font-medium text-gray-900 dark:text-white capitalize'>{selectedUser.theme || 'System'}</p>
                  </div>
                  <div>
                    <p className='text-xs text-gray-500 dark:text-gray-400'>Language</p>
                    <p className='text-sm font-medium text-gray-900 dark:text-white uppercase'>{selectedUser.language || 'EN'}</p>
                  </div>
                  <div>
                    <p className='text-xs text-gray-500 dark:text-gray-400'>Notifications</p>
                    <p className='text-sm font-medium text-gray-900 dark:text-white'>
                      {selectedUser.notifications_enabled !== false ? 'Enabled' : 'Disabled'}
                    </p>
                  </div>
                  <div>
                    <p className='text-xs text-gray-500 dark:text-gray-400'>MFA</p>
                    <p className='text-sm font-medium text-gray-900 dark:text-white'>
                      {selectedUser.is_mfa_enabled ? 'Enabled' : 'Disabled'}
                    </p>
                  </div>
                  <div>
                    <p className='text-xs text-gray-500 dark:text-gray-400'>Timezone</p>
                    <p className='text-sm font-medium text-gray-900 dark:text-white'>{selectedUser.timezone || 'UTC+0'}</p>
                  </div>
                  <div>
                    <p className='text-xs text-gray-500 dark:text-gray-400'>Hour Format</p>
                    <p className='text-sm font-medium text-gray-900 dark:text-white'>{selectedUser.hour_format || '24h'}</p>
                  </div>
                </div>
              </div>
              
              {/* Connected Accounts */}
              <div className='bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg border border-gray-200 dark:border-gray-600'>
                <h4 className='text-sm font-medium text-gray-500 dark:text-gray-300 uppercase mb-2'>Connected Accounts</h4>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                  <div className='flex items-center'>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${selectedUser.google_provider_id ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-300' : 'bg-gray-100 text-gray-400 dark:bg-gray-600 dark:text-gray-400'}`}>
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                      </svg>
                    </div>
                    <div>
                      <p className='text-sm font-medium text-gray-900 dark:text-white'>Google</p>
                      <p className='text-xs text-gray-500 dark:text-gray-400'>
                        {selectedUser.google_provider_id ? 'Connected' : 'Not connected'}
                      </p>
                    </div>
                  </div>
                  <div className='flex items-center'>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${selectedUser.github_provider_id ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/50 dark:text-purple-300' : 'bg-gray-100 text-gray-400 dark:bg-gray-600 dark:text-gray-400'}`}>
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                      </svg>
                    </div>
                    <div>
                      <p className='text-sm font-medium text-gray-900 dark:text-white'>GitHub</p>
                      <p className='text-xs text-gray-500 dark:text-gray-400'>
                        {selectedUser.github_provider_id ? 'Connected' : 'Not connected'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className='flex justify-end space-x-3 pt-4 mt-4 border-t border-gray-200 dark:border-gray-600'>
              {hasPermission('edit_users') && (
                <button
                  type='button'
                  onClick={() => {
                    closeModal();
                    openModal('edit', selectedUser);
                  }}
                  className='px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium
                    text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600'
                >
                  Edit User
                </button>
              )}
              <button
                type='button'
                onClick={closeModal}
                className='px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium
                  text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2
                  focus:ring-offset-2 focus:ring-indigo-500'
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
  </div>
  );
} 