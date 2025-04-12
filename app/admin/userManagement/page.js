'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { FaBell, FaSearch, FaFilter, FaUserPlus, FaEdit, FaTrash, FaUserLock, FaUserCheck } from 'react-icons/fa';

export default function UserManagement() {
  const router = useRouter();
  
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all');
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
  
  // Fetch users on component mount
  useEffect(() => {
    const initialize = async () => {
      try {
        // Get current session
        const { data: sessionData } = await supabase.auth.getSession();
        
        if (sessionData.session) {
          // Get admin data
          const { data: admin } = await supabase
            .from('admin_user')
            .select('*')
            .eq('email', sessionData.session.user.email)
            .eq('is_active', true)
            .single();
            
          if (admin) {
            setAdminData(admin);
          }
        }
        
        // Fetch users
        await fetchUsers();
      } catch (error) {
        console.error('Error initializing:', error);
      } finally {
        setLoading(false);
      }
    };
    
    initialize();
  }, []);
  
  // Fetch users from database
  const fetchUsers = async () => {
    try {
      let query = supabase
        .from('user')
        .select('*')
        .order('created_at', { ascending: false });
      
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
    } else {
      // Reset form values for other modal types
      setName('');
      setEmail('');
      setPhone('');
      setIsEmailVerified(false);
    }
    
    setIsModalOpen(true);
  };
  
  // Close modal
  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedUser(null);
  };
  
  // Edit user
  const editUser = async (userData) => {
    try {
      // Store original user data for activity logging
      const originalUserData = { ...selectedUser };
      
      // Handle checkbox inputs that come as 'on' or undefined
      if ('notifications_enabled' in userData) {
        userData.notifications_enabled = userData.notifications_enabled === 'on';
      }
      
      // Add updated_at timestamp
      userData.updated_at = new Date().toISOString();
      
      const { data, error } = await supabase
        .from('user')
        .update(userData)
        .eq('id', selectedUser.id)
        .select()
        .single();
      
      if (error) throw error;
      
      // Update local data
      setUsers(users.map(user => 
        user.id === selectedUser.id ? { ...user, ...userData } : user
      ));
      
      // Create a detailed changes log for admin activity
      const changes = {};
      Object.keys(userData).forEach(key => {
        if (key !== 'updated_at' && userData[key] !== originalUserData[key]) {
          changes[key] = {
            from: originalUserData[key],
            to: userData[key]
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
      
      closeModal();
      
    } catch (error) {
      console.error('Error updating user:', error);
      alert(`Failed to update user: ${error.message}`);
    }
  };

  // Debug
  useEffect(()=>{
    console.log(email);
    console.log(name);
    console.log(phone);

  },[email,name,phone])

  
  // Delete user
  const deleteUser = async () => {
    try {
      const confirmationInput = document.getElementById('delete-confirmation');
      const confirmationValue = confirmationInput.value.trim();
      const expectedValue = selectedUser.name || selectedUser.email;
      
      if (confirmationValue !== expectedValue) {
        alert('Confirmation text does not match. Please try again.');
        return;
      }
      
      const { error } = await supabase
        .from('user')
        .delete()
        .eq('id', selectedUser.id);
      
      if (error) throw error;
      
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
      
      closeModal();
      
    } catch (error) {
      console.error('Error deleting user:', error);
      alert(`Failed to delete user: ${error.message}`);
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
  
  // Add user - Simple debug version
  // Add user
const addUser = async (userData) => {
    try {
      // Generate a proper UUID (follows RFC4122 format)
      const id = crypto.randomUUID ? crypto.randomUUID() : 
        'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          const r = Math.random() * 16 | 0;
          const v = c === 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
      
      // Add the ID to the user data
      const userDataWithId = {
        ...userData,
        id,
        provider: 'local', // From your signup code
        theme: 'system', // Default from your schema
        language: 'en', // Default from your schema
        notifications_enabled: true // Default from your schema
      };
      
      console.log('Inserting user with data:', userDataWithId);
      
      // Insert directly using Supabase client
      const { data, error } = await supabase
        .from('user')
        .insert([userDataWithId])
        .select()
        .single();
      
      if (error) {
        console.error('Supabase error:', error);
        throw error;
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
      
      closeModal();
      
    } catch (error) {
      console.error('Error adding user:', error);
      alert(`Failed to add user: ${error.message}`);
    }
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-slate-500 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading user data...</p>
        </div>
      </div>
    );
  }
  
  return (
    <>
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white">User Management</h2>
          
          <div className="flex items-center">
            <button className="p-2 mr-4 text-gray-500 dark:text-gray-400 hover:text-slate-500 dark:hover:text-slate-400">
              <FaBell />
            </button>
          </div>
        </div>
      </header>
      
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
          <button
            onClick={() => openModal('add')}
            className="flex items-center justify-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm"
          >
            <FaUserPlus className="mr-2" />
            Add New User
          </button>
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
                    <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-300 font-semibold mr-3">
                            {user.name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || 'U'}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {user.name || 'Unnamed User'}
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
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100">
                            <FaUserCheck className="mr-1" />
                            Verified
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100">
                            <FaUserLock className="mr-1" />
                            Unverified
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(user.created_at)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-right">
                        <button
                          onClick={() => openModal('edit', user)}
                          className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 mr-3"
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={() => openModal('delete', user)}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                        >
                          <FaTrash />
                        </button>
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
            <div className="bg-gray-50 dark:bg-gray-750 px-4 py-3 flex items-center justify-between border-t border-gray-200 dark:border-gray-700">
              <div className="flex-1 flex justify-between items-center">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className={`relative inline-flex items-center px-4 py-2 text-sm font-medium rounded-md ${
                    currentPage === 1
                      ? 'text-gray-400 bg-gray-100 dark:text-gray-500 dark:bg-gray-700 cursor-not-allowed'
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
                      ? 'text-gray-400 bg-gray-100 dark:text-gray-500 dark:bg-gray-700 cursor-not-allowed'
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
      
      {/* Modals would go here in a real implementation */}
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
              const userData = {
                name: name,
                email: email,
                phone: phone|| null,
                email_verified: isEmailVerified,
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
                    required
                    className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm shadow-sm
                      placeholder-gray-400 dark:placeholder-gray-500 dark:bg-gray-700 dark:text-white
                      focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                    placeholder='Enter user name'
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                
                <div>
                  <label htmlFor='email' className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                    Email
                  </label>
                  <input
                    type='email'
                    id='email'
                    name='email'
                    required
                    className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm shadow-sm
                      placeholder-gray-400 dark:placeholder-gray-500 dark:bg-gray-700 dark:text-white
                      focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                    placeholder='Enter email address'
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                
                <div>
                  <label htmlFor='phone' className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                    Phone (optional)
                  </label>
                  <input
                    type='tel'
                    id='phone'
                    name='phone'
                    className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm shadow-sm
                      placeholder-gray-400 dark:placeholder-gray-500 dark:bg-gray-700 dark:text-white
                      focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                    placeholder='Enter phone number'
                    onChange={(e) => setPhone(e.target.value)}
                  />
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
                        className='h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500'
                      />
                      <span className='ml-2 text-sm text-gray-700 dark:text-gray-300'>Verified</span>
                    </label>
                    
                    <label className='inline-flex items-center'>
                      <input
                        type='radio'
                        name='email_verified'
                        value={isEmailVerified}
                        className='h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500'
                        defaultChecked='false'
                      />
                      <span className='ml-2 text-sm text-gray-700 dark:text-gray-300'>Unverified</span>
                    </label>
                  </div>
                </div>
              </div>
              
              <div className='mt-6 flex justify-end space-x-3'>
                <button
                  type='button'
                  onClick={closeModal}
                  className='px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium
                    text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600'
                >
                  Cancel
                </button>
                
                <button
                  type='submit'
                  className='px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium
                    text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2
                    focus:ring-offset-2 focus:ring-indigo-500'
                >
                  Add User
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
            const userData = {
              name: name,
              email: email,
              phone: phone || null,
              email_verified: isEmailVerified,
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
                  required
                  defaultValue={selectedUser.name || ''}
                  className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm shadow-sm
                    placeholder-gray-400 dark:placeholder-gray-500 dark:bg-gray-700 dark:text-white
                    focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                  placeholder='Enter user name'
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              
              <div>
                <label htmlFor='edit-email' className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                  Email
                </label>
                <input
                  type='email'
                  id='edit-email'
                  name='email'
                  required
                  defaultValue={selectedUser.email || ''}
                  className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm shadow-sm
                    placeholder-gray-400 dark:placeholder-gray-500 dark:bg-gray-700 dark:text-white
                    focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                  placeholder='Enter email address'
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              
              <div>
                <label htmlFor='edit-phone' className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                  Phone (optional)
                </label>
                <input
                  type='tel'
                  id='edit-phone'
                  name='phone'
                  defaultValue={selectedUser.phone || ''}
                  className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm shadow-sm
                    placeholder-gray-400 dark:placeholder-gray-500 dark:bg-gray-700 dark:text-white
                    focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                  placeholder='Enter phone number'
                  onChange={(e) => setPhone(e.target.value)}
                />
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
                className='px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium
                  text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600'
              >
                Cancel
              </button>
              
              <button
                type='submit'
                className='px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium
                  text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2
                  focus:ring-offset-2 focus:ring-indigo-500'
              >
                Save Changes
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
                  <p className='text-sm font-medium text-gray-900 dark:text-white'>{selectedUser.name || 'Unnamed User'}</p>
                  <p className='text-xs text-gray-500 dark:text-gray-400'>{selectedUser.email}</p>
                </div>
              </div>
              <p className='text-xs text-gray-500 dark:text-gray-400'>
                Registered: {formatDate(selectedUser.created_at)}
              </p>
            </div>
            
            <div className='p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-100 dark:border-yellow-800'>
              <p className='text-sm text-yellow-700 dark:text-yellow-300'>
                To confirm deletion, please type <strong>{selectedUser.name || selectedUser.email}</strong> below:
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
              className='px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium
                text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600'
            >
              Cancel
            </button>
            
            <button
              type='button'
              onClick={deleteUser}
              className='px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium
                text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2
                focus:ring-offset-2 focus:ring-red-500'
            >
              Delete User
            </button>
          </div>
        </div>
      </div>
    )}

    </>
  );
} 