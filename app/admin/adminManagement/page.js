'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { FaUsers, FaBell, FaSearch, FaFilter, FaUserPlus, FaEdit, FaTrash, FaUserShield, FaUserCog } from 'react-icons/fa';

export default function AdminUserManagement() {
  const router = useRouter();
  const params = useParams();
  const locale = params.locale || 'en';
  
  const [adminData, setAdminData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [admins, setAdmins] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [adminsPerPage] = useState(10);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState('');
  const [roles, setRoles] = useState([]);
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [isPasswordValid, setIsPasswordValid] = useState(false)
  const [isPasswordMatch, setIsPasswordMatch] = useState(false)
  const [isEmailValid, setIsEmailValid] = useState(false)

  // Verify super admin session and fetch admin data
  useEffect(() => {
    const checkAdminSession = async () => {
      try {
        setLoading(true);
        
        // Get current session
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !sessionData.session) {
          throw new Error('No active session found');
        }
        
        // Check if user is an admin with appropriate permissions
        const { data: admin, error: adminError } = await supabase
          .from('admin_user')
          .select('*')
          .eq('email', sessionData.session.user.email)
          .eq('is_active', true)
          .single();
          
        if (adminError || !admin) {
          throw new Error('Unauthorized access');
        }
        
        // Check if admin has sufficient role to manage other admins (only SUPER_ADMIN can)
        if (admin.role !== 'SUPER_ADMIN') {
          throw new Error('Insufficient permissions');
        }
        
        setAdminData(admin);
        
        // Fetch admin users
        await fetchAdminUsers();

      } catch (error) {
        console.error('Admin session check failed:', error);
        // Redirect to admin login
        router.replace(`/${locale}/adminLogin`);
      } finally {
        setLoading(false);
      }
    };
    
    checkAdminSession();
  }, []);
  
  
  // Fetch admin users from database
  const fetchAdminUsers = async () => {
    try {
      let query = supabase
        .from('admin_user')
        .select('*')
        .order('created_at', { ascending: false });
      
      // Apply filter if not 'all'
      if (filter === 'active') {
        query = query.eq('is_active', true);
      } else if (filter === 'inactive') {
        query = query.eq('is_active', false);
      } else if (filter === 'superadmin') {
        query = query.eq('role', 'SUPER_ADMIN');
      } else if (filter === 'admin') {
        query = query.eq('role', 'ADMIN');
      } else if (filter === 'moderator') {
        query = query.eq('role', 'MODERATOR');
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      setAdmins(data || []);
      
    } catch (error) {
      console.error('Error fetching admin users:', error);
    }
  };

  // Fetch roles from database
  useEffect(()=>{
    const fetchRoles = async () => {
      try {
        const { data, error } = await supabase
          .from('admin_role_permission')
          .select('role')
          
        if (error) throw error;
        
        // Extract unique roles from the result
        const roles = [...new Set(data.map(item => item.role))];
        console.log(roles);
        setRoles(roles);
        
        // Return the array of roles
        return roles;
      } catch (error) {
        console.error('Error fetching roles:', error);
        return ['SUPER_ADMIN', 'ADMIN', 'MODERATOR']; // Fallback to default roles
      }
    }
    fetchRoles();
  },[]);

  // Handle logout
  const handleLogout = async () => {
    try {
      // Log the logout action
      if (adminData) {
        await supabase.from('admin_activity_log').insert({
          admin_id: adminData.id,
          action: 'logout',
          ip_address: '127.0.0.1',
          user_agent: navigator.userAgent
        });
      }
      
      // Sign out
      await supabase.auth.signOut();
      
      // Redirect to admin login
      router.replace(`/${locale}/adminLogin`);
      
    } catch (error) {
      console.error('Error during logout:', error);
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
  const openModal = (type, admin = null) => {
    setModalType(type);
    setSelectedAdmin(admin);
    setIsModalOpen(true);
  };
  
  // Close modal
  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedAdmin(null);
  };
  
  // Edit admin
  const editAdmin = async (newAdminData) => {
    try {
      // Prevent non-super admins from elevating privileges
      if (adminData.role !== 'SUPER_ADMIN') {
        throw new Error('Only super admins can modify other admins');
      }
      
      // Create a filtered version of newAdminData that only includes non-empty values
      const filteredAdminData = {};
      
      // Only include fields that have values
      if (newAdminData.username && newAdminData.username.trim() !== '') {
        filteredAdminData.username = newAdminData.username;
      }
      
      if (newAdminData.full_name) {
        filteredAdminData.full_name = newAdminData.full_name;
      }
      
      if (newAdminData.email && newAdminData.email.trim() !== '') {
        filteredAdminData.email = newAdminData.email;
      }
      
      if (newAdminData.password_hash && newAdminData.password_hash.trim() !== '') {
        filteredAdminData.password_hash = newAdminData.password_hash;
      }
      
      if (newAdminData.role && ['SUPER_ADMIN', 'ADMIN', 'MODERATOR'].includes(newAdminData.role)) {
        filteredAdminData.role = newAdminData.role;
      }
      
      // Always update the updated_at timestamp
      filteredAdminData.updated_at = new Date().toISOString();
      
      const { error } = await supabase
        .from('admin_user')
        .update(filteredAdminData)
        .eq('id', selectedAdmin.id);
      
      if (error) throw error;
      
      // Update local data
      setAdmins(admins.map(admin => 
        admin.id === selectedAdmin.id ? { ...admin, ...filteredAdminData } : admin
      ));
      
      // Log activity
      if (adminData) {
        await supabase.from('admin_activity_log').insert({
          admin_id: adminData.id,
          action: 'update_admin_user',
          entity_type: 'admin_user',
          entity_id: selectedAdmin.id,
          details: { updated_fields: Object.keys(filteredAdminData) },
          ip_address: '127.0.0.1',
          user_agent: navigator.userAgent
        });
      }
      
      closeModal();
      
    } catch (error) {
      console.error('Error updating admin user:', error);
    }
  };
  
  // Create new admin
  const createAdmin = async (adminUserData) => {
    try {
      // Prevent non-super admins from creating super admins
      if (adminData.role !== 'SUPER_ADMIN' && adminUserData.role === 'SUPER_ADMIN') {
        throw new Error('Only super admins can create other super admins');
      }
      
      // For simplicity, in a real app you would hash the password properly
      // and handle authentication through your auth provider
      const { data, error } = await supabase
        .from('admin_user')
        .insert({
          ...adminUserData,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Update local data
      setAdmins([data, ...admins]);
      
      // Log activity
      if (adminData) {
        await supabase.from('admin_activity_log').insert({
          admin_id: adminData.id,
          action: 'create_admin_user',
          entity_type: 'admin_user',
          entity_id: data.id,
          ip_address: '127.0.0.1',
          user_agent: navigator.userAgent
        });
      }
      
      closeModal();
      
    } catch (error) {
      console.error('Error creating admin user:', error);
    }
  };
  
  // Delete admin
  const deleteAdmin = async () => {
    try {
      // Prevent deleting your own account
      if (selectedAdmin.id === adminData.id) {
        throw new Error('You cannot delete your own account');
      }
      
      // Prevent non-super admins from deleting other super admins
      if (adminData.role !== 'SUPER_ADMIN' && selectedAdmin.role === 'SUPER_ADMIN') {
        throw new Error('Only super admins can delete other super admins');
      }
      
      const { error } = await supabase
        .from('admin_user')
        .delete()
        .eq('id', selectedAdmin.id);
      
      if (error) throw error;
      
      // Update local data
      setAdmins(admins.filter(admin => admin.id !== selectedAdmin.id));
      
      // Log activity
      if (adminData) {
        await supabase.from('admin_activity_log').insert({
          admin_id: adminData.id,
          action: 'delete_admin_user',
          entity_type: 'admin_user',
          entity_id: selectedAdmin.id,
          ip_address: '127.0.0.1',
          user_agent: navigator.userAgent
        });
      }
      
      closeModal();
      
    } catch (error) {
      console.error('Error deleting admin user:', error);
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
  
  // Filter admins by search query
  const filteredAdmins = admins.filter(admin => {
    const searchLower = searchQuery.toLowerCase();
    return (
      admin.full_name?.toLowerCase().includes(searchLower) ||
      admin.username?.toLowerCase().includes(searchLower) ||
      admin.email?.toLowerCase().includes(searchLower)
    );
  });
  
  // Pagination
  const indexOfLastAdmin = currentPage * adminsPerPage;
  const indexOfFirstAdmin = indexOfLastAdmin - adminsPerPage;
  const currentAdmins = filteredAdmins.slice(indexOfFirstAdmin, indexOfLastAdmin);
  const totalPages = Math.ceil(filteredAdmins.length / adminsPerPage);
  
  // Get role badge style
  const getRoleBadgeStyle = (role) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-800 dark:text-purple-100';
      case 'ADMIN':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100';
      case 'MODERATOR':
        return 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100';
    }
  };
  
  // Password validation function
  const validatePassword = (password) => {
    // Check if password meets the requirements:
    // - At least 8 characters
    // - Contains at least one uppercase letter
    // - Contains at least one lowercase letter
    // - Contains at least one number
    // - Contains at least one special character

    const minLength = password.length >= 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

    return {
      isValid: minLength && hasUpperCase && hasLowerCase && hasNumber && hasSpecialChar,
      criteria: {
        minLength,
        hasUpperCase,
        hasLowerCase,
        hasNumber,
        hasSpecialChar
      }
    };
  };

  useEffect(() => {
    const validationResult = validatePassword(password);
    setIsPasswordValid(validationResult.isValid);
    setIsPasswordMatch(password === confirmPassword)
    console.log("Password valid?:", validationResult.isValid);
    console.log("password matach? :", isPasswordMatch)
  }, [password, confirmPassword]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading admin management...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
      
      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 shadow-sm">
          <div className="px-6 py-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Admin User Management</h2>
            
            <div className="flex items-center">
              <button className="p-2 mr-4 text-gray-500 dark:text-gray-400 hover:text-indigo-500 dark:hover:text-indigo-400">
                <FaBell />
              </button>
              
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white font-semibold mr-2">
                  {adminData?.username?.charAt(0).toUpperCase() || 'A'}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{adminData?.full_name || adminData?.username}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{adminData?.role}</p>
                </div>
              </div>
            </div>
          </div>
        </header>
        
        {/* Admin Management Content */}
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
                  <option value="all">All Admins</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="superadmin">Super Admins</option>
                  <option value="admin">Admins</option>
                  <option value="moderator">Moderators</option>
                </select>
              </div>
              
              {/* Search */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search admins..."
                  className="pl-9 pr-4 py-1.5 w-full md:w-64 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md text-sm"
                  value={searchQuery}
                  onChange={handleSearch}
                />
                <FaSearch className="absolute left-3 top-2 text-gray-400" />
              </div>
            </div>
            
            {/* Add Admin Button */}
            <button
              onClick={() => openModal('add')}
              className="flex items-center justify-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm"
            >
              <FaUserPlus className="mr-2" />
              Add New Admin
            </button>
          </div>
          
          {/* Admins Table */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Admin
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Last Login
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {currentAdmins.length > 0 ? (
                    currentAdmins.map((admin) => (
                      <tr key={admin.id} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-300 font-semibold mr-3">
                              {admin.full_name?.charAt(0).toUpperCase() || admin.username?.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {admin.full_name || admin.username}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                @{admin.username}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {admin.email}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeStyle(admin.role)}`}>
                            {admin.role === 'SUPER_ADMIN' && <FaUserShield className="mr-1" />}
                            {admin.role === 'ADMIN' && <FaUserCog className="mr-1" />}
                            {admin.role === 'MODERATOR' && <FaUsers className="mr-1" />}
                            {admin.role}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          {admin.is_active ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100">
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100">
                              Inactive
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {admin.last_login ? formatDate(admin.last_login) : 'Never logged in'}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-right">
                          <button
                            onClick={() => openModal('edit', admin)}
                            className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 mr-3"
                            disabled={adminData.id === admin.id && adminData.role !== 'SUPER_ADMIN'}
                          >
                            <FaEdit />
                          </button>
                          <button
                            onClick={() => openModal('delete', admin)}
                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                            disabled={adminData.id === admin.id}
                          >
                            <FaTrash />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="px-4 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                        {searchQuery
                          ? 'No admin users match your search criteria'
                          : 'No admin users found'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            {filteredAdmins.length > adminsPerPage && (
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
      </div>
      
      {/* Modals would go here in a real implementation */}
      {/*add admin modal*/}
      {isModalOpen && modalType=="add" && (
        <div className='fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50'>
        <div className='bg-white dark:bg-gray-800 rounded-lg shadow-lg w-full max-w-md p-6'>
          <div className='flex justify-between items-center mb-4'>
            <h2 className='text-xl font-semibold text-gray-800 dark:text-white'>Add New Admin</h2>
            <button
              onClick={closeModal}
              className='text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            >
              &times;
            </button>
          </div>
          
          <form onSubmit={(e) => {
            e.preventDefault();
            const adminUserData = {
              username: username,
              full_name: fullName,
              email: email,
              password_hash: password,
              role: selectedRole
            };
            
            createAdmin(adminUserData);
          }}>
            <div className='space-y-4'>
              <div>
                  <label htmlFor='name' className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                    Username
                  </label>
                  <input
                    type='text'
                    id='username'
                    name='username'
                    onChange={(e)=>{setUsername(e.target.value)}}
                    required
                    className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm shadow-sm
                      placeholder-gray-400 dark:placeholder-gray-500 dark:bg-gray-700 dark:text-white
                      focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                    placeholder='How should we call you?'
                  />
                </div>

              <div>
                <label htmlFor='name' className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                  Full Name (optional)
                </label>
                <input
                  type='text'
                  id='fullName'
                  name='fullName'
                  onChange={(e)=>{setFullName(e.target.value)}}
                  className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm shadow-sm
                    placeholder-gray-400 dark:placeholder-gray-500 dark:bg-gray-700 dark:text-white
                    focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                  placeholder='Enter user name'
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
                  onChange={(e)=>{setEmail(e.target.value)}}
                  required
                  className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm shadow-sm
                    placeholder-gray-400 dark:placeholder-gray-500 dark:bg-gray-700 dark:text-white
                    focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                  placeholder='Enter email address'
                />
              </div>
              
              <div>
                <label htmlFor='password ' className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                  Password
                </label>
                <input
                  type='password'
                  id='password'
                  name='password'
                  onChange={(e)=>{setPassword(e.target.value)}}
                  required
                  className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm shadow-sm
                    placeholder-gray-400 dark:placeholder-gray-500 dark:bg-gray-700 dark:text-white
                    focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                  placeholder='Enter password'
                />
              </div>

              <div>
                <label htmlFor='password ' className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                  Confirm Password
                </label>
                <input 
                type='password'
                name='confirm_password'
                id='confirm_password'
                onChange={(e)=>{setConfirmPassword(e.target.value)}}
                required
                className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm shadow-sm
                placeholder-gray-400 dark:placeholder-gray-500 dark:bg-gray-700 dark:text-white
                focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                placeholder='Enter confirm password'
                />
              </div>
              
              <div>
              <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                  Role
                </label>
                <div className='flex items-center space-x-4'>
                  {/*role selection*/}
                  {roles.map(item => (
                      <label className='inline-flex items-center' key={item}>
                        <input
                          type='radio'
                          name='role'
                          value={item}
                          onChange={(e)=>setSelectedRole(e.target.value)}
                          className='h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500'
                        />
                        <span className='ml-2 text-sm text-gray-700 dark:text-gray-300'>{item}</span>
                      </label>
                  ))}
                </div>

              </div>

              {password && (
                <div className="mt-1">
                  <p className="text-xs font-medium mb-1">Password must contain:</p>
                  <ul className="space-y-1 text-xs">
                    <li className={`flex items-center ${validatePassword(password).criteria.minLength ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      <span className="mr-1">{validatePassword(password).criteria.minLength ? '✓' : '✗'}</span>
                      At least 8 characters
                    </li>
                    <li className={`flex items-center ${validatePassword(password).criteria.hasUpperCase ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      <span className="mr-1">{validatePassword(password).criteria.hasUpperCase ? '✓' : '✗'}</span>
                      One uppercase letter
                    </li>
                    <li className={`flex items-center ${validatePassword(password).criteria.hasLowerCase ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      <span className="mr-1">{validatePassword(password).criteria.hasLowerCase ? '✓' : '✗'}</span>
                      One lowercase letter
                    </li>
                    <li className={`flex items-center ${validatePassword(password).criteria.hasNumber ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      <span className="mr-1">{validatePassword(password).criteria.hasNumber ? '✓' : '✗'}</span>
                      One number
                    </li>
                    <li className={`flex items-center ${validatePassword(password).criteria.hasSpecialChar ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      <span className="mr-1">{validatePassword(password).criteria.hasSpecialChar ? '✓' : '✗'}</span>
                      One special character
                    </li>
                  </ul>
                </div>
              )}

              {confirmPassword && (
                <div className="mt-1">
                  <p className={`text-xs ${isPasswordMatch ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {isPasswordMatch ? '✓ Passwords match' : '✗ Passwords do not match'}
                  </p>
                </div>
              )}
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
                disabled={!isPasswordValid || !isPasswordMatch || !username || !email || !selectedRole}
                className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium
                  text-white ${isPasswordValid && isPasswordMatch && username && email && selectedRole 
                    ? 'bg-indigo-600 hover:bg-indigo-700' 
                    : 'bg-indigo-400 cursor-not-allowed'} 
                  focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
              >
                Add User
              </button>
            </div>
          </form>
        </div>
      </div>
      )}

       {/* Edit admin Modal */}
      {isModalOpen && modalType === 'edit' && selectedAdmin && (
        <div className='fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50'>
          <div className='bg-white dark:bg-gray-800 rounded-lg shadow-lg w-full max-w-md p-6'>
            <div className='flex justify-between items-center mb-4'>
              <h2 className='text-xl font-semibold text-gray-800 dark:text-white'>Edit Admin</h2>
              <button
                onClick={closeModal}
                className='text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              >
                &times;
              </button>
            </div>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              const newAdminData = {
                username: username,
                full_name: fullName,
                email: email,
                password_hash: password ,
                role: selectedRole,
                updated_at: new Date().toISOString()
              };
              
              editAdmin(newAdminData);
            }}>
              <div className='space-y-4'>

                <div>
                  <label htmlFor='edit-username' className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                    New Username
                  </label>
                  <input
                    type='text'
                    id='edit-username'
                    name='username'
                    required
                    defaultValue={selectedAdmin.username}
                    className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm shadow-sm
                      placeholder-gray-400 dark:placeholder-gray-500 dark:bg-gray-700 dark:text-white
                      focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                    placeholder='Enter new username'
                    onChange={(e)=> {setUsername(e.target.value)}}
                  />
                </div>

                <div>
                  <label htmlFor='edit-fullName' className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                    Full Name (optional)
                  </label>
                  <input
                    type='text'
                    id='edit-fullName'
                    name='fullName'
                    defaultValue={selectedAdmin.full_name || ''}
                    className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm shadow-sm
                      placeholder-gray-400 dark:placeholder-gray-500 dark:bg-gray-700 dark:text-white
                      focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                    placeholder='Enter new full name'
                    onChange={(e)=> {setFullName(e.target.value)}}
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
                    defaultValue={selectedAdmin.email || ''}
                    className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm shadow-sm
                      placeholder-gray-400 dark:placeholder-gray-500 dark:bg-gray-700 dark:text-white
                      focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                    placeholder='Enter email address'
                    onChange={(e)=>{setEmail(e.target.value)}}
                  />
                </div>

                <div>
                <label htmlFor='newPassword ' className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                  New Password
                </label>
                <input
                  type='password'
                  id='newPassword'
                  name='newPassword'
                  className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm shadow-sm
                    placeholder-gray-400 dark:placeholder-gray-500 dark:bg-gray-700 dark:text-white
                    focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                  placeholder='Enter new password'
                  onChange={(e)=>{setPassword(e.target.value)}}
                />
              </div>

              <div>
                <label htmlFor='confirmNewPassword ' className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                  Confirm New Password
                </label>
                <input 
                type='password'
                name='confirmNewPassword'
                id='confirmNewPassword'
                onChange={(e)=>{setConfirmPassword(e.target.value)}}
                className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm shadow-sm
                placeholder-gray-400 dark:placeholder-gray-500 dark:bg-gray-700 dark:text-white
                focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                placeholder='Enter confirm password'
                />
              </div>

              <div>
              <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                  New Role
                </label>
                <div className='flex items-center space-x-4'>
                  
                  {roles.map(item => (
                      <label className='inline-flex items-center' key={item}>
                        <input
                          type='radio'
                          name='role'
                          value={item}
                          defaultChecked={selectedAdmin.role === item}
                          onChange={(e)=>setSelectedRole(e.target.value)}
                          className='h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500'
                        />
                        <span className='ml-2 text-sm text-gray-700 dark:text-gray-300'>{item}</span>
                      </label>
                  ))}
                </div>

              </div>
               
                
                <div className='pt-3 border-t border-gray-200 dark:border-gray-700'>
                  <p className='text-xs text-gray-500 dark:text-gray-400'>
                    Admin ID: {selectedAdmin.id}<br />
                    Created: {formatDate(selectedAdmin.created_at)}<br />
                    Last Updated: {formatDate(selectedAdmin.updated_at)}
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
    {isModalOpen && modalType === 'delete' && selectedAdmin && (
      <div className='fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50'>
        <div className='bg-white dark:bg-gray-800 rounded-lg shadow-lg w-full max-w-md p-6'>
          <div className='flex justify-between items-center mb-4'>
            <h2 className='text-xl font-semibold text-gray-800 dark:text-white'>Delete Admin</h2>
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
                  {selectedAdmin.username?.charAt(0).toUpperCase() || selectedAdmin.email?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div>
                  <p className='text-sm font-medium text-gray-900 dark:text-white'>{selectedAdmin.username || 'Admin'}</p>
                  <p className='text-xs text-gray-500 dark:text-gray-400'>{selectedAdmin.email}</p>
                </div>
              </div>
              <p className='text-xs text-gray-500 dark:text-gray-400'>
                Registered: {formatDate(selectedAdmin.created_at)}
              </p>
            </div>
            
            <div className='p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-100 dark:border-yellow-800'>
              <p className='text-sm text-yellow-700 dark:text-yellow-300'>
                To confirm deletion, please type <strong>{selectedAdmin.username || selectedAdmin.email}</strong> below:
              </p>
              <input
                type='text'
                id='delete-confirmation'
                className='mt-2 w-full px-3 py-2 border border-yellow-300 dark:border-yellow-700 rounded-md text-sm
                  placeholder-yellow-500 dark:placeholder-yellow-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                  focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500'
                placeholder={`Type ${selectedAdmin.username || selectedAdmin.email} to confirm`}
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
              onClick={deleteAdmin}
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

      {/* For brevity, I've omitted the actual modal implementation */}
      {/* In a real app, you'd implement modals for adding, editing, and deleting admin users */}
    </div>
  );
} 