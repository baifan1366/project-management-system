import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { supabase } from '@/lib/supabase';

// Async thunk for admin login
export const loginAdmin = createAsyncThunk(
  'admin/login',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      // 首先查询 admin_user 表确定管理员类型
      const { data: adminData, error: adminQueryError } = await supabase
        .from('admin_user')
        .select('*')
        .eq('email', email)
        .single();
      
      if (adminQueryError) {
        console.error('Admin query error:', adminQueryError);
        throw new Error('Admin not found');
      }
      
      // 检查是否激活
      if (!adminData.is_active) {
        throw new Error('Your admin account has been deactivated.');
      }
      
      let authUser;
      
      // 根据 supabase_user_id 字段判断是超级管理员还是普通管理员
      if (adminData.supabase_user_id) {
        console.log('Authenticating super admin via Supabase Auth');
        // 超级管理员 - 使用 Supabase Auth
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        if (error) {
          console.error('Supabase auth error:', error);
          throw error;
        }
        
        authUser = data.user;
      } else {
        console.log('Authenticating regular admin via password hash');
        // 普通管理员 - 使用密码哈希比较
        // 检查密码哈希是否匹配
        if (adminData.password_hash !== password) {
          throw new Error('Invalid credentials');
        }
        
        // 如果验证成功，设置authUser为模拟结构
        authUser = { email };
      }
      
      console.log('Authentication successful');
      
      // Get admin details from admin_user table (already fetched above)
      const adminDetails = adminData;
      
      // Get permissions based on admin ID
      let permissions = [];
      try {
        // Get permission IDs for the admin
        const { data: adminPermissions, error: permissionsError } = await supabase
          .from('admin_role_permission')
          .select('permission_id')
          .eq('admin_id', Number(adminDetails.id))
          .eq('is_active', true);
          
        if (!permissionsError && adminPermissions && adminPermissions.length > 0) {
          // Extract permission IDs
          const permissionIds = adminPermissions.map(item => item.permission_id);
          
          // Get permission details
          const { data: permissionDetails, error: permissionDetailsError } = await supabase
            .from('admin_permission')
            .select('id, name')
            .in('id', permissionIds);
            
          if (!permissionDetailsError && permissionDetails) {
            permissions = permissionDetails;
          } else {
            console.error('Error fetching permission details:', permissionDetailsError);
          }
        } else {
          console.log('No permissions found for admin:', adminDetails.id);
        }
      } catch (permError) {
        console.error('Error in permissions process:', permError);
        // Continue login process even if permissions fetch fails
      }
      
      try {
        // Log admin activity - 防止出现 UUID 格式错误
        await supabase.from('admin_activity_log').insert({
          admin_id: adminDetails.id,
          action: 'login',
          entity_type: 'admin',
          // 确保 entity_id 是字符串，而非 UUID 格式
          // entity_id: adminDetails.id.toString(),
          // 暂时省略 entity_id 字段，避免 UUID 错误
          ip_address: '127.0.0.1', // In a real app, you would get the actual IP
          user_agent: navigator.userAgent
        });
        
        // Update last login time
        await supabase
          .from('admin_user')
          .update({ 
            last_login: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', adminDetails.id);
      } catch (logError) {
        // 即使日志记录失败，也不要中断登录流程
        console.error('Error logging admin activity:', logError);
      }
      
      // 存储到 localStorage
      localStorage.setItem('adminData', JSON.stringify(adminDetails));
      
      console.log('Login completed successfully:', adminDetails.email);
      
      return {
        id: adminDetails.id,
        email: adminDetails.email,
        role: adminDetails.role,
        name: adminDetails.full_name || adminDetails.username,
        avatar_url: adminDetails.avatar_url,
        supabase_user_id: adminDetails.supabase_user_id,
        permissions: permissions // Include permissions in the returned data
      };
    } catch (err) {
      console.error('Login error:', err);
      return rejectWithValue(err.message || 'Failed to sign in');
    }
  }
);

