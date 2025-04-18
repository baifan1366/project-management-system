'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import LogoImage from '../../../public/logo.png';

export default function AdminLoginPage() {
  const router = useRouter();
  const params = useParams();
  
  // Get current locale
  const locale = params.locale || 'en';
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Check if admin is already logged in
  useEffect(() => {
    const checkAdmin = async () => {
      // Check for existing session
      const { data, error } = await supabase.auth.getSession();
      
      if (!error && data.session && data.session.user) {
        // Check if user has admin role
        const { data: adminData, error: adminError } = await supabase
          .from('admin_user')
          .select('*')
          .eq('email', data.session.user.email)
          .single();
          
        if (!adminError && adminData && adminData.is_active) {
          console.log('Admin already logged in, redirecting to dashboard');
          router.replace(`/${locale}/adminDashboard`);
        }
      }
    };
    
    checkAdmin();
  }, [locale, router]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Authenticate with Supabase Auth
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (signInError) throw signInError;

      if (data?.user) {
        // Check if user is an admin
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
        
        // Store admin info in local storage for easy access
        localStorage.setItem('adminData', JSON.stringify({
          id: adminData.id,
          email: adminData.email,
          role: adminData.role,
          name: adminData.full_name || adminData.username
        }));
        
        // Redirect to admin dashboard
        router.replace(`/${locale}/adminDashboard`);
      }
    } catch (err) {
      console.error('Admin login error:', err);
      setError(err.message || 'Failed to sign in. Please check your credentials and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
          <div className="text-center">
            <Image
              src={LogoImage}
              alt="Logo"
              width={64}
              height={64}
              className="mx-auto mb-6"
              priority
            />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Admin Login
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-8">
              Access the administration panel
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                type="email"
                name="email"
                placeholder="Email Address"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                required
              />
            </div>

            <div>
              <input
                type="password"
                name="password"
                placeholder="Password"
                value={formData.password}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                required
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                  Remember me
                </label>
              </div>

              <Link href={`/${locale}/admin/forgot-password`} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
                Forgot password?
              </Link>
            </div>

            {error && (
              <div className="text-red-500 dark:text-red-400 text-sm text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
            <p>
              This area is restricted to administrators only.
            </p>
            <p className="mt-2">
              <Link href={`/${locale}/login`} className="text-blue-600 dark:text-blue-400 hover:underline">
                Return to user login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}