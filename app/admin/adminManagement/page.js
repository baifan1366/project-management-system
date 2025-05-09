'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { FaUsers, FaBell, FaSearch, FaFilter, FaUserPlus, FaEdit, FaTrash, FaUserShield, FaUserCog } from 'react-icons/fa';
import { useSelector, useDispatch } from 'react-redux';
import { checkAdminSession } from '@/lib/redux/features/adminSlice';
import AccessRestrictedModal from '@/components/admin/accessRestrictedModal';
import { toast } from 'sonner';


export default function AdminUserManagement() {

  const router = useRouter();
  const params = useParams();
  const dispatch = useDispatch();
  // Get the admin data from Redux state
  const { admin: reduxAdminData, isAuthenticated } = useSelector(state => state.admin);
  
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
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isPasswordValid, setIsPasswordValid] = useState(false)
  const [isPasswordMatch, setIsPasswordMatch] = useState(false)
  const [isEmailValid, setIsEmailValid] = useState(false)
  const permissions = useSelector((state) => state.admin.permissions);
  
  // State for admin permissions management
  const [adminPermissions, setAdminPermissions] = useState([]);
  const [allPermissions, setAllPermissions] = useState([]);
  const [permissionsByCategory, setPermissionsByCategory] = useState({});
  const [loadingPermissions, setLoadingPermissions] = useState(false);
  const [savingPermissions, setSavingPermissions] = useState(false);
  const [permissionError, setPermissionError] = useState(null);
  const [adminRoles, setAdminRoles] = useState({});

  // initialize the page
  useEffect(() => {
    const initDashboard = async () => {
      try {
        setLoading(true);
        
        // Set adminData from Redux state if available
        if (reduxAdminData) {
          setAdminData(reduxAdminData);
        } else {
          // Try to fetch admin session if not already in Redux
          const result = await dispatch(checkAdminSession()).unwrap();
          if (result) {
            setAdminData(result);
          } else {
            // If no admin data, redirect to login
            throw new Error('No admin session found');
          }
        }
        
        // Fetch admin users
        await fetchAdminUsers();  
        
      } catch (error) {
        console.error('Error in fetching admins data:', error);
        // Redirect to admin login
        router.replace(`/admin/adminLogin`);
      } finally {
        setLoading(false);
      }
    };
    
    initDashboard();
  }, [dispatch, router, reduxAdminData]);

  // Fetch admin users from database
  const fetchAdminUsers = useCallback(async () => {
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
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      setAdmins(data || []);
      
      // After fetching admins, load their permissions
      await fetchAllAdminPermissions(data);
      
    } catch (error) {
      console.error('Error fetching admin users:', error);
    }
  }, [filter]);

  // Fetch permissions for all admins
  const fetchAllAdminPermissions = async (adminsList) => {
    try {
      const permissionMap = {};
      const rolesMap = {};
      
      // Fetch admin_permission data once to have all permission names
      const { data: allPermissionsData, error: permError } = await supabase
        .from('admin_permission')
        .select('id, name');
        
      if (permError) throw permError;
      
      // Create a map of permission id to name for quick lookup
      const permissionIdToNameMap = {};
      allPermissionsData.forEach(perm => {
        permissionIdToNameMap[perm.id] = perm.name;
      });
      
      // For each admin, fetch their active permissions
      for (const admin of adminsList) {
        const { data: adminPermData, error: adminPermError } = await supabase
          .from('admin_role_permission')
          .select('permission_id')
          .eq('admin_id', admin.id)
          .eq('is_active', true);
          
        if (!adminPermError && adminPermData) {
          // Convert permission IDs to permission names
          const permissionNames = adminPermData.map(item => 
            permissionIdToNameMap[item.permission_id]
          ).filter(name => name); // Filter out any undefined values
          
          permissionMap[admin.id] = permissionNames;
          
          // Determine admin role based on permissions
          const adminPermNames = ['view_admins', 'edit_admins', 'add_admins', 'delete_admins'];
          const isSuperAdmin = adminPermNames.every(perm => 
            permissionNames.includes(perm)
          );
          
          rolesMap[admin.id] = isSuperAdmin ? 'SUPER_ADMIN' : 'ADMIN';
        }
      }
      
      setAdminRoles(rolesMap);
      
    } catch (error) {
      console.error('Error fetching admin permissions:', error);
    }
  };

  // Add function to verify permission access
  const hasPermission = (permissionName) => {
    return permissions.includes(permissionName);
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
  const openModal = async (type, admin = null) => {
    setModalType(type);
    setSelectedAdmin(admin);
    setIsModalOpen(true);
    
    // If opening permission edit modal, fetch permissions
    if (type === 'editPermission' && admin) {
      await fetchAdminPermissions(admin.id);
    }
  };
  
  // Close modal
  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedAdmin(null);
  };
  
  // Edit admin
  const editAdmin = async (newAdminData) => {
    try {
      // Verify permission
      if (!hasPermission('edit_admins')) {
        toast.error('Permission denied: You do not have permission to edit admin users');
        throw new Error('You do not have permission to edit admin users');
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
      
      // Always update the updated_at timestamp
      filteredAdminData.updated_at = new Date().toISOString();
      
      const { error } = await supabase
        .from('admin_user')
        .update(filteredAdminData)
        .eq('id', selectedAdmin.id);
      
      if (error) {
        toast.error(`Failed to update admin: ${error.message}`);
        throw error;
      }
      
      // Update local data
      setAdmins(admins.map(admin => 
        admin.id === selectedAdmin.id ? { ...admin, ...filteredAdminData } : admin
      ));
      
      // Log activity
      if (adminData) {
        await supabase.from('admin_activity_log').insert([{
          admin_id: adminData.id,
          action: 'update_admin_user',
          entity_type: 'admin_user',
          entity_id: String(selectedAdmin.id),
          details: { updated_fields: Object.keys(filteredAdminData) },
          ip_address: '127.0.0.1',
          user_agent: navigator.userAgent
        }]);
      }
      
      toast.success(`Admin user "${selectedAdmin.username}" updated successfully`);
      closeModal();
      
      // Refresh admin data to ensure permissions are correctly displayed
      fetchAdminUsers();
      
    } catch (error) {
      toast.error(`Error updating admin user: ${error.message}`);
    }
  };
  
  // Initialize permissions for a new admin user
  const initializeAdminPermissions = async (adminId) => {
    try {
      // Fetch all available permissions
      const { data: allPermissions, error: permissionsError } = await supabase
        .from('admin_permission')
        .select('id, name')
        .order('id', { ascending: true });
      
      if (permissionsError) {
        toast.error(`Failed to fetch permissions: ${permissionsError.message}`);
        throw permissionsError;
      }
      
      // Default permissions to give to new admins
      // For basic admin access but not super admin access
      const defaultPermissionNames = ['view_users', 'edit_users', 'add_users', 'delete_users']; //default permissions
      
      // Prepare batch insert data
      const permissionsToInsert = allPermissions.map(permission => ({
        admin_id: adminId,
        permission_id: permission.id,
        is_active: defaultPermissionNames.includes(permission.name)
      }));
      
      // Insert permissions in a single batch operation
      if (permissionsToInsert.length > 0) {
        const { error: batchInsertError } = await supabase
          .from('admin_role_permission')
          .insert(permissionsToInsert);
        
        if (batchInsertError) {
          console.error('Failed to insert permissions batch:', batchInsertError);
          
          // If batch insert fails, try one by one as fallback
          let someSucceeded = false;
          for (const permData of permissionsToInsert) {
            try {
              // Check if this specific permission already exists for this admin
              const { data: existingPerm } = await supabase
                .from('admin_role_permission')
                .select('id')
                .eq('admin_id', adminId)
                .eq('permission_id', permData.permission_id)
                .maybeSingle();
              
              if (existingPerm) {
                // Update existing permission
                await supabase
                  .from('admin_role_permission')
                  .update({ is_active: permData.is_active })
                  .eq('id', existingPerm.id);
              } else {
                // Insert new permission
                await supabase
                  .from('admin_role_permission')
                  .insert(permData);
              }
              
              someSucceeded = true;
            } catch (error) {
              console.error(`Failed to insert/update permission ${permData.permission_id}:`, error);
            }
          }
          
          return someSucceeded;
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error initializing admin permissions:', error);
      return false;
    }
  };

  // Create new admin
  const createAdmin = async (adminUserData) => {
    try {
      // Verify permission
      if (!hasPermission('add_admins')) {
        toast.error('Permission denied: You do not have permission to create admin users');
        throw new Error('You do not have permission to create admin users');
      }
      
      // For simplicity, in a real app you would hash the password properly
      // and handle authentication through your auth provider
      const { data, error } = await supabase
        .from('admin_user')
        .insert({
          username: adminUserData.username,
          full_name: adminUserData.full_name,
          email: adminUserData.email,
          password_hash: adminUserData.password_hash,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) {
        toast.error(`Failed to create admin: ${error.message}`);
        throw error;
      }
      
      // Initialize permissions for the new admin
      const permissionsInitialized = await initializeAdminPermissions(data.id);
      if (!permissionsInitialized) {
        toast.warning('Admin created but permissions initialization failed. Please assign permissions manually.');
      }
      
      // Update local data
      setAdmins([data, ...admins]);
      
      // Log activity
      if (adminData) {
        await supabase.from('admin_activity_log').insert([{
          admin_id: adminData.id,
          action: 'create_admin_user',
          entity_type: 'admin_user',
          entity_id: String(data.id),
          details: { updated_fields: Object.keys(adminUserData) },
          ip_address: '127.0.0.1',
          user_agent: navigator.userAgent
        }]);
      }
      
      toast.success(`Admin user "${data.username}" created successfully`);
      closeModal();
      
      // Refresh admin data to ensure permissions are correctly displayed
      fetchAdminUsers();
      
    } catch (error) {
      toast.error(`Error creating admin user: ${error.message}`);
    }
  };
  
  // Delete admin
  const deleteAdmin = async () => {
    try {
      // Verify permission
      if (!hasPermission('delete_admins')) {
        toast.error('Permission denied: You do not have permission to delete admin users');
        throw new Error('You do not have permission to delete admin users');
      }
      
      // Prevent deleting your own account
      if (adminData && selectedAdmin.id === adminData.id) {
        toast.error('You cannot delete your own account');
        throw new Error('You cannot delete your own account');
      }
      
      const { error } = await supabase
        .from('admin_user')
        .delete()
        .eq('id', selectedAdmin.id);
      
      if (error) {
        toast.error(`Failed to delete admin: ${error.message}`);
        throw error;
      }
      
      // Update local data
      setAdmins(admins.filter(admin => admin.id !== selectedAdmin.id));
      
      // Log activity
      if (adminData) {
        await supabase.from('admin_activity_log').insert([{
          admin_id: adminData.id,
          action: 'delete_admin_user',
          entity_type: 'admin_user',
          entity_id: String(selectedAdmin.id),
          ip_address: '127.0.0.1',
          user_agent: navigator.userAgent
        }]);
      }
      
      toast.success(`Admin user deleted successfully`);
      closeModal();
      
      // Refresh admin data to ensure permissions are correctly displayed
      fetchAdminUsers();
      
    } catch (error) {
      toast.error(`Error deleting admin user: ${error.message}`);
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
    const matchesSearch = (
      admin.full_name?.toLowerCase().includes(searchLower) ||
      admin.username?.toLowerCase().includes(searchLower) ||
      admin.email?.toLowerCase().includes(searchLower)
    );
    
    // Apply role-based filtering
    if (filter === 'superadmin') {
      return matchesSearch && getEffectiveRole(admin) === 'SUPER_ADMIN';
    } else if (filter === 'admin') {
      return matchesSearch && getEffectiveRole(admin) === 'ADMIN';
    } else if (filter === 'active') {
      return matchesSearch && admin.is_active;
    } else if (filter === 'inactive') {
      return matchesSearch && !admin.is_active;
    }
    
    // Default: return all admins that match search
    return matchesSearch;
  });
  
  // Pagination
  const indexOfLastAdmin = currentPage * adminsPerPage;
  const indexOfFirstAdmin = indexOfLastAdmin - adminsPerPage;
  const currentAdmins = filteredAdmins.slice(indexOfFirstAdmin, indexOfLastAdmin);
  const totalPages = Math.ceil(filteredAdmins.length / adminsPerPage);
  
  // Get role badge style TODO: change the validate logic
  const getRoleBadgeStyle = (role) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-800 dark:text-purple-100';
      case 'ADMIN':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100';
    }
  };
  
  // Get the effective role for display purposes
  const getEffectiveRole = (admin) => {
    // First check if this admin is the current logged-in admin
    if (adminData && admin.id === adminData.id) {
      // For the current admin, check permissions from Redux
      const requiredPermissions = ['view_admins', 'edit_admins', 'add_admins', 'delete_admins'];
      return requiredPermissions.every(perm => permissions.includes(perm)) ? 'SUPER_ADMIN' : 'ADMIN';
    } else {
      // For other admins, check from our computed roles
      return adminRoles[admin.id] || 'ADMIN';
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

  // Fetch permissions for a specific admin
  const fetchAdminPermissions = async (adminId) => {
    try {
      setLoadingPermissions(true);
      setPermissionError(null);
      
      // Fetch all available permissions first
      const { data: permissionsData, error: permissionsError } = await supabase
        .from('admin_permission')
        .select('*')
        .order('id', { ascending: true });
      
      if (permissionsError) throw permissionsError;
      
      // Group permissions by category
      const groupedPermissions = permissionsData.reduce((acc, permission) => {
        const category = permission.category || 'Other';
        return {
          ...acc,
          [category]: [...(acc[category] || []), permission]
        };
      }, {});
      
      setAllPermissions(permissionsData);
      setPermissionsByCategory(groupedPermissions);
      
      // Fetch permissions assigned to this admin
      const { data: adminPermData, error: adminPermError } = await supabase
        .from('admin_role_permission')
        .select('permission_id, is_active')
        .eq('admin_id', adminId);
      
      if (adminPermError) throw adminPermError;
      
      // Map to just the permission IDs that are active
      const activePermissionIds = adminPermData
        .filter(p => p.is_active)
        .map(p => p.permission_id);
      
      setAdminPermissions(activePermissionIds);
      
    } catch (error) {
      console.error('Error fetching admin permissions:', error);
      setPermissionError('Failed to load permissions. Please try again.');
    } finally {
      setLoadingPermissions(false);
    }
  };
  
  // Toggle a permission for the selected admin
  const togglePermission = (permissionId) => {
    setAdminPermissions(prevPermissions => {
      if (prevPermissions.includes(permissionId)) {
        return prevPermissions.filter(id => id !== permissionId);
      } else {
        return [...prevPermissions, permissionId];
      }
    });
  };
  
  // Save updated permissions
  const savePermissions = async () => {
    try {
      // Verify permission
      if (!hasPermission('edit_admins')) {
        toast.error('Permission denied: You do not have permission to manage admin permissions');
        throw new Error('You do not have permission to manage admin permissions');
      }
      
      setSavingPermissions(true);
      setPermissionError(null);
      
      // First, get current permissions to compare
      const { data: currentPerms, error: currentError } = await supabase
        .from('admin_role_permission')
        .select('*')
        .eq('admin_id', selectedAdmin.id);
      
      if (currentError) {
        toast.error(`Failed to fetch current permissions: ${currentError.message}`);
        throw currentError;
      }
      
      // Process each permission
      for (const permission of allPermissions) {
        const isActive = adminPermissions.includes(permission.id);
        const existingPerm = currentPerms.find(p => p.permission_id === permission.id);
        
        if (existingPerm) {
          // Update existing permission if its state changed
          if (existingPerm.is_active !== isActive) {
            const { error: updateError } = await supabase
              .from('admin_role_permission')
              .update({ is_active: isActive })
              .eq('id', existingPerm.id);
            
            if (updateError) {
              toast.error(`Failed to update permission: ${updateError.message}`);
              throw updateError;
            }
          }
        } else if (isActive) {
          // First check if this permission already exists for this admin
          const { data: existingData, error: checkError } = await supabase
            .from('admin_role_permission')
            .select('id')
            .eq('admin_id', selectedAdmin.id)
            .eq('permission_id', permission.id)
            .single();
            
          if (checkError && checkError.code !== 'PGRST116') { // PGRST116 means no rows returned
            toast.error(`Failed to check existing permission: ${checkError.message}`);
            throw checkError;
          }
          
          // If the permission already exists, update it instead of inserting
          if (existingData) {
            const { error: updateError } = await supabase
              .from('admin_role_permission')
              .update({ is_active: true })
              .eq('id', existingData.id);
              
            if (updateError) {
              toast.error(`Failed to update permission: ${updateError.message}`);
              throw updateError;
            }
          } else {
            // Insert new permission if it should be active and doesn't exist
            const { error: insertError } = await supabase
              .from('admin_role_permission')
              .insert({
                admin_id: selectedAdmin.id,
                permission_id: permission.id,
                is_active: true
              });
            
            if (insertError) {
              toast.error(`Failed to add permission: ${insertError.message}`);
              throw insertError;
            }
          }
        }
      }
      
      // Log activity
      if (adminData) {
        await supabase.from('admin_activity_log').insert([{
          admin_id: adminData.id,
          action: 'update_admin_permissions',
          entity_type: 'admin_user',
          entity_id: String(selectedAdmin.id),
          details: { updated_permissions: adminPermissions },
          ip_address: '127.0.0.1',
          user_agent: navigator.userAgent
        }]);
      }
      
      toast.success(`Permissions for "${selectedAdmin.username}" updated successfully`);
      // Show success notification in a real app
      // For now, just close the modal
      closeModal();
      
      // Refresh admin users list to show the updated role
      fetchAdminUsers();
      
    } catch (error) {
      console.error('Error saving admin permissions:', error);
      setPermissionError(error.message || 'Failed to save permissions. Please try again.');
      toast.error(`Error saving permissions: ${error.message}`);
    } finally {
      setSavingPermissions(false);
    }
  };

  // Format permission category name
  const formatCategoryName = (category) => {
    // First, convert camelCase to space-separated words
    const withSpaces = category.replace(/([A-Z])/g, ' $1');
    
    // Then capitalize the first letter of each word
    return withSpaces
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
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
    <div className="w-full">

      {/* Main Content */}
      <div className="w-full">

        {/* Content Area */}
        {hasPermission('view_admins') ? (
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
              {hasPermission('add_admins') && (
              <button
                onClick={() => openModal('add')}
                className="flex items-center justify-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm"
              >
                  <FaUserPlus className="mr-2" />
                  Add New Admin
                </button>
              )}
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
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeStyle(getEffectiveRole(admin))}`}>
                              {getEffectiveRole(admin) === 'SUPER_ADMIN' && <FaUserShield className="mr-1" />}
                              {getEffectiveRole(admin) === 'ADMIN' && <FaUserCog className="mr-1" />}
                              {getEffectiveRole(admin)}
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
                            {hasPermission("edit_admins") && (
                            <button
                              onClick={() => openModal('edit', admin)}
                              className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 mr-3"
                              disabled={adminData && adminData.id === admin.id && adminData.role !== 'SUPER_ADMIN'}
                            >
                              <FaEdit />
                            </button>
                            )}
                            {hasPermission("delete_admins") && (
                            <button
                              onClick={() => openModal('delete', admin)}
                              className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                              disabled={adminData && adminData.id === admin.id}
                            >
                              <FaTrash />
                            </button>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" className="px-4 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                          {searchQuery
                            ? 'No admin users match your search criteria'
                            : 'No admin users found or you dont have permission to view this page'}
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
        ) : (
          <div className="min-h-screen flex items-center justify-center w-full">
            <AccessRestrictedModal />
          </div>
        )}
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
              password_hash: password
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
                disabled={!isPasswordValid || !isPasswordMatch || !username || !email}
                className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium
                  text-white ${isPasswordValid && isPasswordMatch && username && email
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
                password_hash: password,
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
                  type='button'
                  onClick={() => openModal('editPermission', selectedAdmin)}
                  className='px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium
                    text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2
                    focus:ring-offset-2 focus:ring-indigo-500'
                >
                  Edit Permission
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

    {/* Edit Admin Permissions Modal */}
    {isModalOpen && modalType === 'editPermission' && selectedAdmin && (
      <div className='fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50'>
        <div className='bg-white dark:bg-gray-800 rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden'>
          <div className='flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10'>
            <h2 className='text-xl font-semibold text-gray-800 dark:text-white'>
              Edit Permissions for {selectedAdmin.username || selectedAdmin.email}
            </h2>
            <button
              onClick={closeModal}
              className='text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            >
              &times;
            </button>
          </div>
          
          <div className='flex-1 overflow-y-auto px-6 py-4'>
            <div className='mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800'>
              <div className='flex items-start'>
                <div className='flex-shrink-0 mr-3 text-blue-500 dark:text-blue-400 pt-0.5'>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h3 className='text-sm font-medium text-blue-800 dark:text-blue-200'>Access Control Information</h3>
                  <p className='mt-1 text-sm text-blue-700 dark:text-blue-300'>
                    Permissions determine what actions this admin can perform in the system. Select the appropriate permissions based on their role and responsibilities.
                  </p>
                  
                  <div className="mt-3 flex items-center">
                    <span className="text-sm font-medium text-blue-800 dark:text-blue-200 mr-2">Current Role:</span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      getEffectiveRole(selectedAdmin) === 'SUPER_ADMIN' 
                        ? 'bg-purple-100 text-purple-800 dark:bg-purple-800 dark:text-purple-100' 
                        : 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100'
                    }`}>
                      {getEffectiveRole(selectedAdmin)}
                    </span>
                  </div>
                  
                  <p className='mt-2 text-xs text-blue-700 dark:text-blue-300 italic'>
                    Note: An admin with all admin management permissions (view, edit, add, delete admins) will have the SUPER_ADMIN role.
                  </p>
                </div>
              </div>
            </div>

            {permissionError && (
              <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-100 dark:border-red-800">
                <div className="flex items-start">
                  <div className="flex-shrink-0 mr-3 text-red-500 dark:text-red-400 pt-0.5">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-red-800 dark:text-red-200">Error</h3>
                    <p className="mt-1 text-sm text-red-700 dark:text-red-300">{permissionError}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Permission Setup */}
            {!loadingPermissions && allPermissions.length > 0 && (
              <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-750 rounded-lg border border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Quick Permission Setup</h3>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                  Quickly set permissions based on common role patterns
                </p>
                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      // For SUPER_ADMIN, select all admin management permissions
                      const adminPermNames = ['view_admins', 'edit_admins', 'add_admins', 'delete_admins'];
                      const adminPermIds = allPermissions
                        .filter(perm => adminPermNames.includes(perm.name))
                        .map(perm => perm.id);
                        
                      // Add these permissions to existing selections
                      setAdminPermissions(prev => {
                        const newPerms = [...prev];
                        adminPermIds.forEach(id => {
                          if (!newPerms.includes(id)) {
                            newPerms.push(id);
                          }
                        });
                        return newPerms;
                      });
                    }}
                    className="px-3 py-1.5 bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-800 dark:text-purple-100 dark:hover:bg-purple-700 rounded text-xs font-medium"
                  >
                    Set SUPER_ADMIN permissions
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      // For regular ADMIN, remove admin management permissions
                      const adminPermNames = ['edit_admins', 'add_admins', 'delete_admins'];
                      const adminPermIds = allPermissions
                        .filter(perm => adminPermNames.includes(perm.name))
                        .map(perm => perm.id);
                        
                      // Remove these permissions from selections
                      setAdminPermissions(prev => prev.filter(id => !adminPermIds.includes(id)));
                    }}
                    className="px-3 py-1.5 bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-800 dark:text-blue-100 dark:hover:bg-blue-700 rounded text-xs font-medium"
                  >
                    Set standard ADMIN permissions
                  </button>
                </div>
              </div>
            )}

            {loadingPermissions ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
                <span className="ml-3 text-gray-600 dark:text-gray-400">Loading permissions...</span>
              </div>
            ) : (
              <>
                {/* Permissions by Category */}
                <div className='space-y-6'>
                  {Object.entries(permissionsByCategory).map(([category, categoryPermissions]) => (
                    <div key={category} className='border dark:border-gray-700 rounded-lg overflow-hidden'>
                      <div className='bg-gray-50 dark:bg-gray-750 px-4 py-3 border-b border-gray-200 dark:border-gray-700'>
                        <h3 className='text-md font-medium text-gray-700 dark:text-gray-300'>
                          {formatCategoryName(category)}
                        </h3>
                      </div>
                      <div className='p-4 grid grid-cols-1 md:grid-cols-2 gap-3'>
                        {categoryPermissions.map(permission => (
                          <div key={permission.id} className='flex items-center'>
                            <input
                              type='checkbox'
                              id={`perm-${permission.id}`}
                              className='h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500'
                              checked={adminPermissions.includes(permission.id)}
                              onChange={() => togglePermission(permission.id)}
                            />
                            <label 
                              htmlFor={`perm-${permission.id}`} 
                              className={`ml-2 text-sm ${
                                ['view_admins', 'edit_admins', 'add_admins', 'delete_admins'].includes(permission.name)
                                ? 'font-medium text-indigo-700 dark:text-indigo-300'
                                : 'text-gray-700 dark:text-gray-300'
                              }`}
                            >
                              {permission.name.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                              {['view_admins', 'edit_admins', 'add_admins', 'delete_admins'].includes(permission.name) && (
                                <span className="ml-1 text-xs text-indigo-500 dark:text-indigo-400">
                                  (affects role)
                                </span>
                              )}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className='p-6 border-t border-gray-200 dark:border-gray-700 sticky bottom-0 bg-white dark:bg-gray-800 z-10 flex justify-end space-x-3'>
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
              onClick={savePermissions}
              disabled={savingPermissions}
              className='px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium
                text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2
                focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400 disabled:cursor-not-allowed'
            >
              {savingPermissions ? (
                <>
                  <span className="inline-block animate-spin h-4 w-4 border-t-2 border-b-2 border-white rounded-full mr-2"></span>
                  Saving...
                </>
              ) : (
                'Save Permissions'
              )}
            </button>
          </div>
        </div>
      </div>
    )}
    </div>
  );
} 