// Async thunk for checking admin session
export const checkAdminSession = createAsyncThunk(
  'admin/checkSession',
  async (_, { rejectWithValue, getState }) => {
    try {
      // 1. 首先检查 Supabase Auth session
      const { data, error } = await supabase.auth.getSession();
      
      // 如果有 Supabase 会话，优先使用
      if (!error && data.session && data.session.user) {
        console.log('Found Supabase session for:', data.session.user.email);
        // 检查用户是否为管理员
        const { data: adminData, error: adminError } = await supabase
          .from('admin_user')
          .select('*')
          .eq('email', data.session.user.email)
          .single();
          
        if (!adminError && adminData && adminData.is_active) {
          console.log('Valid admin found in database:', adminData.email);
          
          // Fetch admin permissions
          let permissions = [];
          try {
            const { data: adminPermissions, error: permissionsError } = await supabase
              .from('admin_role_permission')
              .select('permission_id')
              .eq('admin_id', Number(adminData.id))
              .eq('is_active', true);
              
            if (!permissionsError && adminPermissions && adminPermissions.length > 0) {
              const permissionIds = adminPermissions.map(item => item.permission_id);
              
              const { data: permissionDetails, error: permissionDetailsError } = await supabase
                .from('admin_permission')
                .select('id, name')
                .in('id', permissionIds);
                
              if (!permissionDetailsError && permissionDetails) {
                permissions = permissionDetails.map(p => p.name);
              }
            }
          } catch (permError) {
            console.error('Error fetching permissions:', permError);
          }
          
          return {
            id: adminData.id,
            email: adminData.email,
            role: adminData.role,
            name: adminData.full_name || adminData.username,
            avatar_url: adminData.avatar_url,
            supabase_user_id: adminData.supabase_user_id,
            permissions: permissions
          };
        } else {
          console.log('Admin not found or not active:', adminError);
        }
      }
      
      // 2. 如果没有 Supabase 会话，检查 localStorage
      try {
        const storedAdminData = localStorage.getItem('adminData');
        if (storedAdminData) {
          console.log('Found adminData in localStorage');
          
          try {
            const adminData = JSON.parse(storedAdminData);
            
            // 验证数据有效性 (可以根据需要添加更多验证)
            if (adminData && adminData.email && adminData.is_active) {
              console.log('Valid adminData in localStorage:', adminData.email);
              
              // 重新从数据库验证管理员状态
              const { data: freshAdminData, error: adminError } = await supabase
                .from('admin_user')
                .select('*')
                .eq('email', adminData.email)
                .single();
                
              if (!adminError && freshAdminData && freshAdminData.is_active) {
                console.log('Verified admin from database:', freshAdminData.email);
                
                // Fetch admin permissions
                let permissions = [];
                try {
                  const { data: adminPermissions, error: permissionsError } = await supabase
                    .from('admin_role_permission')
                    .select('permission_id')
                    .eq('admin_id', Number(freshAdminData.id))
                    .eq('is_active', true);
                    
                  if (!permissionsError && adminPermissions && adminPermissions.length > 0) {
                    const permissionIds = adminPermissions.map(item => item.permission_id);
                    
                    const { data: permissionDetails, error: permissionDetailsError } = await supabase
                      .from('admin_permission')
                      .select('id, name')
                      .in('id', permissionIds);
                      
                    if (!permissionDetailsError && permissionDetails) {
                      permissions = permissionDetails.map(p => p.name);
                    }
                  }
                } catch (permError) {
                  console.error('Error fetching permissions:', permError);
                }
                
                return {
                  id: freshAdminData.id,
                  email: freshAdminData.email,
                  role: freshAdminData.role,
                  name: freshAdminData.full_name || freshAdminData.username,
                  avatar_url: freshAdminData.avatar_url,
                  supabase_user_id: freshAdminData.supabase_user_id,
                  permissions: permissions
                };
              } else {
                console.log('Could not verify admin from database:', adminError);
                // 数据库中不存在或未激活，清除无效的 localStorage
                localStorage.removeItem('adminData');
              }
            } else {
              console.log('Invalid admin data format in localStorage');
              localStorage.removeItem('adminData');
            }
          } catch (parseError) {
            console.error('Error parsing localStorage adminData:', parseError);
            localStorage.removeItem('adminData');
          }
        } else {
          console.log('No adminData found in localStorage');
        }
      } catch (localStorageError) {
        console.error('Error accessing localStorage:', localStorageError);
      }
      
      // 3. 都没有找到有效的会话
      console.log('No valid admin session found');
      return null;
    } catch (err) {
      console.error('Admin session check error:', err);
      return rejectWithValue(err.message);
    }
  }
);

