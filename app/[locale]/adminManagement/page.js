'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { FaUsers, FaBell, FaSearch, FaFilter, FaUserPlus, FaEdit, FaTrash, FaUserShield, FaUserCog } from 'react-icons/fa';
import AdminSidebar from '@/components/admin/AdminSidebar';

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
        router.replace(`/${locale}/admin/login`);
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
      router.replace(`/${locale}/admin/login`);
      
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
  const editAdmin = async (adminUserData) => {
    try {
      // Prevent non-super admins from elevating privileges
      if (adminData.role !== 'SUPER_ADMIN' && adminUserData.role === 'SUPER_ADMIN') {
        throw new Error('Only super admins can create other super admins');
      }
      
      const { error } = await supabase
        .from('admin_user')
        .update(adminUserData)
        .eq('id', selectedAdmin.id);
      
      if (error) throw error;
      
      // Update local data
      setAdmins(admins.map(admin => 
        admin.id === selectedAdmin.id ? { ...admin, ...adminUserData } : admin
      ));
      
      // Log activity
      if (adminData) {
        await supabase.from('admin_activity_log').insert({
          admin_id: adminData.id,
          action: 'update_admin_user',
          entity_type: 'admin_user',
          entity_id: selectedAdmin.id,
          details: { updated_fields: Object.keys(adminUserData) },
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
      {/* Sidebar */}
      <AdminSidebar activePage="admins" adminData={adminData} onLogout={handleLogout} />
      
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
                          {formatDate(admin.last_login)}
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
      {/* For brevity, I've omitted the actual modal implementation */}
      {/* In a real app, you'd implement modals for adding, editing, and deleting admin users */}
    </div>
  );
} 