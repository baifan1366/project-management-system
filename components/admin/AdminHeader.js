'use client';

import { FaBell, FaSun, FaMoon } from 'react-icons/fa';
import { useTheme } from 'next-themes';
import { useState, useEffect } from 'react';
import AdminProfileModal from './AdminProfileModal';

/**
 * Reusable header component for admin pages
 * @param {Object} props
 * @param {string} props.title - The page title to display
 * @param {Object} props.adminData - The admin user data
 * @param {React.ReactNode} props.extraContent - Optional additional content to display in the header (e.g., filters, date selectors)
 * @param {boolean} props.showThemeToggle - Whether to show the theme toggle button
 */
const AdminHeader = ({ 
  title, 
  adminData, 
  extraContent,
  showThemeToggle = true
}) => {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // To avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(()=>{
    
  })

  // Handle theme toggle
  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <header className="bg-white dark:bg-gray-800 shadow">
      <div className="max-w-8xl mx-auto px-2 sm:px-4 lg:px-">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white">{title}</h2>
          </div>
          
          <div className="flex items-center space-x-4">
            {extraContent && (
              <div className="mr-2">{extraContent}</div>
            )}
            
            {showThemeToggle && mounted && (
              <button 
                onClick={toggleTheme}
                className="p-2 text-gray-500 dark:text-gray-400 hover:text-indigo-500 dark:hover:text-indigo-400"
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? <FaSun /> : <FaMoon />}
              </button>
            )}
            
            <button 
              className="p-2 text-gray-500 dark:text-gray-400 hover:text-indigo-500 dark:hover:text-indigo-400"
              aria-label="Notifications"
            >
              <FaBell />
            </button>
            
            {adminData && (
              <div 
                className="flex items-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 px-3 rounded-lg transition-colors"
                onClick={() => setIsProfileModalOpen(true)}
              >
                {/* avatar */}
                <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white font-semibold mr-2">
                  {adminData?.username?.charAt(0).toUpperCase() || 'A'}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{adminData?.username}</p>
                  
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <AdminProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        adminData={adminData}
      />
    </header>
  );
};

export default AdminHeader; 