'use client';

import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { FaUsers, FaMoneyBillWave, FaTicketAlt, FaCog, FaSignOutAlt, FaChartLine } from 'react-icons/fa';
import LogoImage from '../../public/logo.png';

export default function AdminSidebar({ activePage, adminData, onLogout }) {
  const router = useRouter();
  const params = useParams();
  const locale = params.locale || 'en';
  
  // Default logout handler if not provided
  const handleLogout = async () => {
    if (!onLogout) {
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
    } else {
      // Use the provided logout handler
      onLogout();
    }
  };
  
  // Navigation items configuration
  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <FaChartLine className="mr-3" />,
      href: `/${locale}/adminDashboard`
    },
    {
      id: 'users',
      label: 'User Management',
      icon: <FaUsers className="mr-3" />,
      href: `/${locale}/userManagement`
    },
    {
      id: 'admins',
      label: 'Admin Management',
      icon: <FaUsers className="mr-3" />,
      href: `/${locale}/adminManagement`
    },
    {
      id: 'subscriptions',
      label: 'Subscriptions',
      icon: <FaMoneyBillWave className="mr-3" />,
      href: `/${locale}/subscriptionManagement`
    },
    {
      id: 'support',
      label: 'Support Tickets',
      icon: <FaTicketAlt className="mr-3" />,
      href: `/${locale}/supportManagement`
    },
    {
      id: 'settings',
      label: 'System Settings',
      icon: <FaCog className="mr-3" />,
      href: `/${locale}/adminSettings`,
      isSettings: true
    }
  ];
  
  return (
    <div className="w-64 bg-indigo-800 dark:bg-gray-800 text-white h-screen flex flex-col">
      <div className="p-4 flex items-center">
        <Image
          src={LogoImage}
          alt="Logo"
          width={40}
          height={40}
          className="mr-2"
        />
        <h1 className="text-xl font-bold">Admin Panel</h1>
      </div>
      
      <nav className="mt-8 flex-1">
        <div className="px-4 py-2 text-indigo-200 dark:text-gray-400 uppercase text-xs font-semibold">
          Main
        </div>
        
        {navItems.filter(item => !item.isSettings).map(item => (
          <Link 
            key={item.id}
            href={item.href}
            className={`flex items-center px-4 py-3 ${
              activePage === item.id 
                ? 'bg-indigo-900 dark:bg-gray-700 text-white' 
                : 'text-indigo-100 dark:text-gray-300 hover:bg-indigo-700 dark:hover:bg-gray-700'
            }`}
          >
            {item.icon}
            {item.label}
          </Link>
        ))}
        
        <div className="px-4 py-2 mt-6 text-indigo-200 dark:text-gray-400 uppercase text-xs font-semibold">
          Settings
        </div>
        
        {navItems.filter(item => item.isSettings).map(item => (
          <Link 
            key={item.id}
            href={item.href}
            className={`flex items-center px-4 py-3 ${
              activePage === item.id 
                ? 'bg-indigo-900 dark:bg-gray-700 text-white' 
                : 'text-indigo-100 dark:text-gray-300 hover:bg-indigo-700 dark:hover:bg-gray-700'
            }`}
          >
            {item.icon}
            {item.label}
          </Link>
        ))}
        
        <button 
          onClick={handleLogout}
          className="w-full flex items-center px-4 py-3 text-indigo-100 dark:text-gray-300 hover:bg-indigo-700 dark:hover:bg-gray-700"
        >
          <FaSignOutAlt className="mr-3" />
          Logout
        </button>
      </nav>
      
      {adminData && (
        <div className="p-4 border-t border-indigo-700 dark:border-gray-700">
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white font-semibold mr-2">
              {adminData.username?.charAt(0).toUpperCase() || 'A'}
            </div>
            <div>
              <p className="text-sm font-medium text-white">{adminData.full_name || adminData.username}</p>
              <p className="text-xs text-indigo-200 dark:text-gray-400">{adminData.role}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 