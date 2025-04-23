import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { supabase } from '@/lib/supabase';

// Async thunk for admin login
export const loginAdmin = createAsyncThunk(
  'admin/login',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      // Authenticate with Supabase Auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data?.user) {
        // Get admin details from admin_user table
        const { data: adminData, error: adminError } = await supabase
          .from('admin_user')
          .select('*')
          .eq('email', data.user.email)
          .single();
          
        if (adminError || !adminData) {
          throw new Error('Unauthorized access. This area is restricted to administrators only.');
        }
        
        if (!adminData.is_active) {
          throw new Error('Your admin account has been deactivated. Please contact the system administrator.');
        }
        
        // Log admin activity
        await supabase.from('admin_activity_log').insert({
          admin_id: adminData.id,
          action: 'login',
          entity_type: 'admin',
          entity_id: adminData.id.toString(),
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
          .eq('id', adminData.id);
        
        return {
          id: adminData.id,
          email: adminData.email,
          role: adminData.role,
          name: adminData.full_name || adminData.username,
          avatar_url: adminData.avatar_url,
          supabase_user_id: adminData.supabase_user_id
        };
      }
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to sign in');
    }
  }
);

// Async thunk for checking admin session
export const checkAdminSession = createAsyncThunk(
  'admin/checkSession',
  async (_, { rejectWithValue }) => {
    try {
      // Check for existing session
      const { data, error } = await supabase.auth.getSession();
      
      if (error) throw error;
      
      if (data.session && data.session.user) {
        // Check if user has admin role
        const { data: adminData, error: adminError } = await supabase
          .from('admin_user')
          .select('*')
          .eq('email', data.session.user.email)
          .single();
          
        if (adminError || !adminData) {
          return null; // Not an admin user
        }
        
        if (!adminData.is_active) {
          return null; // Admin account is deactivated
        }
        
        return {
          id: adminData.id,
          email: adminData.email,
          role: adminData.role,
          name: adminData.full_name || adminData.username,
          avatar_url: adminData.avatar_url,
          supabase_user_id: adminData.supabase_user_id
        };
      }
      
      return null; // No session
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

// Async thunk for admin logout
export const logoutAdmin = createAsyncThunk(
  'admin/logout',
  async (_, { rejectWithValue }) => {
    try {
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
  error: null
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
      })
      .addCase(checkAdminSession.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Logout
      .addCase(logoutAdmin.pending, (state) => {
        state.loading = true;
      })
      .addCase(logoutAdmin.fulfilled, (state) => {
        state.loading = false;
        state.admin = null;
        state.isAuthenticated = false;
      })
      .addCase(logoutAdmin.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  }
});

export const { clearError } = adminSlice.actions;
export default adminSlice.reducer; 