// Async thunk for checking admin permissions
export const checkAdminPermissions = createAsyncThunk(
  'admin/checkPermissions',
  async (adminId, { rejectWithValue, getState }) => {
    try {
      if (!adminId) {
        // If no adminId provided, try to get it from state
        const state = getState();
        adminId = state.admin?.admin?.id;
        
        if (!adminId) {
          throw new Error('No admin id provided or available in state');
        }
      }
      
      // Get permission IDs for admin id
      const { data: adminPermissions, error: adminPermissionsError } = await supabase
        .from('admin_role_permission')
        .select('permission_id')
        .eq('admin_id', Number(adminId))
        .eq('is_active', true);
        
      if (adminPermissionsError) throw adminPermissionsError;
      
      if (!adminPermissions || adminPermissions.length === 0) {
        console.log('No permissions found for admin id:', adminId);
        return [];
      }
      
      // Extract permission IDs
      const permissionIds = adminPermissions.map(item => item.permission_id);
      
      // Get permission details
      const { data: permissions, error: permissionDetailsError } = await supabase
        .from('admin_permission')
        .select('id, name')
        .in('id', permissionIds);
        
      if (permissionDetailsError) throw permissionDetailsError;
      
      // Return just the permission names for easier use in the application
      return permissions?.map(p => p.name) || [];
    } catch (err) {
      console.error('Admin permissions check error:', err);
      return rejectWithValue(err.message);
    }
  }
);

// Async thunk for admin logout
export const logoutAdmin = createAsyncThunk(
  'admin/logout',
  async (_, { rejectWithValue }) => {
    try {
      // 清除 localStorage
      localStorage.removeItem('adminData');
      
      // 对于有 Supabase Auth 的管理员，需要登出
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      return null;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

const initialState = {
  admin: null,
  isAuthenticated: false,
  loading: false,
  error: null,
  permissions: [] // Add permissions to the initial state
};

const adminSlice = createSlice({
  name: 'admin',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(loginAdmin.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginAdmin.fulfilled, (state, action) => {
        state.loading = false;
        state.admin = action.payload;
        state.isAuthenticated = !!action.payload;
        // Add permissions to state
        state.permissions = action.payload?.permissions?.map(p => p.name) || [];
      })
      .addCase(loginAdmin.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Check Session
      .addCase(checkAdminSession.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(checkAdminSession.fulfilled, (state, action) => {
        state.loading = false;
        state.admin = action.payload;
        state.isAuthenticated = !!action.payload;
        // Set permissions from payload if available
        state.permissions = action.payload?.permissions || [];
      })
      .addCase(checkAdminSession.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Check Permissions
      .addCase(checkAdminPermissions.fulfilled, (state, action) => {
        state.permissions = action.payload || [];
      })
      .addCase(checkAdminPermissions.rejected, (state) => {
        // If permissions check fails, ensure we at least have an empty array
        if (!state.permissions) {
          state.permissions = [];
        }
      })
      
      // Logout
      .addCase(logoutAdmin.pending, (state) => {
        state.loading = true;
      })
      .addCase(logoutAdmin.fulfilled, (state) => {
        state.loading = false;
        state.admin = null;
        state.isAuthenticated = false;
        // Clear permissions
        state.permissions = [];
      })
      .addCase(logoutAdmin.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  }
});

export const { clearError } = adminSlice.actions;
export default adminSlice.reducer; 